'use strict';
// Rohlík checkout preparation: pure parsers of the (verified) MCP tool payloads + the operations the
// callables run. Tool calls go through `call(name, args)` = rohlikAdapter.callJson (allowlisted).
// Returned objects contain only what the CappyMeal UI needs – never contact data, order contents or
// payment details. Nothing here logs values.

const PRODUCT_ID_RE = /^\d{1,12}$/;
const SLOT_ID_RE = /^\d{1,15}$/;
const CODE_RE = /^[A-Z0-9_]{1,40}$/;

/** Payment methods CappyMeal can set (update_payment_method_checkout enum). Online card → in Rohlík. */
const SETTABLE_PAYMENTS = ['CARD_ON_PLACE', 'CASH'];
const PACKAGING = ['PAPER_BAGS', 'REUSABLE_BAGS'];
const PACKAGING_LABEL = { PAPER_BAGS: 'Papírové tašky', REUSABLE_BAGS: 'Vratné tašky (se zálohou)' };
const PAYMENT_LABEL = {
  CARD_ON_PLACE: 'Kartou při převzetí',
  CASH: 'Hotově při převzetí',
  CARD: 'Kartou online',
  CARD_ONLINE: 'Kartou online',
  ONLINE_CARD: 'Kartou online',
  ONLINE: 'Online platba',
  GATEWAY: 'Online platba',
  SAVED_CARD: 'Uloženou kartou',
  APPLE_PAY: 'Apple Pay',
  GOOGLE_PAY: 'Google Pay',
  MEAL_VOUCHER: 'Stravenkami',
  MEAL_VOUCHERS: 'Stravenkami',
  VOUCHER: 'Poukázkou',
};
const MAX_NOTE = 230; // update_courier_instructions_checkout maxLength
const SYNC_TOLERANCE_MS = 60 * 1000;
const CLEAR_GRACE_MS = 2 * 60 * 1000;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';

function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (isStr(v)) {
    const m = v.replace(/\s| /g, '').replace(',', '.').match(/^-?\d+(\.\d+)?$/);
    return m ? parseFloat(m[0]) : null;
  }
  return null;
}
const str = (v, max) => (isStr(v) ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const code = (v) => {
  const s = isStr(v) ? v.trim().toUpperCase() : '';
  return CODE_RE.test(s) ? s : '';
};
const safeInt = (v) => {
  const n = typeof v === 'number' ? v : (isStr(v) && /^\d{1,15}$/.test(v) ? Number(v) : NaN);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** 812.5 -> "812,50 Kč", 39 -> "39 Kč" */
function formatKc(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const frac = Math.abs(n % 1) > 0.001;
  return `${n.toLocaleString('cs-CZ', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 })} Kč`;
}

const ROHLIK_HOST_RE = /^([a-z0-9-]+\.)*rohlik\.cz$/i;
/** https URL on rohlik.cz (or a subdomain) – anything else is dropped. */
function rohlikUrl(v) {
  if (!isStr(v) || v.length > 2000) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !ROHLIK_HOST_RE.test(u.hostname) || u.username || u.password) return null;
    return u.toString();
  } catch (e) {
    return null;
  }
}

// ---------- checkout warnings ----------

// Rohlík's validation_warnings are written for AI assistants ("Please ask the user…", in English).
// Translate the known ones, drop the rest unless they're already Czech.
const WARNING_MAP = [
  [/timeslot|time slot/i, 'Vyberte čas doručení.'],
  [/address/i, 'Zkontrolujte adresu doručení.'],
  [/payment/i, 'Zvolte způsob platby.'],
  [/minimal|minimum/i, 'Nákup ještě nedosahuje minimální hodnoty objednávky.'],
  [/empty cart|cart is empty/i, 'Košík je prázdný.'],
];
const GENERIC_NOT_READY = /checkout is not ready|ask the user|assistant|retrieve the available/i;
const CZECH_CHARS = /[áčďéěíňóřšťúůýž]/i;

