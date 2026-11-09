// Persistent shopping session ("Nákup"): what the user picked survives navigation, reload and the PWA being
// killed in the background. localStorage key `cappymeal-shop-{hid}`; private mode / blocked storage falls back
// to memory (this tab only). Never stores tokens or personal data – only days, item keys, product snapshots.
//
// Shape: { v: 1, savedAt, daysSel: string[] | null, regSel: { id: bool }, extras: item[],
//          step: 'list' | 'matched' | 'checkout', results: { key: entry }, picks: { key: pick },
//          submittedDays?: string[], submittedAt?: number, addedIds?: string[], notice?: 'reverted',
//          navKey?: string, checkout?: { dayTab?: number, picked?: string } }

export const SESSION_VERSION = 1;
export const SESSION_TTL_MS = 48 * 60 * 60 * 1000;
/** After filling the cart, statuses may lag behind (RTDB) – a "pending" day is not trusted as reverted yet. */
export const REVERT_GRACE_MS = 15000;

const memory = new Map();

export const sessionKey = (hid) => `cappymeal-shop-${hid}`;

function local() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const strList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : null);

/** Shape check of a stored value (anything odd is dropped instead of crashing the screen). */
function sanitize(raw) {
  if (!isObj(raw) || raw.v !== SESSION_VERSION) return null;
  const out = {
    v: SESSION_VERSION,
    savedAt: Number(raw.savedAt) || 0,
    daysSel: strList(raw.daysSel),
    regSel: isObj(raw.regSel) ? raw.regSel : {},
    extras: Array.isArray(raw.extras) ? raw.extras.filter((x) => isObj(x) && typeof x.key === 'string') : [],
    step: ['list', 'matched', 'checkout'].includes(raw.step) ? raw.step : 'list',
    results: isObj(raw.results) ? raw.results : {},
    picks: isObj(raw.picks) ? raw.picks : {},
  };
  const sub = strList(raw.submittedDays);
  if (sub && sub.length) {
    out.submittedDays = sub;
    out.submittedAt = Number(raw.submittedAt) || 0;
  }
  const added = strList(raw.addedIds);
  if (added) out.addedIds = added;
  if (raw.notice === 'reverted') out.notice = 'reverted';
  if (typeof raw.navKey === 'string') out.navKey = raw.navKey;
  if (isObj(raw.checkout)) out.checkout = raw.checkout;
  if (out.step === 'checkout' && !out.submittedDays) out.step = 'matched';
  return out;
}

/** Stored session or null (missing, unreadable, other version, older than 48 h – an expired one is removed). */
export function loadSession(hid, now = Date.now(), storage = local()) {
  if (!hid) return null;
  const key = sessionKey(hid);
  let raw = null;
  try {
    const s = storage && storage.getItem(key);
    raw = s ? JSON.parse(s) : null;
  } catch (e) {
    raw = null;
  }
  if (!raw && memory.has(key)) raw = memory.get(key);
  const s = sanitize(raw);
  if (!s) return null;
  if (!s.savedAt || now - s.savedAt > SESSION_TTL_MS || s.savedAt > now + 60000) {
    clearSession(hid, storage);
    return null;
  }
  return s;
}

/** Writes the session (stamped with v + savedAt). Storage failure → in-memory copy. */
export function saveSession(hid, session, now = Date.now(), storage = local()) {
  if (!hid || !session) return null;
  const key = sessionKey(hid);
  const value = { ...session, v: SESSION_VERSION, savedAt: now };
  memory.set(key, value);
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // private mode / quota: the memory copy stays
  }
  return value;
}

/** Merges `patch` into the stored session (starting a new one when none). */
export function updateSession(hid, patch, now = Date.now(), storage = local()) {
  const cur = loadSession(hid, now, storage) || {
    daysSel: null, regSel: {}, extras: [], step: 'list', results: {}, picks: {},
  };
  const next = { ...cur, ...patch };
  Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
  return saveSession(hid, next, now, storage);
}

