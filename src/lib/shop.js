// Rohlík product selection helpers (pure, unit tested): remembered choices (productPrefs),
// candidate ordering / preselection and household shopping preferences (settings/shop).

export const DEFAULT_SHOP = { preferLight: false, preferBio: false, sort: 'best' };

/** settings.shop with defaults. */
export function shopPrefs(settings) {
  const s = (settings && settings.shop) || {};
  return {
    preferLight: s.preferLight === true,
    preferBio: s.preferBio === true,
    sort: s.sort === 'unitPrice' ? 'unitPrice' : 'best',
  };
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
export function prefRecord(candidate, prev, uid, now) {
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
  const price = clip(candidate.priceText, 200);
  if (price) rec.priceText = price;
  const pack = clip(candidate.packText || candidate.unit, 200);
  if (pack) rec.packText = pack;
  return rec;
}

const RTDB_BAD = /[.#$/[\]]/;

/** Multi-path update object { [key]: record } for the chosen products (skips unsafe / too long keys). */
export function prefUpdates(chosen, prefs, uid, now) {
  const out = {};
  chosen.forEach(({ key, product }) => {
    if (!key || key.length > 120 || RTDB_BAD.test(key) || !product || product.productId == null) return;
    out[key] = prefRecord(product, prefs && prefs[key], uid, now);
  });
  return out;
}
