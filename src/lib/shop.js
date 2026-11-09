// Rohlík product selection helpers (pure, unit tested): remembered choices (productPrefs),
// candidate ordering / preselection and household shopping preferences (settings/shop).

export const DEFAULT_SHOP = { preferLight: false, preferBio: false, xtra: false, sort: 'best' };

/** settings.shop with defaults. */
export function shopPrefs(settings) {
  const s = (settings && settings.shop) || {};
  return {
    preferLight: s.preferLight === true,
    preferBio: s.preferBio === true,
    xtra: s.xtra === true,
    sort: s.sort === 'unitPrice' ? 'unitPrice' : 'best',
  };
}

const kcText = (n) => `${String(Math.round(n * 100) / 100).replace('.', ',')} Kč`;

/**
 * Effective price of a variant. xtra = household has Rohlík Xtra.
 * → { price (number|null), text, refPrice, refText (struck-through reference price or null),
 *     percent (reduction vs. reference or null), xtraApplied, xtraOffer: null | { price, text } }
 * Xtra price is used only when the household has Xtra; the reference is then the regular price,
 * otherwise the pre-sale price (originalPrice).
 */
export function priceInfo(p, xtra) {
  const base = p && Number(p.price) > 0 ? Number(p.price) : null;
  const none = { price: null, text: (p && p.priceText) || '', refPrice: null, refText: '', percent: null, xtraApplied: false, xtraOffer: null };
  if (base == null) return none;
  const xp = Number(p.xtraPrice) > 0 && Number(p.xtraPrice) < base ? Number(p.xtraPrice) : null;
  const xtext = xp ? p.xtraPriceText || kcText(xp) : '';
  const text = p.priceText || kcText(base);
  if (xtra && xp) {
    return {
      price: xp,
      text: xtext,
      refPrice: base,
      refText: text,
      percent: Number(p.xtraDiscountPercent) > 0 ? Math.round(p.xtraDiscountPercent) : Math.round((1 - xp / base) * 100),
      xtraApplied: true,
      xtraOffer: null,
    };
  }
  const orig = Number(p.originalPrice) > base ? Number(p.originalPrice) : null;
  return {
    price: base,
    text,
    refPrice: orig,
    refText: orig ? p.originalPriceText || kcText(orig) : '',
    percent: orig ? (Number(p.discountPercent) > 0 ? Math.round(p.discountPercent) : Math.round((1 - base / orig) * 100)) : null,
    xtraApplied: false,
    xtraOffer: xp ? { price: xp, text: xtext } : null,
  };
}

/** Unit price text for the effective price ("149,75 Kč/kg"). */
export function unitPriceLabel(p, xtra) {
  if (!p) return '';
  return (xtra && Number(p.xtraPrice) > 0 && p.xtraUnitPriceText) || p.unitPriceText || '';
}

/** Sum of the effective prices × qty for chosen = [{ product, qty }]. */
export function totalOf(chosen, xtra) {
  return chosen.reduce((a, x) => a + (priceInfo(x.product, xtra).price || 0) * x.qty, 0);
}

/** Sum of (reference − effective) × qty over the chosen variants (0 when nothing is discounted). */
export function savingsOf(chosen, xtra) {
  return chosen.reduce((a, x) => {
    const i = priceInfo(x.product, xtra);
    return a + (i.refPrice && i.price != null ? (i.refPrice - i.price) * x.qty : 0);
  }, 0);
}

const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Candidates for one item in display order + preselected index + note.
 * - the remembered product (pref) goes first with `preferred: true` ("Vaše volba");
 * - not among the results → its stored snapshot is shown first (`snapshot: true`, "z minulého nákupu");
 * - remembered but unavailable → preselect the best available other variant, note 'unavailable'.
 * @returns { options, selected: number (-1 = nothing to pick), note: null | 'unavailable' }
 */
export function arrangeCandidates(candidates, pref, status) {
  let options = (candidates || []).filter((c) => c && c.productId != null).map((c) => ({ ...c }));
  let note = null;
  if (pref && pref.productId) {
    const id = String(pref.productId);
    const idx = options.findIndex((c) => String(c.productId) === id);
    if (idx >= 0) {
      const [hit] = options.splice(idx, 1);
      options = [{ ...hit, preferred: true }, ...options];
    } else if (status !== 'unavailable') {
      options = [
        {
          productId: id,
          name: pref.name || 'Váš produkt',
          imageUrl: pref.imageUrl || null,
          priceText: pref.priceText || '',
          price: null,
          packText: pref.packText || '',
          available: true,
          badges: [],
          preferred: true,
          snapshot: true,
        },
        ...options,
      ];
    }
  }
  let selected = options.findIndex((c) => c.available !== false);
  if (options[0] && options[0].preferred && options[0].available === false) note = 'unavailable';
  if (status === 'unavailable' && !(options[0] && options[0].preferred)) note = 'unavailable';
  if (selected < 0) selected = -1;
  return { options: options.slice(0, 6), selected, note };
}

/**
 * Record for households/{hid}/productPrefs/{key} (mirrors database.rules.json limits).
 * prev = the existing record (count is incremented when the same product is chosen again).
 */
export function prefRecord(candidate, prev, uid, now, xtra) {
  const productId = String(candidate.productId);
  const rec = {
    productId: productId.slice(0, 40),
    name: clip(candidate.name, 200) || 'Produkt',
    count: prev && String(prev.productId) === productId && prev.count > 0 ? Math.min(1000000, Math.floor(prev.count) + 1) : 1,
    lastAt: now,
    by: uid,
  };
  const img = clip(candidate.imageUrl, 500);
  if (img && img.startsWith('https://')) rec.imageUrl = img;
  const price = clip(priceInfo(candidate, xtra).text || candidate.priceText, 200);
  if (price) rec.priceText = price;
  const pack = clip(candidate.packText || candidate.unit, 200);
  if (pack) rec.packText = pack;
  return rec;
}

const RTDB_BAD = /[.#$/[\]]/;

/** Multi-path update object { [key]: record } for the chosen products (skips unsafe / too long keys). */
export function prefUpdates(chosen, prefs, uid, now, xtra) {
  const out = {};
  chosen.forEach(({ key, product }) => {
    if (!key || key.length > 120 || RTDB_BAD.test(key) || !product || product.productId == null) return;
    out[key] = prefRecord(product, prefs && prefs[key], uid, now, xtra);
  });
  return out;
}
