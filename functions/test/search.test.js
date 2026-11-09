const test = require('node:test');
const assert = require('node:assert');
const q = require('../src/quantity');
const ps = require('../src/productSearch');
const a = require('../src/rohlikAdapter');
const { matchItem } = require('../src/matcher');

// ---------- packages / unit prices ----------

test('parsePack: names and amount texts', () => {
  assert.deepStrictEqual(q.parsePack('Madeta Cottage 180 g'), { qty: 180, unit: 'g' });
  assert.deepStrictEqual(q.parsePack('Vejce M 10 ks'), { qty: 10, unit: 'ks' });
  assert.deepStrictEqual(q.parsePack('Mléko 1,5% 1 l'), { qty: 1000, unit: 'ml' });
  assert.deepStrictEqual(q.parsePack('Polotučné mléko 1,5 % 0,5 l'), { qty: 500, unit: 'ml' });
  assert.deepStrictEqual(q.parsePack('Jogurt 4 x 125 g'), { qty: 500, unit: 'g' });
  assert.deepStrictEqual(q.parsePack('Voda 6×1,5 l'), { qty: 9000, unit: 'ml' });
  assert.deepStrictEqual(q.parsePack('500g'), { qty: 500, unit: 'g' });
  assert.deepStrictEqual(q.parsePack('cca 1 kg'), { qty: 1000, unit: 'g' });
  assert.deepStrictEqual(q.parsePack('Smetana 12% 200 ml'), { qty: 200, unit: 'ml' });
  assert.strictEqual(q.parsePack('Banány'), null);
  assert.strictEqual(q.parsePack('Olej 1 lžíce'), null);
  assert.strictEqual(q.parsePack(''), null);
});

test('packsFor / packFit / unit price', () => {
  assert.deepStrictEqual(q.packsFor({ qty: 450, unit: 'g' }, { qty: 180, unit: 'g' }), { packs: 3, leftover: 90 });
  assert.deepStrictEqual(q.packsFor({ qty: 180, unit: 'g' }, { qty: 180, unit: 'g' }), { packs: 1, leftover: 0 });
  assert.deepStrictEqual(q.packsFor({ qty: 300, unit: 'ml' }, { qty: 1000, unit: 'ml' }), { packs: 1, leftover: 700 });
  assert.deepStrictEqual(q.packsFor({ qty: 200, unit: 'g' }, { qty: 250, unit: 'ml' }), { packs: 1, leftover: 50 });
  assert.strictEqual(q.packsFor({ qty: 4, unit: 'ks' }, { qty: 500, unit: 'g' }), null);
  assert.strictEqual(q.packsFor({ qty: 100000, unit: 'g' }, { qty: 10, unit: 'g' }).packs, 50);
  assert.strictEqual(q.packFit({ qty: 180, unit: 'g' }, { qty: 180, unit: 'g' }), 1);
  assert.ok(q.packFit({ qty: 450, unit: 'g' }, { qty: 500, unit: 'g' }) > q.packFit({ qty: 450, unit: 'g' }, { qty: 1000, unit: 'g' }));
  assert.strictEqual(q.packFit({ qty: 4, unit: 'ks' }, { qty: 1, unit: 'l' }), null);
  assert.deepStrictEqual(q.computeUnitPrice(39.9, { qty: 180, unit: 'g' }).per, 'kg');
  assert.strictEqual(q.unitPriceText(q.computeUnitPrice(39.9, { qty: 180, unit: 'g' })), '221,67 Kč/kg');
  assert.strictEqual(q.unitPriceText(q.computeUnitPrice(59.9, { qty: 10, unit: 'ks' })), '5,99 Kč/ks');
  assert.strictEqual(q.formatPack({ qty: 1500, unit: 'g' }), '1,5 kg');
  assert.strictEqual(q.formatPack({ qty: 1000, unit: 'ml' }), '1 l');
  assert.strictEqual(q.formatPack({ qty: 10, unit: 'ks' }), '10 ks');
});

// ---------- normaliser + dictionary ----------

