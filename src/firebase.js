import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, indexedDBLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Ваши ключи Firebase...
};

const app = initializeApp(firebaseConfig);

// 🌟 ВАЖНО: Вместо обычного getAuth(app) используем инициализацию с защищенной памятью IndexedDB
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();