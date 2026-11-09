import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './ui';
import { priceInfo, unitPriceLabel } from '../lib/shop';
import './productCarousel.css';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const selectable = (o) => !!o && o.available !== false;

function Price({ option, xtra }) {
  const info = priceInfo(option, xtra);
  const unit = unitPriceLabel(option, xtra);
  return (
    <div className="pc__prices">
      <div className="pc__pricerow">
        <span className="pc__price">{info.text || ''}</span>
        {info.xtraApplied && <span className="pc__xtra">Xtra</span>}
        {info.refPrice && (
          <>
            <s className="pc__old">{info.refText}</s>
            <span className="pc__pct">−{info.percent} %</span>
          </>
        )}
      </div>
      {info.xtraOffer && <div className="pc__xtraoffer">s Xtra {info.xtraOffer.text}</div>}
      {unit && <span className="pc__uprice">{unit}</span>}
    </div>
  );
}

function Badges({ option }) {
  const list = [];
  if (option.preferred) list.push(['pref', 'Vaše volba']);
  if (option.snapshot) list.push(['past', 'z minulého nákupu']);
  if (option.available === false) list.push(['off', 'Nedostupné']);
  (option.badges || []).slice(0, 2).forEach((b) => list.push(['tag', b]));
  if (!list.length) return null;
  return (
    <div className="pc__badges">
      {list.slice(0, 3).map(([kind, text]) => (
        <span key={`${kind}-${text}`} className={`pc__badge pc__badge--${kind}`}>
          {kind === 'pref' && <Icon name="favorite" size={13} />}
          {text}
        </span>
      ))}
    </div>
  );
}

/**
 * Horizontal carousel of product variants (CSS scroll-snap, mandatory + center).
 * Phone: one card ~70 % wide with neighbours peeking, swipe; desktop (>= 1024 px): 3 cards + arrows.
 * Accessible as a listbox: arrow keys / Home / End move the selection, Enter / Space select.
 *
 * props: xtra (household has Rohlík Xtra: Xtra prices are effective), options [{ productId, name, imageUrl, packText, priceText, unitPriceText, available, badges,
 *        preferred, snapshot }], selected (index, -1 = none), onSelect(index), label, hints (per option text),
 *        disabled
 */
export default function ProductCarousel({ options, selected, onSelect, label, hints = [], disabled = false, xtra = false }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const firstScroll = useRef(true);
  const [active, setActive] = useState(selected >= 0 ? selected : 0);
  const [edges, setEdges] = useState({ start: true, end: false });

  const scrollToIndex = useCallback((i, smooth = true) => {
    const track = trackRef.current;
    const card = cardRefs.current[i];
    if (!track || !card) return;
    const left = Math.max(0, card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2);
    if (smooth && !reducedMotion() && typeof track.scrollTo === 'function') {
      track.scrollTo({ left, behavior: 'smooth' });
      return;
    }
    // Instant jump: the CSS scroll-behavior (smooth) would otherwise animate it.
    const prev = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = left;
    track.style.scrollBehavior = prev;
  }, []);

  // Keep the selected card in view (instantly on first render, smoothly afterwards).
  useLayoutEffect(() => {
    if (selected < 0) return;
    scrollToIndex(selected, !firstScroll.current);
    firstScroll.current = false;
  }, [selected, options, scrollToIndex]);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cardRefs.current.forEach((c, i) => {
      if (!c) return;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
    setEdges({
      start: track.scrollLeft <= 2,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [measure, options.length]);

  const choose = (i) => {
    if (disabled || !selectable(options[i])) return;
    onSelect(i);
  };

  const focusOption = (i) => {
    const el = cardRefs.current[i];
    if (el) el.focus({ preventScroll: true });
    scrollToIndex(i);
  };

  const step = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
      if (selectable(options[i])) return i;
    }
    return from;
  };

  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = step(i, 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = step(i, -1);
    else if (e.key === 'Home') next = step(-1, 1);
    else if (e.key === 'End') next = step(options.length, -1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(i);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    choose(next);
    focusOption(next);
  };

  const focusIndex = selected >= 0 ? selected : Math.max(0, options.findIndex(selectable));

  return (
    <div className={`pc${disabled ? ' pc--disabled' : ''}`}>
      <div className="pc__viewport">
        <button
          type="button"
          className="pc__arrow pc__arrow--prev"
          onClick={() => scrollToIndex(Math.max(0, active - 1))}
          disabled={edges.start}
          aria-label="Předchozí varianty"
          tabIndex={-1}
        >
          <Icon name="chevron_left" size={22} />
        </button>
        <div className="pc__track" ref={trackRef} role="listbox" aria-label={label} aria-orientation="horizontal">
          {options.map((o, i) => {
            const on = i === selected;
            const off = !selectable(o);
            return (
              <div
                key={`${o.productId}-${i}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                role="option"
                aria-selected={on}
                aria-disabled={off || disabled || undefined}
                tabIndex={i === focusIndex ? 0 : -1}
                className={`pc__card${on ? ' pc__card--on' : ''}${off ? ' pc__card--off' : ''}${
                  o.preferred ? ' pc__card--pref' : ''
                }`}
                onClick={() => choose(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {on && <Icon name="check_circle" size={22} className="pc__check" />}
                <Badges option={o} />
                <div className="pc__img">
                  {o.imageUrl ? <img src={o.imageUrl} alt="" loading="lazy" /> : <Icon name="shopping_basket" size={28} />}
                </div>
                <div className="pc__name">{o.name}</div>
                {o.packText && <div className="pc__pack">{o.packText}</div>}
                <Price option={o} xtra={xtra} />
                {hints[i] && <div className="pc__hint">{hints[i]}</div>}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="pc__arrow pc__arrow--next"
          onClick={() => scrollToIndex(Math.min(options.length - 1, active + 1))}
          disabled={edges.end}
          aria-label="Další varianty"
          tabIndex={-1}
        >
          <Icon name="chevron_right" size={22} />
        </button>
      </div>
      {options.length > 1 && (
        <div className="pc__dots" aria-hidden="true">
          {options.map((o, i) => (
            <span
              key={`${o.productId}-dot-${i}`}
              className={`pc__dot${i === active ? ' pc__dot--active' : ''}${i === selected ? ' pc__dot--on' : ''}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