test('cleanName strips adjectives, amounts, parentheses, alternatives', () => {
  assert.strictEqual(ps.cleanName('Mrkev nastrouhaná'), 'mrkev');
  assert.strictEqual(ps.cleanName('Brambory uvařené (z večera)'), 'brambory');
  assert.strictEqual(ps.cleanName('Čerstvý špenát nebo mražený'), 'spenat');
  assert.strictEqual(ps.cleanName('Cibule na kostičky, 2 ks'), 'cibule');
  assert.strictEqual(ps.cleanName('Skyr / cottage sýr'), 'skyr');
  assert.strictEqual(ps.cleanName('Sůl, pepř'), 'sul');
  assert.strictEqual(ps.cleanName('Smetana na vaření'), 'smetana na vareni');
});

test('dictionary: aliases → canonical query', () => {
  const qy = (n) => ps.planQuery(n).query;
  assert.strictEqual(qy('Vaječné bílky'), 'vejce');
  assert.strictEqual(qy('Bílky'), 'vejce');
  assert.strictEqual(qy('Žloutky'), 'vejce');
  assert.strictEqual(qy('Vejce natvrdo'), 'vejce');
  assert.strictEqual(qy('vajíčka'), 'vejce');
  assert.strictEqual(qy('Cottage'), 'cottage sýr');
  assert.strictEqual(qy('Cottage sýr'), 'cottage sýr');
  assert.strictEqual(qy('Kuřecí prsa'), 'kuřecí prsní řízky');
  assert.strictEqual(qy('Prsa'), 'kuřecí prsní řízky');
  assert.strictEqual(qy('Brambory velké'), 'brambory');
  assert.strictEqual(qy('Banán zralý'), 'banány');
  // not swallowed by a shorter alias
  assert.strictEqual(qy('Vaječné nudle'), 'vaječné nudle');
  assert.strictEqual(qy('Kokosové mléko'), 'kokosové mléko');
  assert.strictEqual(qy('Paprika sladká mletá'), 'paprika sladká mletá');
  assert.strictEqual(qy('Rajčata drcená'), 'drcená rajčata');
  // unknown ingredient keeps diacritics, loses the noise
  assert.strictEqual(qy('Žampiony nakrájené'), 'žampiony');
  assert.strictEqual(qy('Quinoa (bílá)'), 'quinoa');
  assert.strictEqual(qy('Hořčice plnotučná'), 'hořčice plnotučná');
});

test('user override query is used verbatim', () => {
  const p = ps.planQuery('Vejce', '  Vejce   L  ');
  assert.strictEqual(p.query, 'Vejce L');
  assert.strictEqual(p.user, true);
  assert.deepStrictEqual(ps.planQuery('Mléko', 'mléko').exclude.includes('kokos'), true);
});

test('exclusions: per ingredient + generic, unless asked for', () => {
  const chicken = ps.planQuery('Kuřecí prsa');
  assert.strictEqual(ps.isExcluded('Kuřecí prsní řízky chlazené 500 g', chicken), false);
  assert.strictEqual(ps.isExcluded('Kuřecí prsa uzená 100 g', chicken), true);
  assert.strictEqual(ps.isExcluded('Kuřecí šunka 100 g', chicken), true);
  assert.strictEqual(ps.isExcluded('Kuřecí nuggets 400 g', chicken), true);
  const eggs = ps.planQuery('Vejce');
  assert.strictEqual(ps.isExcluded('Čerstvá vejce M 10 ks', eggs), false);
  assert.strictEqual(ps.isExcluded('Kinder Surprise vajíčko', eggs), true);
  assert.strictEqual(ps.isExcluded('Čokoládové vajíčko', eggs), true);
  assert.strictEqual(ps.isExcluded('Vaječné těstoviny 500 g', eggs), true);
  const carrot = ps.planQuery('Mrkev');
  assert.strictEqual(ps.isExcluded('Hami Mrkev první lžička 125 g', carrot), true);
  assert.strictEqual(ps.isExcluded('Mrkev pro děti od 4. měsíce', carrot), true);
  assert.strictEqual(ps.isExcluded('Granule pro psy s kuřecím', ps.planQuery('Kuřecí maso')), true);
  // the user explicitly searched for it
  assert.strictEqual(ps.isExcluded('Krmivo pro psy 1 kg', ps.planQuery('x', 'krmivo pro psy')), false);
  assert.strictEqual(ps.isExcluded('Česnek granulovaný', ps.planQuery('Česnek granulovaný')), false);
});

