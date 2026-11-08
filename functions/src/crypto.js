'use strict';
// AES-256-GCM encryption of per-household Rohlík credentials.
// Key: secret ROHLIK_ENC_KEY = base64 of 32 random bytes. The household id is
// bound as additional authenticated data, so a record cannot be moved to another household.

const crypto = require('crypto');

const VERSION = 1;

function parseKey(keyB64) {
  const key = Buffer.from(String(keyB64 || '').trim(), 'base64');
  if (key.length !== 32) throw new Error('ROHLIK_ENC_KEY must be base64 of exactly 32 bytes');
  return key;
}

/** obj -> { v, iv, tag, ct } (base64 strings) */
function encryptJson(obj, keyB64, aad) {
  const key = parseKey(keyB64);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return {
    v: VERSION,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ct: ct.toString('base64'),
  };
}

function decryptJson(rec, keyB64, aad) {
  if (!rec || rec.v !== VERSION || !rec.iv || !rec.tag || !rec.ct) {
    throw new Error('Unsupported credential record');
  }
  const key = parseKey(keyB64);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(rec.iv, 'base64'));
  if (aad) decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  decipher.setAuthTag(Buffer.from(rec.tag, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(rec.ct, 'base64')), decipher.final()]);
  return JSON.parse(pt.toString('utf8'));
}

module.exports = { encryptJson, decryptJson, parseKey };
