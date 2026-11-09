const test = require('node:test');
const assert = require('node:assert');
const dl = require('../src/deliveries');
const co = require('../src/checkout');

// 2026-11-10 is a Tuesday (CET, UTC+1); 2026-03-29 / 2026-10-25 are the DST switches in Prague.
const at = (iso) => Date.parse(iso);
const ORDER_TIME = at('2026-11-09T18:20:00+01:00');

test('pragueToMs is DST-safe', () => {
  assert.strictEqual(dl.pragueToMs('2026-11-10', 17, 0), at('2026-11-10T16:00:00Z'));
  assert.strictEqual(dl.pragueToMs('2026-07-10', 17, 0), at('2026-07-10T15:00:00Z'));
  // spring forward: 02:30 does not exist → moves forward to 03:30 CEST
  assert.strictEqual(dl.pragueToMs('2026-03-29', 2, 30), at('2026-03-29T01:30:00Z'));
  assert.strictEqual(dl.pragueToMs('2026-03-29', 8, 0), at('2026-03-29T06:00:00Z'));
  assert.strictEqual(dl.pragueToMs('2026-10-25', 8, 0), at('2026-10-25T07:00:00Z'));
  assert.strictEqual(dl.pragueDate(at('2026-11-10T23:30:00Z')), '2026-11-11');
});

test('parseDeliveryWindow: date + HH:MM range in Czech formats', () => {
  const want = { start: at('2026-11-10T16:00:00Z'), end: at('2026-11-10T17:00:00Z') };
  for (const timeRange of [
    'Út 10. 11. 17:00–18:00',
    '10. 11. 2026 17:00 - 18:00',
    '10.11.2026 17:00-18:00',
    '2026-11-10 17:00-18:00',
    'zítra 17:00 – 18:00',
    'úterý 10.11. 17:00–18:00',
  ]) {
    assert.deepStrictEqual(dl.parseDeliveryWindow({ type: 'ON_TIME', timeRange }, {}, ORDER_TIME), want, timeRange);
  }
});

test('parseDeliveryWindow: ISO pairs, start/end fields, date fields', () => {
  const want = { start: at('2026-11-10T16:00:00Z'), end: at('2026-11-10T17:00:00Z') };
  assert.deepStrictEqual(dl.parseDeliveryWindow({
    timeRange: '2026-11-10T17:00:00+01:00 - 2026-11-10T18:00:00+01:00',
  }, {}, ORDER_TIME), want);
  assert.deepStrictEqual(dl.parseDeliveryWindow({
    timeRange: '2026-11-10T16:00:00Z/2026-11-10T17:00:00Z',
  }, {}, ORDER_TIME), want);
  // ISO without offset = Prague wall clock
  assert.deepStrictEqual(dl.parseDeliveryWindow({
    since: '2026-11-10T17:00:00', till: '2026-11-10T18:00:00',
  }, {}, ORDER_TIME), want);
  assert.deepStrictEqual(dl.parseDeliveryWindow({ start: want.start, end: want.end }, {}, ORDER_TIME), want);
  assert.deepStrictEqual(dl.parseDeliveryWindow({ timeRange: '17:00-18:00', date: '2026-11-10' }, {}, ORDER_TIME), want);
  assert.deepStrictEqual(dl.parseDeliveryWindow({ timeRange: '17:00-18:00' }, { deliveryDate: '10. 11. 2026' }, ORDER_TIME), want);
});

test('parseDeliveryWindow: year inference, midnight, garbage', () => {
  // ordered on 30. 12., delivery "2. 1." → next year
  const r = dl.parseDeliveryWindow({ timeRange: 'Pá 2. 1. 8:00–9:00' }, {}, at('2026-12-30T10:00:00+01:00'));
  assert.strictEqual(r.start, at('2027-01-02T07:00:00Z'));
  const late = dl.parseDeliveryWindow({ timeRange: '10. 11. 2026 23:00–00:30' }, {}, ORDER_TIME);
  assert.strictEqual(late.end - late.start, 90 * 60000);
  // no date anywhere → null (never guess the day)
  assert.strictEqual(dl.parseDeliveryWindow({ type: 'ON_TIME', timeRange: '17:00-18:00' }, {}, ORDER_TIME), null);
  assert.strictEqual(dl.parseDeliveryWindow(null, {}, ORDER_TIME), null);
  assert.strictEqual(dl.parseDeliveryWindow({ timeRange: 'brzy' }, {}, ORDER_TIME), null);
  assert.strictEqual(dl.parseDeliveryWindow({ timeRange: '10. 11. 2026 08:00–23:00' }, {}, ORDER_TIME), null);
  assert.strictEqual(dl.maskShape('Út 10. 11. 17:00'), 'aa 99. 99. 99:99');
  assert.strictEqual(dl.maskShape({ type: 'X', timeRange: 'y' }), '{type,timeRange}');
});