export function clearSession(hid, storage = local()) {
  if (!hid) return;
  const key = sessionKey(hid);
  memory.delete(key);
  try {
    storage.removeItem(key);
  } catch (e) {
    // ignore
  }
}

/** Keeps only results / picks of items that still exist (keys of the current shopping list). */
export function pruneItems(results, picks, keys) {
  const keep = new Set(keys);
  const r = {};
  const p = {};
  Object.keys(results || {}).forEach((k) => {
    if (keep.has(k)) r[k] = results[k];
  });
  Object.keys(picks || {}).forEach((k) => {
    if (keep.has(k)) p[k] = picks[k];
  });
  return { results: r, picks: p };
}

/** The products a session would put into the cart: [{ productId, quantity }] (skipped / unavailable left out). */
export function sessionProducts(session) {
  if (!session) return [];
  const out = [];
  Object.entries(session.picks || {}).forEach(([key, pk]) => {
    const entry = session.results && session.results[key];
    const opt = pk && !pk.skip && pk.idx >= 0 && entry && Array.isArray(entry.options) ? entry.options[pk.idx] : null;
    if (!opt || opt.available === false || opt.productId == null) return;
    const q = Math.max(1, Math.min(50, Math.round(Number(pk.qty) || 1)));
    out.push({ productId: String(opt.productId), quantity: q });
  });
  return out;
}

const uniqSorted = (list) => [...new Set(list)].sort();

/**
 * Which day chips are selected on the Nákup screen (pure).
 * The selection is EXPLICIT and stable: once the session has one, status changes never change it.
 * - submitted session (cart filled from this device):
 *     any of its days 'ordered' (or none left in the horizon) → action 'clear' (start fresh);
 *     some still 'in_cart' (or filled < REVERT_GRACE_MS ago) → banner { state: 'in_cart', days };
 *     back to pending (cart emptied on Rohlík / here) → banner 'reverted', action 'reverted'
 *       (the screen keeps the picks so they can go to the cart again);
 *     no meals left on those days → action 'clear'.
 * Call it only once the household data is loaded (statuses of a not-yet-loaded plan are all 'empty').
 * - otherwise session.daysSel (pruned to the horizon); brand-new session → pending days (never in_cart ones).
 * chipDays: the selection + every pending / in_cart / ordered day of the horizon (with their status label).
 * → { days, chipDays, banner: null | { state, days }, action: null | 'clear' | 'reverted' }
 */
export function resolveShopDays({ session, horizon, statusOf, now = Date.now() }) {
  const inH = (list) => uniqSorted((list || []).filter((k) => horizon.includes(k)));
  const pending = horizon.filter((k) => statusOf(k) === 'pending');
  let days;
  let banner = null;
  let action = null;
  const sub = session && session.submittedDays ? inH(session.submittedDays) : null;
  if (sub) {
    const st = sub.map(statusOf);
    const fresh = now - (Number(session.submittedAt) || 0) < REVERT_GRACE_MS;
    if (!sub.length || st.includes('ordered')) {
      action = 'clear';
      days = pending;
    } else if (st.includes('in_cart') || fresh) {
      banner = { state: 'in_cart', days: sub };
      days = sub;
    } else if (st.includes('pending')) {
      banner = { state: 'reverted', days: sub };
      action = 'reverted';
      days = sub;
    } else {
      // the days have no meals any more – nothing to continue
      action = 'clear';
      days = pending;
    }
  } else if (session && Array.isArray(session.daysSel)) {
    days = inH(session.daysSel);
  } else {
    days = pending;
  }
  const chips = new Set(days);
  horizon.forEach((k) => {
    const s = statusOf(k);
    if (s === 'pending' || s === 'in_cart' || s === 'ordered') chips.add(k);
  });
  return { days: uniqSorted(days), chipDays: [...chips].sort(), banner, action };
}
