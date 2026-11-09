'use strict';
// Smarter Rohlík product search (pure, unit tested): query normaliser + small Czech ingredient
// dictionary, negative keywords, and ranking of the search results.

const q = require('./quantity');

/** Lowercase, no diacritics, single spaces. */
function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- dictionary ----------

// Generic exclusions: baby food and pet food (skipped when the query itself asks for it).
const GENERIC_EXCLUDE = [
  'detsk', 'kojen', 'pro deti', 'od 4. mesic', 'od 6. mesic', 'od 8. mesic', 'od 12. mesic', 'presnidav',
  'hami', 'hipp', 'sunar', 'nutrilon', 'bebivita', 'salvest',
  'pro psy', 'pro psa', 'pro kocky', 'pro kocku', 'krmivo', 'krmiva', 'granule', 'pamlsk', 'kapsicka pro',
  'whiskas', 'pedigree', 'friskies', 'purina',
];

const FLAVOURS = ['jahod', 'boruvk', 'vanil', 'cokolad', 'broskv', 'malin', 'stracciatel', 'kokos', 'meruň', 'merun',
  'tresn', 'visn', 'oris', 'karamel', 'banan', 'ovocn', 'muesli', 'mysli', 'lesni plody'];

/**
 * canonical query → { aliases (folded phrases), exclude (folded substrings) }.
 * Aliases are matched against the whole cleaned ingredient name (or its start for multi-word aliases).
 */
