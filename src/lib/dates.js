// Date helpers. All date keys are LOCAL dates in the form YYYY-MM-DD.
// Never use toISOString() for keys – it converts to UTC and shifts days around midnight.

export const DAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
export const DAY_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
// Accusative ("na pondělí", "na středu")
export const DAY_ACC = ['neděli', 'pondělí', 'úterý', 'středu', 'čtvrtek', 'pátek', 'sobotu'];
export const MONTH_GEN = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

export const HORIZON_DAYS = 14; // today + 13 days

const pad = (n) => String(n).padStart(2, '0');

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function diffDays(fromKey, toKey) {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  return Math.round((b - a) / 86400000);
}

export function dayInfo(key, todayKey) {
  const d = parseKey(key);
  const w = d.getDay();
  return {
    key,
    index: todayKey ? diffDays(todayKey, key) : null,
    short: DAY_SHORT[w],
    dl: DAY_LONG[w],
    acc: DAY_ACC[w],
    num: d.getDate(),
    m: d.getMonth() + 1,
    long: `${cap(DAY_LONG[w])} ${d.getDate()}. ${MONTH_GEN[d.getMonth()]}`,
    shortLabel: `${DAY_SHORT[w]} ${d.getDate()}. ${d.getMonth() + 1}.`,
  };
}

export function horizonKeys(todayKey, length = HORIZON_DAYS) {
  return Array.from({ length }, (_, i) => addDays(todayKey, i));
}

/** "Dnes 9:00", "Včera 18:42", "Pá 12:10" (this week), "3. 11." otherwise */
export function relativeTime(ts, now = Date.now()) {
  const d = new Date(ts);
  const time = `${d.getHours()}:${pad(d.getMinutes())}`;
  const todayKey = dateKey(new Date(now));
  const k = dateKey(d);
  const diff = diffDays(k, todayKey);
  if (diff === 0) return now - ts < 60000 ? 'Teď' : `Dnes ${time}`;
  if (diff === 1) return `Včera ${time}`;
  if (diff > 1 && diff < 7) return `${DAY_SHORT[d.getDay()]} ${time}`;
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

/** Czech plural: plural(2, 'den', 'dny', 'dní') */
export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