// ---------- adapter normalisation (structured fields) ----------

test('normaliseProduct reads structured fields when present', () => {
  const p = a.normaliseProduct({
    productId: 1, name: 'Madeta Cottage 180 g', price: { amount: 39.9, currency: 'CZK' },
    pricePerUnit: { amount: 221.67, unit: 'kg' }, inStock: false, brand: { name: 'Madeta' },
    badges: [{ type: 'bio', title: 'BIO' }, 'Novinka'], textualAmount: '180 g', images: [{ url: 'https://cdn.rohlik.cz/x.jpg' }],
  });
  assert.strictEqual(p.available, false);
  assert.strictEqual(p.unitPriceValue, 221.67);
  assert.strictEqual(p.unitPricePer, 'kg');
  assert.strictEqual(p.brand, 'Madeta');
  assert.deepStrictEqual(p.badges, ['BIO', 'Novinka']);
  assert.strictEqual(p.imageUrl, 'https://cdn.rohlik.cz/x.jpg');
  const s = a.normaliseProduct({ id: 'x', title: 'Mléko', price: '24,90 Kč', unitPrice: '24,90 Kč/l', availability: 'available',
    amount: 1, amountUnit: 'l', originalPrice: 29.9, imageUrl: 'javascript:alert(1)' });
  assert.strictEqual(s.available, true);
  assert.deepStrictEqual(s.pack, { qty: 1000, unit: 'ml' });
  assert.strictEqual(s.unitPricePer, 'l');
  assert.ok(s.badges.includes('Akce'));
  assert.strictEqual(s.imageUrl, null);
  const per100 = a.normaliseProduct({ id: 2, name: 'Sýr', price: 50, unit_price: { value: 10, unit: '100 g' } });
  assert.strictEqual(per100.unitPriceValue, 100);
  assert.strictEqual(per100.unitPricePer, 'kg');
  assert.strictEqual(a.normaliseProduct({ id: 3, name: 'X', availability: { status: 'SOLD_OUT' } }).available, false);
  assert.strictEqual(a.normaliseProduct({ id: 4, name: 'X', stock: 0 }).available, false);
});

test('enrich: pack, unit price, badges from text when not structured', () => {
  const e = ps.enrich(a.normaliseProduct({ id: 1, name: 'BIO Polotučné mléko 1,5% 1 l', price: 32.9 }));
  assert.strictEqual(e.packQty, 1000);
  assert.strictEqual(e.packUnit, 'ml');
  assert.strictEqual(e.packText, '1 l');
  assert.strictEqual(e.unitPrice, 32.9);
  assert.strictEqual(e.unitPriceText, '32,90 Kč/l');
  assert.ok(e.badges.includes('BIO'));
  assert.strictEqual(e.available, true);
  const light = ps.enrich(a.normaliseProduct({ id: 2, name: 'Jogurt bílý 0 % tuku 150 g', price: 15 }));
  assert.ok(light.badges.includes('Light'));
  assert.ok(!ps.enrich(a.normaliseProduct({ id: 3, name: 'Smetana 10 % 200 ml', price: 15 })).badges.includes('Light'));
  assert.ok(ps.isLight({ name: 'Skyr bílý 140 g' }));
  assert.ok(ps.isLight({ name: 'Mléko odtučněné 0,5 % 1 l' }));
  assert.ok(!ps.isBio({ name: 'Biologický rozbor' }));
});

// ---------- ranking ----------

const fixture = (list) => list.map(([id, name, price, extra]) => ps.enrich(a.normaliseProduct({ id, name, price, ...(extra || {}) })));