const DICTIONARY = [
  { query: 'vejce', aliases: ['vejce', 'vajicka', 'vajicko', 'vajec', 'bilky', 'bilek', 'vajecne bilky', 'vajecny bilek',
    'zloutky', 'zloutek', 'vejce natvrdo', 'vajicka natvrdo', 'vejce vetsi', 'vejce m', 'vejce l'],
  exclude: ['cokolad', 'kinder', 'nudle', 'testovin', 'likér', 'liker', 'pomazank', 'majonez', 'koralk', 'figur'] },
  { query: 'cottage sýr', aliases: ['cottage', 'cottage cheese', 'cottage syr', 'syr cottage'], exclude: ['pomazank'] },
  { query: 'kuřecí prsní řízky', aliases: ['kureci prsa', 'kureci prso', 'kureci prsni rizky', 'kureci prsni rizek',
    'kureci rizky', 'kureci rizek', 'prsa', 'kureci prsni filet', 'kureci prsni maso'],
  exclude: ['uzen', 'sunk', 'nugget', 'salam', 'park', 'konzerv', 'pastik', 'grilovan', 'obalovan', 'smazen',
    'pecen', 'sous', 'kebab', 'gyros', 'nasoleno', 'hotov'] },
  { query: 'kuřecí stehna', aliases: ['kureci stehna', 'kureci stehno', 'kureci horni stehna'],
    exclude: ['uzen', 'pecen', 'grilovan', 'konzerv', 'hotov'] },
  { query: 'kuřecí maso', aliases: ['kureci maso', 'kure'], exclude: ['uzen', 'sunk', 'nugget', 'salam', 'park', 'konzerv', 'pastik', 'hotov'] },
  { query: 'mleté hovězí maso', aliases: ['mlete hovezi maso', 'mlete hovezi', 'hovezi mlete maso', 'hovezi mlete'],
    exclude: ['konzerv', 'hotov', 'omack', 'lasagn', 'burger'] },
  { query: 'mleté kuřecí maso', aliases: ['kureci mlete maso', 'mlete kureci maso', 'mlete kureci'],
    exclude: ['konzerv', 'hotov', 'omack'] },
  { query: 'mléko', aliases: ['mleko', 'mleko polotucne', 'polotucne mleko', 'mleko plnotucne', 'trvanlive mleko'],
    exclude: ['kokos', 'mandl', 'sojov', 'ovesn', 'ryzov', 'cokolad', 'kondenz', 'suse', 'kakao', 'kav', 'pudink',
      'zakys', 'kefir', 'acidof', 'jogurt', 'zmrzl', 'ochucen'] },
  { query: 'řecký jogurt bílý', aliases: ['recky jogurt', 'bily recky jogurt', 'jogurt recky', 'recky jogurt bily'],
    exclude: FLAVOURS },
  { query: 'bílý jogurt', aliases: ['bily jogurt', 'jogurt bily', 'jogurt', 'bily jogurt 0 %', 'bily jogurt 0%'],
    exclude: FLAVOURS.concat(['napoj', 'drink', 'pitny']) },
  { query: 'skyr', aliases: ['skyr', 'skyr bily'], exclude: FLAVOURS },
  { query: 'máslo', aliases: ['maslo', 'maslo cerstve'], exclude: ['arasid', 'orech', 'kakaov', 'bylink', 'cesnek',
    'pomazank', 'sušen', 'susenk', 'ghi', 'ghee', 'rostlinn'] },
  { query: 'eidam strouhaný', aliases: ['eidam strouhany', 'strouhany eidam', 'syr strouhany', 'strouhany syr'], exclude: ['pizza'] },
  { query: 'eidam plátky', aliases: ['eidam platkovy', 'eidam platky', 'platkovy syr', 'syr platky'], exclude: ['pizza', 'sendvic'] },
  { query: 'mozzarella', aliases: ['mozzarella', 'mozarella'], exclude: ['pizza', 'tycink', 'obalovan', 'salat'] },
  { query: 'parmezán', aliases: ['parmezan', 'parmezan strouhany', 'parmazan'], exclude: ['omack', 'pesto', 'chips'] },
  { query: 'šunka', aliases: ['sunka', 'kvalitni sunka', 'sunka kvalitni', 'sunka nejvyssi jakosti', 'vepr. sunka'],
    exclude: ['pizza', 'pomazank', 'testovin', 'sendvic', 'bageta'] },
  { query: 'kuřecí šunka', aliases: ['kureci sunka'], exclude: ['pizza', 'pomazank', 'sendvic'] },
  { query: 'slanina', aliases: ['slanina', 'anglicka slanina'], exclude: ['chips', 'pomazank', 'pizza'] },
  { query: 'brambory', aliases: ['brambory', 'brambor', 'brambory velke', 'brambory stredni', 'brambory varne',
    'brambory uvarene', 'brambory na varu'],
  exclude: ['chips', 'lupink', 'hranolk', 'kroket', 'kase', 'knedl', 'salat', 'plack', 'susen', 'pyre', 'noky', 'gnocchi'] },
  { query: 'cibule', aliases: ['cibule', 'cibule zluta', 'cibule velka', 'zluta cibule'],
    exclude: ['susen', 'granul', 'smazen', 'jarni', 'cervena', 'chips', 'krouzky'] },
  { query: 'červená cibule', aliases: ['cervena cibule'], exclude: ['susen', 'smazen'] },
  { query: 'jarní cibulka', aliases: ['jarni cibulka', 'jarni cibule'], exclude: ['susen'] },
  { query: 'česnek', aliases: ['cesnek', 'cesnek cerstvy', 'strouzek cesneku', 'strouzky cesneku'],
    exclude: ['susen', 'granul', 'pasta', 'chips', 'dresink', 'omack', 'majonez', 'bageta', 'medvedi'] },
  { query: 'mrkev', aliases: ['mrkev', 'mrkve'], exclude: ['stav', 'presnidav', 'salat', 'detsk', 'dzus', 'smoothie'] },
  { query: 'rajčata', aliases: ['rajcata', 'rajce', 'rajcata cerstva'],
    exclude: ['protlak', 'kecup', 'drcen', 'susen', 'pasirov', 'omack', 'polevk', 'stav', 'passata', 'loupan', 'konzerv'] },
  { query: 'drcená rajčata', aliases: ['rajcata drcena', 'drcena rajcata', 'rajcata v plechovce'], exclude: ['susen'] },
  { query: 'cherry rajčata', aliases: ['cherry rajcata', 'cherry rajcatka', 'rajcata cherry'], exclude: ['susen', 'omack'] },
  { query: 'okurka salátová', aliases: ['okurka', 'okurka salatova', 'salatova okurka', 'okurky'],
    exclude: ['kysel', 'sterilovan', 'nakladan', 'cornichon', 'kvasen'] },
  { query: 'kyselé okurky', aliases: ['kysele okurky', 'okurky kysele', 'sterilovane okurky'], exclude: [] },
  { query: 'banány', aliases: ['banan', 'banany', 'banan zraly'], exclude: ['chips', 'susen', 'detsk', 'presnidav', 'jogurt', 'smoothie', 'cokolad', 'pyre'] },
  { query: 'jablka', aliases: ['jablko', 'jablka'], exclude: ['stav', 'most', 'presnidav', 'chips', 'susen', 'ocet', 'pyre', 'kompot', 'dzus', 'cider'] },
  { query: 'citrony', aliases: ['citron', 'citrony', 'stava z citronu', 'citronova stava'],
    exclude: ['caj', 'limonad', 'sirup', 'bonbon', 'tycink', 'oplatk'] },
  { query: 'avokádo', aliases: ['avokado'], exclude: ['dip', 'guacamole', 'olej'] },
  { query: 'hladká mouka', aliases: ['mouka hladka', 'hladka mouka', 'mouka'], exclude: ['kukuric', 'ryzov', 'pohank'] },
  { query: 'ovesné vločky', aliases: ['ovesne vlocky', 'vlocky'], exclude: ['susenk', 'tycink', 'cokolad', 'kase s'] },
  { query: 'rýže jasmínová', aliases: ['ryze jasminova', 'jasminova ryze'], exclude: ['chlebic', 'napoj', 'mleko', 'ocet', 'nudle', 'papir', 'hotov'] },
  { query: 'rýže', aliases: ['ryze', 'ryze uvarena', 'ryze dlouhozrnna'], exclude: ['chlebic', 'napoj', 'mleko', 'ocet', 'nudle', 'papir', 'hotov', 'oplatk'] },
  { query: 'tortilly pšeničné', aliases: ['tortilla', 'tortilla psenicna', 'tortilly', 'psenicne tortilly', 'wrap'], exclude: ['chips', 'nachos'] },
  { query: 'tuňák ve vlastní šťávě', aliases: ['tunak ve vlastni stave', 'tunak'], exclude: ['salat', 'pomazank', 'pasta'] },
  { query: 'cizrna', aliases: ['cizrna', 'cizrna sterilovana', 'cizrna v nalevu'], exclude: ['chips', 'mouka', 'hummus', 'pomazank'] },
  { query: 'smetana na vaření', aliases: ['smetana na vareni', 'smetana'], exclude: ['zakys', 'slehac', 'kys', 'sprej'] },
  { query: 'zakysaná smetana', aliases: ['zakysana smetana'], exclude: ['dip', 'dresink'] },
  { query: 'slunečnicový olej', aliases: ['olej'], exclude: ['motor', 'masaz', 'telov', 'sprej'] },
  { query: 'olivový olej', aliases: ['olivovy olej', 'olivovy olej extra panensky'], exclude: ['olivy', 'sprej'] },
  { query: 'baby špenát', aliases: ['spenat baby', 'baby spenat', 'spenat cerstvy'], exclude: ['mrazen', 'protlak', 'pyre'] },
  { query: 'brokolice', aliases: ['brokolice'], exclude: ['mrazen', 'polevk', 'pyre'] },
  { query: 'žampiony', aliases: ['zampiony', 'zampiony velke', 'houby'], exclude: ['sterilovan', 'konzerv', 'polevk', 'omack', 'susen'] },
  { query: 'cuketa', aliases: ['cuketa', 'cukety'], exclude: ['chips', 'nakladan'] },
  { query: 'paprika červená', aliases: ['paprika', 'paprika cervena', 'cervena paprika'],
    exclude: ['mlet', 'koren', 'chips', 'pasta', 'lecho', 'nakladan', 'sterilovan', 'pomazank'] },
  { query: 'med', aliases: ['med', 'med kvetovy'], exclude: ['medvidek', 'medovnik', 'perník', 'pernik', 'bonbon', 'susen', 'medvedi'] },
];

