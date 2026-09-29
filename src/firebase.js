import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCmbVwwSd5GjyhY1MkF_oSkB7SEaORgLyU",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "matrix-hr-3ba0a.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "matrix-hr-3ba0a",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "matrix-hr-3ba0a.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "960958272528",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:960958272528:web:f9ac947c37bc539e0a6695"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Не удалось включить постоянную сессию Firebase Auth:', error?.code || error);
});
export const googleProvider = new GoogleAuthProvider();
// Firestore сначала отдаёт последнюю безопасно закэшированную копию данных,
// а затем синхронизирует её с сервером. Благодаря этому повторное открытие
// Flow Space не начинается с пустого списка задач при медленной сети.
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  // В тестах и старых браузерах Firestore мог быть инициализирован раньше.
  // В этом случае сохраняем обычное подключение без падения приложения.
  console.warn('Постоянный кеш Firestore недоступен:', error?.code || error);
  firestore = getFirestore(app);
}

export const db = firestore;
