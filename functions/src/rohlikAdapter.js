'use strict';
const quantity = require('./quantity');
// Adapter for the Rohlík MCP server. Tool names/schemas are not published,
// so tools are discovered at runtime and arguments built from inputSchema.

const SEARCH_RE = /search.*product|product.*search|search|find|vyhled/i;
const ADD_RE = /add.*(cart|basket)|(cart|basket).*add|update.*(cart|basket)|(cart|basket).*(update|change)|košík/i;
const NOT_SEARCH_RE = /recipe|order|list|cart|basket/i;

function pickTool(tools, re, exclude) {
  const ok = (t, text) => re.test(text) && !(exclude && exclude.test(t.name));
  return tools.find((t) => ok(t, t.name))
    || tools.find((t) => ok(t, t.description || ''))
    || null;
}
const pickSearchTool = (tools) => pickTool(tools, SEARCH_RE, NOT_SEARCH_RE);
// Prefer a real "add ... to cart" tool (Rohlík: add_items_to_cart) over update_cart_item.
const pickAddTool = (tools) => pickTool(tools, /add.*(cart|basket)/i) || pickTool(tools, ADD_RE);

function props(tool) {
  return (tool && tool.inputSchema && tool.inputSchema.properties) || {};
}
function findProp(tool, names) {
  const keys = Object.keys(props(tool));
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase() === n.toLowerCase());
    if (k) return k;
  }
  return null;
}

const SEARCH_LIMIT = 15; // fetch more than we show: some get filtered out
const QUERY_NAMES = ['query', 'keyword', 'keywords', 'search', 'searchTerm', 'search_term', 'q', 'term', 'text', 'name'];
const ID_NAMES = ['productId', 'product_id', 'id', 'productIds', 'product_ids'];
const QTY_NAMES = ['quantity', 'qty', 'amount', 'count'];

function buildSearchArgs(tool, query) {
  const key = findProp(tool, [...QUERY_NAMES, 'queries', 'keywords_list', 'terms']) || Object.keys(props(tool))[0] || 'query';
  const schema = props(tool)[key] || {};
  let value = query;
  if (schema.type === 'array') {
    // Batch tools (e.g. Rohlík's batch_search_products) take a list of queries.
    const items = schema.items || {};
    if (items.type === 'object') {
      const ip = items.properties || {};
      const qk = matchKey(ip, QUERY_NAMES) || Object.keys(ip)[0] || 'query';
      const item = { [qk]: query };
      const lk = matchKey(ip, ['limit', 'pageSize', 'page_size', 'max_results']);
      if (lk) item[lk] = SEARCH_LIMIT;
      value = [item];
    } else {
      value = [query];
    }
  }
  const args = { [key]: value };
  if (findProp(tool, ['context'])) args.context = 'Hledání surovin pro naplánovaná jídla do nákupního košíku.';
  const lim = findProp(tool, ['limit', 'pageSize', 'page_size', 'max_results']);
  if (lim) args[lim] = SEARCH_LIMIT;
  return args;
}

function coerce(schema, id) {
  if (schema && (schema.type === 'integer' || schema.type === 'number')) {
    const n = Number(id);
    return Number.isNaN(n) ? id : n;
  }
  return String(id);
}

function matchKey(obj, names) {
  return Object.keys(obj).find((x) => names.some((n) => n.toLowerCase() === x.toLowerCase()));
}

/** products: [{ productId, quantity }] -> list of calls { args, products } (one batch call or one per product). */
function buildAddCalls(tool, products) {
  const p = props(tool);
  for (const [k, v] of Object.entries(p)) {
    if (v && v.type === 'array' && v.items && v.items.type === 'object') {
      const ip = v.items.properties || {};
      const idK = matchKey(ip, ID_NAMES) || 'productId';
      const qK = matchKey(ip, QTY_NAMES) || 'quantity';
      return [{
        args: { [k]: products.map((x) => ({ [idK]: coerce(ip[idK], x.productId), [qK]: x.quantity })) },
        products,
      }];
    }
  }
  const idK = findProp(tool, ID_NAMES) || 'productId';
  const qK = findProp(tool, QTY_NAMES) || 'quantity';
  return products.map((x) => ({
    args: { [idK]: coerce(p[idK], x.productId), [qK]: x.quantity },
    products: [x],
  }));
}

