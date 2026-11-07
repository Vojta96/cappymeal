/* eslint-disable no-console */
// Generates PWA icons from src/Images/Cappy.png without extra dependencies.
// Usage: node scripts/gen-icons.js
// Supports 8-bit RGBA / RGB non-interlaced PNGs (which Cappy.png is).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = path.join(__dirname, '..', 'src', 'Images', 'Cappy.png');
const OUT = path.join(__dirname, '..', 'public');
const BG = [0xf0, 0xe3, 0xce]; // wheat tile behind the logo
const TARGETS = [
  { file: 'icon-192.png', size: 192, scale: 0.78 },
  { file: 'icon-512.png', size: 512, scale: 0.78 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78 },
  { file: 'favicon-64.png', size: 64, scale: 0.9 },
];

function decode(buf) {
  let pos = 8;
  let width, height, bitDepth, colorType, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error('Unsupported PNG format');
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * bpp];
      out[o + 1] = line[x * bpp + 1];
      out[o + 2] = line[x * bpp + 2];
      out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encode(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Area-average resample of src into a dst square of `inner` px, composited on BG.
function render(src, size, scale) {
  const inner = Math.round(size * scale);
  const off = Math.floor((size - inner) / 2);
  const dst = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    dst[i * 4] = BG[0];
    dst[i * 4 + 1] = BG[1];
    dst[i * 4 + 2] = BG[2];
    dst[i * 4 + 3] = 255;
  }
  const sx = src.width / inner;
  const sy = src.height / inner;
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const o = (yy * src.width + xx) * 4;
          const al = src.data[o + 3];
          r += src.data[o] * al;
          g += src.data[o + 1] * al;
          b += src.data[o + 2] * al;
          a += al;
          n++;
        }
      }
      const alpha = a / n / 255;
      const o = ((y + off) * size + (x + off)) * 4;
      if (a > 0) {
        dst[o] = Math.round((r / a) * alpha + BG[0] * (1 - alpha));
        dst[o + 1] = Math.round((g / a) * alpha + BG[1] * (1 - alpha));
        dst[o + 2] = Math.round((b / a) * alpha + BG[2] * (1 - alpha));
      }
    }
  }
  return dst;
}

const src = decode(fs.readFileSync(SRC));
for (const t of TARGETS) {
  fs.writeFileSync(path.join(OUT, t.file), encode(t.size, t.size, render(src, t.size, t.scale)));
  console.log('wrote', t.file);
}
