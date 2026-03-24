// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// Simplified app params for GitHub migration
export const appParams = {
  appId: import.meta.env.VITE_APP_ID || 'price-pilot',
  token: null,
  fromUrl: typeof window !== 'undefined' ? window.location.href : '',
  functionsVersion: '1.0.0',
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
};
