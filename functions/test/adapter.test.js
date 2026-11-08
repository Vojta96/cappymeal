const test = require('node:test');
const assert = require('node:assert');
const a = require('../src/rohlikAdapter');

const tools = [
  { name: 'get_order_history', description: 'orders', inputSchema: { properties: {} } },
  { name: 'search_products', description: 'Search products', inputSchema: { properties: { keyword: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'add_to_cart', description: 'Add to cart', inputSchema: { properties: { productId: { type: 'integer' }, quantity: { type: 'integer' } } } },
];

test('tool picking', () => {
  assert.strictEqual(a.pickSearchTool(tools).name, 'search_products');
  assert.strictEqual(a.pickAddTool(tools).name, 'add_to_cart');
});
test('search args mapped to schema', () => {
  assert.deepStrictEqual(a.buildSearchArgs(tools[1], 'mléko'), { keyword: 'mléko', limit: 8 });
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

test('variants: deduped by productId, best-first, max 5', async () => {
  const items = [1, 2, 2, 3, 4, 5, 6, 7].map((n) => ({ productId: n, name: `P${n}`, price: n }));
  const res = { content: [{ type: 'text', text: JSON.stringify({ products: items }) }] };
  assert.deepStrictEqual(a.parseProducts(res).map((p) => p.productId), ['1', '2', '3', '4', '5', '6', '7']);
  let args;
  const client = {
    listTools: async () => ({ tools }),
    callTool: async (c) => { args = c.arguments; return res; },
  };
  const out = await a.searchProducts(client, 'mléko');
  assert.deepStrictEqual(out.map((p) => p.productId), ['1', '2', '3', '4', '5']);
  assert.deepStrictEqual(args, { keyword: 'mléko', limit: 8 });
  assert.strictEqual((await a.searchProducts(client, 'mléko', 3)).length, 3);
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
