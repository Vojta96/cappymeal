import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { app, db } from '../firebase';

export async function pushSupported() {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return false;
    }
    return await isSupported();
  } catch (e) {
    return false;
  }
}

function shortHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function enablePush(hid, uid) {
  try {
    if (!(await pushSupported())) return 'unsupported';
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('Chybí REACT_APP_FIREBASE_VAPID_KEY (viz .env.example).');
      return 'error';
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'error';
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return 'error';
    await set(ref(db, `households/${hid}/pushTokens/${uid}/${shortHash(token)}`), {
      token,
      createdAt: Date.now(),
      ua: (navigator.userAgent || '').slice(0, 200),
    });
    return 'granted';
  } catch (e) {
    console.warn('enablePush failed', e);
    return 'error';
  }
}

export function onForegroundMessage(cb) {
  let unsub = () => {};
  let cancelled = false;
  pushSupported().then((ok) => {
    if (!ok || cancelled) return;
    unsub = onMessage(getMessaging(app), cb);
  });
  return () => {
    cancelled = true;
    unsub();
  };
}
