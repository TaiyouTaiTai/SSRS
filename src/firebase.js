import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD12tbDyVcqnwXKpBOwD2xQX2lxLRnJyBc',
  authDomain: 'taiyouflare.firebaseapp.com',
  projectId: 'taiyouflare',
  storageBucket: 'taiyouflare.firebasestorage.app',
  messagingSenderId: '401775662725',
  appId: '1:401775662725:web:b2011efae8fc8952687bec',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
