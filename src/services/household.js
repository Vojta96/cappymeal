// Household onboarding (create / join). Firebase-touching code, kept out of src/lib.
import { ref, push, get, update } from 'firebase/database';
import { db } from '../firebase';
import { generateJoinCode, JOIN_CODE_RE, normalizeJoinCode } from '../lib/joinCode';
import { SEED_IMAGE_BY_ID } from '../lib/builtinImages';
import seedRecipes from '../data/seedRecipes';
import { capitalizeFirst } from '../lib/text';

export const DEFAULT_SETTINGS = { remind3d: true, remindDaily: true, remindBoth: true, remindHour: 9 };

function seedRecipeMap(hid, uid, now) {
  const out = {};
  for (const m of seedRecipes) {
    const rid = push(ref(db, `households/${hid}/recipes`)).key;
    out[rid] = {
      name: m.name,
      emoji: m.emoji || '🍽️',
      type: m.type,
      preparation: m.preparation || '',
      instructions: m.instructions || '',
      ingredients: (m.ingredients || []).map((g) => ({ name: g.name, amount: g.amount || '' })),
      builtinImage: SEED_IMAGE_BY_ID[m.id] || null,
      hasPhoto: false,
      createdBy: uid,
      updatedAt: now,
    };
  }
  return out;
}

async function freeJoinCode() {
  for (let i = 0; i < 6; i++) {
    const code = generateJoinCode();
    // eslint-disable-next-line no-await-in-loop
    const snap = await get(ref(db, `joinCodes/${code}`));
    if (!snap.exists()) return code;
  }
  throw new Error('Nepodařilo se vytvořit kód domácnosti. Zkuste to znovu.');
}

export async function createHousehold(uid, nickname, name) {
  const householdName = capitalizeFirst(name);
  if (!householdName) throw new Error('Doplňte název domácnosti.');
  const now = Date.now();
  const hid = push(ref(db, 'households')).key;
  const code = await freeJoinCode();
  const household = {
    name: householdName,
    joinCode: code,
    createdAt: now,
    members: { [uid]: { nickname, joinedAt: now } },
    settings: DEFAULT_SETTINGS,
    recipes: seedRecipeMap(hid, uid, now),
  };
  // Order matters for rules evaluation only per path; the multi-path update is atomic.
  await update(ref(db), {
    [`households/${hid}`]: household,
    [`joinCodes/${code}`]: hid,
    [`users/${uid}/householdId`]: hid,
    [`users/${uid}/nickname`]: nickname,
  });
  return hid;
}

export async function joinHousehold(uid, nickname, rawCode) {
  const code = normalizeJoinCode(rawCode);
  if (!JOIN_CODE_RE.test(code)) throw new Error('Kód má 8 znaků (písmena a číslice).');
  const snap = await get(ref(db, `joinCodes/${code}`));
  if (!snap.exists()) throw new Error('Domácnost s tímto kódem neexistuje.');
  const hid = snap.val();
  await update(ref(db), {
    [`households/${hid}/members/${uid}`]: { nickname, joinedAt: Date.now() },
    [`users/${uid}/householdId`]: hid,
    [`users/${uid}/nickname`]: nickname,
  });
  return hid;
}
