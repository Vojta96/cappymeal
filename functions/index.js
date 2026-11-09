'use strict';
const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');
const rohlik = require('./src/rohlikAdapter');
const rem = require('./src/reminders');
const v = require('./src/validate');
const enc = require('./src/crypto');
const rl = require('./src/rateLimit');
const oauth = require('./src/rohlikOAuth');
const matcher = require('./src/matcher');
const co = require('./src/checkout');

const DB_URL = 'https://cappymeal-go-default-rtdb.europe-west1.firebasedatabase.app';
admin.initializeApp({ databaseURL: DB_URL });
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

// Only secret: key for the per-household Rohlík OAuth tokens (base64 of 32 random bytes).
const ROHLIK_ENC_KEY = defineSecret('ROHLIK_ENC_KEY');

const CALLABLE = { maxInstances: 3 };
const ROHLIK = { ...CALLABLE, secrets: [ROHLIK_ENC_KEY], timeoutSeconds: 300, memory: '512MiB' };
const MAX_MEMBERS = 6;

const db = () => admin.database();

// ---------- errors ----------

/** HttpsError with a generic Czech message and a stable machine code in details.code. */
function fail(status, message, code) {
  return new HttpsError(status, message, { code });
}

const notConnected = () => fail(
  'failed-precondition',
  'Tato domácnost nemá připojený účet Rohlík. Připojte ho v Nastavení.',
  'ROHLIK_NOT_CONNECTED',
);

/** Wraps a handler: known errors pass through, everything else becomes a generic error (details only in logs). */
function handle(name, fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      if (e instanceof v.InputError) throw fail('invalid-argument', e.message, e.code);
      if (e instanceof rohlik.ToolError) {
        // Only the tool name + a masked summary (never the tool's text, which may contain personal data).
        console.warn(`${name}: Rohlík tool ${e.tool} returned an error:`, e.detail);
        throw fail('failed-precondition', 'Rohlík požadavek odmítl. Zkuste to znovu nebo jinou volbu.', 'ROHLIK_REJECTED');
      }
      console.error(`${name} failed:`, (e && e.message) || String(e));
      throw fail('internal', 'Něco se nepovedlo. Zkuste to znovu.', 'INTERNAL');
    }
  };
}

async function limit(path, max) {
  if (!(await rl.consume(db(), `rateLimits/${path}`, max))) {
    throw fail('resource-exhausted', 'Příliš mnoho požadavků. Zkuste to později.', 'RATE_LIMITED');
  }
}

// ---------- auth / membership ----------

function requireAuth(request) {
  if (!request.auth) throw fail('unauthenticated', 'Je potřeba se přihlásit.', 'UNAUTHENTICATED');
  return request.auth.uid;
}

async function requireMember(request) {
  const uid = requireAuth(request);
  const hid = (await db().ref(`users/${uid}/householdId`).get()).val();
  if (!hid) throw fail('permission-denied', 'Nejste členem žádné domácnosti.', 'NOT_MEMBER');
  const member = (await db().ref(`households/${hid}/members/${uid}`).get()).val();
  if (!member) throw fail('permission-denied', 'Nejste členem této domácnosti.', 'NOT_MEMBER');
  // Display form (server-written activity texts, Rohlík status "by"): capitalized like the client shows names.
  return { uid, hid, nickname: v.capitalizeFirst(member.nickname).slice(0, 32) || 'Někdo' };
}

/** Sets households/{hid}/owner to the earliest member if it is missing. Returns the owner uid. */
async function ensureOwner(hid) {
  const ownerRef = db().ref(`households/${hid}/owner`);
  const existing = (await ownerRef.get()).val();
  if (existing) return existing;
  const members = (await db().ref(`households/${hid}/members`).get()).val() || {};
  const first = Object.entries(members)
    .sort(([a, x], [b, y]) => ((x && x.joinedAt) || Infinity) - ((y && y.joinedAt) || Infinity) || a.localeCompare(b))[0];
  if (!first) return null;
  const res = await ownerRef.transaction((cur) => cur || first[0]);
  return res.snapshot.val();
}

async function requireOwner(request) {
  const m = await requireMember(request);
  const owner = await ensureOwner(m.hid);
  if (owner !== m.uid) {
    throw fail('permission-denied', 'Tuto akci může provést jen zakladatel domácnosti.', 'NOT_OWNER');
  }
  return m;
}

async function displayNickname(uid, fallbackEmail) {
  const stored = (await db().ref(`users/${uid}/nickname`).get()).val();
  if (typeof stored === 'string' && stored.trim()) return stored.trim().slice(0, 32);
  const local = String(fallbackEmail || '').split('@')[0];
  return v.capitalizeFirst(local).slice(0, 32) || 'Člen';
}

/** Reserves a free join code for hid (transaction, so two households never share a code). */
async function reserveJoinCode(hid) {
  for (let i = 0; i < 8; i++) {
    const code = v.generateJoinCode(crypto.randomInt);
    // eslint-disable-next-line no-await-in-loop
    const res = await db().ref(`joinCodes/${code}`).transaction((cur) => (cur === null ? hid : undefined));
    if (res.committed) return code;
  }
  throw new Error('could not allocate join code');
}

