import seedRecipes from './seedRecipes';
import { seedRecipeRecords } from '../services/household';

jest.mock('../services/functions', () => ({ callFunction: () => Promise.resolve({}) }));

describe('seed recipes', () => {
  test('expected counts per type, unique ids and names', () => {
    const count = (t) => seedRecipes.filter((r) => r.type === t).length;
    expect(seedRecipes).toHaveLength(186);
    expect(count('breakfast')).toBe(30);
    expect(count('snack')).toBe(38);
    expect(count('lunch')).toBe(70);
    expect(count('afternoon_snack')).toBe(16);
    expect(count('dinner')).toBe(22);
    expect(count('treat')).toBe(10);
    expect(new Set(seedRecipes.map((r) => r.id)).size).toBe(186);
    expect(new Set(seedRecipes.map((r) => r.name)).size).toBe(186);
  });

  test('no placeholders, every recipe has ingredients, instructions and a preparation', () => {
    const names = seedRecipes.map((r) => r.name);
    ['Snídaně od Páji', 'Polévka od Páji', 'Pomazánka s pečivem (vajíčková)'].forEach((n) => {
      expect(names).not.toContain(n);
    });
    seedRecipes.forEach((r) => {
      expect(r.ingredients.length).toBeGreaterThanOrEqual(1);
      r.ingredients.forEach((g) => expect(g.amount).not.toBe(''));
      expect(r.instructions.length).toBeGreaterThan(10);
      expect(r.instructions.length).toBeLessThanOrEqual(5000);
      expect(r.ingredients.length).toBeLessThanOrEqual(60);
      expect(r.preparation).not.toBe('');
      expect(r.name).toBe(r.name.charAt(0).toUpperCase() + r.name.slice(1));
    });
  });

  test('multi-type recipes carry types incl. the primary type', () => {
    const multi = seedRecipes.filter((r) => r.types);
    expect(multi.length).toBeGreaterThanOrEqual(12);
    multi.forEach((r) => {
      expect(Object.keys(r.types).length).toBeGreaterThan(1);
      expect(r.types[r.type]).toBe(true);
    });
    expect(seedRecipeRecords('u1', 1).filter((r) => r.types)).toHaveLength(multi.length);
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
