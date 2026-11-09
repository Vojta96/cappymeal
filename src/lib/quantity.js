// Ingredient amounts → base units, summed needs, package sizes and packs to buy (pure, unit tested).
// Base units: g, ml, ks; 'bal' = whole packages ("1 balení", "1 plechovka"). g and ml are treated
// as interchangeable (1:1) when comparing a need with a package – good enough for kitchen amounts.
// The package helpers mirror functions/src/quantity.js (server).

export const MAX_PACKS = 50;

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

// unit word (letters only, see AMOUNT_RE) → [base unit, factor]
const UNITS = [
  [/^(kg|kilo|kilogram.*)$/, 'g', 1000],
  [/^(dkg|deka)$/, 'g', 10],
  [/^(g|gr|gram.*)$/, 'g', 1],
  [/^(l|litr.*)$/, 'ml', 1000],
  [/^(dl|decilitr.*)$/, 'ml', 100],
  [/^(cl)$/, 'ml', 10],
  [/^(ml|mililitr.*)$/, 'ml', 1],
  // spoons: ≈ 15 / 5 g or ml (liquid ingredients → ml)
  [/^(lžíc.*|lžic.*|pl|polévkov.*)$/, 'spoon', 15],
  [/^(lžičk.*|lžiček|kl|kávov.*)$/, 'spoon', 5],
  [/^(hrst.*|hrsť)$/, 'g', 30],
  [/^(ks|kus|kusy|kusů|kusu|vejce|vajíčk.*|vajec|hlavičk.*|hlávk.*|hlavic.*|bulv.*)$/, 'ks', 1],
  [/^(velk.*|velký|malý|malá|malé|střední|větší|menší|celý|celá|celé)$/, 'ks', 1],
  [/^(balení|bal|balíč.*|plechov.*|konzerv.*|sáč.*|sklenic.*|kelímk.*|kelímek|krabic.*|kostk.*|tub.*|lahv.*|láhev|role|rol.*)$/, 'bal', 1],
];

// No quantity at all (seasoning, optional items).
const NO_QTY = /špetk|dle chuti|podle chuti|dle potřeby|podle potřeby|volitelně|na ozdobu|trochu|pár kapek|na dochucení|^$/i;

const LIQUID = /olej|ocet|omáčk|mléko|mléka|smetan|sirup|voda|vody|šťáv|vývar|víno|rum|likér|jogurt.*nápoj|kefír|džus|limet.*šťáva|citronov.*šťáva|med$/i;

function parseNumber(raw) {
  let s = String(raw).trim();
  // "1 ½" / "1½"
  const mixed = s.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]];
  if (FRACTIONS[s] !== undefined) return FRACTIONS[s];
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Letters for unit words – no unicode property escapes / lookbehind in client regexes
// (Babel expands \p{L} into huge ranges and older iOS Safari can't parse lookbehind).
const LETTERS = 'a-záčďéěíňóřšťúůýžäöü';
const NUM = '(?:\\d+\\s*[½¼¾⅓⅔⅛]|\\d+(?:[.,]\\d+)?(?:\\s*/\\s*\\d+)?|[½¼¾⅓⅔⅛])';
const AMOUNT_RE = new RegExp(`^(${NUM})(?:\\s*(?:-|–|až)\\s*(${NUM}))?\\s*([${LETTERS}.]*)`);

/**
 * One amount text → { qty, unit } in base units ('g' | 'ml' | 'ks' | 'bal' | 'spoon'),
 * { none: true } for "dle chuti" & co., or null when unknown ("4 plátky", "1 stroužek").
 * Ranges ("1-2") take the upper bound.
 */
export function parseAmount(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase().replace(/ /g, ' ');
  if (NO_QTY.test(s)) return { none: true };
  const m = s.match(AMOUNT_RE);
  if (!m) return null;
  const lo = parseNumber(m[1]);
  const hi = m[2] ? parseNumber(m[2]) : null;
  const qty = hi != null && hi > (lo || 0) ? hi : lo;
  if (qty == null || !(qty > 0)) return null;
  const word = (m[3] || '').replace(/\.$/, '');
  if (!word) return { qty, unit: 'ks' };
  for (const [re, unit, factor] of UNITS) {
    if (re.test(word)) return { qty: Math.round(qty * factor * 1000) / 1000, unit };
  }
  return null;
}

/**
 * Sum of all amounts of one ingredient → { qty, unit: 'g'|'ml'|'ks'|'bal' } or null
 * (nothing measurable, or incompatible / unknown units). Spoons become g, or ml for liquids
 * (or when the other amounts are in ml).
 */
export function sumNeed(amounts, name = '') {
  const parsed = (amounts || []).map(parseAmount);
  if (parsed.some((p) => p === null)) return null;
  const real = parsed.filter((p) => !p.none);
  if (!real.length) return null;
  const hard = [...new Set(real.filter((p) => p.unit !== 'spoon').map((p) => p.unit))];
  const massVol = hard.every((u) => u === 'g' || u === 'ml');
  let unit;
  if (!hard.length) unit = LIQUID.test(name) ? 'ml' : 'g';
  else if (hard.length === 1) unit = hard[0];
  else if (massVol) unit = LIQUID.test(name) ? 'ml' : 'g';
  else return null;
  if (real.some((p) => p.unit === 'spoon') && unit !== 'g' && unit !== 'ml') return null;
  const qty = real.reduce((a, p) => a + p.qty, 0);
  return { qty: Math.round(qty * 100) / 100, unit };
}

