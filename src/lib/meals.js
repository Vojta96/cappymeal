// Pure meal-planning logic (no Firebase, no React) – easy to unit test.
import { cap, dayInfo, plural } from './dates';
import { slotEntries } from './planModel';

export const SLOTS = [
  { key: 'breakfast', label: 'Snídaně', acc: 'snídani' },
  { key: 'snack', label: 'Svačina', acc: 'svačinu' },
  { key: 'lunch', label: 'Oběd', acc: 'oběd' },
  { key: 'afternoon_snack', label: 'Odp. svačina', acc: 'odpolední svačinu' },
  { key: 'dinner', label: 'Večeře', acc: 'večeři' },
];

export const SLOT_BY_KEY = Object.fromEntries(SLOTS.map((s) => [s.key, s]));
export const TYPE_LABEL = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]));

export const STATUS = {
  ordered: { label: 'Objednáno', bg: '#E3EFE0', fg: '#3F7449', dot: '#5A9A64' },
  in_cart: { label: 'V košíku', bg: '#F3E7C9', fg: '#7A5A12', dot: '#C9A23B' },
  pending: { label: 'Neobjednáno', bg: '#FBEBD3', fg: '#9A5B12', dot: '#D98E2F' },
  empty: { label: 'Prázdný den', bg: '#EFE8DC', fg: '#8A7458', dot: '#D6CAB6' },
};

export const MIN_ORDER_KC = 749;

