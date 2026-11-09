'use strict';
// Package sizes and unit prices of Rohlík products (pure, unit tested).
// Mirrors the package helpers in src/lib/quantity.js (client); base units are g, ml, ks.
// g and ml are treated as interchangeable (1:1) – good enough for kitchen amounts.

const UNIT_FACTORS = {
  kg: ['g', 1000], g: ['g', 1], dkg: ['g', 10], mg: ['g', 0.001],
  l: ['ml', 1000], ml: ['ml', 1], dl: ['ml', 100], cl: ['ml', 10],
  ks: ['ks', 1], kus: ['ks', 1], kusy: ['ks', 1], 'kusů': ['ks', 1], pcs: ['ks', 1],
};
const UNIT_RE = 'kg|dkg|mg|g|ml|cl|dl|l|ks|kusů|kusy|kus|pcs';

function num(s) {
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toBase(qty, unit) {
  const f = UNIT_FACTORS[String(unit || '').toLowerCase().replace(/\.$/, '')];
  if (!f || qty == null || !(qty > 0)) return null;
  return { qty: Math.round(qty * f[1] * 1000) / 1000, unit: f[0] };
}

/**
 * Package size from a product name / amount text: "Madeta Cottage 180 g" → { qty: 180, unit: 'g' },
 * "Mléko 1,5% 1 l" → 1000 ml, "4 x 125 g" → 500 g, "Vejce M 10 ks" → 10 ks. Last match wins
 * (the size usually ends the name); percentages are ignored. null when nothing is found.
 */
function parsePack(text) {
  const s = ` ${String(text || '').toLowerCase().replace(/ /g, ' ')} `;
  const multi = new RegExp(`(\\d+)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_RE})(?![\\p{L}%])`, 'gu');
  let m;
  let last = null;
  while ((m = multi.exec(s))) {
    last = { count: num(m[1]), qty: num(m[2]), unit: m[3], index: m.index, end: m.index + m[0].length };
  }
  const single = new RegExp(`(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_RE})\\.?(?![\\p{L}%\\d])`, 'gu');
  let lastSingle = null;
  while ((m = single.exec(s))) lastSingle = { count: 1, qty: num(m[1]), unit: m[2], index: m.index };
  let pick = lastSingle || last;
  // the single match inside "4 x 125 g" belongs to the multipack
  if (last && (!lastSingle || lastSingle.index < last.end)) pick = last;
  if (!pick) return null;
  return toBase(pick.qty * (pick.count || 1), pick.unit);
}

/** Same base-unit family? g and ml count as compatible. */
function compatible(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return (a === 'g' || a === 'ml') && (b === 'g' || b === 'ml');
}

const MAX_PACKS = 50;

/** Packs needed for a need ({qty, unit}) and a pack ({qty, unit}); null if unknown/incompatible. */
function packsFor(need, pack) {
  if (!need || !pack || !(need.qty > 0) || !(pack.qty > 0) || !compatible(need.unit, pack.unit)) return null;
  const packs = Math.min(MAX_PACKS, Math.max(1, Math.ceil(need.qty / pack.qty - 1e-9)));
  const leftover = Math.max(0, Math.round((packs * pack.qty - need.qty) * 100) / 100);
  return { packs, leftover };
}

/** 0..1 – how well a pack matches the need (1 = exact, little waste, few packs). null if unknown. */
function packFit(need, pack) {
  const p = packsFor(need, pack);
  if (!p) return null;
  const total = p.packs * pack.qty;
  const waste = total > 0 ? p.leftover / total : 1;
  const manyPacks = p.packs > 4 ? Math.min(0.5, (p.packs - 4) * 0.05) : 0;
  return Math.max(0, 1 - waste - manyPacks);
}

const fmt = (n, digits = 2) => n.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Unit price: Kč per kg / l / ks from price + pack. */
function computeUnitPrice(price, pack) {
  if (!(price > 0) || !pack || !(pack.qty > 0)) return null;
  if (pack.unit === 'g') return { value: price / (pack.qty / 1000), per: 'kg' };
  if (pack.unit === 'ml') return { value: price / (pack.qty / 1000), per: 'l' };
  if (pack.unit === 'ks') return { value: price / pack.qty, per: 'ks' };
  return null;
}

const unitPriceText = (up) => (up && up.value > 0 ? `${fmt(up.value)} Kč/${up.per}` : '');

/** "180 g", "1 l", "10 ks", "1,5 kg" */
function formatPack(pack) {
  if (!pack) return '';
  const { qty, unit } = pack;
  if (unit === 'g' && qty >= 1000) return `${fmt(qty / 1000, qty % 1000 ? 1 : 0).replace(/,0$/, '')} kg`;
  if (unit === 'ml' && qty >= 1000) return `${fmt(qty / 1000, qty % 1000 ? 1 : 0).replace(/,0$/, '')} l`;
  const n = Number.isInteger(qty) ? String(qty) : fmt(qty, 1).replace(/,0$/, '');
  return `${n} ${unit}`;
}

module.exports = {
  parsePack, toBase, compatible, packsFor, packFit, computeUnitPrice, unitPriceText, formatPack, MAX_PACKS,
};