const DICT_BY_QUERY = Object.fromEntries(DICTIONARY.map((d) => [fold(d.query), d]));

// Words that describe preparation / size and never help the search.
const STRIP_WORDS = [
  'nastrouhany', 'nastrouhana', 'nastrouhane', 'nastrouhanou', 'uvareny', 'uvarena', 'uvarene', 'uvarenou',
  'vareny', 'varena', 'varene', 'cerstvy', 'cerstva', 'cerstve', 'cerstvou', 'nakrajeny', 'nakrajena', 'nakrajene',
  'oloupany', 'oloupana', 'oloupane', 'nasekany', 'nasekana', 'nasekane', 'rozpusteny', 'rozpustena', 'rozpustene',
  'zmekly', 'zmekla', 'zmekle', 'studeny', 'studena', 'studene', 'tepla', 'teple', 'teply', 'horka', 'horke', 'horky',
  'velky', 'velka', 'velke', 'stredni', 'maly', 'mala', 'male', 'vetsi', 'mensi', 'zraly', 'zrala', 'zrale',
  'kvalitni', 'upeceny', 'upecena', 'upecene', 'volitelne', 'cca', 'asi', 'trochu',
];
const STRIP_PHRASES = [
  'na kosticky', 'na platky', 'na nudlicky', 'na plneni', 'k plneni', 'k podavani', 'na ozdobu', 'dle chuti',
  'podle chuti', 'dle sezony', 'dle potreby', 'pokojove teploty', 'na kousky', 'na proužky', 'na prouzky',
];

