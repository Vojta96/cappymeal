import { deliveryOnDay, deliveryTimeText, deliveryWhen, hasPendingDelivery, upcomingDeliveries } from './deliveries';

const local = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const now = local(2026, 11, 9, 12);
const entry = (start, extra = {}) => ({ start, end: start + 3600000, text: 'x', days: [], state: 'PLANNED', ...extra });

test('upcomingDeliveries: within 48 h, not ended / delivered / cancelled, earliest first', () => {
  const list = upcomingDeliveries(
    {
      a: entry(local(2026, 11, 10, 17)),
      b: entry(local(2026, 11, 9, 18)),
      far: entry(local(2026, 11, 12, 17)),
      over: entry(local(2026, 11, 9, 9)),
      done: entry(local(2026, 11, 9, 19), { state: 'DELIVERED' }),
      gone: entry(local(2026, 11, 9, 19), { state: 'CANCELLED' }),
      bad: { start: 'x' },
    },
    now
  );
  expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  // a delivery in progress (started, not ended) is still upcoming
  expect(upcomingDeliveries({ c: entry(now - 600000) }, now)).toHaveLength(1);
  expect(upcomingDeliveries(null, now)).toEqual([]);
});

test('deliveryWhen / deliveryTimeText', () => {
  expect(deliveryTimeText(entry(local(2026, 11, 10, 17)))).toBe('17:00–18:00');
  expect(deliveryWhen(entry(local(2026, 11, 9, 17)), now)).toBe('dnes 17:00–18:00');
  expect(deliveryWhen(entry(local(2026, 11, 10, 8, 30)), now)).toBe('zítra 08:30–09:30');
  expect(deliveryWhen(entry(local(2026, 11, 11, 17)), now)).toBe('St 11. 11. 17:00–18:00');
});

test('deliveryOnDay / hasPendingDelivery', () => {
  const d = { a: entry(local(2026, 11, 10, 17)), b: entry(local(2026, 11, 11, 9), { state: 'CANCELLED' }) };
  expect(deliveryOnDay(d, '2026-11-10').id).toBe('a');
  expect(deliveryOnDay(d, '2026-11-11')).toBeNull();
  expect(hasPendingDelivery(d, now)).toBe(true);
  expect(hasPendingDelivery({ a: entry(local(2026, 11, 8, 9)) }, now)).toBe(false);
  expect(hasPendingDelivery({ a: entry(local(2026, 11, 10, 9), { state: 'DELIVERED' }) }, now)).toBe(false);
});