test('parseOrders carries the window and keeps cancelled only on request', () => {
  const payload = {
    orders: [
      { id: 1001, orderTime: '2026-11-09T18:20:00+01:00', state: 'PLANNED', deliverySlot: { type: 'ON_TIME', timeRange: 'Út 10. 11. 17:00–18:00' } },
      { id: 1000, orderTime: '2026-11-08T10:00:00+01:00', state: 'CANCELLED', deliverySlot: { timeRange: '17:00-18:00' } },
    ],
  };
  const list = co.parseOrders(payload);
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual(list[0].delivery, { start: at('2026-11-10T16:00:00Z'), end: at('2026-11-10T17:00:00Z') });
  const all = co.parseOrders(payload, { keepCancelled: true });
  assert.strictEqual(all.length, 2);
  assert.strictEqual(all[1].cancelled, true);
  assert.strictEqual(all[1].delivery, null);
  // decideSync never treats a cancelled order as placed
  const r = co.decideSync({ inCart: [{ day: '2026-11-10', at: at('2026-11-08T09:00:00+01:00') }], orders: [all[1]], cart: null, now: ORDER_TIME });
  assert.strictEqual(r.action, 'none');
});

test('texts', () => {
  const s = at('2026-11-10T16:00:00Z');
  assert.strictEqual(dl.windowText(s, s + 3600000), 'Út 10. 11. 17:00–18:00');
  assert.strictEqual(dl.daysPhrase(['2026-11-11', '2026-11-10']), 'Út a St');
  assert.strictEqual(dl.daysPhrase(['2026-11-09', '2026-11-10', '2026-11-11']), 'Po, Út a St');
  assert.strictEqual(dl.daysPhrase([]), '');
});

test('mergeDeliveries: create, refresh, moved window resets notified, prune', () => {
  const now = at('2026-11-09T18:30:00+01:00');
  const start = at('2026-11-10T16:00:00Z');
  const end = start + 3600000;
  const a = dl.mergeDeliveries({}, [{ id: 1001, start, end, state: 'PLANNED', days: ['2026-11-11', '2026-11-10'] }], now);
  assert.deepStrictEqual(a.created, [{ id: '1001', text: 'Út 10. 11. 17:00–18:00' }]);
  assert.deepStrictEqual(a.updates['1001/days'], ['2026-11-10', '2026-11-11']);
  assert.strictEqual(a.updates['1001/notified'], undefined);
  assert.strictEqual(a.nextStart, start);

  const stored = { 1001: { start, end, text: 'x', days: ['2026-11-10'], state: 'PLANNED', notified: { morning: true }, updatedAt: 1 } };
  // same window, same state → nothing
  assert.deepStrictEqual(dl.mergeDeliveries(stored, [{ id: '1001', start, end, state: 'PLANNED' }], now).updates, {});
  // state-only refresh (window unknown) keeps the window
  const b = dl.mergeDeliveries(stored, [{ id: '1001', start: null, end: null, state: 'DELIVERED' }], now);
  assert.strictEqual(b.updates['1001/state'], 'DELIVERED');
  assert.strictEqual(b.updates['1001/start'], undefined);
  assert.strictEqual(b.nextStart, null);
  // moved window → notified reset
  const c = dl.mergeDeliveries(stored, [{ id: '1001', start: start + 3600000, end: end + 3600000, state: 'PLANNED' }], now);
  assert.strictEqual(c.updates['1001/notified'], null);
  assert.strictEqual(c.updates['1001/text'], 'Út 10. 11. 18:00–19:00');
  // never create an entry for a window already over
  assert.deepStrictEqual(dl.mergeDeliveries({}, [{ id: 5, start: now - 7200000, end: now - 3600000 }], now).created, []);
  // prune: ended > 2 days ago, and at most 10
  const many = {};
  for (let i = 0; i < 12; i++) many[100 + i] = { start: now + i * 3600000, end: now + i * 3600000 + 1, state: 'PLANNED' };
  many[99] = { start: now - 4 * 86400000, end: now - 3 * 86400000, state: 'DELIVERED' };
  const d = dl.mergeDeliveries(many, [{ id: 200, start: now + 50 * 3600000, end: now + 51 * 3600000 }], now);
  assert.strictEqual(d.updates['99'], null);
  assert.strictEqual(d.updates['100'], null);
  assert.strictEqual(d.updates['101'], null);
  assert.strictEqual(d.updates['102'], null);
  assert.strictEqual(d.updates['103'], undefined);
  assert.strictEqual(d.updates['200/start'], now + 50 * 3600000);
  assert.strictEqual(d.nextStart, now + 3 * 3600000);
});

