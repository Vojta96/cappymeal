const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const v = require('../src/validate');
const enc = require('../src/crypto');
const rl = require('../src/rateLimit');

const KEY = crypto.randomBytes(32).toString('base64');

test('crypto round-trip with household binding', () => {
  const rec = enc.encryptJson({ email: 'a@b.cz', password: 'tajné heslo' }, KEY, 'hid1');
  assert.strictEqual(rec.v, 2);
  assert.ok(rec.iv && rec.tag && rec.ct);
  assert.ok(!rec.ct.includes('tajn'));
  assert.deepStrictEqual(enc.decryptJson(rec, KEY, 'hid1'), { email: 'a@b.cz', password: 'tajné heslo' });
  // fresh IV every time
  assert.notStrictEqual(enc.encryptJson({ a: 1 }, KEY, 'h').iv, enc.encryptJson({ a: 1 }, KEY, 'h').iv);
});

test('crypto rejects wrong key, wrong household and tampering', () => {
  const rec = enc.encryptJson({ email: 'a@b.cz', password: 'x' }, KEY, 'hid1');
  assert.throws(() => enc.decryptJson(rec, crypto.randomBytes(32).toString('base64'), 'hid1'));
  assert.throws(() => enc.decryptJson(rec, KEY, 'hid2'));
  const ct = Buffer.from(rec.ct, 'base64');
  ct[0] ^= 1;
  assert.throws(() => enc.decryptJson({ ...rec, ct: ct.toString('base64') }, KEY, 'hid1'));
  assert.throws(() => enc.parseKey(crypto.randomBytes(16).toString('base64')));
  assert.throws(() => enc.decryptJson({ v: 3, iv: 'a', tag: 'b', ct: 'c' }, KEY, 'hid1'));
});

test('rate limiter window logic', () => {
  const H = rl.HOUR;
  let s = null;
  for (let i = 0; i < 5; i++) {
    const r = rl.nextState(s, 1000 + i, 5, H);
    assert.strictEqual(r.allowed, true);
    s = r.state;
  }
  assert.deepStrictEqual(s, { start: 1000, count: 5 });
  assert.strictEqual(rl.nextState(s, 2000, 5, H).allowed, false);
  const after = rl.nextState(s, 1000 + H, 5, H);
  assert.strictEqual(after.allowed, true);
  assert.deepStrictEqual(after.state, { start: 1000 + H, count: 1 });
  // garbage / clock skew resets
  assert.strictEqual(rl.nextState({ start: 'x' }, 5, 1, H).allowed, true);
  assert.strictEqual(rl.nextState({ start: 9999, count: 99 }, 10, 1, H).allowed, true);
});

test('rate limiter consume uses a transaction', async () => {
  let stored = { start: Date.now(), count: 1 };
  const fakeDb = {
    ref: () => ({
      transaction: async (fn) => {
        const next = fn(stored);
        if (next !== undefined) stored = next;
        return { committed: next !== undefined };
      },
    }),
  };
  assert.strictEqual(await rl.consume(fakeDb, 'rateLimits/x', 2), true);
  assert.strictEqual(stored.count, 2);
  assert.strictEqual(await rl.consume(fakeDb, 'rateLimits/x', 2), false);
  assert.strictEqual(stored.count, 2);
});

test('nickname rules for new accounts', () => {
  const ok = v.validateRegistration({ nickname: '  Žofie.K ', password: '0123456789' });
  assert.deepStrictEqual(ok, { key: 'žofie.k', display: 'Žofie.K', password: '0123456789' });
  assert.strictEqual(v.validateRegistration({ nickname: 'vojta', password: 'x'.repeat(128) }).display, 'Vojta');
  const bad = (nickname, password = '0123456789') => assert.throws(
    () => v.validateRegistration({ nickname, password }), v.InputError,
  );
  bad('ab');
  bad('a'.repeat(25));
  bad('jan novák');
  bad('jan@x');
  bad('ölaf');
  bad('vojta', '123456789');
  bad('vojta', 'x'.repeat(129));
  bad(undefined);
  assert.throws(() => v.validateRegistration(null), v.InputError);
  assert.strictEqual(v.loginEmail('vojta'), 'vojta@users.cappymeal-go.firebaseapp.com');
  assert.strictEqual(v.legacyEmail('vojta'), 'vojta@cappymeal.app');
  assert.strictEqual(v.normalizeNickname(' VoJta '), 'vojta');
});

