const test = require('node:test');
const assert = require('node:assert');
const co = require('../src/checkout');
const a = require('../src/rohlikAdapter');
const v = require('../src/validate');

// Fixtures follow the masked shapes logged from the real Rohlík MCP (values invented).
const cartPayload = {
  status: 200,
  messages: [],
  data: {
    cartId: 1,
    totalPrice: 106.37,
    totalSavings: 10,
    minimalStandardOrderPrice: 749,
    minimalDeliveryPointOrderPrice: 0,
    premiumSavings: 0,
    deliveryPointEnabled: true,
    submitConditionPassed: false,
    companies: [{ id: 1, name: 'Rohlík', label: 'x', link: 'x', categories: [300101000] }],
    categories: { 300101000: { id: 300101000, name: 'Mléčné', position: 1, items: [709025, 710869], topMessages: [], bottomMessages: [] } },
    items: {
      709025: {
        productId: 709025, orderFieldId: 1, imgPath: 'https://cdn.rohlik.cz/images/grocery/products/709025/x.jpg',
        productName: 'Mléko polotučné 1 l', link: '/709025-mleko', baseLink: '/709025', quantity: 2, volume: '', unit: 'l',
        maxBasketAmount: 30, maxBasketAmountReason: '', salePercents: 0, originalPricePerUnit: 24.9, price: 49.8,
        currency: 'CZK', textualAmount: '1 l', id: '709025',
      },
      710869: {
        productId: 710869, imgPath: '/relative/path.jpg', productName: 'Jogurt bílý 150 g', quantity: 1, price: 15.9,
        textualAmount: '150 g', maxBasketAmount: 99, originalPrice: 19.9, discountPrice: 15.9, brand: 'X',
      },
      719201: {
        productId: 719201, productName: 'Vejce M 10 ks', quantity: 3, price: 40.666, textualAmount: '10 ks',
      },
    },
  },
};

test('parseCart: items, line totals (sum check), min order, image only https rohlik.cz', () => {
  const c = co.parseCart(cartPayload);
  assert.strictEqual(c.count, 3);
  const milk = c.items.find((x) => x.productId === '709025');
  assert.strictEqual(milk.quantity, 2);
  assert.strictEqual(milk.price, 49.8); // line total
  assert.ok(milk.imageUrl.startsWith('https://cdn.rohlik.cz/'));
  assert.strictEqual(milk.maxQuantity, 30);
  const yog = c.items.find((x) => x.productId === '710869');
  assert.strictEqual(yog.imageUrl, null);
  assert.strictEqual(yog.sale, true);
  assert.strictEqual(yog.maxQuantity, 50);
  assert.strictEqual(c.total, 106.37);
  assert.strictEqual(c.minOrder, 749);
  assert.strictEqual(c.minOrderOk, false);
  assert.ok(/749/.test(c.minOrderText));
});

test('parseCart: unit-price mode detected from totalPrice', () => {
  const p = { data: { totalPrice: 100, items: { 1: { productId: 1, productName: 'A', quantity: 4, price: 20 }, 2: { productId: 2, productName: 'B', quantity: 1, price: 20 } } } };
  assert.strictEqual(co.priceMode([{ quantity: 4, price: 20 }, { quantity: 1, price: 20 }], 100), 'unit');
  const c = co.parseCart(p);
  assert.strictEqual(c.items[0].price, 80);
  assert.ok(c.items[0].unitPriceText);
});

test('parseCart: empty cart and junk', () => {
  assert.strictEqual(co.parseCart({ status: 200, data: { totalPrice: 0, items: {} } }).count, 0);
  assert.strictEqual(co.parseCart(null).count, 0);
  assert.strictEqual(co.parseCart({ data: { items: { x: { productId: 'abc', productName: 'X', quantity: 1 } } } }).count, 0);
});

