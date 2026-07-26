import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Добавили GoogleAuthProvider
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCmbVwwSd5GjyhY1MkF_oSkB7SEaORgLyU",
authDomain: "flow-space-theta.vercel.app",
  projectId: "matrix-hr-3ba0a",
  storageBucket: "matrix-hr-3ba0a.firebasestorage.app",
  messagingSenderId: "960958272528",
  appId: "1:960958272528:web:f9ac947c37bc539e0a6695"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // Создали и экспортируем провайдер Google
export const db = getFirestore(app);
}