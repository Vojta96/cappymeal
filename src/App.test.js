import { addDays, dateKey, diffDays, horizonKeys, parseKey, plural } from './lib/dates';
import {
  aggregateIngredients,
  buildAlert,
  dayStatus,
  ingredientKey,
  isInPantry,
  isStaple,
  shoppingListText,
} from './lib/meals';
import { JOIN_CODE_RE, generateJoinCode, normalizeJoinCode } from './lib/joinCode';

describe('date keys', () => {
  test('uses the local date, not UTC', () => {
    // 23:30 local time must stay on the same calendar day
    expect(dateKey(new Date(2026, 10, 7, 23, 30))).toBe('2026-11-07');
    expect(dateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  test('round-trips and adds days across month/DST boundaries', () => {
    expect(dateKey(parseKey('2026-03-29'))).toBe('2026-03-29');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // DST switch in Europe
    expect(diffDays('2026-11-07', '2026-11-20')).toBe(13);
  });

  test('horizon is today + 13 days', () => {
    const h = horizonKeys('2026-11-07');
    expect(h).toHaveLength(14);
    expect(h[0]).toBe('2026-11-07');
    expect(h[13]).toBe('2026-11-20');
  });

  test('czech plural', () => {
    expect(plural(1, 'den', 'dny', 'dní')).toBe('den');
    expect(plural(3, 'den', 'dny', 'dní')).toBe('dny');
    expect(plural(5, 'den', 'dny', 'dní')).toBe('dní');
  });
});

const recipes = {
  a: {
    name: 'Bolognese',
    type: 'lunch',
    ingredients: [
      { name: 'Cibule', amount: '1 ks' },
      { name: 'Sůl, pepř', amount: 'dle chuti' },
      { name: 'Špagety', amount: '100 g' },
    ],
  },
  b: {
    name: 'Polévka',
    type: 'dinner',
    ingredients: [
      { name: ' cibule ', amount: '2 ks' },
      { name: 'Mrkev', amount: '2 ks' },
    ],
  },
};
const plan = {
  '2026-11-08': { lunch: 'a', dinner: 'b' },
  '2026-11-09': { lunch: 'a', dinner: 'missing' },
};

describe('ingredient aggregation', () => {
  test('merges by lowercased trimmed name and collects amounts and meals', () => {
    const items = aggregateIngredients(['2026-11-08', '2026-11-09'], plan, recipes);
    const cibule = items.find((i) => i.key === 'cibule');
    expect(cibule.amounts).toEqual(['1 ks', '2 ks', '1 ks']);
    expect(cibule.meals).toEqual(['Bolognese', 'Polévka']);
    expect(items.map((i) => i.key)).toEqual(['cibule', 'mrkev', 'sůl, pepř', 'špagety']);
  });

  test('staples default to "Mám doma" unless pantry says otherwise', () => {
    const items = aggregateIngredients(['2026-11-08'], plan, recipes);
    const salt = items.find((i) => i.key === 'sůl, pepř');
    const onion = items.find((i) => i.key === 'cibule');
    expect(isStaple(salt)).toBe(true);
    expect(isInPantry(salt, {})).toBe(true);
    expect(isInPantry(salt, { 'sůl, pepř': false })).toBe(false);
    expect(isInPantry(onion, {})).toBe(false);
    expect(isInPantry(onion, { cibule: true })).toBe(true);
  });

  test('ingredient keys are safe RTDB keys', () => {
    expect(ingredientKey(' Sůl. / pepř ')).toBe('sůl_ _ pepř');
  });

  test('plain text shopping list', () => {
    const items = aggregateIngredients(['2026-11-08'], plan, recipes);
    const txt = shoppingListText(items, ['2026-11-08']);
    expect(txt.split('\n')[0]).toBe('Nákup CappyMeal – Ne 8. 11.');
    expect(txt).toContain('- Cibule (1 ks + 2 ks)');
  });
});

describe('day status and alert', () => {
  test('status follows the contract', () => {
    expect(dayStatus(undefined, undefined, recipes)).toBe('empty');
    expect(dayStatus({ lunch: 'missing' }, undefined, recipes)).toBe('empty');
    expect(dayStatus({ lunch: 'a' }, undefined, recipes)).toBe('pending');
    expect(dayStatus({ lunch: 'a' }, { status: 'in_cart' }, recipes)).toBe('in_cart');
    expect(dayStatus({ lunch: 'a' }, { status: 'ordered' }, recipes)).toBe('ordered');
  });

  test('alert covers tomorrow..+3 that are not ordered', () => {
    const today = '2026-11-07';
    const h = horizonKeys(today);
    const status = { '2026-11-08': 'ordered', '2026-11-09': 'pending', '2026-11-10': 'empty' };
    const alert = buildAlert(today, h, (k) => status[k] || 'empty');
    expect(alert.days).toEqual(['2026-11-09']);
    expect(alert.title).toBe('Pondělí 9. 11. ještě není objednané');
    expect(buildAlert(today, h, () => 'ordered')).toBeNull();
  });
});

describe('join codes', () => {
  test('generated codes match the contract alphabet', () => {
    for (let i = 0; i < 50; i++) expect(generateJoinCode()).toMatch(JOIN_CODE_RE);
    expect(normalizeJoinCode('ab cd-23 45xyz')).toBe('ABCD2345');
  });
});
