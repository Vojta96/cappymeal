'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rohlik = require('../src/rohlikAdapter');
const co = require('../src/checkout');

const cartData = {
  status: 200, messages: [],
  data: { totalPrice: 59.9, items: { 1317247: { productId: 1317247, productName: 'Borůvky', quantity: 2, price: 59.9, textualAmount: '125 g' } } },
};

function fakeClient(res) {
  return {
    listTools: async () => ({ tools: [{ name: 'get_cart', inputSchema: { type: 'object', properties: { context: { type: 'string' } } } }] }),
    callTool: async () => res,
  };
}

test('callJson prefers JSON text over structuredContent { result } wrapper (get_cart was read as empty)', async () => {
  const client = fakeClient({
    content: [{ type: 'text', text: JSON.stringify(cartData) }],
    structuredContent: { result: cartData },
  });
  const payload = await rohlik.callJson(client, 'get_cart', { context: 'x' });
  const cart = co.parseCart(payload);
  assert.strictEqual(cart.items.length, 1);
  assert.strictEqual(cart.items[0].quantity, 2);
});

test('callJson unwraps structuredContent { result } when the text is not JSON', async () => {
  const client = fakeClient({ content: [{ type: 'text', text: 'not json' }], structuredContent: { result: cartData } });
  const cart = co.parseCart(await rohlik.callJson(client, 'get_cart', { context: 'x' }));
  assert.strictEqual(cart.items.length, 1);
});
