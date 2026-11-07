import React, { useEffect, useRef, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { BUILTIN_IMAGES } from '../lib/builtinImages';

/** Image URL for a recipe (builtin asset or lazily loaded photo). */
export function useRecipeImage(rid, visible = true) {
  const { recipes, photoFor, requestPhoto } = useHousehold();
  const r = rid ? recipes[rid] : null;
  const hasPhoto = !!(r && r.hasPhoto);
  useEffect(() => {
    if (visible && hasPhoto) requestPhoto(rid);
  }, [visible, hasPhoto, rid, requestPhoto]);
  if (!r) return null;
  if (r.hasPhoto) return photoFor(rid) || null;
  if (r.builtinImage && BUILTIN_IMAGES[r.builtinImage]) return BUILTIN_IMAGES[r.builtinImage];
  return null;
}

/**
 * Recipe image tile with an emoji fallback.
 * size: number (square px) or undefined (fills parent – use className for sizing).
 */
export default function Thumb({ rid, size, radius = 14, emojiSize, className = '', lazy = false }) {
  const { recipes } = useHousehold();
  const elRef = useRef(null);
  const [visible, setVisible] = useState(!lazy);

  useEffect(() => {
    if (!lazy || visible) return undefined;
    const el = elRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy, visible]);

  const src = useRecipeImage(rid, visible);
  const r = recipes[rid];
  const style = { borderRadius: radius };
  if (size) {
    style.width = size;
    style.height = size;
  }
  return (
    <div ref={elRef} className={`thumb ${className}`} style={style}>
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span style={{ fontSize: emojiSize || (size ? Math.round(size * 0.48) : 52) }}>
          {(r && r.emoji) || '🍽️'}
        </span>
      )}
    </div>
  );
}
