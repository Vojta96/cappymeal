const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const o = require('../src/rohlikOAuth');
const { InputError } = require('../src/validate');

const RU = o.CONFIG.REDIRECT_URI;

test('PKCE S256 pair', () => {
  const { verifier, challenge } = o.createPkce();
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  const expected = crypto.createHash('sha256').update(verifier).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.strictEqual(challenge, expected);
  assert.notStrictEqual(o.createPkce().verifier, verifier);
  assert.match(o.randomState(), /^[A-Za-z0-9_-]{32}$/);
});

test('authorize URL', () => {
  const u = new URL(o.buildAuthUrl({ clientId: 'cid', state: 'st', challenge: 'ch' }));
  assert.strictEqual(`${u.origin}${u.pathname}`, 'https://identity.rohlik.cz/oauth2/authorize');
  const p = Object.fromEntries(u.searchParams);
  assert.deepStrictEqual(p, {
    response_type: 'code',
    client_id: 'cid',
    redirect_uri: RU,
    scope: o.CONFIG.SCOPE,
    state: 'st',
    code_challenge: 'ch',
    code_challenge_method: 'S256',
    resource: 'https://mcp.rohlik.cz/mcp',
  });
});

test('redirect URL parsing', () => {
  assert.deepStrictEqual(o.parseRedirectUrl(`${RU}?code=abc&state=xyz`), { code: 'abc', state: 'xyz' });
  // pasted without scheme / with whitespace
  assert.deepStrictEqual(o.parseRedirectUrl(`  127.0.0.1:8976/rohlik-callback?state=s&code=c \n`), { code: 'c', state: 's' });
  const bad = (url, code) => assert.throws(() => o.parseRedirectUrl(url), (e) => e instanceof InputError && e.code === code);
  bad('', 'OAUTH_BAD_URL');
  bad('https://evil.example/rohlik-callback?code=a&state=b', 'OAUTH_BAD_URL');
  bad('http://127.0.0.1:8977/rohlik-callback?code=a&state=b', 'OAUTH_BAD_URL');
  bad('http://127.0.0.1:8976/other?code=a&state=b', 'OAUTH_BAD_URL');
  bad(`${RU}?state=b`, 'OAUTH_BAD_URL');
  bad(`${RU}?code=a`, 'OAUTH_BAD_URL');
  bad(`${RU}?error=access_denied&state=b`, 'OAUTH_DENIED');
  bad(`${RU}?error=server_error`, 'OAUTH_DENIED');
  bad(`${RU}?code=${'a'.repeat(4000)}&state=b`, 'OAUTH_BAD_URL');
  bad('not a url at all ::', 'OAUTH_BAD_URL');
  // custom (future https) redirect
  assert.deepStrictEqual(
    o.parseRedirectUrl('https://cappymeal-go.web.app/rohlik?code=1&state=2', 'https://cappymeal-go.web.app/rohlik'),
    { code: '1', state: '2' },
  );
});

test('state check and pending TTL', () => {
  assert.strictEqual(o.stateMatches('abc', 'abc'), true);
  assert.strictEqual(o.stateMatches('abc', 'abd'), false);
  assert.strictEqual(o.stateMatches('abc', 'abcd'), false);
  assert.strictEqual(o.stateMatches('', ''), false);
  const now = 1_000_000_000;
  assert.strictEqual(o.pendingExpired({ createdAt: now - 60_000 }, now), false);
  assert.strictEqual(o.pendingExpired({ createdAt: now - 16 * 60_000 }, now), true);
  assert.strictEqual(o.pendingExpired(null, now), true);
});

test('token expiry / refresh decision', () => {
  const now = 1_000_000;
  assert.strictEqual(o.needsRefresh({ access_token: 'a', expiresAt: now + 120_000 }, now), false);
  assert.strictEqual(o.needsRefresh({ access_token: 'a', expiresAt: now + 60_000 }, now), true);
  assert.strictEqual(o.needsRefresh({ access_token: 'a', expiresAt: now - 1 }, now), true);
  assert.strictEqual(o.needsRefresh({ access_token: 'a' }, now), false);
  assert.strictEqual(o.needsRefresh({}, now), true);
});

test('token record keeps or rotates the refresh token', () => {
  const r1 = o.tokenRecord({ access_token: 'a1', refresh_token: 'r1', expires_in: 300, scope: 'openid' }, 1000);
  assert.deepStrictEqual(r1, { access_token: 'a1', refresh_token: 'r1', expiresAt: 301000, scope: 'openid' });
  const r2 = o.tokenRecord({ access_token: 'a2' }, 1000, 'r1');
  assert.strictEqual(r2.refresh_token, 'r1');
  assert.strictEqual(r2.expiresAt, 1000 + 3600 * 1000);
  assert.strictEqual(o.tokenRecord({ access_token: 'a3', refresh_token: 'r3' }, 0, 'r1').refresh_token, 'r3');
  assert.throws(() => o.tokenRecord({}, 0));
});

test('email from id_token', () => {
  const payload = Buffer.from(JSON.stringify({ email: 'jana@gmail.com' })).toString('base64url');
  assert.strictEqual(o.emailFromIdToken(`h.${payload}.s`), 'jana@gmail.com');
  assert.strictEqual(o.emailFromIdToken('garbage'), null);
  assert.strictEqual(o.emailFromIdToken(undefined), null);
});

test('token endpoint errors carry only the OAuth error code', async () => {
  const fakeFetch = async (url, init) => {
    assert.strictEqual(init.method, 'POST');
    const body = new URLSearchParams(init.body);
    assert.strictEqual(body.get('grant_type'), 'refresh_token');
    assert.strictEqual(body.get('resource'), 'https://mcp.rohlik.cz/mcp');
    return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'secret-ish' }) };
  };
  await assert.rejects(o.refreshTokens({ clientId: 'c', refreshToken: 'zzRefresh' }, fakeFetch), (e) => {
    assert.ok(e instanceof o.OAuthError);
    assert.strictEqual(e.error, 'invalid_grant');
    assert.ok(!e.message.includes('zzRefresh') && !e.message.includes('secret-ish'));
    return true;
  });
});
