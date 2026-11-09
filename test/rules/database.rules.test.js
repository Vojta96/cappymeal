// Realtime Database rules tests. Run with: npm run test:rules
// (starts the Database emulator via `firebase emulators:exec`; needs Java).
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { ref, set, update, get, remove, push } = require('firebase/database');

const HID = 'h1';
const OTHER = 'h2';
let env;

const today = '2026-11-10';
const recipe = {
  name: 'Kaše',
  emoji: '🥣',
  type: 'breakfast',
  preparation: 'Vaření',
  instructions: 'Uvařit.',
  ingredients: [{ name: 'Mléko', amount: '200 ml' }],
  hasPhoto: false,
  createdBy: 'alice',
  updatedAt: 1,
};

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cappymeal',
    database: {
      rules: readFileSync(path.join(__dirname, '../../database.rules.json'), 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
});

test.after(async () => {
  if (env) await env.cleanup();
});

test.beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database()), {
      users: {
        alice: { nickname: 'Alice', householdId: HID },
        bob: { nickname: 'Bob', householdId: HID },
        eve: { nickname: 'Eve' },
      },
      joinCodes: { ABCD2345: HID },
      rohlikCredentials: { [HID]: { v: 2, iv: 'x', tag: 'y', ct: 'z' } },
      rohlikOAuthClient: { client_id: 'c', redirect_uri: 'http://127.0.0.1:8976/rohlik-callback', registeredAt: 1 },
      rohlikOAuthPending: { [HID]: { state: 's', uid: 'alice', createdAt: 1 } },
      rateLimits: { h: { [HID]: { rohlikMatch: { start: 1, count: 1 } } } },
      households: {
        [HID]: {
          name: 'Procházkovi',
          owner: 'alice',
          joinCode: 'ABCD2345',
          members: { alice: { nickname: 'Alice', joinedAt: 1 }, bob: { nickname: 'Bob', joinedAt: 2 } },
          recipes: { r1: recipe },
          photos: { r1: 'data:image/jpeg;base64,AAAA' },
          orders: { [today]: { status: 'in_cart', at: 1, by: 'alice' } },
          settings: { remind3d: true, remindHour: 9 },
        },
        [OTHER]: {
          name: 'Jiní',
          owner: 'zed',
          members: { zed: { nickname: 'Zed', joinedAt: 1 } },
        },
      },
    });
  });
});

test('users: self only, validated keys', async () => {
  await assertSucceeds(get(ref(db('alice'), 'users/alice')));
  await assertFails(get(ref(db('alice'), 'users/bob')));
  await assertFails(get(ref(db(), 'users/alice')));
  await assertSucceeds(set(ref(db('alice'), 'users/alice/nickname'), 'Alenka'));
  await assertFails(set(ref(db('alice'), 'users/alice/nickname'), 'x'.repeat(33)));
  await assertFails(set(ref(db('alice'), 'users/bob/nickname'), 'Bob2'));
  await assertFails(set(ref(db('alice'), 'users/alice/admin'), true));
  // householdId only for a household where the user is a member
  await assertFails(set(ref(db('eve'), 'users/eve/householdId'), HID));
  await assertSucceeds(set(ref(db('bob'), 'users/bob/householdId'), HID));
  await assertSucceeds(remove(ref(db('bob'), 'users/bob/householdId')));
});

test('joinCodes: single key read, no client writes, no listing', async () => {
  await assertSucceeds(get(ref(db('eve'), 'joinCodes/ABCD2345')));
  await assertFails(get(ref(db('eve'), 'joinCodes')));
  await assertFails(get(ref(db(), 'joinCodes/ABCD2345')));
  await assertFails(set(ref(db('eve'), 'joinCodes/ZZZZ2345'), HID));
  await assertFails(set(ref(db('alice'), 'joinCodes/ABCD2345'), null));
});

