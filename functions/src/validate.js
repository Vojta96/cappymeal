'use strict';
// Pure input validation / normalisation helpers shared by the callables (unit tested).

const LOGIN_DOMAIN = 'users.cappymeal-go.firebaseapp.com';
const LEGACY_DOMAIN = 'cappymeal.app';

const SLOTS = ['breakfast', 'snack', 'lunch', 'afternoon_snack', 'dinner'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NICK_RE = /^[a-z0-9áčďéěíňóřšťúůýž._-]{3,24}$/;
const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const PRODUCT_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const BUILTIN_IMAGES = ['pancakes', 'soup'];

/** Error carrying a stable code; index.js converts it to an HttpsError. */
class InputError extends Error {
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.code = code;
  }
}

const isStr = (v) => typeof v === 'string';
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Same as the client: trimmed + lowercased local part of the login e-mail. */
function normalizeNickname(nickname) {
  return String(nickname == null ? '' : nickname).trim().toLowerCase();
}

/** First letter uppercased (Czech locale), rest untouched. */
function capitalizeFirst(value) {
  const s = String(value == null ? '' : value).trim();
  if (!s) return '';
  const [first, ...rest] = Array.from(s);
  return first.toLocaleUpperCase('cs') + rest.join('');
}

const loginEmail = (key) => `${key}@${LOGIN_DOMAIN}`;
const legacyEmail = (key) => `${key}@${LEGACY_DOMAIN}`;

/** Nickname + password rules for NEW accounts. Returns { key, display, password }. */
function validateRegistration(data) {
  const d = isPlainObject(data) ? data : {};
  if (!isStr(d.nickname) || !isStr(d.password)) {
    throw new InputError('Vyplňte přezdívku i heslo.');
  }
  const typed = d.nickname.trim();
  const key = normalizeNickname(typed);
  if (!NICK_RE.test(key)) {
    throw new InputError(
      'Přezdívka musí mít 3–24 znaků: písmena (i s diakritikou), číslice, tečka, podtržítko nebo pomlčka.',
      'INVALID_NICKNAME',
    );
  }
  if (d.password.length < 10) throw new InputError('Heslo musí mít alespoň 10 znaků.', 'WEAK_PASSWORD');
  if (d.password.length > 128) throw new InputError('Heslo může mít nejvýše 128 znaků.', 'INVALID_PASSWORD');
  return { key, display: capitalizeFirst(typed), password: d.password };
}

/** 'jana.novakova@gmail.com' -> 'j***@gmail.com' */
function maskEmail(email) {
  const s = String(email || '');
  const at = s.lastIndexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}

function normalizeJoinCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function validateJoinCode(data) {
  const raw = isPlainObject(data) && isStr(data.code) ? data.code : '';
  if (raw.length > 32) throw new InputError('Kód má 8 znaků (písmena a číslice).');
  const code = normalizeJoinCode(raw);
  if (!JOIN_CODE_RE.test(code)) throw new InputError('Kód má 8 znaků (písmena a číslice).');
  return code;
}

/** randomInt: (max) => integer in [0, max) – crypto.randomInt in production. */
function generateJoinCode(randomInt) {
  let s = '';
  for (let i = 0; i < 8; i++) s += JOIN_ALPHABET[randomInt(JOIN_ALPHABET.length)];
  return s;
}

function validateHouseholdName(name) {
  const n = capitalizeFirst(isStr(name) ? name : '');
  if (!n) throw new InputError('Doplňte název domácnosti.');
  if (n.length > 40) throw new InputError('Název domácnosti může mít nejvýše 40 znaků.');
  return n;
}

function str(v, max, label, { required = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw new InputError(`Chybí ${label}.`);
    return '';
  }
  if (!isStr(v) || v.length > max) throw new InputError(`Neplatné pole ${label}.`);
  return v;
}