async function rotateCode(hid) {
  const old = (await db().ref(`households/${hid}/joinCode`).get()).val();
  const code = await reserveJoinCode(hid);
  const updates = { [`households/${hid}/joinCode`]: code };
  if (old && old !== code) {
    const oldTarget = (await db().ref(`joinCodes/${old}`).get()).val();
    if (oldTarget === hid) updates[`joinCodes/${old}`] = null;
  }
  await db().ref().update(updates);
  return code;
}

// ---------- accounts ----------

async function userExists(email) {
  try {
    await admin.auth().getUserByEmail(email);
    return true;
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') return false;
    throw e;
  }
}

exports.registerAccount = onCall(CALLABLE, handle('registerAccount', async (request) => {
  const { key, display, password } = v.validateRegistration(request.data);
  const ip = v.ipKey(request.rawRequest && request.rawRequest.ip);
  await limit(`ip/${ip}/registerAccount`, 5);
  const email = v.loginEmail(key);
  if ((await userExists(email)) || (await userExists(v.legacyEmail(key)))) {
    throw fail('already-exists', 'Tato přezdívka už je obsazená.', 'NICKNAME_TAKEN');
  }
  let user;
  try {
    user = await admin.auth().createUser({ email, password, displayName: display });
  } catch (e) {
    if (e && e.code === 'auth/email-already-exists') {
      throw fail('already-exists', 'Tato přezdívka už je obsazená.', 'NICKNAME_TAKEN');
    }
    if (e && (e.code === 'auth/invalid-email' || e.code === 'auth/invalid-password')) {
      console.warn('registerAccount rejected by Auth:', e.code);
      throw fail('invalid-argument', 'Přezdívku nebo heslo nelze použít.', 'INVALID_INPUT');
    }
    throw e;
  }
  await db().ref(`users/${user.uid}`).set({ nickname: display });
  return { ok: true };
}));

exports.migrateLoginEmail = onCall(CALLABLE, handle('migrateLoginEmail', async (request) => {
  const uid = requireAuth(request);
  const user = await admin.auth().getUser(uid);
  const email = String(user.email || '');
  const suffix = `@${v.LEGACY_DOMAIN}`;
  if (!email.toLowerCase().endsWith(suffix)) return { migrated: false };
  const local = email.slice(0, -suffix.length).toLowerCase();
  const next = v.loginEmail(local);
  if (await userExists(next)) {
    console.warn('migrateLoginEmail: target e-mail already used, uid', uid);
    throw fail('already-exists', 'Účet nelze převést.', 'MIGRATION_CONFLICT');
  }
  await admin.auth().updateUser(uid, { email: next });

  // Older accounts stored no nickname or the lowercase e-mail-derived one: save the typed form.
  const typed = request.data && typeof request.data.nickname === 'string' ? request.data.nickname : '';
  const display = v.capitalizeFirst(typed).slice(0, 32);
  if (display && v.normalizeNickname(typed) === local) {
    const prof = (await db().ref(`users/${uid}`).get()).val() || {};
    if ((!prof.nickname || prof.nickname === local) && prof.nickname !== display) {
      const updates = { [`users/${uid}/nickname`]: display };
      if (prof.householdId) {
        const member = (await db().ref(`households/${prof.householdId}/members/${uid}`).get()).val();
        if (member) updates[`households/${prof.householdId}/members/${uid}/nickname`] = display;
      }
      await db().ref().update(updates);
    }
  }
  return { migrated: true };
}));

// ---------- households ----------

exports.createHousehold = onCall(CALLABLE, handle('createHousehold', async (request) => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const name = v.validateHouseholdName(data.name);
  const now = Date.now();
  const recipes = v.validateSeedRecipes(data.recipes, uid, now);
  const current = (await db().ref(`users/${uid}/householdId`).get()).val();
  if (current && (await db().ref(`households/${current}/members/${uid}`).get()).exists()) {
    throw fail('failed-precondition', 'Už jste členem domácnosti.', 'ALREADY_MEMBER');
  }
  await limit(`u/${uid}/createHousehold`, 5);
  const nickname = await displayNickname(uid, request.auth.token.email);
  const hid = db().ref('households').push().key;
  const code = await reserveJoinCode(hid);
  const recipeMap = {};
  recipes.forEach((r) => {
    recipeMap[db().ref(`households/${hid}/recipes`).push().key] = r;
  });
  await db().ref().update({
    [`households/${hid}`]: {
      name,
      owner: uid,
      joinCode: code,
      createdAt: now,
      members: { [uid]: { nickname, joinedAt: now } },
      settings: { remind3d: true, remindDaily: true, remindBoth: true, remindHour: 9 },
      recipes: recipeMap,
    },
    [`householdIndex/${hid}`]: true,
    [`users/${uid}/householdId`]: hid,
    [`users/${uid}/nickname`]: nickname,
  });
  return { hid };
}));