test('admin-only trees', async () => {
  for (const p of [
    `rohlikCredentials/${HID}`, 'rateLimits', 'householdIndex',
    'rohlikOAuthClient', `rohlikOAuthPending/${HID}`, 'rohlikOAuthPending',
  ]) {
    // eslint-disable-next-line no-await-in-loop
    await assertFails(get(ref(db('alice'), p)));
    // eslint-disable-next-line no-await-in-loop
    await assertFails(set(ref(db('alice'), p), null));
  }
});

test('households: members read, non-members cannot read or join', async () => {
  await assertSucceeds(get(ref(db('bob'), `households/${HID}`)));
  await assertFails(get(ref(db('eve'), `households/${HID}`)));
  await assertFails(get(ref(db('eve'), 'households')));
  await assertFails(set(ref(db('eve'), `households/${HID}/members/eve`), { nickname: 'Eve', joinedAt: 3 }));
  await assertFails(set(ref(db('bob'), `households/${HID}/members/bob`), { nickname: 'Bob', joinedAt: 3 }));
  await assertFails(set(ref(db('eve'), 'households/h3'), {
    name: 'X', owner: 'eve', members: { eve: { nickname: 'Eve', joinedAt: 1 } },
  }));
});

test('households: server-only fields and no wipe', async () => {
  const bob = db('bob');
  const alice = db('alice');
  await assertFails(set(ref(bob, `households/${HID}`), null));
  await assertFails(set(ref(alice, `households/${HID}`), null));
  await assertFails(set(ref(alice, `households/${HID}/owner`), 'bob'));
  await assertFails(set(ref(alice, `households/${HID}/joinCode`), 'ZZZZ2345'));
  await assertFails(remove(ref(alice, `households/${HID}/members/bob`)));
  await assertFails(set(ref(alice, `households/${HID}/rohlik`), { connected: true }));
  await assertFails(set(ref(alice, `households/${HID}/evil`), 1));
});

test('households: only the owner renames', async () => {
  await assertSucceeds(set(ref(db('alice'), `households/${HID}/name`), 'Noví'));
  await assertFails(set(ref(db('alice'), `households/${HID}/name`), 'x'.repeat(41)));
  await assertFails(set(ref(db('alice'), `households/${HID}/name`), ''));
  await assertFails(set(ref(db('bob'), `households/${HID}/name`), 'Bobovi'));
});

test('recipes validation', async () => {
  const bob = db('bob');
  await assertSucceeds(set(ref(bob, `households/${HID}/recipes/r2`), recipe));
  await assertSucceeds(update(ref(bob, `households/${HID}`), { 'recipes/r1': null }));
  await assertFails(set(ref(db('eve'), `households/${HID}/recipes/r3`), recipe));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), { ...recipe, type: 'brunch' }));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), { ...recipe, name: 'x'.repeat(81) }));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), { ...recipe, instructions: 'x'.repeat(5001) }));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), { ...recipe, evil: 1 }));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), {
    ...recipe, ingredients: Array.from({ length: 61 }, () => ({ name: 'a', amount: '1' })),
  }));
  await assertSucceeds(set(ref(bob, `households/${HID}/recipes/r3`), {
    ...recipe, ingredients: Array.from({ length: 60 }, () => ({ name: 'a', amount: '1' })),
  }));
  await assertFails(set(ref(bob, `households/${HID}/recipes/r3`), {
    ...recipe, ingredients: [{ name: 'a', amount: 'x'.repeat(41) }],
  }));
});

