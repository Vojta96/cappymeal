// Rohlík delivery windows stored by the server in households/{hid}/deliveries/{orderId}:
// { start, end (epoch ms), text: "Út 10. 11. 17:00–18:00", days: [date keys], state, notified?, updatedAt }.
import { DAY_SHORT, addDays, dateKey } from './dates';

const HOUR = 60 * 60 * 1000;
// Rohlík order states after which the delivery is no longer "coming".
const FINAL_STATE_RE = /DELIVER|FINISH|COMPLET|DONE|CANCEL|STORNO|RETURN|REFUND/;
const CANCELLED_RE = /CANCEL|STORNO/;

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const valid = (e) => !!e && Number.isFinite(e.start) && Number.isFinite(e.end);

/** "17:00–18:00" (device local time) */
export const deliveryTimeText = (e) => `${hhmm(e.start)}–${hhmm(e.end)}`;

/** Deliveries still coming (not ended, not delivered / cancelled) that start within `withinMs`, earliest first. */
export function upcomingDeliveries(deliveries, now = Date.now(), withinMs = 48 * HOUR) {
  return Object.entries(deliveries || {})
    .map(([id, e]) => ({ id, ...e }))
    .filter((e) => valid(e) && e.end > now && e.start - now <= withinMs && !FINAL_STATE_RE.test(e.state || ''))
    .sort((a, b) => a.start - b.start);
}

/** "dnes 17:00–18:00" / "zítra 17:00–18:00" / "Út 10. 11. 17:00–18:00" */
export function deliveryWhen(e, now = Date.now()) {
  const day = dateKey(new Date(e.start));
  const today = dateKey(new Date(now));
  const time = deliveryTimeText(e);
  if (day === today) return `dnes ${time}`;
  if (day === addDays(today, 1)) return `zítra ${time}`;
  const d = new Date(e.start);
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${time}`;
}

/** The delivery arriving on a given local date key (not cancelled), for the plan chip. */
export function deliveryOnDay(deliveries, key) {
  return (
    Object.entries(deliveries || {})
      .map(([id, e]) => ({ id, ...e }))
      .filter((e) => valid(e) && !CANCELLED_RE.test(e.state || '') && dateKey(new Date(e.start)) === key)
      .sort((a, b) => a.start - b.start)[0] || null
  );
}

/** Any stored delivery worth refreshing from Rohlík (window not over yet). */
export const hasPendingDelivery = (deliveries, now = Date.now()) =>
  Object.values(deliveries || {}).some((e) => valid(e) && e.end > now && !FINAL_STATE_RE.test(e.state || ''));
