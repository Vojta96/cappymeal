/* global firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBusTSYtsoWGmC-akC76290cskdDlHV2y4',
  authDomain: 'cappymeal-go.firebaseapp.com',
  databaseURL: 'https://cappymeal-go-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'cappymeal-go',
  storageBucket: 'cappymeal-go.firebasestorage.app',
  messagingSenderId: '944253021810',
  appId: '1:944253021810:web:abe092ae15d02b15491ceb',
});

const messaging = firebase.messaging();

// Messages with a "notification" payload are displayed by the SDK/browser automatically;
// this handles data-only messages.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'CappyMeal', {
    body: data.body || '',
    icon: '/icon-192.png',
    data: { link: data.link || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const fcm = d.FCM_MSG && d.FCM_MSG.data;
  const link = d.link || (fcm && fcm.link) || '/';
  // Only ever navigate within this app (never to a URL supplied by a message from elsewhere).
  let url = new URL('/', self.location.origin).href;
  try {
    const target = new URL(String(link), self.location.origin);
    if (target.origin === self.location.origin) url = target.href;
  } catch (e) {
    // keep '/'
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