test('photos: new top-level path, legacy path delete-only', async () => {
  const bob = db('bob');
  const ok = `data:image/jpeg;base64,${'A'.repeat(1000)}`;
  await assertSucceeds(set(ref(bob, `householdPhotos/${HID}/r1`), ok));
  await assertSucceeds(get(ref(bob, `householdPhotos/${HID}/r1`)));
  await assertFails(get(ref(db('eve'), `householdPhotos/${HID}/r1`)));
  await assertFails(set(ref(db('eve'), `householdPhotos/${HID}/r1`), ok));
  await assertFails(set(ref(bob, `householdPhotos/${HID}/r1`), 'data:text/html;base64,AAAA'));
  await assertFails(set(ref(bob, `householdPhotos/${HID}/r1`), `data:image/jpeg;base64,${'A'.repeat(400000)}`));
  await assertSucceeds(get(ref(bob, `households/${HID}/photos/r1`)));
  await assertFails(set(ref(bob, `households/${HID}/photos/r1`), ok));
  await assertSucceeds(update(ref(bob), {
    [`householdPhotos/${HID}/r1`]: null,
    [`households/${HID}/photos/r1`]: null,
  }));
});

test('member replaces all recipes in one multi-path update (delete + photos + plan + new set)', async () => {
  const bob = db('bob');
  await assertSucceeds(set(ref(bob, `households/${HID}/plan/${today}/lunch`), 'r1'));
  await assertSucceeds(set(ref(bob, `householdPhotos/${HID}/r1`), 'data:image/jpeg;base64,AAAA'));
  const placeholder = { name: 'Snídaně od Páji', emoji: '🍽️', type: 'breakfast', preparation: '',
    instructions: 'Recept doplňte (poslala Pája).', hasPhoto: false, createdBy: 'bob', updatedAt: 5 };
  await assertSucceeds(update(ref(bob), {
    [`households/${HID}/recipes/r1`]: null,
    [`householdPhotos/${HID}/r1`]: null,
    [`households/${HID}/photos/r1`]: null,
    [`households/${HID}/plan/${today}/lunch`]: null,
    [`households/${HID}/recipes/n1`]: placeholder,
    [`households/${HID}/recipes/n2`]: { ...recipe, createdBy: 'bob', updatedAt: 5 },
    [`households/${HID}/activity/a1`]: { type: 'recipe', text: 'Bob nahradil(a) recepty novou sadou', by: 'bob', at: 5 },
  }));
  const snap = await get(ref(bob, `households/${HID}/recipes`));
  assert.deepStrictEqual(Object.keys(snap.val()).sort(), ['n1', 'n2']);
  assert.strictEqual((await get(ref(bob, `householdPhotos/${HID}/r1`))).exists(), false);
  // an outsider cannot do it
  await assertFails(update(ref(db('eve')), { [`households/${HID}/recipes/n1`]: null }));
});

test('member deletes a recipe together with its photo', async () => {
  const bob = db('bob');
  await assertSucceeds(set(ref(bob, `householdPhotos/${HID}/r1`), 'data:image/jpeg;base64,AAAA'));
  await assertSucceeds(update(ref(bob), {
    [`households/${HID}/recipes/r1`]: null,
    [`householdPhotos/${HID}/r1`]: null,
    [`households/${HID}/photos/r1`]: null,
  }));
});

test('plan validation', async () => {
  const bob = db('bob');
  await assertSucceeds(set(ref(bob, `households/${HID}/plan/${today}/lunch`), 'r1'));
  await assertSucceeds(remove(ref(bob, `households/${HID}/plan/${today}/lunch`)));
  await assertFails(set(ref(bob, `households/${HID}/plan/${today}/brunch`), 'r1'));
  await assertFails(set(ref(bob, `households/${HID}/plan/tomorrow/lunch`), 'r1'));
  await assertFails(set(ref(bob, `households/${HID}/plan/${today}/lunch`), 'x'.repeat(41)));
  await assertFails(set(ref(bob, `households/${HID}/plan/${today}/lunch`), 5));
});

