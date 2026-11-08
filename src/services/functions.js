// Calls Cloud Functions (callables) and turns their errors into Czech messages.
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const GENERIC = {
  unavailable: 'Služba je teď nedostupná. Zkuste to za chvíli.',
  'deadline-exceeded': 'Služba neodpověděla včas. Zkuste to znovu.',
  'not-found': 'Služba zatím není nasazená.',
  internal: 'Něco se nepovedlo. Zkuste to znovu.',
  unknown: 'Něco se nepovedlo. Zkuste to znovu.',
  'resource-exhausted': 'Příliš mnoho požadavků. Zkuste to později.',
};

/** Error with .code (functions status) and .reason (server error code from details.code). */
export class CallError extends Error {
  constructor(message, code, reason) {
    super(message);
    this.code = code;
    this.reason = reason;
  }
}

export function toCallError(e) {
  const code = String((e && e.code) || '').replace('functions/', '');
  const reason = (e && e.details && e.details.code) || '';
  // Our functions always send a Czech message together with details.code.
  if (reason && e.message) return new CallError(e.message, code, reason);
  if (code === 'not-found' && !reason) return new CallError(GENERIC['not-found'], code, 'NOT_DEPLOYED');
  return new CallError(GENERIC[code] || (e && e.message) || GENERIC.unknown, code, reason || code);
}

export async function callFunction(name, data, timeout = 70000) {
  try {
    const res = await httpsCallable(functions, name, { timeout })(data);
    return res.data;
  } catch (e) {
    throw toCallError(e);
  }
}
