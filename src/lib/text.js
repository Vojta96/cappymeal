// Display helpers for names (nicknames, household name).

/** First letter uppercased (Czech locale), rest untouched: "procházkovi" -> "Procházkovi". */
export function capitalizeFirst(value) {
  const s = String(value == null ? '' : value).trim();
  if (!s) return '';
  const [first, ...rest] = Array.from(s);
  return first.toLocaleUpperCase('cs') + rest.join('');
}

/** Initial letter for avatars. */
export function initial(value) {
  const s = capitalizeFirst(value);
  return s ? Array.from(s)[0] : '?';
}

export const DEFAULT_HOUSEHOLD_NAME = 'Naše domácnost';

export function householdDisplayName(name) {
  return capitalizeFirst(name) || DEFAULT_HOUSEHOLD_NAME;
}