test('addresses: short labels without postal code, ids as integers', () => {
  assert.strictEqual(co.shortAddress('Vinohradská 12, 120 00 Praha 2'), 'Vinohradská 12, Praha 2');
  assert.strictEqual(co.shortAddress('Vinohradská 12, Praha 2, 12000, Česká republika'), 'Vinohradská 12, Praha 2');
  assert.strictEqual(co.shortAddress('Hlavní 1'), 'Hlavní 1');
  const list = co.parseAddresses({ success: true, addresses: [{ id: 55, fullAddress: 'Hlavní 1, 602 00 Brno', isDeliveredTo: true }, { id: 'x', fullAddress: 'Y' }], message: '' });
  assert.deepStrictEqual(list, [{ id: 55, label: 'Hlavní 1, Brno', deliveredTo: true }]);
});

const checkoutPayload = {
  sections: {
    addressSection: {
      is_valid: true, is_mandatory: true, delivery_address: 'Hlavní 1, 602 00 Brno',
      available_delivery_types: [{ type: 'HOME', title: 'Domů' }, { type: 'DELIVERY_POINT', title: 'Výdejní místo' }],
      selected_delivery_type: 'HOME', addressId: 55,
    },
    contactSection: { is_valid: true, is_mandatory: true, contact_name: 'Jan Novák', phone: '+420777000000', email: 'jan@example.com' },
    courierSection: { is_valid: true, is_mandatory: false, delivery_note: null, call_on_arrival: true },
    packagingSection: { is_valid: true, is_mandatory: true, selected_packaging: 'PAPER_BAGS' },
    paymentSection: {
      is_valid: true, is_mandatory: true, selected_method: 'CARD',
      available_methods: ['CARD', 'CARD_ON_PLACE', 'CASH', 'APPLE_PAY', 'MEAL_VOUCHER'],
      do_not_print_delivery_note: false, show_do_not_print_delivery_note: true,
    },
    timeslotSection: { is_valid: false, is_mandatory: true, slot_id: null, delivery_type: 'ON_TIME', delivery_time: '' },
  },
  validation_warnings: ['Vyberte čas doručení', 'Minimální objednávka je 749 Kč'],
  order_details: {
    estimated_total: '812,50 Kč', card_hold_total: '850 Kč',
    price_breakdown: ['Zboží: 763,50 Kč', 'Doprava: 49 Kč', 'Balení: 0 Kč', 'Kredity: 0 Kč', 'Celkem: 812,50 Kč'],
    price_note: 'Cena vážených položek se může mírně lišit.',
  },
  saved_card: { has_saved_card: true },
  checkout_ready: false,
};
const addressesPayload = { success: true, addresses: [{ id: 55, fullAddress: 'Hlavní 1, 602 00 Brno', isDeliveredTo: true }, { id: 56, fullAddress: 'Dlouhá 5, 110 00 Praha 1', isDeliveredTo: true }] };

test('parseCheckout: sections mapped, contact data never returned', () => {
  const c = co.parseCheckout(checkoutPayload, addressesPayload);
  assert.strictEqual(JSON.stringify(c).includes('Novák'), false);
  assert.strictEqual(JSON.stringify(c).includes('777'), false);
  assert.strictEqual(JSON.stringify(c).includes('example.com'), false);
  assert.strictEqual(c.address.id, 55);
  assert.strictEqual(c.address.label, 'Hlavní 1, Brno');
  assert.deepStrictEqual(c.addresses.map((x) => x.selected), [true, false]);
  assert.strictEqual(c.payment.selected, 'CARD');
  assert.deepStrictEqual(c.payment.methods.filter((m) => m.settable).map((m) => m.id), ['CARD_ON_PLACE', 'CASH']);
  assert.strictEqual(c.payment.methods.find((m) => m.id === 'CARD').label, 'Kartou online');
  assert.deepStrictEqual(c.receipt, { doNotPrint: false });
  assert.strictEqual(c.packaging.selected, 'PAPER_BAGS');
  assert.deepStrictEqual(c.courier, { note: '', callOnArrival: true });
  assert.strictEqual(c.slot.id, null);
  assert.strictEqual(c.slot.valid, false);
  assert.deepStrictEqual(c.totals.lines[1], { label: 'Doprava', value: '49 Kč' });
  assert.strictEqual(c.totals.estimated, '812,50 Kč');
  assert.strictEqual(c.warnings.length, 2);
  assert.strictEqual(c.ready, false);
  assert.strictEqual(c.deliveryType.options.length, 2);
});

