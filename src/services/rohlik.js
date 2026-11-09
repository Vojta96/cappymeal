// Client wrappers for the Rohlík Cloud Functions (per-household Rohlík account via OAuth).
import { callFunction } from './functions';

const LONG = 300000;
const MATCH_CHUNK = 60; // server cap per call
const FILL_CHUNK = 80;

export const NOT_CONNECTED = 'ROHLIK_NOT_CONNECTED';
/** Errors after which the household has to (re)connect its Rohlík account in settings. */
export const needsReconnect = (e) =>
  !!e && ['ROHLIK_NOT_CONNECTED', 'ROHLIK_AUTH_FAILED', 'ROHLIK_AUTH_EXPIRED'].includes(e.reason);

const chunks = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** Trims an item to the server's input caps (see functions/src/validate.js). */
export function matchItem({ key, name, amounts, need, query, preferredProductId, preferredName }) {
  const out = {
    key: String(key).slice(0, 120),
    name: String(name).trim().slice(0, 100),
    amounts: (amounts || []).slice(0, 10).map((a) => String(a).slice(0, 40)),
  };
  if (need && ['g', 'ml', 'ks'].includes(need.unit) && need.qty > 0 && need.qty <= 100000) {
    out.need = { qty: need.qty, unit: need.unit };
  }
  const q = typeof query === 'string' ? query.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  if (q) out.query = q;
  if (preferredProductId != null && /^[A-Za-z0-9_-]{1,40}$/.test(String(preferredProductId))) {
    out.preferredProductId = String(preferredProductId);
    if (preferredName) out.preferredName = String(preferredName).trim().slice(0, 200);
  }
  return out;
}

export const getRohlikStatus = () => callFunction('rohlikStatus', undefined, LONG);
/** Step 1 of the OAuth connection (owner): { authUrl, redirectUri }. */
export const startRohlikOAuth = () => callFunction('rohlikOAuthStart');
/** Step 2: the URL the owner copied from the address bar after the Rohlík login. */
export const finishRohlikOAuth = (redirectUrl) => callFunction('rohlikOAuthFinish', { redirectUrl }, LONG);
export const disconnectRohlik = () => callFunction('rohlikDisconnect');

/**
 * items: [{ key, name, amounts, need?, query?, preferredProductId?, preferredName? }]
 * prefs: household shopping preferences (settings/shop) – { preferLight, preferBio, sort }.
 * → { results: [{ key, query, candidates[], preferred: null | 'found' | 'unavailable' | 'missing' }] }
 */
export async function matchProducts(items, prefs) {
  const results = [];
  for (const part of chunks(items.map(matchItem), MATCH_CHUNK)) {
    const data = { items: part };
    if (prefs) data.prefs = { preferLight: !!prefs.preferLight, preferBio: !!prefs.preferBio, sort: prefs.sort === 'unitPrice' ? 'unitPrice' : 'best' };
    // eslint-disable-next-line no-await-in-loop
    const res = await callFunction('rohlikMatch', data, LONG);
    results.push(...((res && res.results) || []));
  }
  return { results };
}

export async function fillCart(days, products) {
  const out = { ok: true, added: 0, failed: [] };
  for (const part of chunks(products, FILL_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    const res = await callFunction('rohlikFillCart', { days, products: part }, LONG);
    out.added += (res && res.added) || 0;
    out.failed.push(...((res && res.failed) || []));
    out.ok = out.ok && !!(res && res.ok);
  }
  return out;
}
