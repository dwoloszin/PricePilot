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
  storageBucket: "pricepilot-d2d1b.firebasestorage.app",
  messagingSenderId: "1005347249880",
  appId: "1:1005347249880:web:77543c81d68799c2c201ad",
  measurementId: "G-1EVS774YWY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { /* analytics not available in some environments */ }

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage, serverTimestamp };

// Usage example:
// import { db, auth } from '@/api/firebaseClient'
// then use Firestore functions from 'firebase/firestore'