// RTDB keys cannot contain . # $ [ ] / – those are replaced by '_'.
export const ingredientKey = (name) =>
  String(name || '').trim().toLowerCase().replace(/[.#$/[\]]/g, '_');

/**
 * Slots of a day where someone eats an existing recipe (the shared meal or a member's own meal).
 * dayMembers = effective memberPlan[day] ({ slot: { uid: rid|'-' } }), memberIds = current members.
 */
export function plannedSlots(dayPlan, recipes, dayMembers, memberIds) {
  if (!dayPlan && !dayMembers) return [];
  const dp = dayPlan || {};
  if (!dayMembers || !memberIds || !memberIds.length) {
    return SLOTS.filter((s) => dp[s.key] && (!recipes || recipes[dp[s.key]]));
  }
  return SLOTS.filter((s) => slotEntries(dp[s.key], dayMembers[s.key], memberIds, recipes).length > 0);
}

export function mealCount(dayPlan, recipes, dayMembers, memberIds) {
  return plannedSlots(dayPlan, recipes, dayMembers, memberIds).length;
}

/** 'ordered' | 'in_cart' | 'pending' | 'empty' – see CONTRACT.md */
export function dayStatus(dayPlan, order, recipes, dayMembers, memberIds) {
  if (!mealCount(dayPlan, recipes, dayMembers, memberIds)) return 'empty';
  if (order && order.status === 'ordered') return 'ordered';
  if (order && order.status === 'in_cart') return 'in_cart';
  return 'pending';
}

export function mealCountLabel(n) {
  return n ? `${n} ${plural(n, 'jídlo', 'jídla', 'jídel')}` : 'Nic';
}

/**
 * Aggregate ingredients of the given days. Every distinct recipe of a slot is counted once (the shared meal,
 * when someone still eats it, plus the members' own meals).
 * @returns [{ key, name, amounts: string[], meals: string[] }] sorted by name (cs).
 */
export function aggregateIngredients(dayKeys, plan, recipes, memberPlan, memberIds) {
  const map = {};
  for (const day of dayKeys) {
    const dp = (plan && plan[day]) || {};
    const dm = (memberPlan && memberPlan[day]) || {};
    const rids = [];
    for (const s of SLOTS) {
      if (memberIds && memberIds.length) {
        slotEntries(dp[s.key], dm[s.key], memberIds, recipes).forEach((e) => rids.push(e.rid));
      } else if (dp[s.key]) rids.push(dp[s.key]);
    }
    for (const rid of rids) {
      const r = recipes[rid];
      if (!r) continue;
      for (const g of r.ingredients || []) {
        const key = ingredientKey(g.name);
        if (!key) continue;
        if (!map[key]) map[key] = { key, name: String(g.name).trim(), amounts: [], meals: [] };
        if (g.amount) map[key].amounts.push(String(g.amount).trim());
        if (!map[key].meals.includes(r.name)) map[key].meals.push(r.name);
      }
    }
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
}

export const STAPLE = /sůl|pepř|olej|skořice|koření|kmín|kurkuma|bazalka|oregano|tymián|dle chuti|med$|^voda\b|^voda nebo/i;
const TINY_AMOUNT = /dle chuti|pár kapek|špetka/i;

/** Default "Mám doma" guess for an aggregated item. */
export function isStaple(item) {
  return STAPLE.test(item.name) || (item.amounts.length > 0 && item.amounts.every((a) => TINY_AMOUNT.test(a)));
}

/** Pantry value from DB wins; otherwise the staple guess. */
export function isInPantry(item, pantry) {
  const v = pantry ? pantry[item.key] : undefined;
  return typeof v === 'boolean' ? v : isStaple(item);
}

export function itemDetail(item) {
  let meals = '';
  if (item.regular) meals = 'Pravidelná položka';
  else if (item.meals.length === 1) meals = item.meals[0];
  else if (item.meals.length > 1) meals = `${item.meals.length} jídla`;
  return [item.amounts.join(' + '), meals].filter(Boolean).join(' · ');
}

// ---------- regular shopping items (households/{hid}/regulars) ----------

// Prefix keeps regular items from ever merging with ingredient keys.
export const REGULAR_PREFIX = 'regular:';

/** Selected for this shopping? Local override first, otherwise the item's "auto" flag. */
export const isRegularSelected = (id, r, selection) =>
  selection && typeof selection[id] === 'boolean' ? selection[id] : !!(r && r.auto);

/** Regulars as shopping items ({ key, name, amounts, meals, regular }), sorted by name. */
export function regularItems(regulars, selection, { onlySelected = true } = {}) {
  return Object.entries(regulars || {})
    .filter(([, r]) => r && r.name)
    .filter(([id, r]) => !onlySelected || isRegularSelected(id, r, selection))
    .map(([id, r]) => ({
      key: `${REGULAR_PREFIX}${id}`,
      id,
      name: r.name,
      amounts: r.amount ? [r.amount] : [],
      meals: [],
      regular: true,
      auto: !!r.auto,
    }))
    .sort((x, y) => x.name.localeCompare(y.name, 'cs'));
}

/** Plain-text shopping list for the clipboard. */
export function shoppingListText(items, dayKeys) {
  const days = dayKeys.map((k) => dayInfo(k).shortLabel).join(', ');
  const lines = items.map((it) => `- ${it.name}${it.amounts.length ? ` (${it.amounts.join(' + ')})` : ''}`);
  return [`Nákup CappyMeal – ${days}`, ...lines].join('\n');
}

export const formatKc = (n) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`;

/**
 * Alert for the next 3 days (tomorrow .. +3) that have meals but are not ordered.
 * shift = 1 (delivery the day before cooking, settings/delivery/lead): the deadline is one day earlier,
 * so the window is tomorrow .. +4 (same rule as functions/src/reminders.js).
 * @param statusOf (key) => status
 */
export function buildAlert(todayKey, horizon, statusOf, shift = 0) {
  const next = horizon.slice(1, 4 + (shift ? 1 : 0)).map((k) => dayInfo(k, todayKey));
  const days = next.filter((d) => {
    const st = statusOf(d.key);
    return st === 'pending' || st === 'in_cart';
  });
  if (!days.length) return null;
  const f = days[0];
  const last = days[days.length - 1];
  const allInCart = days.every((d) => statusOf(d.key) === 'in_cart');
  const title =
    days.length === 1
      ? `${cap(f.dl)} ${f.num}. ${f.m}. ${allInCart ? 'čeká v košíku' : 'ještě není objednané'}`
      : `${cap(f.dl)}–${last.dl} ${allInCart ? 'čeká v košíku' : 'zatím bez objednávky'}`;
  const text = allInCart
    ? 'Košík na Rohlíku je připravený. Zvolte doručení a potvrďte objednávku na Rohlíku – dokončení poznáme sami.'
    : shift
      ? `Jídlo má dorazit den před vařením${f.index > 1 ? '' : ' – tedy už dnes'}. Připomeneme se 4 dny dopředu a pak každý den, dokud neobjednáte.`
      : `Jídlo by mělo dorazit nejpozději ${f.index > 1 ? 'den předem' : 'dnes'}. Připomeneme se 3 dny dopředu a pak každý den, dokud neobjednáte.`;
  return { days: days.map((d) => d.key), title, text, allInCart };
}

/**
 * Meal types (slot keys) a recipe fits. `type` is the primary one; optional `types: { slot: true }` adds more
 * (e.g. fruit for breakfast, snack and afternoon snack). Ordered like SLOTS.
 */
export function recipeTypes(r) {
  if (!r) return [];
  const set = new Set([r.type, ...Object.keys(r.types || {}).filter((k) => r.types[k])]);
  return SLOTS.map((s) => s.key).filter((k) => set.has(k));
}

export const recipeHasType = (r, slot) => recipeTypes(r).includes(slot);