exports.joinHousehold = onCall(CALLABLE, handle('joinHousehold', async (request) => {
  const uid = requireAuth(request);
  await limit(`u/${uid}/joinHousehold`, 10);
  const code = v.validateJoinCode(request.data);
  const current = (await db().ref(`users/${uid}/householdId`).get()).val();
  if (current && (await db().ref(`households/${current}/members/${uid}`).get()).exists()) {
    throw fail('failed-precondition', 'Už jste členem domácnosti.', 'ALREADY_MEMBER');
  }
  const hid = (await db().ref(`joinCodes/${code}`).get()).val();
  const notFound = () => fail('not-found', 'Domácnost s tímto kódem neexistuje.', 'CODE_NOT_FOUND');
  if (typeof hid !== 'string' || !hid) throw notFound();
  const hh = db().ref(`households/${hid}`);
  const [joinCode, members] = await Promise.all([hh.child('joinCode').get(), hh.child('members').get()]);
  if (!members.exists() || joinCode.val() !== code) throw notFound();
  if (Object.keys(members.val()).length >= MAX_MEMBERS) {
    throw fail('failed-precondition', `Domácnost už má maximální počet členů (${MAX_MEMBERS}).`, 'HOUSEHOLD_FULL');
  }
  const nickname = await displayNickname(uid, request.auth.token.email);
  await db().ref().update({
    [`households/${hid}/members/${uid}`]: { nickname, joinedAt: Date.now() },
    [`users/${uid}/householdId`]: hid,
  });
  return { hid };
}));

exports.ensureHouseholdMeta = onCall(CALLABLE, handle('ensureHouseholdMeta', async (request) => {
  const { hid } = await requireMember(request);
  const owner = await ensureOwner(hid);
  await db().ref(`householdIndex/${hid}`).set(true);
  return { owner };
}));

exports.rotateJoinCode = onCall(CALLABLE, handle('rotateJoinCode', async (request) => {
  const { hid } = await requireOwner(request);
  await limit(`h/${hid}/rotateJoinCode`, 20);
  return { code: await rotateCode(hid) };
}));

exports.removeMember = onCall(CALLABLE, handle('removeMember', async (request) => {
  const { uid, hid } = await requireOwner(request);
  const target = v.validateUid(request.data);
  if (target === uid) throw fail('invalid-argument', 'Sami sebe odebrat nemůžete.', 'CANNOT_REMOVE_SELF');
  const owner = (await db().ref(`households/${hid}/owner`).get()).val();
  if (target === owner) throw fail('invalid-argument', 'Zakladatele domácnosti nelze odebrat.', 'CANNOT_REMOVE_OWNER');
  if (!(await db().ref(`households/${hid}/members/${target}`).get()).exists()) {
    throw fail('not-found', 'Tento člen v domácnosti není.', 'MEMBER_NOT_FOUND');
  }
  const updates = {
    [`households/${hid}/members/${target}`]: null,
    [`households/${hid}/pushTokens/${target}`]: null,
  };
  const theirHid = (await db().ref(`users/${target}/householdId`).get()).val();
  if (theirHid === hid) updates[`users/${target}/householdId`] = null;
  await db().ref().update(updates);
  const code = await rotateCode(hid);
  return { ok: true, code };
}));

// ---------- Rohlík (per-household OAuth tokens) ----------

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const isAuthError = (e) => {
  const msg = String((e && e.message) || '');
  return (e && (e.code === 401 || e.code === 403)) || /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid_token/i.test(msg);
};

const expiredError = () => fail(
  'failed-precondition',
  'Přihlášení k Rohlíku vypršelo. Připojte účet znovu v Nastavení.',
  'ROHLIK_AUTH_EXPIRED',
);

/** The household must reconnect: drop tokens, keep a public hint for the UI. */
async function markExpired(hid) {
  const pub = (await db().ref(`households/${hid}/rohlik`).get()).val() || {};
  await db().ref().update({
    [`rohlikCredentials/${hid}`]: null,
    [`households/${hid}/rohlik`]: {
      connected: false,
      needsReconnect: true,
      emailMasked: pub.emailMasked || null,
      method: 'oauth',
      by: pub.by || null,
      connectedAt: pub.connectedAt || null,
    },
  });
}

/** The single dynamically registered public OAuth client (lazily, guarded against double registration). */
async function getOAuthClient() {
  const ref = db().ref('rohlikOAuthClient');
  const want = oauth.CONFIG.REDIRECT_URI;
  const usable = (c) => c && c.client_id && c.redirect_uri === want;
  for (let i = 0; i < 30; i++) {
    // eslint-disable-next-line no-await-in-loop
    const cur = (await ref.get()).val();
    if (usable(cur)) return cur;
    const now = Date.now();
    // eslint-disable-next-line no-await-in-loop
    const claim = await ref.transaction((c) => {
      if (usable(c)) return undefined;
      if (c && c.lockedAt && now - c.lockedAt < 30000) return undefined;
      return { lockedAt: now };
    });
    if (claim.committed) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const reg = await oauth.registerClient();
        const rec = { client_id: reg.client_id, redirect_uri: want, registeredAt: Date.now() };
        // eslint-disable-next-line no-await-in-loop
        await ref.set(rec);
        return rec;
      } catch (e) {
        // eslint-disable-next-line no-await-in-loop
        await ref.set(null);
        throw e;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(500);
  }
  throw new Error('OAuth client registration busy');
}

