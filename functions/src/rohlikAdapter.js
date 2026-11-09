'use strict';
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
const pickAddTool = (tools) => pickTool(tools, ADD_RE);

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

const QUERY_NAMES = ['query', 'keyword', 'keywords', 'search', 'searchTerm', 'search_term', 'q', 'term', 'text', 'name'];
const ID_NAMES = ['productId', 'product_id', 'id', 'productIds', 'product_ids'];
const QTY_NAMES = ['quantity', 'qty', 'amount', 'count'];

function buildSearchArgs(tool, query) {
  const key = findProp(tool, QUERY_NAMES) || Object.keys(props(tool))[0] || 'query';
  const args = { [key]: query };
  const lim = findProp(tool, ['limit', 'pageSize', 'page_size', 'max_results']);
  if (lim) args[lim] = 8;
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

function normaliseProduct(o) {
  const id = o.productId ?? o.product_id ?? o.id ?? o.sku;
  const { price, text, cur } = pickPrice(o);
  const unit = o.textualAmount || o.textual_amount || o.unit || o.packageInfo || '';
  let imageUrl = o.imageUrl || o.image_url || o.image || o.imgPath || null;
  if (!imageUrl && Array.isArray(o.images) && o.images.length) {
    imageUrl = typeof o.images[0] === 'string' ? o.images[0] : o.images[0].url;
  }
  const slug = o.url || o.link || o.slug || null;
  return {
    productId: String(id),
    name: String(o.name || o.productName || o.title),
    price,
    priceText: text || (price != null ? `${price} ${!cur || cur === 'CZK' ? 'Kč' : cur}` : ''),
    unit: typeof unit === 'string' ? unit : String(unit),
    imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
    url: slug ? (/^https?:/.test(slug) ? slug : `https://www.rohlik.cz/${String(slug).replace(/^\//, '')}`) : null,
  };
}

/** Products from a search result, best-first (server order), deduplicated by productId. */
function parseProducts(result) {
  const arrays = [];
  for (const p of extractPayloads(result)) findProductArrays(p, arrays);
  if (!arrays.length) return [];
  const best = arrays.sort((a, b) => b.length - a.length)[0];
  const seen = new Set();
  return best.map(normaliseProduct).filter((p) => {
    if (!p.productId || p.productId === 'undefined' || seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });
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

async function searchProducts(client, query, max = MAX_VARIANTS) {
  const tools = await listTools(client);
  const tool = pickSearchTool(tools);
  if (!tool) throw new Error('Rohlík MCP: nenalezen nástroj pro vyhledávání produktů.');
  const res = await client.callTool({ name: tool.name, arguments: buildSearchArgs(tool, query) });
  if (res.isError) return [];
  return parseProducts(res).slice(0, Math.min(max, MAX_VARIANTS));
}

async function addToCart(client, products) {
  const tools = await listTools(client);
  const tool = pickAddTool(tools);
  if (!tool) throw new Error('Rohlík MCP: nenalezen nástroj pro přidání do košíku.');
  let added = 0;
  const failed = [];
  for (const call of buildAddCalls(tool, products)) {
    try {
      const res = await client.callTool({ name: tool.name, arguments: call.args });
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
  normaliseProduct, simplifyQuery, MAX_VARIANTS, connect, listTools, searchProducts, addToCart,
};
