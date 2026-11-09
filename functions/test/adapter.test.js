const test = require('node:test');
const assert = require('node:assert');
const a = require('../src/rohlikAdapter');

const tools = [
  { name: 'get_order_history', description: 'orders', inputSchema: { properties: {} } },
  { name: 'batch_search_products', description: 'Search products', inputSchema: { properties: { keyword: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'add_items_to_cart', description: 'Add to cart', inputSchema: { properties: { productId: { type: 'integer' }, quantity: { type: 'integer' } } } },
];

test('tool picking', () => {
  assert.strictEqual(a.pickSearchTool(tools).name, 'batch_search_products');
  assert.strictEqual(a.pickAddTool(tools).name, 'add_items_to_cart');
});
test('search args mapped to schema', () => {
  assert.deepStrictEqual(a.buildSearchArgs(tools[1], 'mléko'), { keyword: 'mléko', limit: 15 });
});
test('add args single & batch', () => {
  const c = a.buildAddCalls(tools[2], [{ productId: '12', quantity: 2 }]);
  assert.deepStrictEqual(c[0].args, { productId: 12, quantity: 2 });
  const batchTool = { name: 'update_cart', inputSchema: { properties: { items: { type: 'array', items: { type: 'object', properties: { product_id: { type: 'string' }, qty: { type: 'number' } } } } } } };
  const b = a.buildAddCalls(batchTool, [{ productId: '1', quantity: 1 }, { productId: '2', quantity: 3 }]);
  assert.strictEqual(b.length, 1);
  assert.deepStrictEqual(b[0].args.items[1], { product_id: '2', qty: 3 });
});
test('parse JSON text shape A', () => {
  const res = { content: [{ type: 'text', text: JSON.stringify({ products: [
    { productId: 123, name: 'Mléko 1 l', price: { amount: 24.9, currency: 'CZK' }, textualAmount: '1 l', imgPath: 'https://x/y.jpg', slug: '123-mleko' },
    { productId: 124, name: 'Mléko 0,5 l', price: 14.5 },
  ] }) }] };
  const p = a.parseProducts(res);
  assert.strictEqual(p.length, 2);
  assert.strictEqual(p[0].productId, '123');
  assert.strictEqual(p[0].price, 24.9);
  assert.strictEqual(p[0].unit, '1 l');
  assert.strictEqual(p[0].url, 'https://www.rohlik.cz/123-mleko');
  assert.strictEqual(p[1].price, 14.5);
});
test('parse structuredContent shape B, nested + string price', () => {
  const res = { structuredContent: { data: { results: [{ id: 'abc', title: 'Chléb', price: '39,90 Kč', image: 'https://i/c.png' }] } }, content: [] };
  const p = a.parseProducts(res);
  assert.strictEqual(p[0].name, 'Chléb');
  assert.strictEqual(p[0].price, 39.9);
  assert.strictEqual(p[0].imageUrl, 'https://i/c.png');
});
test('parse garbage', () => {
  assert.deepStrictEqual(a.parseProducts({ content: [{ type: 'text', text: 'nic' }] }), []);
});
test('simplifyQuery', () => {
  assert.strictEqual(a.simplifyQuery('Cibule (červená) 2 ks'), 'cibule');
  assert.strictEqual(a.simplifyQuery('máslo nebo margarín'), 'máslo');
  assert.strictEqual(a.simplifyQuery('mouka hladká, 200 g'), 'mouka hladká');
});

test('search: deduped by productId, server order, raw first object reported', async () => {
  const items = [1, 2, 2, 3, 4, 5, 6, 7].map((n) => ({ productId: n, name: `P${n}`, price: n }));
  const res = { content: [{ type: 'text', text: JSON.stringify({ products: items }) }] };
  assert.deepStrictEqual(a.parseProducts(res).map((p) => p.productId), ['1', '2', '3', '4', '5', '6', '7']);
  let args;
  let raw;
  const client = {
    listTools: async () => ({ tools }),
    callTool: async (c) => { args = c.arguments; return res; },
  };
  const out = await a.searchProducts(client, 'mléko', { onRaw: (o) => { raw = o; } });
  assert.deepStrictEqual(out.map((p) => p.productId), ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepStrictEqual(args, { keyword: 'mléko', limit: 15, context: args.context });
  assert.ok(args.context);
  assert.strictEqual(a.describeKeys(raw), 'productId,name,price');
});

test('tool list cache is per client', async () => {
  let calls = 0;
  const mk = () => ({ listTools: async () => { calls += 1; return { tools }; } });
  const c1 = mk();
  const c2 = mk();
  await a.listTools(c1);
  await a.listTools(c1);
  await a.listTools(c2);
  assert.strictEqual(calls, 2);
});

test('normaliseProduct: sale and Xtra price from real field names', () => {
  const p = a.normaliseProduct({
    productId: 1, productName: 'Sýr 200 g', textualAmount: '200 g', price: 59.9, originalPrice: 80.9, discountPercentage: 25,
    pricePerUnit: { full: 299.5, currency: 'CZK' }, badges: ['best-buy'],
    xtraMemberPrice: { price: 49.9, currency: 'CZK', originalPrice: 59.9, discountPercentage: 17 },
  });
  assert.strictEqual(p.price, 59.9);
  assert.strictEqual(p.originalPrice, 80.9);
  assert.strictEqual(p.originalPriceText, '80,9 Kč');
  assert.strictEqual(p.discountPercent, 25);
  assert.strictEqual(p.xtraPrice, 49.9);
  assert.strictEqual(p.xtraPriceText, '49,9 Kč');
  assert.strictEqual(p.xtraDiscountPercent, 17);
  assert.strictEqual(p.xtraUnitPrice, Math.round((299.5 * 49.9 / 59.9) * 100) / 100);
  assert.ok(p.badges.includes('Akce'));
});

test('normaliseProduct: no sale without a real reduction', () => {
  const p = a.normaliseProduct({ productId: 2, productName: 'X', price: 10, originalPrice: 10, discountPercentage: 0,
    xtraMemberPrice: { price: 12, currency: 'CZK' } });
  assert.strictEqual(p.originalPrice, null);
  assert.strictEqual(p.discountPercent, null);
  assert.strictEqual(p.xtraPrice, null);
  assert.ok(!p.badges.includes('Akce'));
});