test('tokenScore: diacritics-insensitive, word starts', () => {
  assert.strictEqual(ps.tokenScore('cottage sýr', 'Madeta Cottage sýr 180 g'), 1);
  assert.ok(ps.tokenScore('kuřecí prsní řízky', 'Kurecí prsni rizky 500 g') >= 0.9);
  assert.ok(ps.tokenScore('vejce', 'Mléko 1 l') === 0);
  assert.ok(ps.tokenScore('rajčata', 'Rajče keříkové 500 g') > 0);
});

test('rank: relevance first, then pack fit, then unit price; ≤ 5', () => {
  const products = fixture([
    [1, 'Sýr Eidam 30% 100 g', 25],
    [2, 'Cottage sýr 180 g', 39.9],
    [3, 'Cottage sýr 500 g', 79.9],
    [4, 'Cottage sýr light 150 g', 32.9],
    [5, 'Cottage sýr BIO 180 g', 49.9],
    [6, 'Tvaroh měkký 250 g', 29.9],
    [7, 'Cottage sýr pažitka 150 g', 34.9],
  ]);
  const out = ps.rank(products, { query: 'cottage sýr', need: { qty: 480, unit: 'g' } });
  assert.strictEqual(out.length, 5);
  assert.strictEqual(out[0].productId, '3'); // 500 g covers 480 g with the least waste
  assert.ok(!out.some((p) => p.productId === '1' || p.productId === '6')); // irrelevant dropped when ≥ 3 relevant
});

test('rank: household prefs boost light / BIO; sort by unit price', () => {
  const products = fixture([
    [1, 'Cottage sýr 180 g', 39.9],
    [2, 'Cottage sýr light 180 g', 42.9],
    [3, 'Cottage sýr BIO 180 g', 59.9],
    [4, 'Cottage sýr 500 g', 79.9],
  ]);
  assert.strictEqual(ps.rank(products, { query: 'cottage sýr', prefs: { preferLight: true } })[0].productId, '2');
  assert.strictEqual(ps.rank(products, { query: 'cottage sýr', prefs: { preferBio: true } })[0].productId, '3');
  const cheap = ps.rank(products, { query: 'cottage sýr', prefs: { sort: 'unitPrice' } });
  assert.strictEqual(cheap[0].productId, '4'); // 159,80 Kč/kg
  assert.strictEqual(cheap[cheap.length - 1].productId, '3');
});

test('rank: unavailable last or dropped, preferred first even if unavailable', () => {
  const products = fixture([
    [1, 'Vejce M 10 ks', 59.9, { available: false }],
    [2, 'Vejce L 10 ks', 69.9],
    [3, 'Vejce M 6 ks', 39.9],
    [4, 'Vejce z volného výběhu 10 ks', 89.9],
  ]);
  const out = ps.rank(products, { query: 'vejce', need: { qty: 4, unit: 'ks' } });
  assert.ok(!out.some((p) => p.productId === '1'));
  assert.strictEqual(out[0].productId, '3'); // 6 ks fits 4 ks best
  const withPref = ps.rank(products, { query: 'vejce', preferredProductId: '1' });
  assert.strictEqual(withPref[0].productId, '1');
  assert.strictEqual(withPref[0].preferred, true);
  assert.strictEqual(withPref[0].available, false);
  const few = fixture([[1, 'Vejce M 10 ks', 59.9, { available: false }], [2, 'Vejce L 10 ks', 69.9]]);
  assert.deepStrictEqual(ps.rank(few, { query: 'vejce' }).map((p) => p.productId), ['2', '1']);
});

// ---------- matcher (search injected) ----------

function fakeSearch(table) {
  const calls = [];
  const fn = async (query) => {
    calls.push(query);
    return (table[query] || []).map((p) => a.normaliseProduct(p));
  };
  fn.calls = calls;
  return fn;
}

test('matchItem: canonical query, exclusions, ranking', async () => {
  const search = fakeSearch({
    vejce: [
      { id: 1, name: 'Kinder Surprise vajíčko 20 g', price: 35 },
      { id: 2, name: 'Vejce M 10 ks', price: 59.9 },
      { id: 3, name: 'Vaječné nudle 250 g', price: 29 },
      { id: 4, name: 'Vejce L 6 ks', price: 45.9 },
    ],
  });
  const r = await matchItem(search, { key: 'vaječné bílky', name: 'Vaječné bílky', amounts: ['3 ks'], need: { qty: 3, unit: 'ks' } });
  assert.deepStrictEqual(search.calls, ['vejce']);
  assert.strictEqual(r.query, 'vejce');
  assert.deepStrictEqual(r.candidates.map((c) => c.productId), ['4', '2']);
  assert.strictEqual(r.preferred, null);
});