/** Decrypted OAuth record { access_token, refresh_token, expiresAt, scope } or throws. */
async function loadTokens(hid, rec) {
  if (!rec) throw notConnected();
  if (rec.v !== 2) {
    // Legacy e-mail/password record – Rohlík no longer accepts it.
    await markExpired(hid);
    throw expiredError();
  }
  try {
    return enc.decryptJson(rec, ROHLIK_ENC_KEY.value(), hid);
  } catch (e) {
    console.error('Rohlik credentials unusable for household', hid, (e && e.message) || '');
    await markExpired(hid);
    throw expiredError();
  }
}

async function saveTokens(hid, tokens, by) {
  await db().ref(`rohlikCredentials/${hid}`).set({
    ...enc.encryptJson(tokens, ROHLIK_ENC_KEY.value(), hid, 2),
    updatedAt: Date.now(),
    by: by || null,
  });
}

/** A valid access token for the household; refreshes (one refresher at a time) when it expires within 60 s. */
async function getAccessToken(hid) {
  const credRef = db().ref(`rohlikCredentials/${hid}`);
  for (let attempt = 0; attempt < 20; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    const rec = (await credRef.get()).val();
    // eslint-disable-next-line no-await-in-loop
    const tokens = await loadTokens(hid, rec);
    if (!oauth.needsRefresh(tokens)) return tokens.access_token;
    if (!tokens.refresh_token) {
      // eslint-disable-next-line no-await-in-loop
      await markExpired(hid);
      throw expiredError();
    }
    const now = Date.now();
    // Short lock so concurrent requests do not spend the same (rotating) refresh token twice.
    // eslint-disable-next-line no-await-in-loop
    // NB: RTDB runs the update function first with the locally cached value, which is null on a fresh
    // instance. Returning undefined there aborts the transaction for good (that bug made every refresh
    // spin 20 × 750 ms and fail with 503). Return null to let the server retry with the real value.
    const lock = await credRef.transaction((c) => {
      if (c === null) return null;
      if (c.refreshLock && now - c.refreshLock < 20000) return undefined;
      return { ...c, refreshLock: now };
    });
    const won = lock.committed && lock.snapshot.exists() && lock.snapshot.child('refreshLock').val() === now;
    if (!lock.snapshot.exists()) {
      // eslint-disable-next-line no-await-in-loop
      await markExpired(hid);
      throw expiredError();
    }
    if (!won) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(750);
      continue; // eslint-disable-line no-continue
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const client = await getOAuthClient();
      // eslint-disable-next-line no-await-in-loop
      const res = await oauth.refreshTokens({ clientId: client.client_id, refreshToken: tokens.refresh_token });
      const next = oauth.tokenRecord(res, Date.now(), tokens.refresh_token);
      // eslint-disable-next-line no-await-in-loop
      await saveTokens(hid, next, rec.by); // also clears refreshLock
      return next.access_token;
    } catch (e) {
      console.error('Rohlik token refresh failed:', (e && e.message) || '');
      if (e instanceof oauth.OAuthError && (e.error === 'invalid_grant' || e.error === 'invalid_client' || e.status === 401)) {
        // eslint-disable-next-line no-await-in-loop
        await markExpired(hid);
        throw expiredError();
      }
      // eslint-disable-next-line no-await-in-loop
      await credRef.child('refreshLock').remove().catch(() => {});
      throw fail('unavailable', 'Nepodařilo se připojit k Rohlíku. Zkuste to později.', 'ROHLIK_UNAVAILABLE');
    }
  }
  throw fail('unavailable', 'Nepodařilo se připojit k Rohlíku. Zkuste to později.', 'ROHLIK_UNAVAILABLE');
}

async function requireConnected(hid) {
  if (!(await db().ref(`rohlikCredentials/${hid}`).get()).exists()) throw notConnected();
}

async function withClient(hid, fn) {
  const token = await getAccessToken(hid);
  let client;
  try {
    client = await rohlik.connect(token);
  } catch (e) {
    console.error('Rohlik connect failed:', (e && e.message) || '');
    if (isAuthError(e)) {
      await markExpired(hid);
      throw expiredError();
    }
    throw fail('unavailable', 'Nepodařilo se připojit k Rohlíku. Zkuste to později.', 'ROHLIK_UNAVAILABLE');
  }
  try {
    return await fn(client);
  } catch (e) {
    if (!(e instanceof HttpsError) && !(e instanceof rohlik.ToolError) && isAuthError(e)) {
      console.error('Rohlik call rejected the token');
      await markExpired(hid);
      throw expiredError();
    }
    throw e;
  } finally {
    try { await client.close(); } catch (e) { /* ignore */ }
  }
}

exports.rohlikOAuthStart = onCall(ROHLIK, handle('rohlikOAuthStart', async (request) => {
  const { uid, hid } = await requireOwner(request);
  await limit(`h/${hid}/rohlikOAuthStart`, 10);
  const client = await getOAuthClient();
  const { verifier, challenge } = oauth.createPkce();
  const state = oauth.randomState();
  await db().ref(`rohlikOAuthPending/${hid}`).set({
    verifierEnc: enc.encryptJson({ verifier }, ROHLIK_ENC_KEY.value(), `${hid}:pkce`, 2),
    state,
    uid,
    clientId: client.client_id,
    redirectUri: client.redirect_uri,
    createdAt: Date.now(),
  });
  return {
    authUrl: oauth.buildAuthUrl({ clientId: client.client_id, redirectUri: client.redirect_uri, state, challenge }),
    redirectUri: client.redirect_uri,
  };
}));