// ---------- result parsing ----------

function extractPayloads(result) {
  const out = [];
  if (!result) return out;
  if (result.structuredContent) out.push(result.structuredContent);
  for (const c of result.content || []) {
    if (c.type === 'text' && typeof c.text === 'string') {
      try { out.push(JSON.parse(c.text)); } catch (e) { out.push(c.text); }
    }
  }
  return out;
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  return null;
}

function isProductLike(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  const hasId = ['productId', 'product_id', 'id', 'sku'].some((k) => o[k] !== undefined);
  const hasName = ['name', 'productName', 'title'].some((k) => typeof o[k] === 'string');
  return hasId && hasName;
}

function findProductArrays(node, acc = [], depth = 0) {
  if (depth > 6 || node == null) return acc;
  if (Array.isArray(node)) {
    if (node.some(isProductLike)) acc.push(node.filter(isProductLike));
    else node.forEach((n) => findProductArrays(n, acc, depth + 1));
  } else if (typeof node === 'object') {
    Object.values(node).forEach((n) => findProductArrays(n, acc, depth + 1));
  }
  return acc;
}

function pickPrice(o) {
  const cand = [o.price, o.salePrice, o.currentPrice];
  for (const c of cand) {
    if (c && typeof c === 'object') {
      const n = toNumber(c.amount !== undefined ? c.amount : c.value !== undefined ? c.value : c.full);
      if (n != null) return { price: n, text: c.formatted || c.text || null, cur: c.currency };
    } else if (c !== undefined && c !== null) {
      const n = toNumber(c);
      if (n != null) return { price: n, text: typeof c === 'string' ? c : null };
    }
  }
  return { price: null, text: null };
}

const firstDefined = (o, keys) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};
const label = (v) => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return firstDefined(v, ['name', 'title', 'label', 'text', 'type', 'slug', 'code']);
  return undefined;
};
const UNAVAILABLE_RE = /unavail|sold.?out|out.?of.?stock|nedostup|vyprod/i;

/** Availability: true / false (explicitly unavailable) – unknown counts as available. */
function pickAvailable(o) {
  const v = firstDefined(o, ['available', 'isAvailable', 'is_available', 'inStock', 'in_stock', 'stockAvailable']);
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') return !/^(false|0|no|ne)$/i.test(v.trim());
  if (o.soldOut === true || o.sold_out === true || o.outOfStock === true || o.out_of_stock === true) return false;
  const a = o.availability !== undefined ? o.availability : o.stock;
  if (typeof a === 'boolean') return a;
  if (typeof a === 'number') return a > 0;
  if (typeof a === 'string') return !UNAVAILABLE_RE.test(a);
  if (a && typeof a === 'object') {
    const inner = firstDefined(a, ['available', 'isAvailable', 'inStock', 'in_stock', 'status', 'quantity', 'amount']);
    if (typeof inner === 'boolean') return inner;
    if (typeof inner === 'number') return inner > 0;
    if (typeof inner === 'string') return !UNAVAILABLE_RE.test(inner);
  }
  return true;
}

