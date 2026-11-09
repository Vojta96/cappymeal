const test = require('node:test');
const assert = require('node:assert');
const r = require('../src/reminders');

const plan = { '2026-11-13': { lunch: 'a' }, '2026-11-14': { dinner: 'b' }, '2026-11-15': {} };

test('addDays / formatDay', () => {
  assert.strictEqual(r.addDays('2026-12-30', 3), '2027-01-02');
  assert.strictEqual(r.formatDay('2026-11-13'), 'Pátek 13. 11.');
});
test('3 days before', () => {
  assert.deepStrictEqual(r.computeReminderDates('2026-11-10', plan, {}, {}), ['2026-11-13']);
});
test('daily D-2 and D-1, skips empty day and ordered', () => {
  assert.deepStrictEqual(r.computeReminderDates('2026-11-12', plan, {}, {}), ['2026-11-13', '2026-11-14']);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-12', plan, { '2026-11-14': { status: 'ordered' } }, {}), ['2026-11-13']);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-11', plan, { '2026-11-13': { status: 'in_cart' } }, {}), ['2026-11-13', '2026-11-14']);
});
test('settings flags', () => {
  assert.deepStrictEqual(r.computeReminderDates('2026-11-10', plan, {}, { remind3d: false }), []);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-12', plan, {}, { remindDaily: false }), []);
});
test('delivery the day before cooking shifts the deadline by one day', () => {
  const lead = { delivery: { lead: 'dayBefore' } };
  // 2026-11-13 planned: remind3d now on D-4, daily on D-3..D-1
  assert.deepStrictEqual(r.computeReminderDates('2026-11-09', plan, {}, lead), ['2026-11-13']);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-09', plan, {}, {}), []);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-10', plan, {}, lead), ['2026-11-13', '2026-11-14']);
  assert.deepStrictEqual(r.computeReminderDates('2026-11-10', plan, {}, { ...lead, remindDaily: false }), ['2026-11-14']);
  assert.strictEqual(r.leadShift(lead), 1);
  assert.strictEqual(r.leadShift({ delivery: { lead: 'sameDay' } }), 0);
});
test('messages', () => {
  assert.strictEqual(r.buildMessage(['2026-11-13']).body, 'Pátek 13. 11. ještě není objednaný');
  assert.strictEqual(r.buildMessage(['2026-11-13', '2026-11-14', '2026-11-15']).body, 'Pá–Ne zatím bez objednávky');
  assert.strictEqual(r.buildMessage([]), null);
});
test('prague date/hour (DST)', () => {
  const d = new Date('2026-07-01T22:30:00Z');
  assert.strictEqual(r.pragueDateString(d), '2026-07-02');
  assert.strictEqual(r.pragueHour(d), 0);
  assert.strictEqual(r.pragueHour(new Date('2026-11-07T08:00:00Z')), 9);
});
