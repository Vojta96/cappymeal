import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app, 'europe-west1');

function toError(e) {
  const code = String((e && e.code) || '').replace('functions/', '');
  if (code === 'failed-precondition') {
    return new Error((e && e.message) || 'Rohlík není nastavený.');
  }
  if (['not-found', 'unavailable', 'internal', 'unknown', 'deadline-exceeded'].includes(code)) {
    return new Error('Služba Rohlík zatím není nasazená nebo nedostupná.');
  }
  if (code === 'unauthenticated' || code === 'permission-denied' || code === 'invalid-argument') {
    return new Error((e && e.message) || 'Požadavek se nepodařilo provést.');
  }
  return new Error((e && e.message) || 'Něco se nepovedlo.');
}

async function call(name, data) {
  try {
    const res = await httpsCallable(functions, name, { timeout: 300000 })(data);
    return res.data;
  } catch (e) {
    throw toError(e);
  }
}

export const getRohlikStatus = () => call('rohlikStatus');
export const matchProducts = (items) => call('rohlikMatch', { items });
export const fillCart = (days, products) => call('rohlikFillCart', { days, products });