exports.rohlikOAuthFinish = onCall(ROHLIK, handle('rohlikOAuthFinish', async (request) => {
  const { uid, hid } = await requireOwner(request);
  await limit(`h/${hid}/rohlikOAuthFinish`, 10);
  const pendingRef = db().ref(`rohlikOAuthPending/${hid}`);
  const pending = (await pendingRef.get()).val();
  if (oauth.pendingExpired(pending)) {
    throw fail('failed-precondition', 'Platnost přihlášení vypršela. Začněte znovu tlačítkem „Přihlásit se přes Rohlík“.', 'OAUTH_EXPIRED');
  }
  const { code, state } = oauth.parseRedirectUrl(request.data && request.data.redirectUrl, pending.redirectUri);
  if (!oauth.stateMatches(state, pending.state)) {
    throw fail('invalid-argument', 'Adresa nepatří k poslednímu přihlášení. Začněte znovu tlačítkem „Přihlásit se přes Rohlík“.', 'OAUTH_STATE');
  }
  // The code is single-use: whatever happens next, this attempt is over.
  await pendingRef.remove();
  const { verifier } = enc.decryptJson(pending.verifierEnc, ROHLIK_ENC_KEY.value(), `${hid}:pkce`);
  let res;
  try {
    res = await oauth.exchangeCode({ clientId: pending.clientId, code, verifier, redirectUri: pending.redirectUri });
  } catch (e) {
    console.warn('Rohlik code exchange failed:', (e && e.message) || '');
    if (e instanceof oauth.OAuthError && e.status >= 400 && e.status < 500) {
      throw fail('failed-precondition', 'Přihlašovací kód už neplatí. Začněte připojení znovu.', 'OAUTH_CODE_INVALID');
    }
    throw fail('unavailable', 'Rohlík teď neodpovídá. Zkuste to za chvíli.', 'ROHLIK_UNAVAILABLE');
  }
  const tokens = oauth.tokenRecord(res, Date.now());
  let client;
  try {
    client = await rohlik.connect(tokens.access_token);
    const tools = await rohlik.listTools(client);
    if (!tools.length) throw new Error('no tools');
  } catch (e) {
    console.warn('Rohlik MCP verification failed:', (e && e.message) || '');
    throw fail('failed-precondition', 'Přihlášení proběhlo, ale Rohlík nepovolil přístup k nákupu. Zkuste to znovu.', 'ROHLIK_AUTH_FAILED');
  } finally {
    if (client) { try { await client.close(); } catch (e) { /* ignore */ } }
  }
  const email = oauth.emailFromIdToken(res.id_token) || (await oauth.fetchUserEmail(tokens.access_token));
  const emailMasked = email ? v.maskEmail(email) : null;
  const now = Date.now();
  await saveTokens(hid, tokens, uid);
  await db().ref(`households/${hid}/rohlik`).set({ connected: true, emailMasked, connectedAt: now, by: uid, method: 'oauth' });
  return { connected: true, emailMasked };
}));

exports.rohlikDisconnect = onCall(CALLABLE, handle('rohlikDisconnect', async (request) => {
  const { hid } = await requireOwner(request);
  // Token revocation needs client authentication we do not have (public client) – the user
  // can revoke access in their Rohlík account; here the tokens are deleted.
  await db().ref().update({
    [`rohlikCredentials/${hid}`]: null,
    [`rohlikOAuthPending/${hid}`]: null,
    [`households/${hid}/rohlik`]: null,
  });
  return { connected: false };
}));

exports.rohlikStatus = onCall(ROHLIK, handle('rohlikStatus', async (request) => {
  const { uid, hid } = await requireMember(request);
  const [credSnap, pubSnap, ownerSnap] = await Promise.all([
    db().ref(`rohlikCredentials/${hid}`).get(),
    db().ref(`households/${hid}/rohlik`).get(),
    db().ref(`households/${hid}/owner`).get(),
  ]);
  if (!credSnap.exists()) return { connected: false, emailMasked: null, toolCount: 0 };
  await limit(`h/${hid}/rohlikStatus`, 60);
  const emailMasked = (pubSnap.val() && pubSnap.val().emailMasked) || null;
  return withClient(hid, async (client) => {
    const tools = await rohlik.listTools(client, { refresh: true });
    const out = { connected: true, emailMasked, toolCount: tools.length };
    if (ownerSnap.val() === uid) {
      out.tools = tools.map((t) => String(t.name));
    }
    return out;
  });
}));

