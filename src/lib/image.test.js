import { fitSize, shrinkStep, makeThumb, THUMB_MAX_CHARS, THUMB_SIZE } from './image';

describe('fitSize', () => {
  test('longer side is scaled to max, aspect ratio kept', () => {
    expect(fitSize(1000, 500, 320)).toEqual({ w: 320, h: 160 });
    expect(fitSize(600, 1200, 320)).toEqual({ w: 160, h: 320 });
  });
  test('never upscales and never returns 0', () => {
    expect(fitSize(200, 100, 320)).toEqual({ w: 200, h: 100 });
    expect(fitSize(5000, 1, 320)).toEqual({ w: 320, h: 1 });
    expect(fitSize(0, 0, 320)).toEqual({ w: 1, h: 1 });
  });
});

describe('shrinkStep', () => {
  test('lowers quality first, then size', () => {
    expect(shrinkStep(320, 0.7)).toEqual({ size: 320, quality: 0.6 });
    expect(shrinkStep(320, 0.6)).toEqual({ size: 320, quality: 0.5 });
    expect(shrinkStep(320, 0.5)).toEqual({ size: 256, quality: 0.5 });
  });
});

describe('makeThumb', () => {
  const realImage = global.Image;
  const realCreate = document.createElement.bind(document);
  afterEach(() => {
    global.Image = realImage;
    document.createElement = realCreate;
  });

  function mockCanvas(lengths) {
    const calls = [];
    document.createElement = (tag) => {
      if (tag !== 'canvas') return realCreate(tag);
      const c = {
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, drawImage() {}, set fillStyle(v) {} }),
        toDataURL: (type, q) => {
          calls.push({ w: c.width, h: c.height, q });
          const n = lengths[Math.min(calls.length - 1, lengths.length - 1)];
          return `data:image/jpeg;base64,${'A'.repeat(n)}`;
        },
      };
      return c;
    };
    return calls;
  }
  function mockImage(w, h) {
    global.Image = class {
      set src(v) {
        this.naturalWidth = w;
        this.naturalHeight = h;
        setTimeout(() => this.onload && this.onload(), 0);
      }
    };
  }

  test('renders 320 px / 0.7 and returns it when small enough', async () => {
    const calls = mockCanvas([20000]);
    mockImage(1000, 750);
    const out = await makeThumb('data:image/jpeg;base64,AAAA');
    expect(out.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(calls).toEqual([{ w: THUMB_SIZE, h: 240, q: 0.7 }]);
  });

  test('shrinks until under the hard cap', async () => {
    const calls = mockCanvas([60000, 50000, 30000]);
    mockImage(1000, 1000);
    const out = await makeThumb('data:image/jpeg;base64,AAAA');
    expect(out.length).toBeLessThan(THUMB_MAX_CHARS);
    expect(calls.map((c) => c.q)).toEqual([0.7, 0.6, 0.5]);
  });

  test('rejects when it can never fit', async () => {
    mockCanvas([100000]);
    mockImage(1000, 1000);
    await expect(makeThumb('data:image/jpeg;base64,AAAA')).rejects.toThrow();
  });

  test('rejects when the image cannot be decoded', async () => {
    global.Image = class {
      set src(v) {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
    };
    await expect(makeThumb('data:broken')).rejects.toThrow();
  });
});
