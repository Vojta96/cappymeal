import {
  formatQty,
  leftoverText,
  needForServer,
  packOf,
  packsFor,
  parseAmount,
  parsePack,
  presetQty,
  sumNeed,
} from './quantity';
import { arrangeCandidates, prefRecord, prefUpdates, shopPrefs } from './shop';

describe('parseAmount', () => {
  test('metric units, decimal commas, no space', () => {
    expect(parseAmount('200 g')).toEqual({ qty: 200, unit: 'g' });
    expect(parseAmount('200g')).toEqual({ qty: 200, unit: 'g' });
    expect(parseAmount('0,5 l')).toEqual({ qty: 500, unit: 'ml' });
    expect(parseAmount('1.5 kg')).toEqual({ qty: 1500, unit: 'g' });
    expect(parseAmount('2 dl')).toEqual({ qty: 200, unit: 'ml' });
    expect(parseAmount('10 dkg')).toEqual({ qty: 100, unit: 'g' });
    expect(parseAmount('250 ml')).toEqual({ qty: 250, unit: 'ml' });
  });
  test('pieces', () => {
    expect(parseAmount('2 ks')).toEqual({ qty: 2, unit: 'ks' });
    expect(parseAmount('3 vejce')).toEqual({ qty: 3, unit: 'ks' });
    expect(parseAmount('½ ks')).toEqual({ qty: 0.5, unit: 'ks' });
    expect(parseAmount('¼ ks')).toEqual({ qty: 0.25, unit: 'ks' });
    expect(parseAmount('2')).toEqual({ qty: 2, unit: 'ks' });
    expect(parseAmount('1 velké')).toEqual({ qty: 1, unit: 'ks' });
    expect(parseAmount('1 hlávka')).toEqual({ qty: 1, unit: 'ks' });
  });
  test('fractions and ranges (upper bound)', () => {
    expect(parseAmount('1-2 ks')).toEqual({ qty: 2, unit: 'ks' });
    expect(parseAmount('1–2')).toEqual({ qty: 2, unit: 'ks' });
    expect(parseAmount('1 až 2 sklenice')).toEqual({ qty: 2, unit: 'bal' });
    expect(parseAmount('1 ½ lžíce')).toEqual({ qty: 22.5, unit: 'spoon' });
    expect(parseAmount('1/2 l')).toEqual({ qty: 500, unit: 'ml' });
  });
  test('spoons, handful, packages', () => {
    expect(parseAmount('2 lžíce')).toEqual({ qty: 30, unit: 'spoon' });
    expect(parseAmount('1 lžička')).toEqual({ qty: 5, unit: 'spoon' });
    expect(parseAmount('½ lžičky')).toEqual({ qty: 2.5, unit: 'spoon' });
    expect(parseAmount('4 lžic')).toEqual({ qty: 60, unit: 'spoon' });
    expect(parseAmount('1 hrst')).toEqual({ qty: 30, unit: 'g' });
    expect(parseAmount('1 balení')).toEqual({ qty: 1, unit: 'bal' });
    expect(parseAmount('½ plechovky')).toEqual({ qty: 0.5, unit: 'bal' });
  });
  test('no quantity vs unknown', () => {
    expect(parseAmount('špetka')).toEqual({ none: true });
    expect(parseAmount('1 špetka')).toEqual({ none: true });
    expect(parseAmount('dle chuti')).toEqual({ none: true });
    expect(parseAmount('dle potřeby')).toEqual({ none: true });
    expect(parseAmount('')).toEqual({ none: true });
    expect(parseAmount('4 plátky')).toBeNull();
    expect(parseAmount('2 stroužky')).toBeNull();
    expect(parseAmount('hodně')).toBeNull();
  });
});

