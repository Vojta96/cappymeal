const test = require('node:test');
const assert = require('node:assert');
const v = require('../src/validate');

const base = { name: 'Jablko', type: 'snack', ingredients: [] };

test('validateRecipe: types omitted for a single type', () => {
  assert.strictEqual(v.validateRecipe(base, 'u', 1).types, undefined);
  assert.strictEqual(v.validateRecipe({ ...base, types: ['snack'] }, 'u', 1).types, undefined);
});

test('validateRecipe: types array and map', () => {
  const want = { breakfast: true, snack: true, afternoon_snack: true };
  assert.deepStrictEqual(v.validateRecipe({ ...base, types: ['afternoon_snack', 'snack', 'breakfast'] }, 'u', 1).types, want);
  assert.deepStrictEqual(v.validateRecipe({ ...base, types: want }, 'u', 1).types, want);
});

test('validateRecipe: invalid types rejected', () => {
  assert.throws(() => v.validateRecipe({ ...base, types: ['snack', 'brunch'] }, 'u', 1));
  assert.throws(() => v.validateRecipe({ ...base, types: ['breakfast', 'lunch'] }, 'u', 1));
  assert.throws(() => v.validateRecipe({ ...base, types: { snack: true, lunch: false } }, 'u', 1));
  assert.throws(() => v.validateRecipe({ ...base, types: 'snack' }, 'u', 1));
});
