'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const rohlik = require('./src/rohlikAdapter');
const rem = require('./src/reminders');

admin.initializeApp({ databaseURL: 'https://cappymeal-go-default-rtdb.europe-west1.firebasedatabase.app' });
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

const RHL_EMAIL = defineSecret('RHL_EMAIL');
const RHL_PASS = defineSecret('RHL_PASS');
const secrets = [RHL_EMAIL, RHL_PASS];

function credentials() {
  const email = (RHL_EMAIL.value() || '').trim();
  const pass = (RHL_PASS.value() || '').trim();
  if (!email || !pass) {
    throw new HttpsError('failed-precondition', 'Přihlašovací údaje k Rohlíku nejsou nastavené.');
  }
  return { email, pass };
}

async function requireMember(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Je potřeba se přihlásit.');
  const uid = request.auth.uid;
  const db = admin.database();
  const hid = (await db.ref(`users/${uid}/householdId`).get()).val();
  if (!hid) throw new HttpsError('permission-denied', 'Nejsi členem žádné domácnosti.');
  const member = (await db.ref(`households/${hid}/members/${uid}`).get()).val();
  if (!member) throw new HttpsError('permission-denied', 'Nejsi členem této domácnosti.');
  return { uid, hid, nickname: member.nickname || 'Někdo' };
}

async function withClient(fn) {
  const { email, pass } = credentials();
  let client;
  try {
    client = await rohlik.connect(email, pass);
  } catch (e) {
    console.error('Rohlik connect failed', e);
    throw new HttpsError('unavailable', 'Nepodařilo se připojit k Rohlíku. Zkontroluj přihlašovací údaje.');
  }
  try {
    return await fn(client);
  } finally {
    try { await client.close(); } catch (e) { /* ignore */ }
  }
}

exports.rohlikStatus = onCall({ secrets }, async (request) => {
  await requireMember(request);
  const email = (RHL_EMAIL.value() || '').trim();
  const pass = (RHL_PASS.value() || '').trim();
  if (!email || !pass) return { configured: false, tools: [] };
  return withClient(async (client) => {
    const tools = await rohlik.listTools(client, { refresh: true });
    return { configured: true, tools: tools.map((t) => ({ name: t.name, description: t.description || '' })) };
  });
});

exports.rohlikMatch = onCall({ secrets, timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  await requireMember(request);
  const items = (request.data && request.data.items) || [];
  if (!Array.isArray(items)) throw new HttpsError('invalid-argument', 'Neplatný seznam surovin.');
  if (items.length > 60) throw new HttpsError('invalid-argument', 'Příliš mnoho položek (max. 60).');
  const clean = items.filter((i) => i && typeof i.key === 'string' && typeof i.name === 'string');
  return withClient(async (client) => {
    const results = new Array(clean.length);
    let next = 0;
    async function worker() {
      while (next < clean.length) {
        const idx = next++;
        const it = clean[idx];
        let candidates = [];
        try {
          candidates = await rohlik.searchProducts(client, rohlik.simplifyQuery(it.name), 4);
        } catch (e) {
          console.warn('search failed', it.name, e.message);
        }
        results[idx] = { key: it.key, candidates };
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, clean.length) }, worker));
    return { results };
  });
});

exports.rohlikFillCart = onCall({ secrets, timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  const { uid, hid, nickname } = await requireMember(request);
  const { days, products } = request.data || {};
  const dayOk = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!Array.isArray(days) || !days.length || days.length > 31 || !days.every(dayOk)) {
    throw new HttpsError('invalid-argument', 'Neplatné dny.');
  }
  if (!Array.isArray(products) || !products.length || products.length > 120) {
    throw new HttpsError('invalid-argument', 'Neplatný seznam produktů.');
  }
  const clean = products.map((p) => ({
    productId: String((p && p.productId) || ''),
    quantity: Math.max(1, Math.min(50, parseInt(p && p.quantity, 10) || 1)),
  }));
  if (clean.some((p) => !p.productId)) throw new HttpsError('invalid-argument', 'Produkt bez ID.');

  const out = await withClient((client) => rohlik.addToCart(client, clean));
  if (out.added > 0) {
    const at = Date.now();
    const updates = {};
    days.forEach((d) => { updates[`households/${hid}/orders/${d}`] = { status: 'in_cart', at, by: uid }; });
    const actKey = admin.database().ref(`households/${hid}/activity`).push().key;
    updates[`households/${hid}/activity/${actKey}`] = {
      type: 'order', text: `${nickname} vložil(a) nákup do košíku na Rohlíku`, by: uid, at,
    };
    await admin.database().ref().update(updates);
  }
  return { ok: out.added > 0 && out.failed.length === 0, added: out.added, failed: out.failed };
});

const BAD_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

exports.dailyReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: rem.TZ, region: 'europe-west1' },
  async () => {
    const db = admin.database();
    const now = new Date();
    const hour = rem.pragueHour(now);
    const today = rem.pragueDateString(now);
    const households = (await db.ref('households').get()).val() || {};
    for (const [hid, h] of Object.entries(households)) {
      const settings = h.settings || {};
      const remindHour = settings.remindHour === undefined ? 9 : Number(settings.remindHour);
      if (remindHour !== hour) continue;
      const msg = rem.buildMessage(rem.computeReminderDates(today, h.plan, h.orders, settings));
      if (!msg) continue;
      const tokens = [];
      for (const [uid, byId] of Object.entries(h.pushTokens || {})) {
        for (const [id, t] of Object.entries(byId || {})) {
          if (t && t.token) tokens.push({ token: t.token, uid, id });
        }
      }
      if (!tokens.length) continue;
      try {
        const res = await admin.messaging().sendEachForMulticast({
          tokens: tokens.map((t) => t.token),
          notification: { title: msg.title, body: msg.body },
          data: { link: '/cart' },
          webpush: { fcmOptions: { link: 'https://cappymeal-go.web.app/cart' } },
        });
        const removals = {};
        res.responses.forEach((r, i) => {
          if (r.error && BAD_TOKEN_CODES.includes(r.error.code)) {
            removals[`households/${hid}/pushTokens/${tokens[i].uid}/${tokens[i].id}`] = null;
          }
        });
        if (Object.keys(removals).length) await db.ref().update(removals);
      } catch (e) {
        console.error('FCM send failed for', hid, e);
      }
    }
  },
);
