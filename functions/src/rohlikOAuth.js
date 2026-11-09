'use strict';
// OAuth 2.1 (authorization code + PKCE) client for the Rohlík MCP server.
//
// Rohlík only allows loopback redirect URIs for dynamically registered clients, so the
// owner logs in at Rohlík, gets redirected to a loopback URL that does not load, and
// pastes that URL back into CappyMeal. Once Rohlík allowlists an https redirect on our
// domain, change REDIRECT_URI below (the stored client is re-registered automatically
// when the redirect URI differs) and let the page at that URL forward the query string.

const crypto = require('crypto');
const { InputError } = require('./validate');

const CONFIG = Object.freeze({
  REDIRECT_URI: 'http://127.0.0.1:8976/rohlik-callback',
  CLIENT_NAME: 'CappyMeal',
  SCOPE: 'openid email roles offline_access',
  RESOURCE: 'https://mcp.rohlik.cz/mcp',
  AUTHORIZE: 'https://identity.rohlik.cz/oauth2/authorize',
  TOKEN: 'https://identity.rohlik.cz/oauth2/token',
  REGISTER: 'https://identity.rohlik.cz/connect/register',
  USERINFO: 'https://identity.rohlik.cz/userinfo',
  PENDING_TTL_MS: 15 * 60 * 1000,
  REFRESH_SKEW_MS: 60 * 1000,
  DEFAULT_EXPIRES_S: 3600,
  TIMEOUT_MS: 15000,
});

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** PKCE pair (RFC 7636, S256). */
function createPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

const randomState = () => b64url(crypto.randomBytes(24));

function buildAuthUrl({ clientId, redirectUri = CONFIG.REDIRECT_URI, state, challenge }) {
  const u = new URL(CONFIG.AUTHORIZE);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', CONFIG.SCOPE);
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('resource', CONFIG.RESOURCE); // RFC 8707 / MCP authorization spec
  return u.toString();
}

/**
 * Parses the URL the user pasted from the address bar after the Rohlík login.
 * Must point to the configured redirect URI (same origin + path). Returns { code, state }.
 */
function parseRedirectUrl(input, redirectUri = CONFIG.REDIRECT_URI) {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw || raw.length > 4000) {
    throw new InputError('Vložte celou adresu z adresního řádku.', 'OAUTH_BAD_URL');
  }
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch (e) {
    throw new InputError('Tohle není platná adresa. Zkopírujte celou adresu z adresního řádku.', 'OAUTH_BAD_URL');
  }
  const expected = new URL(redirectUri);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) {
    throw new InputError(
      `Adresa musí začínat ${expected.origin}${expected.pathname}. Zkopírujte adresu stránky, na kterou vás Rohlík přesměroval.`,
      'OAUTH_BAD_URL',
    );
  }
  const p = url.searchParams;
  const error = p.get('error');
  if (error) {
    if (error === 'access_denied') {
      throw new InputError('Přihlášení u Rohlíku bylo zrušeno. Zkuste to znovu.', 'OAUTH_DENIED');
    }
    throw new InputError(`Rohlík přihlášení odmítl (${error.slice(0, 60)}). Zkuste to znovu.`, 'OAUTH_DENIED');
  }
  const code = p.get('code');
  const state = p.get('state');
  if (!code || !state || code.length > 2048 || state.length > 512) {
    throw new InputError('V adrese chybí přihlašovací kód. Zkopírujte celou adresu i s částí za otazníkem.', 'OAUTH_BAD_URL');
  }
  return { code, state };
}

/** Constant-time state comparison. */
function stateMatches(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

const pendingExpired = (pending, now = Date.now()) =>
  !pending || typeof pending.createdAt !== 'number' || now - pending.createdAt > CONFIG.PENDING_TTL_MS;

/** Should the access token be refreshed before use? */
function needsRefresh(tokens, now = Date.now(), skew = CONFIG.REFRESH_SKEW_MS) {
  if (!tokens || !tokens.access_token) return true;
  if (typeof tokens.expiresAt !== 'number') return false;
  return tokens.expiresAt - now <= skew;
}

/** Token endpoint response -> stored record. Keeps the previous refresh token if none was rotated. */
function tokenRecord(res, now = Date.now(), prevRefresh = null) {
  if (!res || typeof res.access_token !== 'string' || !res.access_token) {
    throw new Error('token response without access_token');
  }
  const expiresIn = Number(res.expires_in) > 0 ? Number(res.expires_in) : CONFIG.DEFAULT_EXPIRES_S;
  return {
    access_token: res.access_token,
    refresh_token: (typeof res.refresh_token === 'string' && res.refresh_token) || prevRefresh || null,
    expiresAt: now + expiresIn * 1000,
    scope: typeof res.scope === 'string' ? res.scope : null,
  };
}

/** E-mail from an id_token payload (received directly from the token endpoint over TLS). */
function emailFromIdToken(idToken) {
  try {
    const part = String(idToken || '').split('.')[1];
    if (!part) return null;
    const claims = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof claims.email === 'string' ? claims.email : null;
  } catch (e) {
    return null;
  }
}

// ---------- network ----------

class OAuthError extends Error {
  constructor(message, { status = 0, error = '' } = {}) {
    super(message);
    this.status = status;
    this.error = error; // OAuth error code, e.g. invalid_grant
  }
}

async function postForm(url, params, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
  });
  let body = {};
  try { body = await res.json(); } catch (e) { body = {}; }
  if (!res.ok) {
    // Only the OAuth error code goes into the message – never tokens or request data.
    throw new OAuthError(`token endpoint HTTP ${res.status} ${body.error || ''}`.trim(), {
      status: res.status, error: body.error || '',
    });
  }
  return body;
}

async function registerClient(fetchImpl = fetch) {
  const res = await fetchImpl(CONFIG.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: CONFIG.CLIENT_NAME,
      redirect_uris: [CONFIG.REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: CONFIG.SCOPE,
    }),
    signal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
  });
  let body = {};
  try { body = await res.json(); } catch (e) { body = {}; }
  if (!res.ok || !body.client_id) {
    throw new OAuthError(`client registration HTTP ${res.status} ${body.error || ''}`.trim(), { status: res.status, error: body.error || '' });
  }
  return { client_id: body.client_id };
}

const exchangeCode = ({ clientId, code, verifier, redirectUri }, fetchImpl) => postForm(CONFIG.TOKEN, {
  grant_type: 'authorization_code',
  code,
  redirect_uri: redirectUri,
  client_id: clientId,
  code_verifier: verifier,
  resource: CONFIG.RESOURCE,
}, fetchImpl);

const refreshTokens = ({ clientId, refreshToken }, fetchImpl) => postForm(CONFIG.TOKEN, {
  grant_type: 'refresh_token',
  refresh_token: refreshToken,
  client_id: clientId,
  resource: CONFIG.RESOURCE,
}, fetchImpl);

async function fetchUserEmail(accessToken, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(CONFIG.USERINFO, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.email === 'string' ? body.email : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  CONFIG,
  OAuthError,
  createPkce,
  randomState,
  buildAuthUrl,
  parseRedirectUrl,
  stateMatches,
  pendingExpired,
  needsRefresh,
  tokenRecord,
  emailFromIdToken,
  registerClient,
  exchangeCode,
  refreshTokens,
  fetchUserEmail,
};