/** Structured unit price ({ value, per: 'kg'|'l'|'ks'|null, text }) if the payload has one. */
function pickUnitPrice(o) {
  const v = firstDefined(o, ['pricePerUnit', 'price_per_unit', 'unitPrice', 'unit_price', 'pricePerKg', 'price_per_kg',
    'pricePerLiter', 'pricePerLitre', 'pricePerMeasure']);
  if (v === undefined) return null;
  let value = null;
  let text = null;
  let per = null;
  if (v && typeof v === 'object') {
    value = toNumber(firstDefined(v, ['amount', 'value', 'full', 'price']));
    per = label(firstDefined(v, ['unit', 'per', 'measure'])) || null;
    text = typeof v.formatted === 'string' ? v.formatted : null;
  } else {
    value = toNumber(v);
    if (typeof v === 'string') {
      text = v;
      const m = v.match(/\/\s*(1\s*)?(kg|l|ks|100\s*g|100\s*ml)\b/i);
      if (m) per = m[2].toLowerCase();
    }
  }
  if (!per) {
    if (o.pricePerKg !== undefined || o.price_per_kg !== undefined) per = 'kg';
    else if (o.pricePerLiter !== undefined || o.pricePerLitre !== undefined) per = 'l';
    else per = label(o.unitPriceUnit || o.unit_price_unit || o.measureUnit) || null;
  }
  if (typeof per === 'string') per = per.toLowerCase().replace(/^1\s*(?=[a-z])/, '').trim();
  if (per && !['kg', 'l', 'ks'].includes(per)) {
    const m = String(per).match(/^(\d+)\s*(g|ml)$/); // "100 g" → per kg
    if (m && value != null) {
      value = (value * 1000) / Number(m[1]);
      per = m[2] === 'g' ? 'kg' : 'l';
      text = null;
    } else {
      per = null;
    }
  }
  if (value == null || !(value > 0)) return null;
  return { value, per, text };
}

/** Structured package size ({ qty, unit } in g / ml / ks) if present. */
function pickPack(o) {
  const amount = firstDefined(o, ['packageAmount', 'package_amount', 'amount', 'weight', 'volume', 'netWeight', 'net_weight']);
  const unit = label(firstDefined(o, ['packageUnit', 'package_unit', 'amountUnit', 'amount_unit', 'unitOfMeasure', 'measureUnit']));
  if (typeof amount === 'number' && unit) return quantity.toBase(amount, unit);
  if (amount && typeof amount === 'object') {
    const n = toNumber(firstDefined(amount, ['value', 'amount', 'quantity']));
    const u = label(firstDefined(amount, ['unit', 'measure']));
    if (n != null && u) return quantity.toBase(n, u);
  }
  if (typeof amount === 'string') return quantity.parsePack(amount);
  return null;
}

function pickBadges(o) {
  const out = [];
  for (const k of ['badges', 'labels', 'tags', 'flags', 'stickers']) {
    const v = o[k];
    if (Array.isArray(v)) {
      v.forEach((b) => {
        const t = label(b);
        if (typeof t === 'string' && t.trim()) out.push(t.trim().slice(0, 30));
      });
    }
  }
  if (o.bio === true || o.isBio === true || o.organic === true) out.push('BIO');
  const origRaw = o.originalPrice !== undefined ? o.originalPrice : o.regularPrice;
  const orig = origRaw && typeof origRaw === 'object' ? toNumber(origRaw.amount ?? origRaw.value) : toNumber(origRaw);
  const cur = pickPrice(o).price;
  if (o.sale === true || o.inPromotion === true || (orig && cur && orig > cur)) out.push('Akce');
  return [...new Set(out)].slice(0, 6);
}

