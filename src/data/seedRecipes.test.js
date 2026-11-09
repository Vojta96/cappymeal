import seedRecipes from './seedRecipes';
import { seedRecipeRecords } from '../services/household';

jest.mock('../services/functions', () => ({ callFunction: () => Promise.resolve({}) }));

const placeholders = ['Snídaně od Páji', 'Polévka od Páji'];

describe('seed recipes', () => {
  test('expected counts per type, unique ids and names', () => {
    const count = (t) => seedRecipes.filter((r) => r.type === t).length;
    expect(seedRecipes).toHaveLength(23);
    expect(count('breakfast')).toBe(7);
    expect(count('lunch')).toBe(13);
    expect(count('dinner')).toBe(3);
    expect(new Set(seedRecipes.map((r) => r.id)).size).toBe(23);
    expect(new Set(seedRecipes.map((r) => r.name)).size).toBe(23);
  });

  test('non-placeholder recipes have at least 2 ingredients and instructions', () => {
    seedRecipes
      .filter((r) => !placeholders.includes(r.name))
      .forEach((r) => {
        expect(r.ingredients.length).toBeGreaterThanOrEqual(2);
        expect(r.instructions.length).toBeGreaterThan(10);
        expect(r.preparation).not.toBe('');
      });
  });

  test('records fit the database rules limits', () => {
    seedRecipeRecords('u1', 1).forEach((r) => {
      expect(r.name.length).toBeLessThanOrEqual(80);
      expect(r.hasPhoto).toBe(false);
      expect(r.createdBy).toBe('u1');
      (r.ingredients || []).forEach((g) => {
        expect(g.name.length).toBeLessThanOrEqual(80);
        expect(g.amount.length).toBeLessThanOrEqual(40);
      });
    });
  });
});
