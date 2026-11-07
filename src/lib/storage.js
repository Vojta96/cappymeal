// Safe wrappers around Web Storage (private mode / blocked storage can throw).
export function readStorage(kind, key, fallback) {
  try {
    const raw = window[kind].getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function writeStorage(kind, key, value) {
  try {
    window[kind].setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}
