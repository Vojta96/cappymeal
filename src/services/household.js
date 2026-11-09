// Household onboarding and owner actions – all through Cloud Functions (the rules
// do not let clients write members, owner or join codes).
import { callFunction } from './functions';
import { SEED_IMAGE_BY_ID } from '../lib/builtinImages';
import seedRecipes from '../data/seedRecipes';
import { capitalizeFirst } from '../lib/text';

export const DEFAULT_SETTINGS = {
  remind3d: true,
  remindDaily: true,
  remindBoth: true,
  remindHour: 9,
  deliveryMorning: true, // missing in the DB = on (server: deliveries.js wants())
  deliveryHourBefore: true,
};

export function seedRecipeList() {
  return seedRecipes.map((m) => ({
    name: m.name,
    emoji: m.emoji || '🍽️',
    type: m.type,
    ...(m.types ? { types: m.types } : {}),
    preparation: m.preparation || '',
    instructions: m.instructions || '',
    ingredients: (m.ingredients || []).map((g) => ({ name: g.name, amount: g.amount || '' })),
    builtinImage: SEED_IMAGE_BY_ID[m.id] || null,
  }));
}

/** Seed recipes as stored in households/{hid}/recipes/{rid} (mirrors validateRecipe in functions). */
export function seedRecipeRecords(uid, now) {
  return seedRecipeList().map((r) => {
    const rec = {
      name: r.name,
      emoji: r.emoji,
      type: r.type,
      preparation: r.preparation,
      instructions: r.instructions,
      hasPhoto: false,
      createdBy: uid,
      updatedAt: now,
    };
    if (r.types) rec.types = r.types;
    if (r.ingredients.length) rec.ingredients = r.ingredients;
    if (r.builtinImage) rec.builtinImage = r.builtinImage;
    return rec;
  });
}

export const SEED_RECIPE_COUNT = seedRecipes.length;

export async function createHousehold(name) {
  const householdName = capitalizeFirst(name);
  if (!householdName) throw new Error('Doplňte název domácnosti.');
  const res = await callFunction('createHousehold', { name: householdName, recipes: seedRecipeList() });
  return res && res.hid;
}

export async function joinHousehold(code) {
  const res = await callFunction('joinHousehold', { code });
  return res && res.hid;
}

export const ensureHouseholdMeta = () => callFunction('ensureHouseholdMeta');
export const rotateJoinCode = () => callFunction('rotateJoinCode');
export const removeMember = (uid) => callFunction('removeMember', { uid });