describe('sumNeed', () => {
  test('sums across days in base units', () => {
    expect(sumNeed(['200 g', '250 g'])).toEqual({ qty: 450, unit: 'g' });
    expect(sumNeed(['0,5 l', '200 ml'], 'Mléko')).toEqual({ qty: 700, unit: 'ml' });
    expect(sumNeed(['2 ks', '3 vejce'])).toEqual({ qty: 5, unit: 'ks' });
    expect(sumNeed(['1 kg', '200g'])).toEqual({ qty: 1200, unit: 'g' });
  });
  test('spoons follow the other amounts / liquids', () => {
    expect(sumNeed(['1 lžíce', '1 lžíce'], 'Olej')).toEqual({ qty: 30, unit: 'ml' });
    expect(sumNeed(['2 lžičky'], 'Med')).toEqual({ qty: 10, unit: 'ml' });
    expect(sumNeed(['2 lžíce'], 'Mouka hladká')).toEqual({ qty: 30, unit: 'g' });
    expect(sumNeed(['100 ml', '1 lžíce'], 'Smetana na vaření')).toEqual({ qty: 115, unit: 'ml' });
  });
  test('seasoning is ignored, unknown / incompatible → null', () => {
    expect(sumNeed(['200 g', 'dle chuti'])).toEqual({ qty: 200, unit: 'g' });
    expect(sumNeed(['dle chuti', 'špetka'])).toBeNull();
    expect(sumNeed([])).toBeNull();
    expect(sumNeed(['2 ks', '200 g'])).toBeNull();
    expect(sumNeed(['4 plátky', '100 g'])).toBeNull();
    expect(sumNeed(['2 ks', '1 lžíce'])).toBeNull();
  });
});

test('formatQty', () => {
  expect(formatQty({ qty: 450, unit: 'g' })).toBe('450 g');
  expect(formatQty({ qty: 1200, unit: 'g' })).toBe('1,2 kg');
  expect(formatQty({ qty: 1500, unit: 'ml' })).toBe('1,5 l');
  expect(formatQty({ qty: 700, unit: 'ml' })).toBe('700 ml');
  expect(formatQty({ qty: 2.5, unit: 'ks' })).toBe('2,5 ks');
  expect(formatQty(null)).toBe('');
});

describe('packages', () => {
  test('parsePack from product texts', () => {
    expect(parsePack('Madeta Cottage 180 g')).toEqual({ qty: 180, unit: 'g' });
    expect(parsePack('Vejce M 10 ks')).toEqual({ qty: 10, unit: 'ks' });
    expect(parsePack('Mléko 1,5% 1 l')).toEqual({ qty: 1000, unit: 'ml' });
    expect(parsePack('Jogurt 4 x 125 g')).toEqual({ qty: 500, unit: 'g' });
    expect(parsePack('0,5 l')).toEqual({ qty: 500, unit: 'ml' });
    expect(parsePack('Banány')).toBeNull();
  });
  test('packOf prefers server fields', () => {
    expect(packOf({ packQty: 250, packUnit: 'g', name: 'X 100 g' })).toEqual({ qty: 250, unit: 'g' });
    expect(packOf({ name: 'Madeta Cottage 180 g' })).toEqual({ qty: 180, unit: 'g' });
    expect(packOf({ packText: '1 l', name: 'Mléko' })).toEqual({ qty: 1000, unit: 'ml' });
  });
  test('packsFor, leftover, cap', () => {
    expect(packsFor({ qty: 450, unit: 'g' }, { qty: 180, unit: 'g' })).toEqual({ packs: 3, leftover: { qty: 90, unit: 'g' } });
    expect(packsFor({ qty: 180, unit: 'g' }, { qty: 180, unit: 'g' })).toEqual({ packs: 1, leftover: null });
    expect(packsFor({ qty: 4, unit: 'ks' }, { qty: 10, unit: 'ks' })).toEqual({ packs: 1, leftover: { qty: 6, unit: 'ks' } });
    expect(packsFor({ qty: 300, unit: 'g' }, { qty: 250, unit: 'ml' }).packs).toBe(2);
    expect(packsFor({ qty: 99999, unit: 'g' }, { qty: 10, unit: 'g' }).packs).toBe(50);
    expect(packsFor({ qty: 1, unit: 'bal' }, null)).toEqual({ packs: 1, leftover: null });
    expect(packsFor({ qty: 2, unit: 'ks' }, { qty: 1000, unit: 'g' })).toBeNull();
    expect(packsFor(null, { qty: 1, unit: 'g' })).toBeNull();
  });
  test('presetQty and leftoverText', () => {
    const need = sumNeed(['200 g', '250 g']);
    const c = { name: 'Madeta Cottage 180 g' };
    expect(presetQty(need, c)).toBe(3);
    expect(leftoverText(need, c, 3)).toBe('zbude 90 g');
    expect(leftoverText(need, c, 2)).toBe('');
    expect(presetQty(sumNeed(['2 ks']), { name: 'Brambory 1 kg' })).toBe(1);
    expect(leftoverText(sumNeed(['2 ks']), { name: 'Brambory 1 kg' }, 1)).toBe('');
    expect(presetQty(null, c)).toBe(1);
    expect(presetQty(sumNeed(['1 balení']), { name: 'Káva 250 g' })).toBe(1);
  });
  test('needForServer', () => {
    expect(needForServer({ qty: 450, unit: 'g' })).toEqual({ qty: 450, unit: 'g' });
    expect(needForServer({ qty: 1, unit: 'bal' })).toBeUndefined();
    expect(needForServer(null)).toBeUndefined();
  });
});

