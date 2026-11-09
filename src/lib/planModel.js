// Effective meal plan = concrete days (plan, memberMeals) over the repeating week pattern (weekTemplate).
// Pure logic – no Firebase, no React.
//
// plan/{date}/{slot}:               rid | '-'            ('-' = empty this day, hides the pattern meal)
// memberMeals/{date}/{slot}/{uid}:  rid | '-' | '='      (own meal | doesn't eat | same as everyone)
// weekTemplate: { from, by, at, days: { d0..d6: { plan: { slot: rid }, members: { slot: { uid: rid|'-' } } } } }
//   d0 = Sunday (Date#getDay). Applies to dates >= from. A concrete day value always wins over the pattern.
import { SLOTS } from './meals';
import { parseKey } from './dates';

export const EMPTY = '-';
export const SAME = '=';

export const weekdayKey = (date) => `d${parseKey(date).getDay()}`;

/** Pattern day for a date, or null when the week does not repeat (yet). */
export function templateDay(template, date) {
  if (!template || !template.from || date < template.from || !template.days) return null;
  return template.days[weekdayKey(date)] || null;
}

const has = (v) => v !== undefined && v !== null;

/**
 * Resolve one date.
 * @returns {{ plan: { [slot]: rid }, members: { [slot]: { [uid]: rid | '-' } }, fromTemplate: { [slot]: true } }}
 *   plan holds only real recipe ids; members only uids with their own meal or '-' (not eating).
 */
export function resolveDay(date, rawPlan, rawMembers, template) {
  const day = (rawPlan && rawPlan[date]) || {};
  const mDay = (rawMembers && rawMembers[date]) || {};
  const t = templateDay(template, date);
  const out = { plan: {}, members: {}, fromTemplate: {} };
  for (const s of SLOTS) {
    let v = day[s.key];
    if (!has(v) && t && t.plan && has(t.plan[s.key])) {
      v = t.plan[s.key];
      if (v && v !== EMPTY) out.fromTemplate[s.key] = true;
    }
    if (v && v !== EMPTY) out.plan[s.key] = v;
    const own = mDay[s.key] || {};
    const tm = (t && t.members && t.members[s.key]) || {};
    const uids = new Set([...Object.keys(own), ...Object.keys(tm)]);
    uids.forEach((uid) => {
      const m = has(own[uid]) ? own[uid] : tm[uid];
      if (m && m !== SAME) {
        if (!out.members[s.key]) out.members[s.key] = {};
        out.members[s.key][uid] = m;
      }
    });
  }
  return out;
}

/** Effective { plan, memberPlan } for the given dates (+ every concrete date in rawPlan / rawMembers). */
export function resolvePlan(dates, rawPlan, rawMembers, template) {
  const keys = new Set([...(dates || []), ...Object.keys(rawPlan || {}), ...Object.keys(rawMembers || {})]);
  const plan = {};
  const memberPlan = {};
  const fromTemplate = {};
  keys.forEach((k) => {
    const r = resolveDay(k, rawPlan, rawMembers, template);
    if (Object.keys(r.plan).length) plan[k] = r.plan;
    if (Object.keys(r.members).length) memberPlan[k] = r.members;
    if (Object.keys(r.fromTemplate).length) fromTemplate[k] = r.fromTemplate;
  });
  return { plan, memberPlan, fromTemplate };
}

/**
 * Who eats what in one slot.
 * @param shared  rid | undefined
 * @param slotMembers { uid: rid | '-' } | undefined (effective)
 * @param memberIds  current household members (overrides of former members are ignored)
 * @returns [{ rid, uids: string[], shared: bool }] – the shared meal first (only when someone still eats it),
 *   then the members' own meals grouped by recipe. Recipes that no longer exist are dropped.
 */
export function slotEntries(shared, slotMembers, memberIds, recipes) {
  const ids = memberIds || [];
  const sm = slotMembers || {};
  const ok = (rid) => rid && rid !== EMPTY && (!recipes || recipes[rid]);
  const out = [];
  const others = ids.filter((u) => !sm[u]);
  if (ok(shared) && (others.length || !ids.length)) out.push({ rid: shared, uids: others, shared: true });
  const byRid = {};
  ids.forEach((u) => {
    const v = sm[u];
    if (!v || v === EMPTY) return;
    if (v === shared && ok(shared)) {
      // Same recipe as everyone – merge into the shared entry.
      const e = out.find((x) => x.shared);
      if (e) e.uids.push(u);
      else out.unshift({ rid: shared, uids: [u], shared: true });
      return;
    }
    if (!ok(v)) return;
    if (!byRid[v]) {
      byRid[v] = { rid: v, uids: [], shared: false };
      out.push(byRid[v]);
    }
    byRid[v].uids.push(u);
  });
  return out;
}

/** Members (uids) that do not eat in this slot ('-'). */
export function slotSkippers(slotMembers, memberIds) {
  const sm = slotMembers || {};
  return (memberIds || []).filter((u) => sm[u] === EMPTY);
}