test('matchItem: remembered product found / via extra search / missing / unavailable', async () => {
  const table = {
    'cottage sýr': [
      { id: 10, name: 'Cottage sýr 180 g', price: 39.9 },
      { id: 11, name: 'Cottage sýr 500 g', price: 79.9 },
      { id: 12, name: 'Cottage light 150 g', price: 32.9, available: false },
    ],
    'Madeta Cottage jemný 180 g': [{ id: 99, name: 'Madeta Cottage jemný 180 g', price: 41.9 }],
  };
  const item = { key: 'cottage sýr', name: 'Cottage sýr', amounts: [] };
  let s = fakeSearch(table);
  let r = await matchItem(s, { ...item, preferredProductId: '11', preferredName: 'Cottage sýr 500 g' });
  assert.strictEqual(r.preferred, 'found');
  assert.strictEqual(r.candidates[0].productId, '11');
  assert.strictEqual(r.candidates[0].preferred, true);
  assert.strictEqual(s.calls.length, 1);

  s = fakeSearch(table);
  r = await matchItem(s, { ...item, preferredProductId: '99', preferredName: 'Madeta Cottage jemný 180 g' });
  assert.strictEqual(r.preferred, 'found');
  assert.strictEqual(r.candidates[0].productId, '99');
  assert.strictEqual(s.calls.length, 2);

  s = fakeSearch(table);
  r = await matchItem(s, { ...item, preferredProductId: '777', preferredName: 'Zrušený výrobek' });
  assert.strictEqual(r.preferred, 'missing');
  assert.ok(!r.candidates.some((c) => c.preferred));

  s = fakeSearch(table);
  r = await matchItem(s, { ...item, preferredProductId: '12', preferredName: 'Cottage light 150 g' }, { preferLight: true });
  assert.strictEqual(r.preferred, 'unavailable');
  assert.strictEqual(r.candidates[0].productId, '12');
  assert.strictEqual(r.candidates[0].available, false);
});

test('matchItem: user query override and fallback when everything is excluded', async () => {
  const s = fakeSearch({ 'tvaroh': [{ id: 1, name: 'Tvaroh měkký 250 g', price: 29.9 }],
    'mléko': [{ id: 5, name: 'Mléčná čokoláda 100 g', price: 30 }, { id: 6, name: 'Kakao mléko 1 l', price: 25 }] });
  const r = await matchItem(s, { key: 'cottage', name: 'Cottage', amounts: [], query: 'tvaroh' });
  assert.deepStrictEqual(s.calls, ['tvaroh']);
  assert.strictEqual(r.candidates[0].productId, '1');
  // every result hits a negative keyword → show them anyway rather than nothing
  const m = await matchItem(s, { key: 'mléko', name: 'Mléko', amounts: [] });
  assert.ok(m.candidates.length > 0);
});

test('rank: Xtra households sort by the Xtra unit price', () => {
  const mk = (id, price, xtra) => ps.enrich(a.normaliseProduct({
    productId: id, productName: `Cottage sýr ${id}`, textualAmount: '200 g', price, pricePerUnit: { full: price * 5, currency: 'CZK' },
    ...(xtra ? { xtraMemberPrice: { price: xtra, currency: 'CZK' } } : {}),
  }));
  const products = [mk('1', 40), mk('2', 50, 30), mk('3', 45)];
  assert.strictEqual(ps.rank(products, { query: 'cottage sýr', prefs: { sort: 'unitPrice' } })[0].productId, '1');
  const x = ps.rank(products, { query: 'cottage sýr', prefs: { sort: 'unitPrice', xtra: true } });
  assert.strictEqual(x[0].productId, '2');
  assert.strictEqual(x[0].xtraUnitPrice, 150);
});