const entry = (startIso, extra = {}) => {
  const start = at(startIso);
  return { start, end: start + 3600000, days: ['2026-11-10', '2026-11-11'], state: 'PLANNED', ...extra };
};

test('dueNotifications: morning on the delivery day 7:00–7:30 Prague', () => {
  const e = { 1: entry('2026-11-10T17:00:00+01:00') };
  const r = dl.dueNotifications(e, {}, at('2026-11-10T07:00:30+01:00'));
  assert.strictEqual(r.length, 1);
  assert.deepStrictEqual(r[0].mark, ['morning']);
  assert.strictEqual(r[0].message.body, 'Dnes mezi 17:00–18:00 přiveze Rohlík nákup na Út a St.');
  // 6:45 / 7:30 / the day before → nothing
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-11-10T06:45:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-11-10T07:30:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-11-09T07:00:00+01:00')), []);
  // already notified / toggle off
  assert.deepStrictEqual(dl.dueNotifications({ 1: { ...e[1], notified: { morning: true } } }, {}, at('2026-11-10T07:00:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications(e, { deliveryMorning: false }, at('2026-11-10T07:00:00+01:00')), []);
  // no days → generic text
  const noDays = dl.dueNotifications({ 1: { ...e[1], days: [] } }, {}, at('2026-11-10T07:10:00+01:00'));
  assert.strictEqual(noDays[0].message.body, 'Dnes mezi 17:00–18:00 přiveze Rohlík nákup.');
});

test('dueNotifications: morning uses Prague time in summer (CEST) too', () => {
  const e = { 1: entry('2026-07-10T17:00:00+02:00') };
  assert.strictEqual(dl.dueNotifications(e, {}, at('2026-07-10T05:00:00Z')).length, 1); // 7:00 CEST
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-07-10T06:00:00Z')), []); // 8:00 CEST
});

test('dueNotifications: hour before = [start − 75 min, start − 45 min]', () => {
  const e = { 1: entry('2026-11-10T17:00:00+01:00') };
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-11-10T15:44:00+01:00')), []);
  const r = dl.dueNotifications(e, {}, at('2026-11-10T15:45:00+01:00'));
  assert.deepStrictEqual(r[0].mark, ['hourBefore']);
  assert.strictEqual(r[0].message.body, 'Za hodinu dorazí nákup z Rohlíku (17:00–18:00).');
  assert.strictEqual(dl.dueNotifications(e, {}, at('2026-11-10T16:15:00+01:00')).length, 1);
  assert.deepStrictEqual(dl.dueNotifications(e, {}, at('2026-11-10T16:16:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications(e, { deliveryHourBefore: false }, at('2026-11-10T16:00:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications({ 1: { ...e[1], notified: { hourBefore: true } } }, {}, at('2026-11-10T16:00:00+01:00')), []);
  // delivered / cancelled → nothing
  assert.deepStrictEqual(dl.dueNotifications({ 1: { ...e[1], state: 'DELIVERED' } }, {}, at('2026-11-10T16:00:00+01:00')), []);
  assert.deepStrictEqual(dl.dueNotifications({ 1: { ...e[1], state: 'CANCELLED' } }, {}, at('2026-11-10T16:00:00+01:00')), []);
});

test('dueNotifications: early delivery → one message, both marked', () => {
  const e = { 1: entry('2026-11-10T08:00:00+01:00') };
  const r = dl.dueNotifications(e, {}, at('2026-11-10T07:00:00+01:00'));
  assert.strictEqual(r.length, 1);
  assert.deepStrictEqual(r[0].mark, ['morning', 'hourBefore']);
  assert.match(r[0].message.body, /^Za hodinu/);
  // morning off: still the hour-before message, only that marked
  assert.deepStrictEqual(dl.dueNotifications(e, { deliveryMorning: false }, at('2026-11-10T07:00:00+01:00'))[0].mark, ['hourBefore']);
  // a delivery that already started never notifies
  assert.deepStrictEqual(dl.dueNotifications({ 1: entry('2026-11-10T07:00:00+01:00') }, {}, at('2026-11-10T07:05:00+01:00')), []);
});

test('scheduler index helpers', () => {
  const now = at('2026-11-09T12:00:00+01:00');
  assert.strictEqual(dl.dueForCheck(now + 25 * 3600000, now), true);
  assert.strictEqual(dl.dueForCheck(now + 27 * 3600000, now), false);
  assert.strictEqual(dl.dueForCheck(null, now), false);
  assert.strictEqual(dl.nextStartOf({ a: entry('2026-11-10T17:00:00+01:00'), b: entry('2026-11-11T09:00:00+01:00') }, now),
    at('2026-11-10T17:00:00+01:00'));
  assert.deepStrictEqual(dl.pendingIds({ a: entry('2026-11-10T17:00:00+01:00'), b: entry('2026-11-08T09:00:00+01:00') }, now), ['a']);
});
