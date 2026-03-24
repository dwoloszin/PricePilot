// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// Preconfiguration for storage/backends and migration helpers
// Edit these values to point the app to another GitHub repo or Firebase project.
export default {
  backend: 'firestore', // 'firestore' or 'github'
  // Firestore defaults
  firestore: {
    projectId: 'pricepilot-d2d1b',
    // If you change projects, update firebaseClient.js accordingly or
    // set environment variables before build.
  },
  // GitHub fallback defaults
  github: {
    repoOwner: '',
    repoName: '',
    dataPath: 'data'
  },
  // Image upload defaults
  images: {
    storage: 'firebase', // 'github' | 'firebase' | 'dataurl'
  }
};