exports.rohlikMatch = onCall(ROHLIK, handle('rohlikMatch', async (request) => {
  const { hid } = await requireMember(request);
  const items = v.validateMatchItems(request.data);
  const prefs = v.validateShopPrefs(request.data);
  await requireConnected(hid);
  await limit(`h/${hid}/rohlikMatch`, 30);
  return withClient(hid, async (client) => {
    let loggedKeys = false;
    // The real shape of Rohlík search results is still unknown: log the key set (never values) once per request.
    const onRaw = (raw) => {
      if (loggedKeys) return;
      loggedKeys = true;
      console.info('rohlikMatch raw product keys:', rohlik.describeKeys(raw));
    };
    const search = (query) => rohlik.searchProducts(client, query, { onRaw });
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const idx = next++;
        const it = items[idx];
        try {
          // eslint-disable-next-line no-await-in-loop
          results[idx] = await matcher.matchItem(search, it, prefs);
        } catch (e) {
          console.warn('rohlikMatch search failed:', (e && e.message) || '');
          results[idx] = { key: it.key, candidates: [], preferred: null };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
    // Images come from Rohlík's public product API (the MCP search has none). Best effort.
    const ids = [];
    results.forEach((r) => ((r && r.candidates) || []).forEach((c) => c && c.productId && ids.push(c.productId)));
    if (ids.length) {
      const imgs = await rohlik.fetchProductImages(ids);
      results.forEach((r) => ((r && r.candidates) || []).forEach((c) => {
        const m = c && imgs.get(String(c.productId));
        if (!m) return;
        if (!c.imageUrl && m.imageUrl) c.imageUrl = m.imageUrl;
        if (!c.url && m.url) c.url = m.url;
      }));
    }
    return { results };
  });
}));

exports.rohlikFillCart = onCall(ROHLIK, handle('rohlikFillCart', async (request) => {
  const { uid, hid, nickname } = await requireMember(request);
  const { days, products } = v.validateFillCart(request.data);
  await requireConnected(hid);
  await limit(`h/${hid}/rohlikFillCart`, 10);
  const out = await withClient(hid, (client) => rohlik.addToCart(client, products));
  if (out.failed.length) {
    console.warn('rohlikFillCart: failed items', out.failed.length, (out.failed[0] && out.failed[0].error) || '');
  }
  if (out.added > 0) {
    const at = Date.now();
    const updates = {};
    days.forEach((d) => { updates[`households/${hid}/orders/${d}`] = { status: 'in_cart', at, by: uid }; });
    const actKey = db().ref(`households/${hid}/activity`).push().key;
    updates[`households/${hid}/activity/${actKey}`] = {
      type: 'order', text: `${nickname} vložil(a) nákup do košíku na Rohlíku`.slice(0, 200), by: uid, at,
    };
    await db().ref().update(updates);
  }
  return {
    ok: out.added > 0 && out.failed.length === 0,
    added: out.added,
    failed: out.failed.map((f) => ({ productId: f.productId })),
  };
}));

// ---------- Rohlík checkout (prepared in CappyMeal, confirmed + paid by the customer in Rohlík) ----------
// Any household member may use the household's connected account. Every tool call goes through the
// adapter allowlist (rohlik.callJson → callAllowed); nothing here can submit or cancel an order.

/** Member + connected + rate limit, then runs work(call, member) on one MCP session. */
async function withCheckout(request, fnName, max, work) {
  const m = await requireMember(request);
  await requireConnected(m.hid);
  await limit(`h/${m.hid}/${fnName}`, max);
  return withClient(m.hid, (client) => work((name, args) => rohlik.callJson(client, name, args), m));
}

/** Fills missing cart images from Rohlík's public product API (best effort). */
async function withImages(cart) {
  const ids = cart.items.filter((x) => !x.imageUrl).map((x) => x.productId);
  if (!ids.length) return cart;
  const imgs = await rohlik.fetchProductImages(ids);
  cart.items.forEach((x) => {
    const m = imgs.get(x.productId);
    if (!x.imageUrl && m && m.imageUrl) x.imageUrl = m.imageUrl;
  });
  return cart;
}

exports.rohlikCart = onCall(ROHLIK, handle('rohlikCart', async (request) => withCheckout(
  request, 'rohlikCart', 60, async (call) => ({ cart: await withImages(await co.loadCart(call)) }),
)));

exports.rohlikCheckout = onCall(ROHLIK, handle('rohlikCheckout', async (request) => {
  const opts = v.validateCheckoutLoad(request.data);
  return withCheckout(request, 'rohlikCheckout', 60, async (call, m) => {
    if (!opts.applyDefaults) return { checkout: await co.loadCheckout(call), applied: [] };
    const delivery = (await db().ref(`households/${m.hid}/settings/delivery`).get()).val();
    return co.applyDefaults(call, delivery, opts.skip);
  });
}));

/** Settings card "Doručení z Rohlíku": addresses (id + short label), payment methods, packaging. */
exports.rohlikDeliveryOptions = onCall(ROHLIK, handle('rohlikDeliveryOptions', async (request) => withCheckout(
  request, 'rohlikDeliveryOptions', 30, async (call) => {
    let checkout = null;
    try {
      checkout = await co.loadCheckout(call);
    } catch (e) {
      if (!(e instanceof rohlik.ToolError)) throw e;
    }
    const addresses = checkout && checkout.addresses.length
      ? checkout.addresses
      : co.parseAddresses(await call('get_user_addresses', { context: 'Výběr výchozí adresy doručení.' }));
    const methods = checkout && checkout.payment.methods.length
      ? checkout.payment.methods
      : co.SETTABLE_PAYMENTS.map((id) => ({ id, label: co.paymentLabel(id), settable: true }));
    return {
      addresses: addresses.map((a) => ({ id: a.id, label: a.label, deliveredTo: a.deliveredTo })),
      payments: methods.map((x) => ({ id: x.id, label: x.label, settable: x.settable })),
      packaging: co.PACKAGING.map((id) => ({ id, label: co.PACKAGING_LABEL[id] })),
    };
  },
)));

let slotShapeLogged = false;
exports.rohlikTimeslots = onCall(ROHLIK, handle('rohlikTimeslots', async (request) => {
  const day = v.validateDayIndex(request.data);
  return withCheckout(request, 'rohlikTimeslots', 120, async (call) => {
    const payload = await call('get_timeslots_checkout', {
      timeslots_day: day, include_15min_slots: false, context: 'Výběr času doručení objednávky.',
    });
    if (!slotShapeLogged) {
      // The output shape is not verified yet: log its structure once per instance (types only, no values).
      slotShapeLogged = true;
      console.info('rohlikTimeslots shape:', JSON.stringify(rohlik.shapeOf(payload)).slice(0, 3000));
    }
    return { day: Number(day), slots: co.parseTimeslots(payload) };
  });
}));

exports.rohlikCheckoutUpdate = onCall(ROHLIK, handle('rohlikCheckoutUpdate', async (request) => {
  const u = v.validateCheckoutUpdate(request.data);
  return withCheckout(request, 'rohlikCheckoutUpdate', 150, async (call) => {
    const { warnings } = await co.applyUpdate(call, u);
    const out = {};
    if (u.action === 'updateCartItem' || u.action === 'removeCartItem') {
      out.cart = await withImages(await co.loadCart(call));
    }
    out.checkout = await co.loadCheckout(call);
    out.checkout.warnings = [...warnings, ...out.checkout.warnings].slice(0, 6);
    return out;
  });
}));

/**
 * "Vysypat košík" (explicit user action, confirmed in the app): mode 'all' → clear_cart, mode 'added' → only the
 * products CappyMeal put in this shopping (remove_cart_item each, best effort). Afterwards the in_cart days go back
 * to pending right away (decideClearRevert) and an activity entry is written.
 */
exports.rohlikClearCart = onCall(ROHLIK, handle('rohlikClearCart', async (request) => {
  const input = v.validateClearCart(request.data);
  return withCheckout(request, 'rohlikClearCart', 10, async (call, m) => {
    const { removed, failed } = await co.clearCart(call, input);
    if (failed.length) console.warn('rohlikClearCart: failed removals', failed.length);
    let cart = null;
    try {
      cart = await withImages(await co.loadCart(call));
    } catch (e) {
      if (!(e instanceof rohlik.ToolError)) throw e;
      console.warn('rohlikClearCart: get_cart failed:', e.detail);
    }
    const today = rem.pragueDateString(new Date());
    const inCart = Object.entries((await db().ref(`households/${m.hid}/orders`).orderByKey().startAt(today).get()).val() || {})
      .filter(([, o]) => o && o.status === 'in_cart')
      .map(([day]) => day);
    const revert = co.decideClearRevert({ mode: input.mode, inCart, days: input.days, cart, failed: failed.length });
    const updates = {};
    revert.forEach((d) => { updates[`households/${m.hid}/orders/${d}`] = null; });
    if (input.mode === 'all' || removed > 0) {
      const at = Date.now();
      const actKey = db().ref(`households/${m.hid}/activity`).push().key;
      const text = input.mode === 'all' || (cart && cart.count === 0)
        ? `${m.nickname} vysypal(a) košík na Rohlíku`
        : `${m.nickname} odebral(a) nákup z CappyMeal z košíku na Rohlíku`;
      updates[`households/${m.hid}/activity/${actKey}`] = { type: 'order', text: text.slice(0, 200), by: m.uid, at };
    }
    if (Object.keys(updates).length) await db().ref().update(updates);
    return { ok: failed.length === 0, removed, failed: failed.length, cart, days: revert };
  });
}));

exports.rohlikCheckoutLink = onCall(ROHLIK, handle('rohlikCheckoutLink', async (request) => withCheckout(
  request, 'rohlikCheckoutLink', 30, async (call) => {
    const url = await co.checkoutLink(call);
    if (!url) {
      console.warn('rohlikCheckoutLink: no usable https rohlik.cz link');
      throw fail('unavailable', 'Odkaz na dokončení objednávky se nepodařilo získat. Otevřete aplikaci Rohlík.', 'ROHLIK_NO_LINK');
    }
    return { url };
  },
)));

/**
 * Detects what happened on Rohlík with the household's in_cart days: an order placed after the cart was filled
 * → days 'ordered' (reminders stop); empty cart and no new order → days back to pending. No in_cart days →
 * Rohlík is not called at all.
 */
exports.rohlikSyncOrders = onCall(ROHLIK, handle('rohlikSyncOrders', async (request) => {
  const { uid, hid } = await requireMember(request);
  const today = rem.pragueDateString(new Date());
  const ordersRef = db().ref(`households/${hid}/orders`);
  const readInCart = async () => Object.entries((await ordersRef.orderByKey().startAt(today).get()).val() || {})
    .filter(([, o]) => o && o.status === 'in_cart')
    .map(([day, o]) => ({ day, at: Number(o.at) || 0 }));
  const inCart = await readInCart();
  if (!inCart.length) return { result: 'idle', days: [] };
  if (!(await db().ref(`rohlikCredentials/${hid}`).get()).exists()) return { result: 'idle', days: [] };
  await limit(`h/${hid}/rohlikSyncOrders`, 60);
  const { orders, cart } = await withClient(hid, async (client) => {
    const call = (name, args) => rohlik.callJson(client, name, args);
    let o = null;
    let c = null;
    try {
      o = await co.loadOrders(call);
    } catch (e) {
      if (!(e instanceof rohlik.ToolError)) throw e;
      console.warn('rohlikSyncOrders: fetch_orders failed:', e.detail);
    }
    try {
      c = await co.loadCart(call);
    } catch (e) {
      if (!(e instanceof rohlik.ToolError)) throw e;
      console.warn('rohlikSyncOrders: get_cart failed:', e.detail);
    }
    return { orders: o, cart: c };
  });
  const decision = co.decideSync({ inCart, orders, cart, now: Date.now() });
  if (decision.action === 'none') return { result: 'none', days: [] };
  // Re-read right before writing: only days still in_cart with the same fill time are touched.
  const fresh = await readInCart();
  const same = fresh.filter((x) => inCart.some((y) => y.day === x.day && y.at === x.at)).map((x) => x.day);
  if (!same.length) return { result: 'none', days: [] };
  const at = Date.now();
  const updates = {};
  if (decision.action === 'ordered') {
    same.forEach((d) => {
      updates[`households/${hid}/orders/${d}`] = { status: 'ordered', at, by: uid, rohlikOrderId: decision.order.id };
    });
    const actKey = db().ref(`households/${hid}/activity`).push().key;
    updates[`households/${hid}/activity/${actKey}`] = {
      type: 'order', text: 'Objednávka na Rohlíku je potvrzená – připomínky pro tyto dny jsme vypnuli.', by: uid, at,
    };
  } else {
    same.forEach((d) => { updates[`households/${hid}/orders/${d}`] = null; });
  }
  await db().ref().update(updates);
  const out = { result: decision.action, days: same };
  if (decision.action === 'ordered') {
    out.order = { id: decision.order.id, slotText: decision.order.slotText, totalText: decision.order.totalText };
  }
  return out;
}));

// ---------- reminders ----------

const BAD_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

/** Household ids without downloading households: index + shallow REST listing. */
async function listHouseholdIds() {
  const ids = new Set(Object.keys((await db().ref('householdIndex').get()).val() || {}));
  try {
    const { access_token: token } = await applicationDefault().getAccessToken();
    const res = await fetch(`${DB_URL}/households.json?shallow=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    Object.keys((await res.json()) || {}).forEach((k) => ids.add(k));
  } catch (e) {
    console.warn('shallow households listing failed, using householdIndex only:', (e && e.message) || '');
  }
  return [...ids];
}

async function remindHousehold(hid, hour, today) {
  const base = db().ref(`households/${hid}`);
  const settings = (await base.child('settings').get()).val() || {};
  const remindHour = settings.remindHour === undefined ? 9 : Number(settings.remindHour);
  if (remindHour !== hour) return;
  const from = rem.addDays(today, 1);
  const to = rem.addDays(today, 3 + rem.leadShift(settings));
  const [planSnap, ordersSnap, memberMealsSnap, templateSnap, membersSnap] = await Promise.all([
    base.child('plan').orderByKey().startAt(from).endAt(to).get(),
    base.child('orders').orderByKey().startAt(from).endAt(to).get(),
    base.child('memberMeals').orderByKey().startAt(from).endAt(to).get(),
    base.child('weekTemplate').get(),
    base.child('members').get(),
  ]);
  const memberIds = Object.keys(membersSnap.val() || {});
  const msg = rem.buildMessage(rem.computeReminderDates(today, planSnap.val(), ordersSnap.val(), settings, {
    memberMeals: memberMealsSnap.val() || {}, weekTemplate: templateSnap.val(), memberIds,
  }));
  if (!msg) return;
  const pushTokens = (await base.child('pushTokens').get()).val() || {};
  const tokens = [];
  for (const [uid, byId] of Object.entries(pushTokens)) {
    for (const [id, t] of Object.entries(byId || {})) {
      if (t && t.token) tokens.push({ token: t.token, uid, id });
    }
  }
  if (!tokens.length) return;
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
  if (Object.keys(removals).length) await db().ref().update(removals);
}

exports.dailyReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: rem.TZ, region: 'europe-west1', maxInstances: 1 },
  async () => {
    const now = new Date();
    const hour = rem.pragueHour(now);
    const today = rem.pragueDateString(now);
    if (hour === 4) {
      try { await db().ref('rateLimits/ip').remove(); } catch (e) { console.warn('rateLimits cleanup failed:', e.message); }
    }
    const hids = await listHouseholdIds();
    for (const hid of hids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await remindHousehold(hid, hour, today);
      } catch (e) {
        console.error('reminder failed for', hid, (e && e.message) || '');
      }
    }
  },
);
