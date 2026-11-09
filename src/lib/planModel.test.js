import { resolveDay, resolvePlan, slotEntries, templateDay, weekdayKey } from './planModel';
import { aggregateIngredients, dayStatus, recipeTypes } from './meals';

const recipes = {
  a: { name: 'Polévka', type: 'lunch', ingredients: [{ name: 'Mrkev', amount: '200 g' }] },
  b: { name: 'Omeleta', type: 'lunch', ingredients: [{ name: 'Vejce', amount: '3 ks' }] },
  c: { name: 'Jablko', type: 'snack', types: { snack: true, breakfast: true }, ingredients: [{ name: 'Jablka', amount: '2 ks' }] },
};
// 2026-11-09 is a Monday.
const MON = '2026-11-09';
const NEXT_MON = '2026-11-16';
const template = { from: MON, days: { d1: { plan: { lunch: 'a' }, members: { lunch: { v: 'b' } } } } };

test('weekdayKey / templateDay', () => {
  expect(weekdayKey(MON)).toBe('d1');
  expect(templateDay(template, '2026-11-02')).toBeNull();
  expect(templateDay(template, NEXT_MON)).toEqual(template.days.d1);
  expect(templateDay(null, NEXT_MON)).toBeNull();
});

test('pattern fills days, concrete values win, "-" empties, "=" cancels a member override', () => {
  expect(resolveDay(NEXT_MON, {}, {}, template)).toEqual({
    plan: { lunch: 'a' },
    members: { lunch: { v: 'b' } },
    fromTemplate: { lunch: true },
  });
  const r = resolveDay(NEXT_MON, { [NEXT_MON]: { lunch: '-' } }, { [NEXT_MON]: { lunch: { v: '=' } } }, template);
  expect(r.plan).toEqual({});
  expect(r.members).toEqual({});
  const own = resolveDay(NEXT_MON, { [NEXT_MON]: { lunch: 'b' } }, { [NEXT_MON]: { lunch: { p: '-' } } }, template);
  expect(own.plan).toEqual({ lunch: 'b' });
  expect(own.fromTemplate).toEqual({});
  expect(own.members.lunch).toEqual({ v: 'b', p: '-' });
});

test('resolvePlan covers given dates and concrete dates', () => {
  const { plan, memberPlan } = resolvePlan([NEXT_MON], { '2026-11-01': { lunch: 'a' } }, {}, template);
  expect(plan['2026-11-01']).toEqual({ lunch: 'a' });
  expect(plan[NEXT_MON]).toEqual({ lunch: 'a' });
  expect(memberPlan[NEXT_MON]).toEqual({ lunch: { v: 'b' } });
});

test('slotEntries groups who eats what', () => {
  const ids = ['p', 'v', 'k'];
  expect(slotEntries('a', { v: 'b' }, ids, recipes)).toEqual([
    { rid: 'a', uids: ['p', 'k'], shared: true },
    { rid: 'b', uids: ['v'], shared: false },
  ]);
  // Everyone has something else -> the shared meal is not eaten.
  expect(slotEntries('a', { p: 'b', v: 'b', k: '-' }, ids, recipes)).toEqual([{ rid: 'b', uids: ['p', 'v'], shared: false }]);
  // Own meal = the shared recipe -> merged.
  expect(slotEntries('a', { v: 'a' }, ids, recipes)).toEqual([{ rid: 'a', uids: ['p', 'k', 'v'], shared: true }]);
  // Only a member eats.
  expect(slotEntries(undefined, { v: 'b' }, ids, recipes)).toEqual([{ rid: 'b', uids: ['v'], shared: false }]);
  // Former members are ignored, missing recipes dropped.
  expect(slotEntries('a', { gone: 'b' }, ['p'], recipes)).toEqual([{ rid: 'a', uids: ['p'], shared: true }]);
  expect(slotEntries('zzz', {}, ['p'], recipes)).toEqual([]);
});

test('dayStatus counts member-only meals; nobody eating = empty', () => {
  expect(dayStatus(undefined, undefined, recipes, { lunch: { v: 'b' } }, ['p', 'v'])).toBe('pending');
  expect(dayStatus({ lunch: 'a' }, undefined, recipes, { lunch: { p: '-', v: '-' } }, ['p', 'v'])).toBe('empty');
});

test('aggregateIngredients buys every distinct recipe of a slot once', () => {
  const day = '2026-11-10';
  const plan = { [day]: { lunch: 'a' } };
  const mp = { [day]: { lunch: { v: 'b', k: 'b' } } };
  const names = aggregateIngredients([day], plan, recipes, mp, ['p', 'v', 'k']).map((i) => i.name);
  expect(names).toEqual(['Mrkev', 'Vejce']);
  // Nobody eats the shared meal -> its ingredients are not bought.
  const none = aggregateIngredients([day], plan, recipes, { [day]: { lunch: { p: 'b', v: 'b' } } }, ['p', 'v']);
  expect(none.map((i) => i.name)).toEqual(['Vejce']);
});

test('recipeTypes', () => {
  expect(recipeTypes(recipes.c)).toEqual(['breakfast', 'snack']);
  expect(recipeTypes(recipes.a)).toEqual(['lunch']);
});
