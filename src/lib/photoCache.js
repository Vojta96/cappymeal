// Persistent cache of recipe thumbnails in IndexedDB (db 'cappymeal', store 'thumbs').
// Key: `${hid}:${rid}:${updatedAt}`. Everything is best effort: when IndexedDB is missing or blocked
// (private mode, old browsers) every function silently resolves to "nothing cached".
const DB_NAME = 'cappymeal';
const STORE = 'thumbs';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  const p = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
      req.onblocked = () => reject(new Error('indexedDB blocked'));
    } catch (e) {
      reject(e);
    }
  });
  dbPromise = p;
  p.catch(() => {
    if (dbPromise === p) dbPromise = null;
  });
  return p;
}

function run(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const thumbCacheKey = (hid, rid, updatedAt) => `${hid}:${rid}:${updatedAt || 0}`;

/** Cached thumbnail data URL or null (never rejects). */
export function getCachedThumb(key) {
  return run('readonly', (s) => s.get(key)).then(
    (v) => (typeof v === 'string' ? v : null),
    () => null
  );
}

/** Stores a thumbnail (never rejects). */
export function putCachedThumb(key, value) {
  return run('readwrite', (s) => s.put(value, key)).then(
    () => true,
    () => false
  );
}

/** Removes cached thumbs of household `hid` whose key is not in `keepKeys` (never rejects). */
export function pruneThumbs(hid, keepKeys) {
  return run('readwrite', (s) => {
    const req = s.getAllKeys();
    req.onsuccess = () => {
      (req.result || []).forEach((k) => {
        if (typeof k === 'string' && k.startsWith(`${hid}:`) && !keepKeys.has(k)) s.delete(k);
      });
    };
    return req;
  }).then(
    () => true,
    () => false
  );
}

/** Test helper. */
export function resetPhotoCacheForTests() {
  dbPromise = null;
}
