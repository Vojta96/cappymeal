// Resize an image File in the browser to max `maxSize` px (longer side) and
// return a JPEG data URL. Used for recipe photos stored in RTDB (householdPhotos/{hid}/{rid}),
// whose rules only accept data URLs shorter than 400 000 characters.
export const MAX_PHOTO_CHARS = 390000;

export function resizeImage(file, maxSize = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const render = (size, q) => {
          const ratio = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * ratio));
          const h = Math.max(1, Math.round(img.naturalHeight * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', q);
        };
        let size = maxSize;
        let q = quality;
        let out = render(size, q);
        for (let i = 0; i < 8 && out.length >= MAX_PHOTO_CHARS; i += 1) {
          if (q > 0.55) q -= 0.1;
          else size = Math.round(size * 0.8);
          out = render(size, q);
        }
        if (out.length >= MAX_PHOTO_CHARS) throw new Error('Fotka je příliš velká. Zkuste jiný obrázek.');
        resolve(out);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Fotku se nepodařilo načíst. Zkuste jiný obrázek.'));
    };
    img.src = url;
  });
}

// ---------- thumbnails (householdThumbs/{hid}/{rid}) ----------
// Rules accept data URLs shorter than 45 000 characters; we stay under THUMB_MAX_CHARS.
export const THUMB_MAX_CHARS = 40000;
export const THUMB_SIZE = 320;
export const THUMB_QUALITY = 0.7;

/** Scaled size so that the longer side is at most `max` (never upscales). Pure, testable. */
export function fitSize(width, height, max) {
  const longest = Math.max(width, height);
  const ratio = longest > 0 ? Math.min(1, max / longest) : 1;
  return { w: Math.max(1, Math.round(width * ratio)), h: Math.max(1, Math.round(height * ratio)) };
}

/** Next (size, quality) attempt when a thumbnail is still too large. Pure, testable. */
export function shrinkStep(size, quality) {
  if (quality > 0.5) return { size, quality: Math.round((quality - 0.1) * 100) / 100 };
  return { size: Math.round(size * 0.8), quality };
}

/**
 * Thumbnail (JPEG data URL, longer side 320 px, < 40 000 chars) from a File/Blob or a data URL.
 * Rejects when the image cannot be decoded or cannot be made small enough.
 */
export function makeThumb(source) {
  return new Promise((resolve, reject) => {
    const isString = typeof source === 'string';
    const url = isString ? source : URL.createObjectURL(source);
    const done = () => {
      if (!isString) URL.revokeObjectURL(url);
    };
    const img = new Image();
    img.onload = () => {
      try {
        const render = (size, q) => {
          const { w, h } = fitSize(img.naturalWidth, img.naturalHeight, size);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', q);
        };
        let size = THUMB_SIZE;
        let q = THUMB_QUALITY;
        let out = render(size, q);
        for (let i = 0; i < 8 && out.length >= THUMB_MAX_CHARS; i += 1) {
          ({ size, quality: q } = shrinkStep(size, q));
          out = render(size, q);
        }
        if (out.length >= THUMB_MAX_CHARS) throw new Error('Náhled je příliš velký.');
        resolve(out);
      } catch (e) {
        reject(e);
      } finally {
        done();
      }
    };
    img.onerror = () => {
      done();
      reject(new Error('Fotku se nepodařilo načíst.'));
    };
    img.src = url;
  });
}
