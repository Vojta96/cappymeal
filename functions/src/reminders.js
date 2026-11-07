'use strict';
// Pure date / reminder logic (Europe/Prague local dates).

const TZ = 'Europe/Prague';
const DAY_NAMES = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
const DAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function pragueDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function pragueHour(date = new Date()) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false })
    .format(date);
  return parseInt(h, 10) % 24;
}

// 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD' (pure calendar arithmetic, no TZ issues)
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function weekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatDay(ymd) {
  const [, m, d] = ymd.split('-').map(Number);
  return `${DAY_NAMES[weekday(ymd)]} ${d}. ${m}.`;
}

function hasPlannedMeals(dayPlan) {
  return !!dayPlan && Object.values(dayPlan).some(Boolean);
}

/**
 * Dates (ascending) that need a reminder today.
 * Date D (planned, not ordered) is reminded on D-3 (remind3d) and D-2, D-1 (remindDaily).
 * => today T notifies D = T+3 (if remind3d), T+2 / T+1 (if remindDaily).
 */
function computeReminderDates(today, plan, orders, settings = {}) {
  const s = { remind3d: true, remindDaily: true, ...settings };
  const offsets = [];
  if (s.remind3d) offsets.push(3);
  if (s.remindDaily) offsets.push(1, 2);
  const out = [];
  for (const off of offsets) {
    const d = addDays(today, off);
    if (!hasPlannedMeals((plan || {})[d])) continue;
    if (orders && orders[d] && orders[d].status === 'ordered') continue;
    out.push(d);
  }
  return out.sort();
}

function buildMessage(dates) {
  if (!dates.length) return null;
  if (dates.length === 1) {
    return { title: 'CappyMeal – nákup', body: `${formatDay(dates[0])} ještě není objednaný` };
  }
  const names = dates.map((d) => DAY_SHORT[weekday(d)]);
  const range = names.length > 2 ? `${names[0]}–${names[names.length - 1]}` : names.join(', ');
  return { title: 'CappyMeal – nákup', body: `${range} zatím bez objednávky` };
}

module.exports = {
  TZ, pragueDateString, pragueHour, addDays, weekday, formatDay,
  computeReminderDates, buildMessage,
};
