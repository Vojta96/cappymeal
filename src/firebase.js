import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyBusTSYtsoWGmC-akC76290cskdDlHV2y4',
  authDomain: 'cappymeal-go.firebaseapp.com',
  databaseURL: 'https://cappymeal-go-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'cappymeal-go',
  storageBucket: 'cappymeal-go.firebasestorage.app',
  messagingSenderId: '944253021810',
  appId: '1:944253021810:web:abe092ae15d02b15491ceb',
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
// Only e-mail/password sign-in is used: no popup/redirect resolver, so the SDK never loads
// the auth iframe or apis.google.com (keeps the Content-Security-Policy tight).
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
export const functions = getFunctions(app, 'europe-west1');
