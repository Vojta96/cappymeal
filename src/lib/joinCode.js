// 8 chars from [A-HJ-NP-Z2-9] (no I, O, 0, 1 – easy to read and type).
export const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function generateJoinCode(random = Math.random) {
  let s = '';
  for (let i = 0; i < 8; i++) s += JOIN_ALPHABET[Math.floor(random() * JOIN_ALPHABET.length)];
  return s;
}

export function normalizeJoinCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}
