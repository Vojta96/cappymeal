import { buildAlert } from './meals';
import { horizonKeys } from './dates';
import { dayTabLabel, defaultDayTab, deliveryPrefs, inWindow, leadShift, recommendSlot } from './checkout';

const slots = [
  { id: '1', label: '08:00–09:00', startMin: 480, available: true },
  { id: null, label: '12:00–13:00', startMin: 720, available: false },
  { id: '3', label: '13:00–14:00', startMin: 780, available: true },
  { id: '4', label: '19:00–20:00', startMin: 1140, available: true },
];

test('preferred window → recommended slot', () => {
  expect(recommendSlot(slots, 'morning')).toBe(0);
  expect(recommendSlot(slots, 'afternoon')).toBe(2);
  expect(recommendSlot(slots, 'evening')).toBe(3);
  expect(recommendSlot(slots, 'any')).toBe(0);
  expect(recommendSlot(slots.slice(0, 2), 'evening')).toBe(-1);
  expect(inWindow({ startMin: 17 * 60 }, 'evening')).toBe(true);
  expect(inWindow({ startMin: 17 * 60 }, 'afternoon')).toBe(false);
});

test('day tab from the earliest shopping day and lead', () => {
  const today = '2026-11-09';
  expect(defaultDayTab(today, ['2026-11-11', '2026-11-12'], 'sameDay')).toBe(2);
  expect(defaultDayTab(today, ['2026-11-12', '2026-11-11'], 'dayBefore')).toBe(1);
  expect(defaultDayTab(today, ['2026-11-09'], 'dayBefore')).toBe(0);
  expect(defaultDayTab(today, ['2026-11-20'], 'sameDay')).toBe(3);
  expect(defaultDayTab(today, [], 'sameDay')).toBe(0);
  expect(dayTabLabel(0, today)).toBe('Dnes');
  expect(dayTabLabel(1, today)).toBe('Zítra');
  expect(dayTabLabel(2, today)).toBe('St 11. 11.');
});

test('delivery prefs defaults and lead shift', () => {
  expect(deliveryPrefs({})).toMatchObject({ window: 'any', lead: 'sameDay', addressId: null, packaging: '' });
  expect(deliveryPrefs({ delivery: { window: 'night', lead: 'dayBefore', addressId: 5 } })).toMatchObject({ window: 'any', lead: 'dayBefore', addressId: 5 });
  expect(leadShift({ delivery: { lead: 'dayBefore' } })).toBe(1);
  expect(leadShift(undefined)).toBe(0);
});

test('alert window shifts by one day with delivery the day before cooking', () => {
  const today = '2026-11-08';
  const h = horizonKeys(today);
  const status = { '2026-11-12': 'pending' }; // today + 4
  expect(buildAlert(today, h, (k) => status[k] || 'empty')).toBeNull();
  const a = buildAlert(today, h, (k) => status[k] || 'empty', 1);
  expect(a.days).toEqual(['2026-11-12']);
  expect(a.text).toMatch(/den před vařením/);
});