describe('shop helpers', () => {
  const cands = [
    { productId: '1', name: 'A 180 g', available: true },
    { productId: '2', name: 'B 500 g', available: true },
    { productId: '3', name: 'C 150 g', available: false },
  ];
  test('no remembered product: first available preselected', () => {
    const r = arrangeCandidates([{ ...cands[2] }, cands[0]], null);
    expect(r.selected).toBe(1);
    expect(r.note).toBeNull();
  });
  test('remembered product found → first + preferred', () => {
    const r = arrangeCandidates(cands, { productId: '2', name: 'B' }, 'found');
    expect(r.options.map((o) => o.productId)).toEqual(['2', '1', '3']);
    expect(r.options[0].preferred).toBe(true);
    expect(r.selected).toBe(0);
  });
  test('remembered product missing → snapshot "z minulého nákupu"', () => {
    const r = arrangeCandidates(cands, { productId: '9', name: 'Staré', priceText: '20 Kč', packText: '200 g' }, 'missing');
    expect(r.options[0]).toMatchObject({ productId: '9', snapshot: true, preferred: true, packText: '200 g' });
    expect(r.selected).toBe(0);
  });
  test('remembered product unavailable → best other preselected + note', () => {
    const r = arrangeCandidates([cands[2], cands[0], cands[1]], { productId: '3' }, 'unavailable');
    expect(r.options[0].productId).toBe('3');
    expect(r.selected).toBe(1);
    expect(r.note).toBe('unavailable');
  });
  test('nothing found', () => {
    expect(arrangeCandidates([], null)).toEqual({ options: [], selected: -1, note: null });
  });
  test('prefRecord respects rule limits and counts repeats', () => {
    const c = { productId: 12, name: 'x'.repeat(300), imageUrl: 'http://insecure/x.jpg', priceText: '39,90 Kč', packText: '180 g' };
    const r = prefRecord(c, null, 'u1', 5);
    expect(r).toEqual({ productId: '12', name: 'x'.repeat(200), count: 1, lastAt: 5, by: 'u1', priceText: '39,90 Kč', packText: '180 g' });
    expect(prefRecord({ ...c, imageUrl: 'https://cdn/x.jpg' }, { productId: '12', count: 4 }, 'u1', 6)).toMatchObject({ count: 5, imageUrl: 'https://cdn/x.jpg' });
    expect(prefRecord(c, { productId: '99', count: 4 }, 'u1', 6).count).toBe(1);
  });
  test('prefUpdates skips unsafe keys', () => {
    const u = prefUpdates(
      [
        { key: 'cottage sýr', product: { productId: '1', name: 'A' } },
        { key: 'regular:k1', product: { productId: '2', name: 'B' } },
        { key: 'a.b', product: { productId: '3', name: 'C' } },
      ],
      {},
      'u1',
      1,
    );
    expect(Object.keys(u)).toEqual(['cottage sýr', 'regular:k1']);
  });
  test('shopPrefs defaults', () => {
    expect(shopPrefs({})).toEqual({ preferLight: false, preferBio: false, sort: 'best' });
    expect(shopPrefs({ shop: { preferBio: true, sort: 'unitPrice' } })).toEqual({ preferLight: false, preferBio: true, sort: 'unitPrice' });
  });
});
