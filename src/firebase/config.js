import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDa3KclxvY3za0smOCQFNN2gkk3aQXzHGM',
  authDomain: 'solution-cbms.firebaseapp.com',
  databaseURL: 'https://solution-cbms-default-rtdb.firebaseio.com',
  projectId: 'solution-cbms',
  storageBucket: 'solution-cbms.firebasestorage.app',
  messagingSenderId: '30521732206',
  appId: '1:30521732206:web:404602b11036c35f0d4a7f',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
