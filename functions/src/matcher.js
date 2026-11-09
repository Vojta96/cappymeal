'use strict';
// rohlikMatch orchestration for one shopping item (pure apart from the injected search function).

const ps = require('./productSearch');

/**
 * @param search async (query) => normalised products (rohlikAdapter.normaliseProduct shape)
 * @param item { key, name, amounts, need?, query?, preferredProductId?, preferredName? }
 * @param prefs { preferLight, preferBio, sort }
 * @returns { key, query, candidates[], preferred: null | 'found' | 'unavailable' | 'missing' }
 *   candidates are enriched (packQty, packUnit, packText, unitPrice, unitPriceText, available, badges[]),
 *   the remembered product (if found) is first with preferred: true.
 */
async function matchItem(search, item, prefs = {}) {
  const plan = ps.planQuery(item.name, item.query);
  let found = await search(plan.query);
  let products = found.filter((p) => !ps.isExcluded(p.name, plan));
  // Over-eager exclusions must not leave the user with nothing.
  if (!products.length && found.length) products = found.filter((p) => !ps.isExcluded(p.name, { ...plan, exclude: [] }));

  const prefId = item.preferredProductId ? String(item.preferredProductId) : null;
  let preferred = null;
  if (prefId) {
    let hit = found.find((p) => p.productId === prefId);
    if (!hit && item.preferredName) {
      // One extra search by the remembered product's name.
      found = await search(String(item.preferredName).slice(0, 100));
      hit = found.find((p) => p.productId === prefId);
    }
    if (hit) {
      if (!products.some((p) => p.productId === prefId)) products = [hit, ...products];
      preferred = hit.available === false ? 'unavailable' : 'found';
    } else {
      preferred = 'missing';
    }
  }

  const candidates = ps.rank(products.map(ps.enrich), {
    query: plan.query,
    need: item.need,
    prefs,
    preferredProductId: preferred && preferred !== 'missing' ? prefId : null,
  });
  return { key: item.key, query: plan.query, candidates, preferred };
}

module.exports = { matchItem };
