// Pure helpers for the Rohlík checkout screen and the delivery settings.
import { addDays, dayInfo, diffDays } from './dates';

export const DELIVERY_WINDOWS = [
  ['morning', 'Ráno', 'do 12:00'],
  ['afternoon', 'Odpoledne', '12–17'],
  ['evening', 'Večer', 'od 17:00'],
  ['any', 'Kdykoli', ''],
];
export const DELIVERY_LEADS = [
  ['dayBefore', 'Den před vařením'],
  ['sameDay', 'V den vaření'],
];
export const PACKAGING_OPTIONS = [
  ['PAPER_BAGS', 'Papírové tašky'],
  ['REUSABLE_BAGS', 'Vratné tašky (se zálohou)'],
];
/** Payment methods CappyMeal can set in the Rohlík checkout (the rest is chosen in Rohlík). */
export const SETTABLE_PAYMENTS = ['CARD_ON_PLACE', 'CASH'];
export const COURIER_NOTE_MAX = 230;
export const SLOT_DAYS = 4; // get_timeslots_checkout: 0 = today … 3

/** Household delivery preferences (settings/delivery) with defaults. */
export function deliveryPrefs(settings) {
  const d = (settings && settings.delivery) || {};
  return {
    addressId: Number.isInteger(d.addressId) ? d.addressId : null,
    addressLabel: typeof d.addressLabel === 'string' ? d.addressLabel : '',
    window: ['morning', 'afternoon', 'evening', 'any'].includes(d.window) ? d.window : 'any',
    lead: d.lead === 'dayBefore' ? 'dayBefore' : 'sameDay',
    paymentId: typeof d.paymentId === 'string' ? d.paymentId : '',
    paymentLabel: typeof d.paymentLabel === 'string' ? d.paymentLabel : '',
    courierNote: typeof d.courierNote === 'string' ? d.courierNote : '',
    packaging: ['PAPER_BAGS', 'REUSABLE_BAGS'].includes(d.packaging) ? d.packaging : '',
  };
}

/** 1 when deliveries should come the day before cooking. */
export const leadShift = (settings) => (deliveryPrefs(settings).lead === 'dayBefore' ? 1 : 0);

/** Slot start (minutes) inside the preferred window? */
export function inWindow(slot, window) {
  if (!window || window === 'any') return true;
  if (!slot || slot.startMin == null) return false;
  const h = slot.startMin / 60;
  if (window === 'morning') return h < 12;
  if (window === 'afternoon') return h >= 12 && h < 17;
  if (window === 'evening') return h >= 17;
  return true;
}

/** Index of the first available slot in the preferred window, or -1. */
export function recommendSlot(slots, window) {
  return (slots || []).findIndex((s) => s.available && s.id && inWindow(s, window));
}

/** Day tab (0–3) to open: the earliest shopping day (minus one with lead 'dayBefore'), clamped. */
export function defaultDayTab(todayKey, days, lead) {
  const list = (days || []).filter(Boolean).sort();
  if (!list.length) return 0;
  const target = lead === 'dayBefore' ? addDays(list[0], -1) : list[0];
  return Math.max(0, Math.min(SLOT_DAYS - 1, diffDays(todayKey, target)));
}

/** "Dnes", "Zítra", "St 12. 11." */
export function dayTabLabel(i, todayKey) {
  if (i === 0) return 'Dnes';
  if (i === 1) return 'Zítra';
  return dayInfo(addDays(todayKey, i)).shortLabel;
}