const fmtNum = (n, digits = 1) =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** "450 g", "1,2 kg", "750 ml", "1,5 l", "3 ks", "2 bal." */
export function formatQty(q) {
  if (!q || !(q.qty > 0)) return '';
  const { qty, unit } = q;
  if (unit === 'g') return qty >= 1000 ? `${fmtNum(qty / 1000, 2)} kg` : `${fmtNum(Math.round(qty))} g`;
  if (unit === 'ml') return qty >= 1000 ? `${fmtNum(qty / 1000, 2)} l` : `${fmtNum(Math.round(qty))} ml`;
  if (unit === 'bal') return `${fmtNum(qty)} bal.`;
  return `${fmtNum(qty)} ${unit}`;
}

// ---------- packages ----------

const PACK_UNITS = {
  kg: ['g', 1000], g: ['g', 1], dkg: ['g', 10],
  l: ['ml', 1000], ml: ['ml', 1], dl: ['ml', 100], cl: ['ml', 10],
  ks: ['ks', 1], kus: ['ks', 1], kusy: ['ks', 1], 'kusů': ['ks', 1],
};
const PACK_UNIT_RE = 'kg|dkg|g|ml|cl|dl|l|ks|kusů|kusy|kus';

const toNum = (s) => {
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Package size from a product name / amount text: "Madeta Cottage 180 g" → { qty: 180, unit: 'g' },
 * "Mléko 1,5% 1 l" → 1000 ml, "4 x 125 g" → 500 g. Last match wins, percentages are ignored.
 */
export function parsePack(text) {
  const s = ` ${String(text || '').toLowerCase().replace(/ /g, ' ')} `;
  const multi = new RegExp(`(\\d+)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(${PACK_UNIT_RE})(?![${LETTERS}%])`, 'g');
  const single = new RegExp(`(^|[^\\d.,])(\\d+(?:[.,]\\d+)?)\\s*(${PACK_UNIT_RE})\\.?(?![${LETTERS}%\\d])`, 'g');
  let m;
  let lastMulti = null;
  while ((m = multi.exec(s))) {
    lastMulti = { count: toNum(m[1]), qty: toNum(m[2]), unit: m[3], end: m.index + m[0].length };
  }
  let lastSingle = null;
  while ((m = single.exec(s))) lastSingle = { count: 1, qty: toNum(m[2]), unit: m[3], index: m.index + m[1].length };
  let pick = lastSingle || lastMulti;
  if (lastMulti && (!lastSingle || lastSingle.index < lastMulti.end)) pick = lastMulti;
  if (!pick || !(pick.qty > 0)) return null;
  const [unit, factor] = PACK_UNITS[pick.unit];
  return { qty: Math.round(pick.qty * (pick.count || 1) * factor * 1000) / 1000, unit };
}

const compatible = (a, b) => a === b || ((a === 'g' || a === 'ml') && (b === 'g' || b === 'ml'));

/** Package of a candidate: server fields first, otherwise parsed from its texts. */
export function packOf(c) {
  if (!c) return null;
  if (c.packQty > 0 && ['g', 'ml', 'ks'].includes(c.packUnit)) return { qty: c.packQty, unit: c.packUnit };
  return parsePack(c.packText) || parsePack(c.unit) || parsePack(c.name);
}

/**
 * Packs to buy for a need and a package → { packs, leftover: { qty, unit } | null }, or null when
 * the units are unknown / incompatible (then the UI defaults to 1 and says nothing).
 * 'bal' needs ("1 balení") are whole packages regardless of the package size.
 */
export function packsFor(need, pack) {
  if (!need || !(need.qty > 0)) return null;
  if (need.unit === 'bal') return { packs: Math.min(MAX_PACKS, Math.max(1, Math.ceil(need.qty - 1e-9))), leftover: null };
  if (!pack || !(pack.qty > 0) || !compatible(need.unit, pack.unit)) return null;
  const packs = Math.min(MAX_PACKS, Math.max(1, Math.ceil(need.qty / pack.qty - 1e-9)));
  const left = Math.round((packs * pack.qty - need.qty) * 100) / 100;
  return { packs, leftover: left > 0 ? { qty: left, unit: pack.unit } : null };
}

/** Preset quantity for a candidate (1 when unknown). */
export const presetQty = (need, candidate) => {
  const p = packsFor(need, packOf(candidate));
  return p ? p.packs : 1;
};

/** "zbude 90 g" for the chosen quantity, or '' (unknown units / nothing left). */
export function leftoverText(need, candidate, qty) {
  if (!need || need.unit === 'bal') return '';
  const pack = packOf(candidate);
  if (!pack || !compatible(need.unit, pack.unit) || !(qty > 0)) return '';
  const left = Math.round((qty * pack.qty - need.qty) * 100) / 100;
  return left > 0 ? `zbude ${formatQty({ qty: left, unit: pack.unit })}` : '';
}

/** Need as sent to rohlikMatch ({ qty, unit } with unit g | ml | ks) or undefined. */
export const needForServer = (need) =>
  need && ['g', 'ml', 'ks'].includes(need.unit) && need.qty > 0 && need.qty <= 100000
    ? { qty: need.qty, unit: need.unit }
    : undefined;
