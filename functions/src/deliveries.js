'use strict';
// Delivery windows of placed Rohlík orders + the pure scheduling logic of the delivery push notifications.
// All wall-clock maths is Europe/Prague via Intl (DST-safe); nothing here touches the database or logs values.

const { TZ, addDays, weekday } = require('./reminders');

const DAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MAX_ENTRIES = 10;
const KEEP_ENDED_MS = 2 * DAY;
const SCHEDULE_AHEAD_MS = 26 * HOUR;
const MORNING_FROM = 7 * 60; // 07:00 Prague
const MORNING_TO = 7 * 60 + 30; // exclusive; the scheduler runs every 15 min, notified.* prevents repeats
const HOUR_BEFORE_FROM = 75 * MIN;
const HOUR_BEFORE_TO = 45 * MIN;
/** Rohlík order states after which nothing is notified any more (delivered, cancelled, returned …). */
const FINAL_STATE_RE = /DELIVER|FINISH|COMPLET|DONE|CANCEL|STORNO|RETURN|REFUND/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const pad = (n) => String(n).padStart(2, '0');

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** epoch ms → Prague wall clock { y, m, d, h, min } */
function pragueParts(ms) {
  const o = {};
  partsFmt.formatToParts(new Date(ms)).forEach((p) => { o[p.type] = p.value; });
  return { y: Number(o.year), m: Number(o.month), d: Number(o.day), h: Number(o.hour) % 24, min: Number(o.minute) };
}
const pragueDate = (ms) => {
  const p = pragueParts(ms);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
};
const pragueMinutes = (ms) => {
  const p = pragueParts(ms);
  return p.h * 60 + p.min;
};
const hhmmOf = (ms) => {
  const p = pragueParts(ms);
  return `${pad(p.h)}:${pad(p.min)}`;
};

/** Offset of Prague from UTC at the instant ms (in ms, e.g. +1 h in winter). */
function offsetAt(ms) {
  const p = pragueParts(ms);
  const flat = Math.floor(ms / MIN) * MIN;
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - flat;
}

/** Prague wall clock ('YYYY-MM-DD', h, m) → epoch ms (DST-safe; a non-existent spring-forward time moves forward). */
function pragueToMs(ymd, h, m) {
  const [y, mo, d] = ymd.split('-').map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, m);
  let t = asUtc - offsetAt(asUtc);
  const o2 = offsetAt(t);
  if (asUtc - o2 !== t) t = asUtc - o2;
  return t;
}

const validYmd = (y, m, d) => {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
};

// ---------- parsing the delivery window ----------

const ISO_DT_RE = /(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?/g;
const TIME_RANGE_RE = /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|až|to)\s*(\d{1,2})[:.](\d{2})/i;

/** One ISO datetime match → epoch ms (with offset: exact; without: Prague wall clock). */
function isoMatchToMs(m) {
  const ymd = validYmd(Number(m[1]), Number(m[2]), Number(m[3]));
  const h = Number(m[4]);
  const mi = Number(m[5]);
  if (!ymd || h > 23 || mi > 59) return null;
  if (m[7]) {
    const t = Date.parse(`${ymd}T${pad(h)}:${pad(mi)}:${m[6] || '00'}${m[7].length === 5 ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : m[7]}`);
    return Number.isNaN(t) ? null : t;
  }
  return pragueToMs(ymd, h, mi);
}

/** A single datetime value (ISO string or epoch s/ms) → epoch ms | null. Date-only strings → null. */
function dateTimeValue(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 1e9) return v > 1e12 ? v : v * 1000;
  if (!isStr(v)) return null;
  ISO_DT_RE.lastIndex = 0;
  const m = ISO_DT_RE.exec(v);
  return m ? isoMatchToMs(m) : null;
}

/**
 * A calendar date in free text → 'YYYY-MM-DD' | null. Accepts "2026-11-10", "10. 11. 2026", "10.11.2026",
 * "Út 10. 11." / "10.11." (year inferred from refYmd: the nearest such date not more than 2 days before it),
 * "dnes"/"zítra"/"pozítří" / "today"/"tomorrow" (relative to refYmd).
 */
