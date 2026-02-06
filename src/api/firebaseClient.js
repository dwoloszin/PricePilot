// Firebase client initialization
// Run `npm install firebase` before using
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration (provided)
const firebaseConfig = {
  apiKey: "AIzaSyC507icVjcQPUmmozoYqV5DR2c5NwHUYqs",
  authDomain: "pricepilot-d2d1b.firebaseapp.com",
  projectId: "pricepilot-d2d1b",
  storageBucket: "pricepilot-d2d1b.appspot.com",
  messagingSenderId: "1005347249880",
  appId: "1:1005347249880:web:77543c81d68799c2c201ad",
  measurementId: "G-1EVS774YWY"
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