/** Recipe as stored in households/{hid}/recipes/{rid} – mirrors database.rules.json. */
function validateRecipe(r, uid, now) {
  if (!isPlainObject(r)) throw new InputError('Neplatný recept.');
  const name = str(r.name, 80, 'název', { required: true });
  if (!SLOTS.includes(r.type)) throw new InputError('Neplatný typ jídla.');
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  if (ingredients.length > 60) throw new InputError('Recept má příliš mnoho surovin.');
  const builtin = r.builtinImage == null ? null : r.builtinImage;
  if (builtin !== null && !BUILTIN_IMAGES.includes(builtin)) throw new InputError('Neplatný obrázek.');
  return {
    name,
    emoji: str(r.emoji, 16, 'emoji') || '🍽️',
    type: r.type,
    preparation: str(r.preparation, 80, 'příprava'),
    instructions: str(r.instructions, 5000, 'postup'),
    ingredients: ingredients.map((g) => {
      if (!isPlainObject(g)) throw new InputError('Neplatná surovina.');
      return { name: str(g.name, 80, 'surovina', { required: true }), amount: str(g.amount, 40, 'množství') };
    }),
    builtinImage: builtin,
    hasPhoto: false,
    createdBy: uid,
    updatedAt: now,
  };
}

function validateSeedRecipes(list, uid, now) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || list.length > 250) throw new InputError('Neplatný seznam receptů.');
  return list.map((r) => validateRecipe(r, uid, now));
}

/** rohlikMatch input: [{ key, name, amounts? }] (≤ 60). */
function validateMatchItems(data) {
  const items = isPlainObject(data) ? data.items : undefined;
  if (!Array.isArray(items) || items.length > 60) {
    throw new InputError('Neplatný seznam surovin (max. 60 položek).');
  }
  return items.map((it) => {
    if (!isPlainObject(it) || !isStr(it.key) || !isStr(it.name)) throw new InputError('Neplatná položka.');
    if (!it.key || it.key.length > 120 || !it.name.trim() || it.name.length > 100) {
      throw new InputError('Neplatná položka.');
    }
    const amounts = it.amounts === undefined ? [] : it.amounts;
    if (!Array.isArray(amounts) || amounts.length > 10 || amounts.some((a) => !isStr(a) || a.length > 40)) {
      throw new InputError('Neplatné množství.');
    }
    return { key: it.key, name: it.name.trim(), amounts };
  });
}

/** rohlikFillCart input. */
function validateFillCart(data) {
  const d = isPlainObject(data) ? data : {};
  const { days, products } = d;
  if (!Array.isArray(days) || !days.length || days.length > 14
    || !days.every((x) => isStr(x) && DATE_RE.test(x))) {
    throw new InputError('Neplatné dny.');
  }
  if (!Array.isArray(products) || !products.length || products.length > 80) {
    throw new InputError('Neplatný seznam produktů (max. 80).');
  }
  const clean = products.map((p) => {
    if (!isPlainObject(p)) throw new InputError('Neplatný produkt.');
    const productId = isStr(p.productId) || typeof p.productId === 'number' ? String(p.productId) : '';
    if (!PRODUCT_ID_RE.test(productId)) throw new InputError('Neplatné ID produktu.');
    const q = p.quantity;
    if (!Number.isInteger(q) || q < 1 || q > 50) throw new InputError('Neplatné množství (1–50).');
    return { productId, quantity: q };
  });
  return { days: [...new Set(days)], products: clean };
}

function validateUid(data) {
  const uid = isPlainObject(data) && isStr(data.uid) ? data.uid : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new InputError('Neplatný člen.');
  return uid;
}

/** RTDB-safe key for an IP address. */
function ipKey(ip) {
  const s = String(ip || 'unknown').slice(0, 64).replace(/[^A-Za-z0-9]/g, '_');
  return s || 'unknown';
}

module.exports = {
  LOGIN_DOMAIN,
  LEGACY_DOMAIN,
  SLOTS,
  DATE_RE,
  NICK_RE,
  JOIN_CODE_RE,
  InputError,
  normalizeNickname,
  capitalizeFirst,
  loginEmail,
  legacyEmail,
  validateRegistration,
  maskEmail,
  normalizeJoinCode,
  validateJoinCode,
  generateJoinCode,
  validateHouseholdName,
  validateRecipe,
  validateSeedRecipes,
  validateMatchItems,
  validateFillCart,
  validateUid,
  ipKey,
};