test('parseCheckout: without addresses list falls back to the short address', () => {
  const c = co.parseCheckout(checkoutPayload, null);
  assert.strictEqual(c.addresses.length, 0);
  assert.strictEqual(c.address.label, 'Hlavní 1, Brno');
  assert.strictEqual(co.parseCheckout({}, null).payment.methods.length, 0);
});

test('parseTimeslots: defensive parsing of several plausible shapes', () => {
  const a1 = co.parseTimeslots({
    days: [{ date: '2026-11-10', slots: [
      { slotId: 111, since: '2026-11-10T17:00:00+01:00', till: '2026-11-10T18:00:00+01:00', price: 0, capacityPercent: 40, type: 'ON_TIME', reservationEnabled: true },
      { since: '2026-11-10T08:00:00+01:00', till: '2026-11-10T09:00:00+01:00', price: 49, capacityPercent: 'NO CAPACITY', type: 'ON_TIME' },
      { slotId: '113', timeWindow: '10:00-11:00', price: { amount: 29 }, type: 'VIRTUAL', reservationEnabled: false },
    ] }],
  });
  assert.deepStrictEqual(a1.map((s) => s.label), ['08:00–09:00', '10:00–11:00', '17:00–18:00']);
  assert.strictEqual(a1[0].available, false); // full, no slotId
  assert.strictEqual(a1[1].priceText, '29 Kč');
  assert.strictEqual(a1[1].reservable, false);
  assert.strictEqual(a1[2].priceText, 'Zdarma');
  assert.strictEqual(a1[2].reservable, true);
  assert.strictEqual(a1[2].id, '111');
  const a2 = co.parseTimeslots([{ slot_id: 9, start_time: '9:00', end_time: '10:00', delivery_price: '39 Kč' }]);
  assert.deepStrictEqual(a2.map((s) => [s.id, s.label, s.priceText]), [['9', '09:00–10:00', '39 Kč']]);
  assert.deepStrictEqual(co.parseTimeslots({ text: 'Žádné termíny' }), []);
});

test('fetch_orders parsing drops items/address and cancelled orders', () => {
  const orders = co.parseOrders({
    success: true,
    orders: [
      { id: 1001, itemsCount: 3, orderTime: '2026-11-09T18:20:00+01:00', state: 'PLANNED', deliverySlot: { type: 'ON_TIME', timeRange: '17:00-18:00' }, priceComposition: { total: { amount: 812.5, currency: 'CZK' } }, items: [{ name: 'Mléko' }], address: 'Hlavní 1' },
      { id: 1000, orderTime: '2026-10-01T10:00:00+02:00', state: 'CANCELLED' },
    ],
    message: '',
  });
  assert.strictEqual(orders.length, 1);
  assert.strictEqual(orders[0].id, 1001);
  assert.strictEqual(orders[0].timeMs, Date.parse('2026-11-09T18:20:00+01:00'));
  assert.strictEqual(JSON.stringify(orders).includes('Hlavní'), false);
  assert.strictEqual(JSON.stringify(orders).includes('Mléko'), false);
  assert.ok(co.parseOrderTime('9. 11. 2026 18:20'));
  assert.strictEqual(co.parseOrderTime('včera'), null);
});

