// Firebase Client for MUSE PC
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'melo-bc6cc.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'melo-bc6cc',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'melo-bc6cc.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '524826675391',
  appId: env.VITE_FIREBASE_APP_ID || '1:524826675391:web:bfed19776d4af523635e0a',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-HDBBY0XKGV'
};

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let googleProviderInstance = null;

try {
  if (firebaseConfig.apiKey) {
    if (getApps().length === 0) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApp();
    }
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  } else {
    console.warn('Firebase API key not provided, running in local-first mode');
  }
} catch (err) {
  console.warn('Firebase initialization resilient notice:', err);
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = googleProviderInstance;