function localizeWarnings(list) {
  const out = [];
  list.filter(isStr).forEach((w) => {
    const hit = WARNING_MAP.find(([re]) => re.test(w));
    if (hit) out.push(hit[1]);
    else if (!GENERIC_NOT_READY.test(w) && CZECH_CHARS.test(w)) out.push(str(w, 200));
  });
  return [...new Set(out)].slice(0, 6);
}

// ---------- cart (get_cart) ----------

/**
 * get_cart's item `price` is either the line total or the unit price (not documented). Decide by
 * comparing both sums with data.totalPrice; ties / no total → line total.
 */
function priceMode(rows, total) {
  if (total == null || rows.every((r) => r.quantity === 1)) return 'line';
  let line = 0;
  let unit = 0;
  rows.forEach((r) => {
    if (r.price == null) return;
    line += r.price;
    unit += r.price * r.quantity;
  });
  return Math.abs(unit - total) < Math.abs(line - total) ? 'unit' : 'line';
}

/**
 * Verified shape: { status, messages, data: { cartId, totalPrice, totalSavings, minimalStandardOrderPrice,
 * submitConditionPassed, items: { [productId]: { productId, productName, quantity, price, textualAmount,
 * imgPath, maxBasketAmount, originalPrice?, … } }, categories, companies } }.
 */
function parseCart(payload) {
  const d = isObj(payload) && isObj(payload.data) ? payload.data : (isObj(payload) ? payload : {});
  let rawItems = [];
  if (isObj(d.items)) rawItems = Object.values(d.items);
  else if (Array.isArray(d.items)) rawItems = d.items;
  const rows = rawItems.filter(isObj).map((it) => ({
    productId: String(it.productId != null ? it.productId : ''),
    name: str(it.productName || it.name, 200),
    quantity: Number.isInteger(it.quantity) ? it.quantity : Math.round(num(it.quantity) || 0),
    price: num(it.price),
    unit: str(it.textualAmount, 40),
    img: it.imgPath,
    max: num(it.maxBasketAmount),
    originalPrice: num(it.originalPrice),
  })).filter((r) => PRODUCT_ID_RE.test(r.productId) && r.quantity > 0 && r.name);
  const total = num(d.totalPrice);
  const mode = priceMode(rows, total);
  const items = rows.slice(0, 200).map((r) => {
    const lineTotal = r.price == null ? null : (mode === 'unit' ? r.price * r.quantity : r.price);
    const unitPrice = lineTotal == null ? null : lineTotal / r.quantity;
    return {
      productId: r.productId,
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
      price: lineTotal == null ? null : Math.round(lineTotal * 100) / 100,
      priceText: formatKc(lineTotal),
      unitPriceText: r.quantity > 1 && unitPrice != null ? formatKc(Math.round(unitPrice * 100) / 100) : '',
      sale: r.originalPrice != null && unitPrice != null && r.originalPrice > unitPrice + 0.001,
      maxQuantity: r.max != null && r.max >= 1 ? Math.min(50, Math.floor(r.max)) : 50,
      imageUrl: rohlikUrl(r.img),
    };
  });
  const minOrder = num(d.minimalStandardOrderPrice);
  const computed = total != null ? total : items.reduce((a, x) => a + (x.price || 0), 0);
  let minOrderOk = true;
  if (typeof d.submitConditionPassed === 'boolean') minOrderOk = d.submitConditionPassed;
  else if (minOrder != null) minOrderOk = computed >= minOrder;
  return {
    items,
    count: items.length,
    total: computed,
    totalText: formatKc(computed),
    savingsText: num(d.totalSavings) > 0 ? formatKc(num(d.totalSavings)) : '',
    minOrder: minOrder != null && minOrder > 0 ? minOrder : null,
    minOrderText: minOrder != null && minOrder > 0 ? formatKc(minOrder) : '',
    minOrderOk,
  };
}

// ---------- addresses (get_user_addresses) ----------

/** "Vinohradská 12, 120 00 Praha 2" -> "Vinohradská 12, Praha 2" (no postal code, ≤ 80 chars). */
function shortAddress(full) {
  const parts = str(full, 300).split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return '';
  const street = parts[0];
  let city = '';
  for (let i = parts.length - 1; i >= 1 && !city; i--) {
    city = parts[i].replace(/\b\d{3}\s?\d{2}\b/, '').replace(/\s+/g, ' ').trim();
    if (/^(česk[áa] republika|czech republic|cz)$/i.test(city)) city = '';
  }
  return (city && city !== street ? `${street}, ${city}` : street).slice(0, 80);
}

