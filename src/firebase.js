import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBusTSYtsoWGmC-akC76290cskdDlHV2y4',
  authDomain: 'cappymeal-go.firebaseapp.com',
  databaseURL: 'https://cappymeal-go-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'cappymeal-go',
  storageBucket: 'cappymeal-go.firebasestorage.app',
  messagingSenderId: '944253021810',
  appId: '1:944253021810:web:abe092ae15d02b15491ceb',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
