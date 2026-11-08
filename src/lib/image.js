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
