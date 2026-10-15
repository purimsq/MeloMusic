// Firebase Enterprise Client Configuration for Melo
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCWsTjzGo1m4wk-dx2vrfcfFCrJZHkbAVE",
  authDomain: "melo-bc6cc.firebaseapp.com",
  projectId: "melo-bc6cc",
  storageBucket: "melo-bc6cc.firebasestorage.app",
  messagingSenderId: "524826675391",
  appId: "1:524826675391:web:bfed19776d4af523635e0a",
  measurementId: "G-HDBBY0XKGV"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
