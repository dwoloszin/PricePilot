// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// Firebase client initialization
// Run `npm install firebase` before using
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration (from environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { /* analytics not available in some environments */ }

// Initialize services with runtime validation and helpful diagnostics
let db = null;
let auth = null;
let storage = null;

try {
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (e) {
  console.error('[Firebase] Initialization error:', e);
  console.error('[Firebase] Please verify your web config in src/api/firebaseClient.js matches the Firebase project and that Firestore is enabled.');
}

function checkFirestoreSetup() {
  console.log('Firebase config:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket
  });
  if (!firebaseConfig.projectId) {
    console.warn('[Firebase] projectId is missing');
  }
  if (!db) {
    console.warn('[Firebase] Firestore not initialized. Open Firebase Console → Build → Firestore and enable a database for project:', firebaseConfig.projectId);
  } else {
    console.log('[Firebase] Firestore appears initialized for project', firebaseConfig.projectId);
  }
}

// Expose a helper for runtime diagnostics
window.__pricePilotFirebaseCheck = checkFirestoreSetup;

export { app, analytics, db, auth, storage, serverTimestamp };

// Usage example:
// import { db, auth } from '@/api/firebaseClient'
// then use Firestore functions from 'firebase/firestore'