/** Verified: { success, addresses: [{ id, fullAddress, isDeliveredTo }], message }. */
function parseAddresses(payload) {
  const list = isObj(payload) && Array.isArray(payload.addresses) ? payload.addresses
    : (isObj(payload) && isObj(payload.data) && Array.isArray(payload.data.addresses) ? payload.data.addresses : []);
  return list.filter(isObj).map((a) => ({
    id: safeInt(a.id),
    label: shortAddress(a.fullAddress || a.address),
    deliveredTo: a.isDeliveredTo !== false,
  })).filter((a) => a.id && a.label).slice(0, 10);
}

// ---------- checkout (get_checkout) ----------

function paymentLabel(c) {
  if (PAYMENT_LABEL[c]) return PAYMENT_LABEL[c];
  const s = c.toLowerCase().replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function methodCode(m) {
  if (isStr(m)) return code(m);
  if (isObj(m)) return code(m.type || m.id || m.code || m.name);
  return '';
}

/** "Doprava: 49 Kč" -> { label: 'Doprava', value: '49 Kč' } */
function splitLine(s) {
  const t = str(s, 120);
  const i = t.lastIndexOf(':');
  if (i <= 0) return { label: t, value: '' };
  return { label: t.slice(0, i).trim(), value: t.slice(i + 1).trim() };
}

/**
 * Verified shape: { sections: { addressSection{ is_valid, delivery_address, available_delivery_types[{type,title}],
 * selected_delivery_type, addressId }, contactSection{…personal – dropped}, courierSection{ delivery_note, call_on_arrival },
 * packagingSection{ selected_packaging }, paymentSection{ selected_method, available_methods[string],
 * do_not_print_delivery_note, show_do_not_print_delivery_note }, timeslotSection{ is_valid, slot_id, delivery_type,
 * delivery_time } }, validation_warnings[string], order_details{ estimated_total, card_hold_total, price_breakdown[string],
 * price_note }, saved_card{ has_saved_card }, checkout_ready, suborder? }.
 */
function parseCheckout(payload, addressesPayload) {
  const p = isObj(payload) ? payload : {};
  const s = isObj(p.sections) ? p.sections : {};
  const addr = isObj(s.addressSection) ? s.addressSection : {};
  const cour = isObj(s.courierSection) ? s.courierSection : {};
  const pack = isObj(s.packagingSection) ? s.packagingSection : {};
  const pay = isObj(s.paymentSection) ? s.paymentSection : {};
  const ts = isObj(s.timeslotSection) ? s.timeslotSection : {};
  const od = isObj(p.order_details) ? p.order_details : {};

  const selectedAddressId = safeInt(addr.addressId);
  const addresses = parseAddresses(addressesPayload).map((a) => ({ ...a, selected: a.id === selectedAddressId }));
  const selectedMethod = code(pay.selected_method);
  const methods = [];
  (Array.isArray(pay.available_methods) ? pay.available_methods : []).forEach((m) => {
    const c = methodCode(m);
    if (c && !methods.some((x) => x.id === c)) {
      methods.push({ id: c, label: paymentLabel(c), settable: SETTABLE_PAYMENTS.includes(c), selected: c === selectedMethod });
    }
  });
  if (selectedMethod && !methods.some((x) => x.id === selectedMethod)) {
    methods.unshift({ id: selectedMethod, label: paymentLabel(selectedMethod), settable: SETTABLE_PAYMENTS.includes(selectedMethod), selected: true });
  }
  const selPack = code(pack.selected_packaging);
  const slotId = ts.slot_id != null && SLOT_ID_RE.test(String(ts.slot_id)) ? String(ts.slot_id) : null;
  const deliveryTypes = (Array.isArray(addr.available_delivery_types) ? addr.available_delivery_types : [])
    .filter(isObj).map((t) => ({ type: code(t.type), title: str(t.title, 60) })).filter((t) => t.type).slice(0, 5);

  return {
    addresses,
    address: {
      id: selectedAddressId,
      label: (addresses.find((a) => a.selected) || {}).label || shortAddress(addr.delivery_address),
      valid: addr.is_valid !== false,
    },
    deliveryType: { selected: code(addr.selected_delivery_type), options: deliveryTypes },
    slot: { id: slotId, text: str(ts.delivery_time, 80), type: code(ts.delivery_type), valid: ts.is_valid !== false },
    payment: { selected: selectedMethod, methods, valid: pay.is_valid !== false },
    receipt: pay.show_do_not_print_delivery_note === true ? { doNotPrint: pay.do_not_print_delivery_note === true } : null,
    packaging: {
      selected: selPack,
      options: PACKAGING.map((id) => ({ id, label: PACKAGING_LABEL[id], selected: id === selPack })),
    },
    courier: {
      note: str(cour.delivery_note, MAX_NOTE),
      callOnArrival: typeof cour.call_on_arrival === 'boolean' ? cour.call_on_arrival : null,
    },
    totals: {
      estimated: str(od.estimated_total, 40),
      cardHold: str(od.card_hold_total, 40),
      lines: (Array.isArray(od.price_breakdown) ? od.price_breakdown : []).filter(isStr).map(splitLine).slice(0, 10),
      note: str(od.price_note, 300),
    },
    warnings: localizeWarnings(Array.isArray(p.validation_warnings) ? p.validation_warnings : []),
    ready: p.checkout_ready === true,
    suborderAvailable: isObj(p.suborder) ? p.suborder.available === true : false,
  };
}

// ---------- timeslots (get_timeslots_checkout) – output shape not verified yet, parsed defensively ----------

const SLOT_MARKERS = ['slotId', 'slot_id', 'timeslotId', 'timeslot_id', 'capacityPercent', 'capacity_percent', 'reservationEnabled'];
const LABEL_KEYS = ['timeWindow', 'time_window', 'timeRange', 'time_range', 'window', 'interval', 'label', 'time'];
const START_KEYS = ['since', 'start', 'from', 'startTime', 'start_time', 'timeFrom', 'time_from'];
const END_KEYS = ['till', 'end', 'to', 'endTime', 'end_time', 'timeTo', 'time_to'];
const PRICE_KEYS = ['price', 'deliveryPrice', 'delivery_price', 'fee', 'priceAmount', 'deliveryFee'];

const first = (o, keys) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};
const hhmm = (v) => {
  const m = isStr(v) ? v.match(/(\d{1,2}):(\d{2})/) : null;
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
};