/**
 * Cleans an ingredient name for search (folded, no diacritics): drops parentheses, "nebo"/"/" alternatives
 * (keeps the first), everything after a comma, amounts, and preparation adjectives.
 */
function cleanName(name) {
  let s = fold(name);
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.split(/\s+nebo\s+|\s*\/\s*|\s+ci\s+/)[0];
  s = s.split(',')[0];
  s = s.replace(/\d+([.,]\d+)?\s*(kg|g|dkg|ml|l|dl|ks|lzice|lzicky|lzicka|hrnek|hrnky|baleni)?(?![a-z\d])/g, ' ');
  for (const p of STRIP_PHRASES) s = s.replace(new RegExp(`(^|\\s)${p}(?=\\s|$)`, 'g'), ' ');
  s = s.split(' ').filter((w) => w && !STRIP_WORDS.includes(w)).join(' ');
  s = s.replace(/[^a-z0-9%\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/** Dictionary entry for an ingredient name (or null). */
function lookup(name) {
  const c = cleanName(name);
  if (!c) return null;
  let best = null;
  for (const d of DICTIONARY) {
    for (const a of d.aliases) {
      const hit = c === a || (a.includes(' ') && c.startsWith(`${a} `));
      if (hit && (!best || a.length > best.len)) best = { entry: d, len: a.length };
    }
  }
  return best ? best.entry : null;
}

/**
 * Search plan for one item: { query, canonical, exclude[] }.
 * A user override (`override`) is used verbatim (trimmed) with only the generic exclusions.
 */
function planQuery(name, override) {
  const own = String(override || '').replace(/\s+/g, ' ').trim();
  if (own) {
    const d = DICT_BY_QUERY[fold(own)] || null;
    return { query: own.slice(0, 60), canonical: d ? d.query : null, exclude: d ? d.exclude : [], user: true };
  }
  const d = lookup(name);
  if (d) return { query: d.query, canonical: d.query, exclude: d.exclude, user: false };
  // Keep the original diacritics in the query: strip the same parts from the original string.
  const cleaned = cleanName(name);
  const original = restoreDiacritics(name, cleaned);
  return { query: original || String(name || '').trim().slice(0, 60), canonical: null, exclude: [], user: false };
}

/** Maps the folded cleaned words back to the original (diacritics) words of the name where possible. */
function restoreDiacritics(name, cleaned) {
  if (!cleaned) return '';
  const words = String(name || '').toLowerCase().split(/[^\p{L}\d%-]+/u).filter(Boolean);
  const byFold = new Map(words.map((w) => [fold(w), w]));
  return cleaned.split(' ').map((w) => byFold.get(w) || w).join(' ');
}

/** true when the product name hits a negative keyword for this search. */
function isExcluded(productName, plan) {
  const n = ` ${fold(productName)} `;
  const qf = fold(plan && plan.query);
  const list = [...((plan && plan.exclude) || []), ...GENERIC_EXCLUDE];
  return list.some((k) => {
    const kf = fold(k);
    return kf && n.includes(kf) && !qf.includes(kf.trim());
  });
}

// ---------- product features ----------

const LIGHT_RE = /\blight\b|(^|[^\d,.])0([,.]\d)?\s?%|odtucn|nizkotucn|bez tuku|skyr|\bfit\b|\blite\b|\bzero\b|tuk 0|0 % tuku/;
const BIO_RE = /(^|[^a-z])bio([^a-z]|$)|organic/;

const isLight = (p) => LIGHT_RE.test(fold(p.name)) || (p.badges || []).some((b) => /light|low fat/i.test(b));
const isBio = (p) => (p.badges || []).some((b) => /^bio$|organic/i.test(fold(b))) || BIO_RE.test(fold(p.name));

/** Adds pack, unit price and badge fields to a normalised product (from rohlikAdapter.normaliseProduct). */
function enrich(p) {
  const pack = p.pack || q.parsePack(p.unit) || q.parsePack(p.name);
  const structured = p.unitPriceValue > 0 ? { value: p.unitPriceValue, per: p.unitPricePer || null } : null;
  const computed = q.computeUnitPrice(p.price, pack);
  const unitPrice = structured && structured.per ? structured : computed || structured;
  const xtraUnit = p.xtraPrice > 0 && unitPrice && p.price > 0
    ? { value: (p.xtraUnitPrice > 0 ? p.xtraUnitPrice : unitPrice.value * p.xtraPrice / p.price), per: unitPrice.per }
    : null;
  const badges = Array.isArray(p.badges) ? [...p.badges] : [];
  if (isBio(p) && !badges.some((b) => /^bio$/i.test(b))) badges.push('BIO');
  if (isLight(p) && !badges.some((b) => /^light$/i.test(b))) badges.push('Light');
  return {
    productId: p.productId,
    name: p.name,
    price: p.price,
    priceText: p.priceText,
    unit: p.unit,
    imageUrl: p.imageUrl,
    url: p.url,
    brand: p.brand || null,
    packQty: pack ? pack.qty : null,
    packUnit: pack ? pack.unit : null,
    packText: p.unit && /\d/.test(p.unit) ? p.unit : pack ? q.formatPack(pack) : '',
    unitPrice: unitPrice ? Math.round(unitPrice.value * 100) / 100 : null,
    unitPricePer: unitPrice ? unitPrice.per : null,
    unitPriceText: p.unitPriceText || q.unitPriceText(unitPrice),
    originalPrice: p.originalPrice || null,
    originalPriceText: p.originalPriceText || null,
    discountPercent: p.discountPercent || null,
    xtraPrice: p.xtraPrice || null,
    xtraPriceText: p.xtraPriceText || null,
    xtraDiscountPercent: p.xtraDiscountPercent || null,
    xtraUnitPrice: xtraUnit ? Math.round(xtraUnit.value * 100) / 100 : null,
    xtraUnitPriceText: xtraUnit ? q.unitPriceText(xtraUnit) : null,
    available: p.available !== false,
    badges: badges.slice(0, 6),
  };
}

// ---------- ranking ----------

const STOP = new Set(['a', 'na', 'v', 've', 's', 'se', 'z', 'ze', 'do', 'k', 'pro', 'bez', 'i', 'o']);
const tokens = (s) => fold(s).split(/[^a-z0-9%]+/).filter((t) => t.length > 1 && !STOP.has(t));
const stem = (t) => (t.length > 5 ? t.slice(0, Math.max(4, t.length - 2)) : t.length > 3 ? t.slice(0, t.length - 1) : t);

/** 0..1 – share of query tokens that start a word of the product name (diacritics-insensitive, light stemming). */
function tokenScore(query, productName) {
  const qt = tokens(query);
  if (!qt.length) return 0;
  const nt = tokens(productName);
  let hit = 0;
  qt.forEach((t) => {
    if (nt.some((w) => w.startsWith(t))) hit += 1;
    else if (nt.some((w) => w.startsWith(stem(t)) || (w.length > 3 && t.startsWith(stem(w))))) hit += 0.75;
  });
  let s = hit / qt.length;
  // head word (first query token) among the first words of the name: small bonus
  if (nt.slice(0, 3).some((w) => w.startsWith(stem(qt[0])))) s += 0.1;
  return Math.min(1, s);
}

const MAX_CANDIDATES = 5;

/**
 * Ranks enriched products for one item and returns ≤ 5 candidates.
 * Order: name-token match, then household preference boost, package fit vs. need, unit price;
 * unavailable products go last (and are dropped when there are enough available ones).
 * opts: { query, need?: {qty, unit}, prefs?: { preferLight, preferBio, sort }, preferredProductId? }
 */
function rank(products, opts = {}) {
  const prefs = opts.prefs || {};
  // effective unit price: the Xtra one for households with Rohlík Xtra
  const eff = (p) => (prefs.xtra && p.xtraUnitPrice > 0 ? p.xtraUnitPrice : p.unitPrice);
  const list = products.map((p, i) => ({ p, i, rel: tokenScore(opts.query || '', p.name) }));
  // unit price rank among candidates with the same price unit (0 = cheapest .. 1)
  const byPer = {};
  list.forEach((x) => {
    if (eff(x.p) > 0) (byPer[x.p.unitPricePer || '?'] = byPer[x.p.unitPricePer || '?'] || []).push(eff(x.p));
  });
  Object.values(byPer).forEach((arr) => arr.sort((a, b) => a - b));
  list.forEach((x) => {
    const arr = byPer[x.p.unitPricePer || '?'];
    x.cheap = eff(x.p) > 0 && arr && arr.length > 1 ? 1 - arr.indexOf(eff(x.p)) / (arr.length - 1) : 0.5;
    const fit = opts.need ? q.packFit(opts.need, { qty: x.p.packQty, unit: x.p.packUnit }) : null;
    x.fit = fit == null ? 0.4 : fit;
    let boost = 0;
    if (prefs.preferLight && x.p.badges.includes('Light')) boost += 1.5;
    if (prefs.preferBio && x.p.badges.includes('BIO')) boost += 1.5;
    x.boost = boost;
    // relevance in 0.1 buckets dominates; boost can lift a variant over one bucket or so
    x.score = Math.round(x.rel * 10) + boost + x.fit + x.cheap * 0.1 - x.i * 0.01;
    x.preferred = !!opts.preferredProductId && String(x.p.productId) === String(opts.preferredProductId);
  });

  let pool = list;
  const relevant = pool.filter((x) => x.rel > 0 || x.preferred);
  if (relevant.length >= 3) pool = relevant;
  const available = pool.filter((x) => x.p.available || x.preferred);
  if (available.length >= 3) pool = available;

  const cmp = prefs.sort === 'unitPrice'
    ? (a, b) => (b.rel >= 0.5) - (a.rel >= 0.5)
      || (eff(a.p) > 0 ? eff(a.p) : Infinity) - (eff(b.p) > 0 ? eff(b.p) : Infinity)
      || b.score - a.score
    : (a, b) => b.score - a.score;
  pool.sort((a, b) => (b.p.available - a.p.available) || cmp(a, b));

  const pref = pool.find((x) => x.preferred);
  const ordered = pref ? [pref, ...pool.filter((x) => x !== pref)] : pool;
  return ordered.slice(0, MAX_CANDIDATES).map((x) => (x.preferred ? { ...x.p, preferred: true } : x.p));
}

module.exports = {
  fold, cleanName, lookup, planQuery, isExcluded, enrich, tokenScore, rank, isLight, isBio,
  DICTIONARY, GENERIC_EXCLUDE, MAX_CANDIDATES,
};