function normaliseProduct(o) {
  const id = o.productId ?? o.product_id ?? o.id ?? o.sku;
  const { price, text, cur } = pickPrice(o);
  const unitRaw = o.textualAmount || o.textual_amount || o.packageInfo || o.package_info || o.unit || o.packageSize || '';
  const unit = typeof unitRaw === 'string' ? unitRaw : (label(unitRaw) || '');
  let imageUrl = o.imageUrl || o.image_url || o.image || o.imgPath || o.img || o.thumbnail || null;
  if (imageUrl && typeof imageUrl === 'object') imageUrl = imageUrl.url || imageUrl.src || null;
  if (!imageUrl && Array.isArray(o.images) && o.images.length) {
    imageUrl = typeof o.images[0] === 'string' ? o.images[0] : o.images[0].url;
  }
  const slug = o.url || o.link || o.slug || null;
  const up = pickUnitPrice(o);
  const brand = label(o.brand || o.brandName || o.manufacturer);
  const category = label(o.category || o.categoryName || (Array.isArray(o.categories) && o.categories[0]));
  return {
    productId: String(id),
    name: String(o.name || o.productName || o.title),
    price,
    priceText: text || (price != null ? `${price} ${!cur || cur === 'CZK' ? 'Kč' : cur}` : ''),
    unit: String(unit).slice(0, 60),
    imageUrl: typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl) ? imageUrl : null,
    url: slug ? (/^https?:/.test(slug) ? slug : `https://www.rohlik.cz/${String(slug).replace(/^\//, '')}`) : null,
    available: pickAvailable(o),
    brand: typeof brand === 'string' ? brand.slice(0, 60) : null,
    category: typeof category === 'string' ? category.slice(0, 60) : null,
    badges: pickBadges(o),
    pack: pickPack(o),
    unitPriceValue: up ? up.value : null,
    unitPricePer: up ? up.per : null,
    unitPriceText: up && up.text ? String(up.text).slice(0, 40) : null,
  };
}

/** Raw product objects of a search result (largest product-like array). */
function rawProducts(result) {
  const arrays = [];
  for (const p of extractPayloads(result)) findProductArrays(p, arrays);
  if (!arrays.length) return [];
  return arrays.sort((a, b) => b.length - a.length)[0];
}

/** Products from a search result, best-first (server order), deduplicated by productId. */
function parseProducts(result) {
  const seen = new Set();
  return rawProducts(result).map(normaliseProduct).filter((p) => {
    if (!p.productId || p.productId === 'undefined' || seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });
}

/** Key set of a raw product object (keys only, nested one level) – for logging, never values. */
function describeKeys(o) {
  if (!o || typeof o !== 'object') return '';
  return Object.keys(o).slice(0, 60).map((k) => {
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) return `${k}{${Object.keys(v).slice(0, 20).join(',')}}`;
    if (Array.isArray(v)) return `${k}[]`;
    return k;
  }).join(',');
}

const MAX_VARIANTS = 5;

