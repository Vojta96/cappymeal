// Household onboarding and owner actions – all through Cloud Functions (the rules
// do not let clients write members, owner or join codes).
import { callFunction } from './functions';
import { SEED_IMAGE_BY_ID } from '../lib/builtinImages';
import seedRecipes from '../data/seedRecipes';
import { capitalizeFirst } from '../lib/text';

export const DEFAULT_SETTINGS = { remind3d: true, remindDaily: true, remindBoth: true, remindHour: 9 };

function seedRecipeList() {
  return seedRecipes.map((m) => ({
    name: m.name,
    emoji: m.emoji || '🍽️',
    type: m.type,
    preparation: m.preparation || '',
    instructions: m.instructions || '',
    ingredients: (m.ingredients || []).map((g) => ({ name: g.name, amount: g.amount || '' })),
    builtinImage: SEED_IMAGE_BY_ID[m.id] || null,
  }));
}

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