test('decideSync: ordered / cleared / none', () => {
  const at = Date.parse('2026-11-09T17:00:00Z');
  const inCart = [{ day: '2026-11-11', at }, { day: '2026-11-10', at }];
  const order = { id: 5, timeMs: at + 10 * 60000, slotText: '', totalText: '' };
  const old = { id: 4, timeMs: at - 24 * 3600000 };
  const now = at + 30 * 60000;
  const r = co.decideSync({ inCart, orders: [old, order], cart: { count: 0 }, now });
  assert.strictEqual(r.action, 'ordered');
  assert.strictEqual(r.order.id, 5);
  assert.deepStrictEqual(r.days, ['2026-11-10', '2026-11-11']);
  assert.strictEqual(co.decideSync({ inCart, orders: [old], cart: { count: 0 }, now }).action, 'cleared');
  assert.strictEqual(co.decideSync({ inCart, orders: [old], cart: { count: 3 }, now }).action, 'none');
  // fresh fill: an empty cart right after filling is not trusted yet
  assert.strictEqual(co.decideSync({ inCart, orders: [old], cart: { count: 0 }, now: at + 30000 }).action, 'none');
  // fetch_orders failed → never decide; get_cart failed → never clear
  assert.strictEqual(co.decideSync({ inCart, orders: null, cart: { count: 0 }, now }).action, 'none');
  assert.strictEqual(co.decideSync({ inCart, orders: [old], cart: null, now }).action, 'none');
  assert.strictEqual(co.decideSync({ inCart: [], orders: [order], cart: null, now }).action, 'none');
});

test('defaultUpdates: only differing, settable, not skipped', () => {
  const c = co.parseCheckout(checkoutPayload, addressesPayload);
  const ups = co.defaultUpdates(c, { addressId: 56, paymentId: 'CASH', packaging: 'REUSABLE_BAGS', courierNote: 'Zvonek Novák' });
  assert.deepStrictEqual(ups.map((u) => u.action), ['selectAddress', 'setPayment', 'setPackaging', 'setCourierNote']);
  assert.deepStrictEqual(co.defaultUpdates(c, { addressId: 55, paymentId: 'CARD', packaging: 'PAPER_BAGS' }), []);
  assert.deepStrictEqual(co.defaultUpdates(c, { addressId: 999 }), []); // unknown address
  assert.deepStrictEqual(co.defaultUpdates(c, { addressId: 56, paymentId: 'CASH' }, ['address', 'payment']), []);
});

test('applyUpdate maps actions to exact tool arguments', async () => {
  const calls = [];
  const call = async (name, args) => {
    calls.push([name, args]);
    return name === 'select_delivery_address_checkout' ? { is_delivered_to: false } : {};
  };
  const r = await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'selectAddress', addressId: '56' }));
  assert.deepStrictEqual(r.warnings.length, 1);
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'selectSlot', slotId: 111, reserve: true, slotType: 'ON_TIME' }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'setPayment', method: 'CASH' }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'setPackaging', packaging: 'REUSABLE_BAGS' }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'setCourierNote', note: ' 3. patro ', callOnArrival: false }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'toggleDeliveryNote', doNotPrint: true }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'updateCartItem', productId: '709025', quantity: 0 }));
  await co.applyUpdate(call, v.validateCheckoutUpdate({ action: 'removeCartItem', productId: 709025 }));
  const strip = calls.map(([n, x]) => { const { context, ...rest } = x; assert.ok(context); return [n, rest]; });
  assert.deepStrictEqual(strip, [
    ['select_delivery_address_checkout', { address_id: 56 }],
    ['change_timeslot_checkout', { timeslot_id: '111' }],
    ['reserve_timeslot', { timeslot_id: 111, slot_type: 'ON_TIME' }],
    ['update_payment_method_checkout', { selected_payment_method: 'CASH' }],
    ['change_checkout_packaging', { selected_packaging: 'REUSABLE_BAGS' }],
    ['update_courier_instructions_checkout', { note: '3. patro', call_on_arrival: false }],
    ['toggle_delivery_note_checkout', { do_not_print_delivery_note: true }],
    ['update_cart_item', { product_id: 709025, quantity: 0 }],
    ['remove_cart_item', { product_id: 709025 }],
  ]);
});

test('timeslots + orders + link calls', async () => {
  const calls = [];
  const call = async (name, args) => {
    calls.push([name, args]);
    if (name === 'get_checkout_link') return { checkout_link: 'https://www.rohlik.cz/objednavka/pokladna?x=1' };
    if (name === 'fetch_orders') return { success: true, orders: [] };
    return [];
  };
  await co.loadTimeslots(call, '2');
  await co.loadOrders(call);
  assert.strictEqual(await co.checkoutLink(call), 'https://www.rohlik.cz/objednavka/pokladna?x=1');
  assert.deepStrictEqual(calls[0][1].timeslots_day, '2');
  assert.strictEqual(calls[0][1].include_15min_slots, false);
  assert.deepStrictEqual([calls[1][1].limit, calls[1][1].order_type], [5, 'both']);
});