function looksLikeSlot(o) {
  if (!isObj(o)) return false;
  if (SLOT_MARKERS.some((k) => o[k] !== undefined)) return true;
  return !!(hhmm(first(o, START_KEYS)) && hhmm(first(o, END_KEYS)));
}

function collectSlots(node, acc, depth = 0) {
  if (depth > 7 || node == null) return acc;
  if (Array.isArray(node)) node.forEach((n) => collectSlots(n, acc, depth + 1));
  else if (isObj(node)) {
    if (looksLikeSlot(node)) acc.push(node);
    else Object.values(node).forEach((n) => collectSlots(n, acc, depth + 1));
  }
  return acc;
}

function normaliseSlot(o) {
  const rawId = first(o, ['slotId', 'slot_id', 'timeslotId', 'timeslot_id', 'id']);
  const id = rawId != null && SLOT_ID_RE.test(String(rawId)) ? String(rawId) : null;
  let label = '';
  const lv = first(o, LABEL_KEYS);
  if (isStr(lv)) {
    const m = lv.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
    if (m) label = `${m[1].padStart(2, '0')}:${m[2]}–${m[3].padStart(2, '0')}:${m[4]}`;
  }
  if (!label) {
    const a = hhmm(first(o, START_KEYS));
    const b = hhmm(first(o, END_KEYS));
    if (a && b) label = `${a}–${b}`;
    else if (isStr(lv) && lv.trim()) label = str(lv, 30);
  }
  const startText = hhmm(label);
  const startMin = startText ? Number(startText.slice(0, 2)) * 60 + Number(startText.slice(3)) : null;
  const pv = first(o, PRICE_KEYS);
  let price = null;
  let priceText = '';
  if (isObj(pv)) price = num(first(pv, ['amount', 'value', 'full', 'price']));
  else if (isStr(pv) && num(pv) == null) priceText = str(pv, 30);
  else price = num(pv);
  if (!priceText && price != null) priceText = price === 0 ? 'Zdarma' : formatKc(price);
  const cap = first(o, ['capacityPercent', 'capacity_percent', 'capacity']);
  const full = isStr(cap) && /no\s*capacity|full|plno/i.test(cap);
  const type = code(first(o, ['type', 'slotType', 'slot_type']));
  return {
    id,
    label,
    startMin,
    price,
    priceText,
    type,
    available: !!id && !full && o.available !== false && o.isAvailable !== false && o.disabled !== true,
    reservable: o.reservationEnabled === true && (type === 'ON_TIME' || type === 'VIRTUAL'),
    selected: o.selected === true || o.isSelected === true,
  };
}