function dateInText(s, refYmd) {
  if (!isStr(s)) return null;
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return validYmd(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (m) return validYmd(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.(?!\d)/);
  if (m && refYmd) {
    const refYear = Number(refYmd.slice(0, 4));
    const cands = [refYear - 1, refYear, refYear + 1]
      .map((y) => validYmd(y, Number(m[2]), Number(m[1]))).filter(Boolean)
      .filter((d) => d >= addDays(refYmd, -2)).sort();
    return cands[0] || null;
  }
  if (refYmd) {
    const low = s.toLowerCase();
    if (/pozítří|pozitri/.test(low)) return addDays(refYmd, 2);
    if (/zítra|zitra|tomorrow/.test(low)) return addDays(refYmd, 1);
    if (/dnes|today/.test(low)) return refYmd;
  }
  return null;
}

const SLOT_TEXT_KEYS = ['timeRange', 'time_range', 'timeWindow', 'time_window', 'window', 'label', 'text', 'interval'];
const SLOT_DATE_KEYS = ['date', 'day', 'deliveryDate', 'delivery_date', 'dayDate'];
const SLOT_START_KEYS = ['since', 'start', 'from', 'startTime', 'start_time', 'timeFrom', 'startDateTime'];
const SLOT_END_KEYS = ['till', 'end', 'to', 'endTime', 'end_time', 'timeTo', 'endDateTime'];
const ORDER_DATE_KEYS = ['deliveryDate', 'delivery_date', 'deliveryTime', 'delivery_time', 'expectedDelivery', 'deliveryDay'];

const firstOf = (o, keys) => {
  if (!isObj(o)) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

function sane(start, end) {
  if (start == null || end == null) return null;
  let e = end;
  if (e <= start) e += DAY; // "23:00–00:30"
  if (e - start > 12 * HOUR) return null;
  return { start, end: e };
}

/**
 * fetch_orders deliverySlot (+ the order itself for extra date fields) → { start, end } epoch ms | null.
 * Verified so far: deliverySlot{ type, timeRange }; the exact timeRange format is not verified, so:
 * 1. explicit start/end datetime fields (since/till, start/end … ISO or epoch);
 * 2. two ISO datetimes inside timeRange ("2026-11-10T17:00:00+01:00 - 2026-11-10T18:00:00+01:00");
 * 3. "HH:MM–HH:MM" + a date from timeRange itself ("Út 10. 11. 17:00–18:00", "2026-11-10 17:00-18:00",
 *    "zítra 17:00 - 18:00"), from slot date fields or order date fields; Prague wall clock.
 * No date anywhere (bare "17:00-18:00") → null: guessing the day could notify on the wrong one.
 * orderTimeMs anchors year-less / relative dates.
 */
function parseDeliveryWindow(slot, order, orderTimeMs) {
  const s = isObj(slot) ? slot : (isStr(slot) ? { timeRange: slot } : null);
  if (!s) return null;
  const refYmd = pragueDate(Number.isFinite(orderTimeMs) ? orderTimeMs : Date.now());

  const st = dateTimeValue(firstOf(s, SLOT_START_KEYS));
  const en = dateTimeValue(firstOf(s, SLOT_END_KEYS));
  if (st != null && en != null) return sane(st, en);

  const text = firstOf(s, SLOT_TEXT_KEYS);
  if (isStr(text)) {
    const isos = [...text.matchAll(ISO_DT_RE)];
    if (isos.length >= 2) return sane(isoMatchToMs(isos[0]), isoMatchToMs(isos[1]));
  }

  const tm = isStr(text) ? text.match(TIME_RANGE_RE) : null;
  if (!tm) return null;
  const [h1, m1, h2, m2] = [tm[1], tm[2], tm[3], tm[4]].map(Number);
  if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59) return null;
  const dateSources = [
    text.replace(TIME_RANGE_RE, ' '),
    ...SLOT_DATE_KEYS.map((k) => s[k]),
    st != null ? null : firstOf(s, SLOT_START_KEYS),
    ...ORDER_DATE_KEYS.map((k) => (isObj(order) ? order[k] : null)),
  ];
  let ymd = null;
  for (const src of dateSources) {
    if (ymd) break;
    if (typeof src === 'number') {
      const ms = dateTimeValue(src);
      if (ms != null) ymd = pragueDate(ms);
    } else ymd = dateInText(src, refYmd);
  }
  if (!ymd) return null;
  const start = pragueToMs(ymd, h1, m1);
  const end = h2 === 24 ? pragueToMs(addDays(ymd, 1), 0, m2) : pragueToMs(ymd, h2, m2);
  return sane(start, end);
}

/** For logs when parsing fails: digits → 9, letters → a, keys only for objects. Never values. */
function maskShape(v) {
  if (isStr(v)) return v.slice(0, 60).replace(/\d/g, '9').replace(/\p{L}/gu, 'a');
  if (isObj(v)) return `{${Object.keys(v).slice(0, 20).join(',')}}`;
  return typeof v;
}

// ---------- texts ----------

const timeText = (start, end) => `${hhmmOf(start)}–${hhmmOf(end)}`;
/** "Út 10. 11. 17:00–18:00" */
function windowText(start, end) {
  const ymd = pragueDate(start);
  const [, m, d] = ymd.split('-').map(Number);
  return `${DAY_SHORT[weekday(ymd)]} ${d}. ${m}. ${timeText(start, end)}`;
}

/** ['2026-11-10', '2026-11-11'] → "Út a St"; 3+ → "Po, Út a St" */
function daysPhrase(days) {
  const names = [...new Set((days || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
    .map((d) => DAY_SHORT[weekday(d)]);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} a ${names[names.length - 1]}`;
}

// ---------- stored entries ----------

const isFinal = (state) => isStr(state) && FINAL_STATE_RE.test(state);
const isActive = (e, now) => isObj(e) && Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > now && !isFinal(e.state);

/** Earliest start of a delivery that has not ended yet (and isn't delivered/cancelled) | null. */
function nextStartOf(entries, now) {
  let best = null;
  Object.values(entries || {}).forEach((e) => {
    if (isActive(e, now) && (best == null || e.start < best)) best = e.start;
  });
  return best;
}

/**
 * existing: households/{hid}/deliveries; incoming: [{ id, start, end, state, days? }] (start/end may be null for a
 * state-only refresh of a known order). → { updates (paths relative to the deliveries node), created: [{ id, text }],
 * nextStart } – fields are written one by one so `notified` set by the scheduler meanwhile survives; a moved
 * window resets `notified`. Keeps at most MAX_ENTRIES (newest starts), drops entries that ended > 2 days ago.
 */
function mergeDeliveries(existing, incoming, now) {
  const cur = {};
  Object.entries(isObj(existing) ? existing : {}).forEach(([id, e]) => { if (isObj(e)) cur[id] = { ...e }; });
  const updates = {};
  const created = [];
  (incoming || []).forEach((inc) => {
    if (!inc || !/^\d{1,15}$/.test(String(inc.id))) return;
    const id = String(inc.id);
    const old = cur[id];
    const hasWindow = Number.isFinite(inc.start) && Number.isFinite(inc.end);
    if (!old) {
      // never create entries for windows that are already over (old orders in fetch_orders)
      if (!hasWindow || inc.end <= now) return;
      const days = [...new Set(inc.days || [])].sort();
      const entry = {
        start: inc.start, end: inc.end, text: windowText(inc.start, inc.end), days,
        state: String(inc.state || '').slice(0, 40), updatedAt: now,
      };
      cur[id] = entry;
      Object.entries(entry).forEach(([k, v]) => { updates[`${id}/${k}`] = v; });
      created.push({ id, text: entry.text });
      return;
    }
    const next = { ...old };
    if (hasWindow && (old.start !== inc.start || old.end !== inc.end)) {
      next.start = inc.start;
      next.end = inc.end;
      next.text = windowText(inc.start, inc.end);
      updates[`${id}/start`] = next.start;
      updates[`${id}/end`] = next.end;
      updates[`${id}/text`] = next.text;
      if (old.start !== inc.start) {
        next.notified = null;
        updates[`${id}/notified`] = null;
      }
    }
    const state = String(inc.state || '').slice(0, 40);
    if (state && state !== old.state) {
      next.state = state;
      updates[`${id}/state`] = state;
    }
    if (inc.days && inc.days.length) {
      const days = [...new Set([...(old.days || []), ...inc.days])].sort();
      if (days.join() !== (old.days || []).join()) {
        next.days = days;
        updates[`${id}/days`] = days;
      }
    }
    if (Object.keys(updates).some((k) => k.startsWith(`${id}/`))) updates[`${id}/updatedAt`] = now;
    cur[id] = next;
  });
  // prune: ended long ago, then keep the newest MAX_ENTRIES
  Object.entries(cur).forEach(([id, e]) => {
    if (!Number.isFinite(e.end) || e.end < now - KEEP_ENDED_MS) {
      delete cur[id];
      Object.keys(updates).forEach((k) => { if (k.startsWith(`${id}/`)) delete updates[k]; });
      updates[id] = null;
    }
  });
  Object.entries(cur).sort((a, b) => b[1].start - a[1].start).slice(MAX_ENTRIES).forEach(([id]) => {
    delete cur[id];
    Object.keys(updates).forEach((k) => { if (k.startsWith(`${id}/`)) delete updates[k]; });
    updates[id] = null;
  });
  return {
    updates,
    created: created.filter((c) => cur[c.id]),
    nextStart: nextStartOf(cur, now),
  };
}

/** Ids of stored deliveries worth refreshing from Rohlík (window not over, not delivered / cancelled). */
const pendingIds = (entries, now) => Object.entries(entries || {}).filter(([, e]) => isActive(e, now)).map(([id]) => id);

// ---------- scheduling ----------

/** settings toggles default to true when missing */
const wants = (settings, key) => !(isObj(settings) && settings[key] === false);

/**
 * Which delivery notifications to send now. → [{ id, mark: ['morning'|'hourBefore'], message: { title, body } }]
 * - morning: 07:00–07:30 Prague on the delivery day (start that day and still ahead), toggle deliveryMorning;
 * - hourBefore: now ∈ [start − 75 min, start − 45 min], toggle deliveryHourBefore;
 * both due in one pass (an early delivery) → only the hour-before message, both marked.
 * Already notified kinds are never returned again.
 */
function dueNotifications(entries, settings, now) {
  const out = [];
  Object.entries(entries || {}).forEach(([id, e]) => {
    if (!isActive(e, now) || e.start <= now) return;
    const notified = isObj(e.notified) ? e.notified : {};
    const nowMin = pragueMinutes(now);
    const morning = wants(settings, 'deliveryMorning') && !notified.morning
      && pragueDate(now) === pragueDate(e.start) && nowMin >= MORNING_FROM && nowMin < MORNING_TO;
    const hourBefore = wants(settings, 'deliveryHourBefore') && !notified.hourBefore
      && now >= e.start - HOUR_BEFORE_FROM && now <= e.start - HOUR_BEFORE_TO;
    if (!morning && !hourBefore) return;
    const range = timeText(e.start, e.end);
    if (hourBefore) {
      out.push({
        id,
        mark: morning ? ['morning', 'hourBefore'] : ['hourBefore'],
        message: { title: 'CappyMeal – doručení', body: `Za hodinu dorazí nákup z Rohlíku (${range}).` },
      });
    } else {
      const days = daysPhrase(e.days);
      out.push({
        id,
        mark: ['morning'],
        message: {
          title: 'CappyMeal – doručení',
          body: days ? `Dnes mezi ${range} přiveze Rohlík nákup na ${days}.` : `Dnes mezi ${range} přiveze Rohlík nákup.`,
        },
      });
    }
  });
  return out;
}

/** deliveryIndex value worth a closer look this run (next start within 26 h, or already running). */
const dueForCheck = (nextStart, now) => Number.isFinite(nextStart) && nextStart <= now + SCHEDULE_AHEAD_MS;

module.exports = {
  MAX_ENTRIES, KEEP_ENDED_MS, SCHEDULE_AHEAD_MS,
  pragueParts, pragueDate, pragueToMs, dateInText, parseDeliveryWindow, maskShape,
  timeText, windowText, daysPhrase, isFinal, isActive, nextStartOf, mergeDeliveries, pendingIds,
  dueNotifications, dueForCheck,
};