test('checkout link must be https on rohlik.cz', () => {
  assert.ok(co.rohlikUrl('https://www.rohlik.cz/x'));
  assert.ok(co.rohlikUrl('https://rohlik.cz/'));
  assert.strictEqual(co.rohlikUrl('http://www.rohlik.cz/x'), null);
  assert.strictEqual(co.rohlikUrl('https://rohlik.cz.evil.com/x'), null);
  assert.strictEqual(co.rohlikUrl('https://evilrohlik.cz/x'), null);
  assert.strictEqual(co.rohlikUrl('https://user:pw@www.rohlik.cz/'), null);
  assert.strictEqual(co.rohlikUrl('javascript:alert(1)'), null);
});

test('allowlist: forbidden tools never reach the client', async () => {
  const called = [];
  const client = { callTool: async (c) => { called.push(c); return { content: [{ type: 'text', text: '{"ok":true}' }] }; } };
  for (const bad of ['clear_cart', 'cancel_order', 'remove_order_items', 'repeat_order', 'submit_claim', 'credit_add', 'set_checkout_as_suborder', 'delete_shopping_list', 'create_scheduled_task', 'submit_order']) {
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(a.callAllowed(client, bad, {}), (e) => e instanceof a.ToolNotAllowedError);
  }
  assert.strictEqual(called.length, 0);
  assert.deepStrictEqual(await a.callJson(client, 'get_cart', {}), { ok: true });
  assert.strictEqual(called[0].arguments.context.length > 10, true);
  assert.strictEqual(a.ALLOWED_TOOLS.size, 18);
});

test('tool errors: thrown as ToolError with a masked summary', async () => {
  const client = { callTool: async () => ({ isError: true, content: [{ type: 'text', text: 'Adresa Hlavní 1 není v zóně' }] }) };
  await assert.rejects(a.callJson(client, 'get_checkout', {}), (e) => e instanceof a.ToolError && e.detail === 'text(27)');
  assert.ok(a.errorSummary('1 validation error for call[x]\ntimeslots_day\n  Missing required argument [type=missing_argument, input_value={}, input_type=dict]').startsWith('1 validation error'));
});

test('validators: checkout inputs', () => {
  assert.strictEqual(v.validateDayIndex({ day: 0 }), '0');
  assert.strictEqual(v.validateDayIndex({ day: '3' }), '3');
  assert.throws(() => v.validateDayIndex({ day: 4 }));
  assert.throws(() => v.validateDayIndex({}));
  assert.deepStrictEqual(v.validateCheckoutLoad({ applyDefaults: true, skip: ['payment'] }), { applyDefaults: true, skip: ['payment'] });
  assert.throws(() => v.validateCheckoutLoad({ skip: ['contact'] }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'submitOrder' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'selectAddress', addressId: '1; drop' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'selectAddress', addressId: 0 }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'selectSlot', slotId: 'abc' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'selectSlot', slotId: 1, reserve: true, slotType: 'EXPRESS' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'setPayment', method: 'CARD' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'setPackaging', packaging: 'PLASTIC' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'setCourierNote', note: 'x'.repeat(231) }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'setCourierNote' }));
  assert.strictEqual(v.validateCheckoutUpdate({ action: 'setCourierNote', note: 'a\u0000b' }).note, 'a b');
  assert.strictEqual(v.validateCheckoutUpdate({ action: 'setCourierNote', note: '' }).note, '');
  assert.throws(() => v.validateCheckoutUpdate({ action: 'toggleDeliveryNote', doNotPrint: 'yes' }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'updateCartItem', productId: 1, quantity: 51 }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'updateCartItem', productId: 1, quantity: 1.5 }));
  assert.throws(() => v.validateCheckoutUpdate({ action: 'removeCartItem', productId: 'x' }));
});