function resultText(result) {
  return ((result && result.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
}

// ---------- query simplification ----------

function simplifyQuery(name) {
  let s = String(name || '').toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.split(/\s+nebo\s+|\s*\/\s*/)[0];
  s = s.split(',')[0];
  s = s.replace(/\d+([.,]\d+)?\s*(kg|g|dkg|ml|l|dl|ks|lžíce|lžičky|lžička|hrnek|hrnky|balení)?(?![\p{L}\d])/gu, ' ');
  s = s.replace(/(^|\s)(cca|asi|trochu|špetka|na ozdobu|dle chuti|podle chuti)(?=\s|$)/gu, ' ');
  s = s.replace(/[^\p{L}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return s || String(name || '').trim();
}

// ---------- client ----------

// Tool lists are cached per MCP client (= per request and household), never shared
// between households.
const toolCache = new WeakMap();
const probed = new WeakSet(); // one product-details probe per MCP session (diagnostics)

const MCP_URL = 'https://mcp.rohlik.cz/mcp';
const TIMEOUT_MS = 30000;

/** Opens an MCP session with the household's OAuth access token. Never log it. */
async function connect(accessToken) {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const client = new Client({ name: 'cappymeal', version: '1.0.0' });
  await client.connect(transport, { timeout: TIMEOUT_MS });
  return client;
}

async function listTools(client, { refresh = false } = {}) {
  if (!refresh && toolCache.has(client)) return toolCache.get(client);
  const r = await client.listTools(undefined, { timeout: TIMEOUT_MS });
  const tools = r.tools || [];
  toolCache.set(client, tools);
  return tools;
}

/**
 * Runs one product search. Returns normalised products (up to SEARCH_LIMIT, in Rohlík's order).
 * onRaw(rawFirstProduct) is called with the first raw result object (for key logging).
 */
async function searchProducts(client, query, { onRaw, onDiag } = {}) {
  const tools = await listTools(client);
  const tool = pickSearchTool(tools);
  if (!tool) throw new Error('Rohlík MCP: nenalezen nástroj pro vyhledávání produktů.');
  const args = buildSearchArgs(tool, query);
  const res = await client.callTool({ name: tool.name, arguments: args });
  if (onDiag) {
    // Diagnostics (public catalogue data only, never tokens): which tool, which args, what came back.
    const addTool = pickAddTool(tools);
    onDiag({
      tool: tool.name,
      searchSchema: JSON.stringify(tool.inputSchema || {}).slice(0, 1500),
      addTool: addTool ? addTool.name : null,
      addSchema: addTool ? JSON.stringify(addTool.inputSchema || {}).slice(0, 1500) : null,
      args,
      isError: !!res.isError,
      contentTypes: (res.content || []).map((c) => c.type),
      structured: res.structuredContent ? describeKeys(res.structuredContent) : null,
      text: resultText(res).slice(0, 800),
    });
    // One-off probe: does get_product_details return images? (diagnostics only)
    const det = tools.find((t) => t.name === 'get_product_details');
    const first = rawProducts(res)[0];
    if (det && first && first.productId != null && !probed.has(client)) {
      probed.add(client);
      const dp = props(det);
      const idK = findProp(det, ['productId', 'product_id', 'productIds', 'product_ids', 'ids', 'id']) || 'productId';
      const idV = dp[idK] && dp[idK].type === 'array' ? [first.productId] : first.productId;
      const dArgs = { [idK]: idV };
      if (dp.context) dArgs.context = 'Zobrazení obrázku produktu v nákupním seznamu.';
      try {
        const dr = await client.callTool({ name: det.name, arguments: dArgs });
        onDiag({ detailsSchema: JSON.stringify(det.inputSchema || {}).slice(0, 1200), detailsArgs: dArgs, isError: !!dr.isError, text: resultText(dr).slice(0, 3000) });
      } catch (e) {
        onDiag({ detailsSchema: JSON.stringify(det.inputSchema || {}).slice(0, 1200), detailsError: (e && e.message) || '' });
      }
    }
  }
  if (res.isError) return [];
  if (onRaw) {
    const raw = rawProducts(res);
    if (raw.length) onRaw(raw[0]);
  }
  return parseProducts(res).slice(0, SEARCH_LIMIT);
}

async function addToCart(client, products) {
  const tools = await listTools(client);
  const tool = pickAddTool(tools);
  if (!tool) throw new Error('Rohlík MCP: nenalezen nástroj pro přidání do košíku.');
  let added = 0;
  const failed = [];
  for (const call of buildAddCalls(tool, products)) {
    try {
      const callArgs = props(tool).context
        ? { ...call.args, context: 'Vložení surovin pro naplánovaná jídla do nákupního košíku.' }
        : call.args;
      const res = await client.callTool({ name: tool.name, arguments: callArgs });
      if (res.isError) {
        const txt = resultText(res).slice(0, 200) || 'Chyba';
        call.products.forEach((p) => failed.push({ productId: p.productId, error: txt }));
      } else {
        added += call.products.length;
      }
    } catch (e) {
      const txt = String((e && e.message) || e).slice(0, 200);
      call.products.forEach((p) => failed.push({ productId: p.productId, error: txt }));
    }
  }
  return { added, failed };
}

module.exports = {
  pickSearchTool, pickAddTool, buildSearchArgs, buildAddCalls, parseProducts,
  normaliseProduct, rawProducts, describeKeys, simplifyQuery, MAX_VARIANTS, SEARCH_LIMIT, connect, listTools, searchProducts, addToCart,
};