test('email masking', () => {
  assert.strictEqual(v.maskEmail('jana.novakova@gmail.com'), 'j***@gmail.com');
  assert.strictEqual(v.maskEmail('bad'), '***');
});

test('join codes', () => {
  assert.strictEqual(v.validateJoinCode({ code: 'abcd-2345' }), 'ABCD2345');
  assert.throws(() => v.validateJoinCode({ code: 'ABCD1234' }), v.InputError); // 1 not in alphabet
  assert.throws(() => v.validateJoinCode({}), v.InputError);
  const code = v.generateJoinCode(crypto.randomInt);
  assert.match(code, v.JOIN_CODE_RE);
});

test('rohlikMatch input caps', () => {
  const item = { key: 'mléko', name: 'Mléko', amounts: ['200 ml'] };
  assert.strictEqual(v.validateMatchItems({ items: [item] }).length, 1);
  assert.strictEqual(v.validateMatchItems({ items: Array(60).fill(item) }).length, 60);
  const bad = (items) => assert.throws(() => v.validateMatchItems({ items }), v.InputError);
  bad(Array(61).fill(item));
  bad([{ ...item, name: 'x'.repeat(101) }]);
  bad([{ ...item, amounts: Array(11).fill('1') }]);
  bad([{ ...item, amounts: ['x'.repeat(41)] }]);
  bad([{ key: 1, name: 'x' }]);
  bad('nope');
});

test('rohlikFillCart input caps', () => {
  const ok = v.validateFillCart({ days: ['2026-11-10', '2026-11-10'], products: [{ productId: '123', quantity: 2 }] });
  assert.deepStrictEqual(ok, { days: ['2026-11-10'], products: [{ productId: '123', quantity: 2 }] });
  const bad = (d) => assert.throws(() => v.validateFillCart(d), v.InputError);
  const p = { productId: 'abc_1-2', quantity: 1 };
  bad({ days: [], products: [p] });
  bad({ days: Array(15).fill('2026-11-10'), products: [p] });
  bad({ days: ['10.11.2026'], products: [p] });
  bad({ days: ['2026-11-10'], products: Array(81).fill(p) });
  bad({ days: ['2026-11-10'], products: [{ productId: '../x', quantity: 1 }] });
  bad({ days: ['2026-11-10'], products: [{ productId: 'a'.repeat(41), quantity: 1 }] });
  bad({ days: ['2026-11-10'], products: [{ productId: '1', quantity: 0 }] });
  bad({ days: ['2026-11-10'], products: [{ productId: '1', quantity: 51 }] });
  bad({ days: ['2026-11-10'], products: [{ productId: '1', quantity: 1.5 }] });
});

test('recipe and household validation', () => {
  const r = v.validateRecipe({
    name: 'Kaše', type: 'breakfast', emoji: '🥣', ingredients: [{ name: 'Mléko', amount: '200 ml' }],
    builtinImage: 'pancakes', evil: 'x',
  }, 'u1', 5);
  assert.deepStrictEqual(Object.keys(r).sort(), [
    'builtinImage', 'createdBy', 'emoji', 'hasPhoto', 'ingredients', 'instructions', 'name', 'preparation', 'type', 'updatedAt',
  ]);
  assert.throws(() => v.validateRecipe({ name: 'x', type: 'brunch' }, 'u1', 1), v.InputError);
  assert.throws(() => v.validateRecipe({ name: 'x'.repeat(81), type: 'lunch' }, 'u1', 1), v.InputError);
  assert.throws(() => v.validateRecipe({ name: 'x', type: 'lunch', builtinImage: 'http://x' }, 'u1', 1), v.InputError);
  assert.throws(() => v.validateSeedRecipes(Array(251).fill({ name: 'x', type: 'lunch' }), 'u1', 1), v.InputError);
  assert.strictEqual(v.validateHouseholdName('  procházkovi '), 'Procházkovi');
  assert.throws(() => v.validateHouseholdName('   '), v.InputError);
  assert.throws(() => v.validateHouseholdName('x'.repeat(41)), v.InputError);
  assert.strictEqual(v.ipKey('2001:db8::1'), '2001_db8__1');
  assert.strictEqual(v.validateUid({ uid: 'abc' }), 'abc');
  assert.throws(() => v.validateUid({ uid: 'a/b' }), v.InputError);
});
