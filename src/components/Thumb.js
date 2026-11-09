import React, { useEffect, useRef, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { BUILTIN_IMAGES } from '../lib/builtinImages';

/**
 * Image URL for a recipe (builtin asset or lazily loaded photo).
 * variant 'thumb' (default): the small 320 px thumbnail (cached on the device) - for every list / small context.
 * variant 'full': the full photo.
 */
export function useRecipeImage(rid, visible = true, variant = 'thumb') {
  const { recipes, photoFor, requestPhoto } = useHousehold();
  const r = rid ? recipes[rid] : null;
  const hasPhoto = !!(r && r.hasPhoto);
  useEffect(() => {
    if (visible && hasPhoto) requestPhoto(rid, variant);
  }, [visible, hasPhoto, rid, variant, requestPhoto]);
  if (!r) return null;
  if (r.hasPhoto) return photoFor(rid, variant) || null;
  if (r.builtinImage && BUILTIN_IMAGES[r.builtinImage]) return BUILTIN_IMAGES[r.builtinImage];
  return null;
}

/**
 * Full photo for the detail hero / editor: the thumb is requested too and shown (blurred, `loading: true`)
 * until the full photo arrives.
 */
export function useRecipeImageFull(rid, visible = true) {
  const { recipes, photoFor, requestPhoto } = useHousehold();
  const r = rid ? recipes[rid] : null;
  const hasPhoto = !!(r && r.hasPhoto);
  useEffect(() => {
    if (visible && hasPhoto) {
      requestPhoto(rid, 'thumb');
      requestPhoto(rid, 'full');
    }
  }, [visible, hasPhoto, rid, requestPhoto]);
  if (!r) return { src: null, loading: false };
  if (r.hasPhoto) {
    const full = photoFor(rid, 'full');
    if (full) return { src: full, loading: false };
    return { src: photoFor(rid, 'thumb') || null, loading: full === undefined };
  }
  if (r.builtinImage && BUILTIN_IMAGES[r.builtinImage]) return { src: BUILTIN_IMAGES[r.builtinImage], loading: false };
  return { src: null, loading: false };
}

/**
 * Recipe image tile with an emoji fallback.
 * size: number (square px) or undefined (fills parent – use className for sizing).
 * variant: 'thumb' (default) | 'full'. lazy (default true): the image is requested once the tile
 * is within ~300 px of the viewport; pass lazy={false} only for critical above-the-fold images.
 */
export default function Thumb({
  rid,
  size,
  radius = 14,
  emojiSize,
  className = '',
  lazy = true,
  variant = 'thumb',
}) {
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
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy, visible]);

  const thumbSrc = useRecipeImage(rid, visible && variant !== 'full', 'thumb');
  const full = useRecipeImageFull(rid, visible && variant === 'full');
  const src = variant === 'full' ? full.src : thumbSrc;
  const blurred = variant === 'full' && full.loading;
  const r = recipes[rid];
  const style = { borderRadius: radius };
  if (size) {
    style.width = size;
    style.height = size;
  }
  return (
    <div ref={elRef} className={`thumb ${className}`} style={style}>
      {src ? (
        <img src={src} alt="" loading="lazy" className={blurred ? 'img-placeholder' : undefined} />
      ) : (
        <span style={{ fontSize: emojiSize || (size ? Math.round(size * 0.48) : 52) }}>
          {(r && r.emoji) || '🍽️'}
        </span>
      )}
    </div>
  );
}