/** → [{ id|null, label "17:00–18:00", startMin, price, priceText, type, available, reservable, selected }] */
function parseTimeslots(payload) {
  const seen = new Set();
  return collectSlots(payload, []).map(normaliseSlot).filter((s) => {
    if (!s.label) return false;
    const k = `${s.id || ''}|${s.label}|${s.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => (a.startMin == null ? 1e6 : a.startMin) - (b.startMin == null ? 1e6 : b.startMin)).slice(0, 80);
}

// ---------- orders (fetch_orders) ----------

/** "2026-11-09T18:22:11+01:00" / "2026-11-09 18:22" / "9. 11. 2026 18:22" -> ms | null */
function parseOrderTime(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  if (!isStr(v)) return null;
  const s = v.trim();
  let t = Date.parse(s.replace(' ', 'T'));
  if (!Number.isNaN(t)) return t;
  const m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    t = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0) - 1, Number(m[5] || 0));
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Verified order keys: id, orderTime, state, deliverySlot{type,timeRange}, priceComposition{total{amount}}, … (items/address dropped). */
function parseOrders(payload) {
  const list = isObj(payload) && Array.isArray(payload.orders) ? payload.orders : [];
  return list.filter(isObj).map((o) => {
    const total = isObj(o.priceComposition) && isObj(o.priceComposition.total) ? num(o.priceComposition.total.amount) : num(o.totalPrice);
    return {
      id: safeInt(o.id),
      timeMs: parseOrderTime(o.orderTime),
      state: code(o.state),
      slotText: isObj(o.deliverySlot) ? str(o.deliverySlot.timeRange, 60) : '',
      totalText: formatKc(total),
    };
  }).filter((o) => o.id && !/CANCEL|STORNO/.test(o.state));
}

/**
 * inCart: [{ day, at }] (in_cart days of the household), orders: parsed fetch_orders | null (call failed),
 * cart: parsed get_cart | null (call failed).
 * → { action: 'ordered', order, days } – an order placed after the cart was filled;
 *   { action: 'cleared', days } – no such order and the Rohlík cart is empty (only when both calls worked and the
 *   newest fill is older than CLEAR_GRACE_MS);
 *   { action: 'none' }.
 */
function decideSync({ inCart, orders, cart, now }) {
  const days = (inCart || []).map((x) => x.day).sort();
  if (!days.length || orders == null) return { action: 'none' };
  const ats = inCart.map((x) => Number(x.at) || 0);
  const earliest = Math.min(...ats);
  const latest = Math.max(...ats);
  const placed = orders
    .filter((o) => o.timeMs != null && o.timeMs >= earliest - SYNC_TOLERANCE_MS)
    .sort((a, b) => b.timeMs - a.timeMs)[0];
  if (placed) return { action: 'ordered', order: placed, days };
  if (cart && cart.count === 0 && now - latest >= CLEAR_GRACE_MS) return { action: 'cleared', days };
  return { action: 'none' };
}

/**
 * After the user emptied the cart from the app ("Vysypat košík"): which in_cart days go back to pending.
 * Same rule as the sync revert, but immediate (no grace – the user did it on purpose):
 * - cart now empty (any mode) → every in_cart day (nothing of any shopping is left in the cart);
 * - mode 'added' and every CappyMeal product was removed → the session's days (`days`) that are in_cart
 *   (all in_cart days when the client sent none); foreign items may stay in the cart;
 * - cart unknown (get_cart failed) or some removals failed → nothing changes.
 * inCart: ['YYYY-MM-DD'], cart: parsed get_cart | null, failed: number of failed removals.
 */
function decideClearRevert({ mode, inCart, days, cart, failed }) {
  const inC = [...new Set(inCart || [])].sort();
  if (!inC.length || !cart) return [];
  if (cart.count === 0) return inC;
  if (mode !== 'added' || failed > 0) return [];
  const want = days && days.length ? new Set(days) : null;
  return want ? inC.filter((d) => want.has(d)) : inC;
}

// ---------- operations (call = allowlisted callJson bound to one MCP session) ----------

const CTX = {
  cart: 'Kontrola nákupního košíku před objednávkou.',
  checkout: 'Příprava objednávky: kontrola doručení, platby a souhrnu.',
  slots: 'Výběr času doručení objednávky.',
  update: 'Úprava nastavení objednávky před jejím potvrzením zákazníkem.',
  link: 'Zákazník potvrdí a zaplatí objednávku v rozhraní Rohlíku.',
  orders: 'Kontrola, zda zákazník dokončil objednávku.',
  clear: 'Zákazník v aplikaci CappyMeal výslovně požádal o vysypání nákupního košíku.',
  remove: 'Zákazník v aplikaci CappyMeal výslovně požádal o odebrání položek, které do košíku vložila aplikace.',
};

const loadCart = async (call) => parseCart(await call('get_cart', { context: CTX.cart }));

/**
 * "Vysypat košík" (explicit user action only): mode 'all' → clear_cart; mode 'added' → remove_cart_item per
 * product id (best effort). → { removed, failed: [productId] }. A refused tool (allowlist) always throws.
 */
async function clearCart(call, { mode, productIds }) {
  if (mode === 'all') {
    await call('clear_cart', { context: CTX.clear });
    return { removed: null, failed: [] };
  }
  let removed = 0;
  const failed = [];
  for (const id of productIds || []) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await call('remove_cart_item', { product_id: id, context: CTX.remove });
      removed += 1;
    } catch (e) {
      if (e && e.code === 'TOOL_NOT_ALLOWED') throw e;
      failed.push(id);
    }
  }
  return { removed, failed };
}

async function loadCheckout(call) {
  const co = await call('get_checkout', { context: CTX.checkout });
  let ad = null;
  try {
    ad = await call('get_user_addresses', { context: CTX.checkout });
  } catch (e) {
    ad = null; // the checkout still works with its own address text
  }
  return parseCheckout(co, ad);
}

const loadTimeslots = async (call, day) => parseTimeslots(
  await call('get_timeslots_checkout', { timeslots_day: day, include_15min_slots: false, context: CTX.slots }),
);

/** u: validated update (validate.validateCheckoutUpdate). Returns { warnings[] } from the action itself. */
async function applyUpdate(call, u) {
  const warnings = [];
  const ctx = { context: CTX.update };
  switch (u.action) {
    case 'selectAddress': {
      const r = await call('select_delivery_address_checkout', { address_id: u.addressId, ...ctx });
      const flag = isObj(r) ? (r.is_delivered_to !== undefined ? r.is_delivered_to : (isObj(r.data) ? r.data.is_delivered_to : undefined)) : undefined;
      if (flag === false) warnings.push('Na tuto adresu Rohlík zatím nedováží.');
      break;
    }
    case 'selectSlot':
      await call('change_timeslot_checkout', { timeslot_id: u.slotId, ...ctx });
      if (u.reserve && u.slotType) {
        // Hold the slot until the customer confirms in Rohlík (only listing entries with reservationEnabled).
        try {
          await call('reserve_timeslot', { timeslot_id: Number(u.slotId), slot_type: u.slotType, ...ctx });
        } catch (e) {
          // best effort – the checkout selection above is what counts
        }
      }
      break;
    case 'setPayment':
      await call('update_payment_method_checkout', { selected_payment_method: u.method, ...ctx });
      break;
    case 'setPackaging':
      await call('change_checkout_packaging', { selected_packaging: u.packaging, ...ctx });
      break;
    case 'setCourierNote': {
      const args = { ...ctx };
      if (u.note !== undefined) args.note = u.note.slice(0, MAX_NOTE);
      if (u.callOnArrival !== undefined) args.call_on_arrival = u.callOnArrival;
      await call('update_courier_instructions_checkout', args);
      break;
    }
    case 'toggleDeliveryNote':
      await call('toggle_delivery_note_checkout', { do_not_print_delivery_note: u.doNotPrint, ...ctx });
      break;
    case 'updateCartItem':
      await call('update_cart_item', { product_id: u.productId, quantity: u.quantity, ...ctx });
      break;
    case 'removeCartItem':
      await call('remove_cart_item', { product_id: u.productId, ...ctx });
      break;
    default:
      throw new Error('unknown checkout action');
  }
  return { warnings };
}

/**
 * Household defaults (settings/delivery) → the updates that differ from the current checkout.
 * skip: fields the user already changed in this session ('address'|'payment'|'packaging'|'courierNote').
 */
function defaultUpdates(checkout, delivery, skip = []) {
  const d = isObj(delivery) ? delivery : {};
  const out = [];
  const addrId = safeInt(d.addressId);
  if (!skip.includes('address') && addrId && checkout.address.id !== addrId
    && (!checkout.addresses.length || checkout.addresses.some((a) => a.id === addrId))) {
    out.push({ action: 'selectAddress', addressId: addrId });
  }
  const pay = code(d.paymentId);
  if (!skip.includes('payment') && SETTABLE_PAYMENTS.includes(pay) && checkout.payment.selected !== pay
    && (!checkout.payment.methods.length || checkout.payment.methods.some((m) => m.id === pay))) {
    out.push({ action: 'setPayment', method: pay });
  }
  const packg = code(d.packaging);
  if (!skip.includes('packaging') && PACKAGING.includes(packg) && checkout.packaging.selected !== packg) {
    out.push({ action: 'setPackaging', packaging: packg });
  }
  const note = str(d.courierNote, MAX_NOTE);
  if (!skip.includes('courierNote') && note && checkout.courier.note !== note) {
    out.push({ action: 'setCourierNote', note });
  }
  return out;
}

/** Applies the household defaults (best effort, each update on its own). → { checkout, applied[] } */
async function applyDefaults(call, delivery, skip) {
  let checkout = await loadCheckout(call);
  const ups = defaultUpdates(checkout, delivery, skip);
  const applied = [];
  const warnings = [];
  for (const u of ups) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await applyUpdate(call, u);
      warnings.push(...r.warnings);
      applied.push(u.action);
    } catch (e) {
      // ignore – the user can still change it by hand
    }
  }
  if (applied.length) checkout = await loadCheckout(call);
  checkout.warnings = [...warnings, ...checkout.warnings].slice(0, 6);
  return { checkout, applied };
}

async function checkoutLink(call) {
  const r = await call('get_checkout_link', { context: CTX.link });
  const raw = isObj(r) ? (r.checkout_link || r.url || r.link) : null;
  return rohlikUrl(raw);
}

const loadOrders = async (call) => parseOrders(await call('fetch_orders', { limit: 5, order_type: 'both', context: CTX.orders }));

module.exports = {
  SETTABLE_PAYMENTS, PACKAGING, PACKAGING_LABEL, MAX_NOTE, CLEAR_GRACE_MS, SYNC_TOLERANCE_MS,
  formatKc, rohlikUrl, priceMode, parseCart, shortAddress, parseAddresses, parseCheckout, parseTimeslots,
  parseOrderTime, parseOrders, decideSync, decideClearRevert, defaultUpdates, paymentLabel,
  loadCart, clearCart, loadCheckout, loadTimeslots, applyUpdate, applyDefaults, checkoutLink, loadOrders,
};