test('orders validation', async () => {
  const bob = db('bob');
  await assertSucceeds(update(ref(bob, `households/${HID}`), {
    'orders/2026-11-11': { status: 'ordered', at: 5, by: 'bob' },
  }));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-12`), { status: 'ordered', at: 5, by: 'alice' }));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-12`), { status: 'paid', at: 5, by: 'bob' }));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-12`), { status: 'ordered', at: 5, by: 'bob', x: 1 }));
  // partner flags a change on an order created by someone else
  await assertSucceeds(set(ref(bob, `households/${HID}/orders/${today}/planChanged`), true));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-20/planChanged`), true));
  await assertSucceeds(remove(ref(bob, `households/${HID}/orders/${today}`)));
  // rohlikOrderId (written by rohlikSyncOrders) is a positive integer
  await assertSucceeds(set(ref(bob, `households/${HID}/orders/2026-11-13`), { status: 'ordered', at: 5, by: 'bob', rohlikOrderId: 123456 }));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-14`), { status: 'ordered', at: 5, by: 'bob', rohlikOrderId: 'x' }));
  await assertFails(set(ref(bob, `households/${HID}/orders/2026-11-14`), { status: 'ordered', at: 5, by: 'bob', rohlikOrderId: 1.5 }));
});

test('pantry, settings, activity, pushTokens, regulars', async () => {
  const bob = db('bob');
  await assertSucceeds(set(ref(bob, `households/${HID}/pantry/sůl`), true));
  await assertFails(set(ref(bob, `households/${HID}/pantry/sůl`), 'yes'));
  await assertFails(set(ref(bob, `households/${HID}/pantry/${'x'.repeat(101)}`), true));

  await assertSucceeds(update(ref(bob, `households/${HID}/settings`), { remindHour: 20, remind3d: false }));
  await assertFails(update(ref(bob, `households/${HID}/settings`), { remindHour: 24 }));
  await assertFails(update(ref(bob, `households/${HID}/settings`), { evil: true }));

  await assertSucceeds(push(ref(bob, `households/${HID}/activity`), { type: 'plan', text: 'ahoj', by: 'bob', at: 1 }));
  await assertFails(push(ref(bob, `households/${HID}/activity`), { type: 'plan', text: 'ahoj', by: 'alice', at: 1 }));
  await assertFails(push(ref(bob, `households/${HID}/activity`), { type: 'hack', text: 'ahoj', by: 'bob', at: 1 }));
  await assertFails(push(ref(bob, `households/${HID}/activity`), { type: 'plan', text: 'x'.repeat(201), by: 'bob', at: 1 }));

  await assertSucceeds(set(ref(bob, `households/${HID}/pushTokens/bob/t1`), { token: 'tok', createdAt: 1, ua: 'x' }));
  await assertFails(set(ref(bob, `households/${HID}/pushTokens/alice/t1`), { token: 'tok', createdAt: 1 }));
  await assertFails(set(ref(bob, `households/${HID}/pushTokens/bob/t2`), { token: 'x'.repeat(4097) }));

  await assertSucceeds(set(ref(bob, `households/${HID}/regulars/k1`), {
    name: 'Káva', amount: '1 balení', auto: true, createdBy: 'bob', createdAt: 1,
  }));
  await assertFails(set(ref(bob, `households/${HID}/regulars/k2`), { name: '' }));
  await assertFails(set(ref(bob, `households/${HID}/regulars/k2`), { name: 'Káva', amount: 'x'.repeat(41) }));
  await assertFails(set(ref(bob, `households/${HID}/regulars/k2`), { name: 'Káva', auto: 'yes' }));
  await assertFails(set(ref(db('eve'), `households/${HID}/regulars/k2`), { name: 'Káva' }));
});

test('settings/shop validation', async () => {
  const bob = db('bob');
  await assertSucceeds(update(ref(bob, `households/${HID}/settings`), {
    'shop/preferLight': true, 'shop/preferBio': false, 'shop/sort': 'unitPrice',
  }));
  await assertSucceeds(set(ref(bob, `households/${HID}/settings/shop/sort`), 'best'));
  await assertFails(set(ref(bob, `households/${HID}/settings/shop/sort`), 'cheapest'));
  await assertFails(set(ref(bob, `households/${HID}/settings/shop/preferBio`), 'yes'));
  await assertFails(set(ref(bob, `households/${HID}/settings/shop/evil`), true));
  await assertFails(set(ref(db('eve'), `households/${HID}/settings/shop/preferLight`), true));
  // the rest of the settings stay intact
  const snap = await get(ref(bob, `households/${HID}/settings`));
  assert.strictEqual(snap.val().remindHour, 9);
});

test('settings/delivery validation', async () => {
  const bob = db('bob');
  await assertSucceeds(update(ref(bob, `households/${HID}/settings`), {
    'delivery/addressId': 123456,
    'delivery/addressLabel': 'Hlavní 1, Brno',
    'delivery/window': 'evening',
    'delivery/lead': 'dayBefore',
    'delivery/paymentId': 'CARD_ON_PLACE',
    'delivery/paymentLabel': 'Kartou při převzetí',
    'delivery/courierNote': 'Zvonek 3. patro',
    'delivery/packaging': 'REUSABLE_BAGS',
  }));
  await assertSucceeds(set(ref(bob, `households/${HID}/settings/delivery/packaging`), null));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/addressId`), 'abc'));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/addressId`), 1.5));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/addressLabel`), 'x'.repeat(81)));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/window`), 'night'));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/lead`), 'weekBefore'));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/paymentId`), 'card; drop'));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/courierNote`), 'x'.repeat(301)));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/packaging`), 'PLASTIC'));
  await assertFails(set(ref(bob, `households/${HID}/settings/delivery/phone`), '777'));
  await assertFails(set(ref(db('eve'), `households/${HID}/settings/delivery/window`), 'any'));
  const snap = await get(ref(bob, `households/${HID}/settings/delivery`));
  assert.strictEqual(snap.val().lead, 'dayBefore');
});

test('productPrefs validation', async () => {
  const bob = db('bob');
  const pref = {
    productId: '1234', name: 'Madeta Cottage 180 g', imageUrl: 'https://cdn.rohlik.cz/images/1234.jpg',
    priceText: '39,90 Kč', packText: '180 g', count: 1, lastAt: 5, by: 'bob',
  };
  await assertSucceeds(set(ref(bob, `households/${HID}/productPrefs/cottage sýr`), pref));
  await assertSucceeds(update(ref(bob, `households/${HID}/productPrefs`), {
    'cottage sýr': { ...pref, count: 2 },
    'regular:k1': { productId: '9', name: 'Káva', count: 1, lastAt: 6, by: 'bob' },
  }));
  await assertSucceeds(get(ref(db('alice'), `households/${HID}/productPrefs`)));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, by: 'alice' }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, count: '2' }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, count: 0 }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, lastAt: 'now' }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, name: 'x'.repeat(201) }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, priceText: 'x'.repeat(201) }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, imageUrl: 'javascript:alert(1)' }));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), { ...pref, evil: 1 }));
  const { productId, ...noId } = pref;
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/x`), noId));
  await assertFails(set(ref(bob, `households/${HID}/productPrefs/${'k'.repeat(121)}`), pref));
  await assertFails(set(ref(db('eve'), `households/${HID}/productPrefs/x`), { ...pref, by: 'eve' }));
  await assertFails(get(ref(db('eve'), `households/${HID}/productPrefs`)));
  await assertSucceeds(remove(ref(bob, `households/${HID}/productPrefs/cottage sýr`)));
});

test('other household is isolated', async () => {
  await assertFails(get(ref(db('alice'), `households/${OTHER}`)));
  await assertFails(set(ref(db('alice'), `households/${OTHER}/plan/${today}/lunch`), 'r1'));
  await assertFails(set(ref(db('alice'), `householdPhotos/${OTHER}/r1`), 'data:image/jpeg;base64,AA'));
});
