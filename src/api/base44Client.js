
import { githubDbClient } from './githubDbClient';
import { firestoreDbClient } from './firestoreDbClient';

/**
 * Base44 Client implementation using GitHub as a backend.
 * This client provides a similar interface to the original base44 client
 * but persists data to GitHub JSON files.
 */
// Prefer Firestore when available, otherwise fall back to GitHub client
const primaryClient = (firestoreDbClient && firestoreDbClient.entities) ? firestoreDbClient : githubDbClient;

export const base44 = (() => {
  const base = {
    ...primaryClient,

    auth: {
    me: async () => {
      const userStr = localStorage.getItem('pricepilot_user');
      if (!userStr) return { id: 'anonymous', full_name: 'Anonymous', name: 'Anonymous' };
      return JSON.parse(userStr);
    },
    
    updateMe: async (data) => {
      const userStr = localStorage.getItem('pricepilot_user');
      let user = userStr ? JSON.parse(userStr) : { id: 'anonymous' };
      
      // Update local storage for immediate persistence
      const updatedUser = { ...user, ...data };
      localStorage.setItem('pricepilot_user', JSON.stringify(updatedUser));
      
      // Also update in GitHub if possible
      try {
        await githubDbClient.entities.User.update(updatedUser.id, updatedUser);
      } catch (e) {
        console.log('GitHub user update skipped/failed');
      }
      
      return updatedUser;
    },

    logout: (redirectUrl) => {
      localStorage.removeItem('pricepilot_user');
      if (redirectUrl) window.location.hash = '#/Login';
    },

    redirectToLogin: () => {
      window.location.hash = '#/Login';
    }
  },

    appLogs: {
    logUserInApp: async (pageName) => {
      console.log(`Page view: ${pageName}`);
    }
  },

  integrations: {
    Core: {
      UploadFile: async ({ file, compress = true }) => {
        // If GitHub is configured, compress the image and store it in the repo.
        // Otherwise fall back to returning a data URL (existing behavior).
        if (!file) throw new Error('No file provided');

        // Helper: convert Blob to base64 (no data: prefix)
        const blobToBase64 = async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
          }
          return btoa(binary);
        };

        // If githubDbClient.uploadFile is available, try to use it
        if (githubDbClient && typeof githubDbClient.uploadFile === 'function') {
          try {
            // Create image element to compress/resize
            const img = await new Promise((resolve, reject) => {
              const url = URL.createObjectURL(file);
              const image = new Image();
              image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
              image.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
              image.src = url;
            });

            // Determine target size
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let { width, height } = img;
            let scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Prefer WebP for good compression, fallback to jpeg
            const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.65));
            if (!blob) {
              // fallback
              const fallbackBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.75));
              const base64 = await blobToBase64(fallbackBlob);
              const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
              const { rawUrl } = await githubDbClient.uploadFile(filename, base64, `Add image ${filename}`);
              return { file_url: rawUrl };
            }

            const base64 = await blobToBase64(blob);
            const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2,8)}.webp`;
            const { rawUrl } = await githubDbClient.uploadFile(filename, base64, `Add image ${filename}`);
            return { file_url: rawUrl };
          } catch (err) {
            console.warn('GitHub image upload failed, falling back to data URL:', err);
            // Fall through to data URL fallback below
          }
        }

        // Fallback: return data URL (original behaviour)
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = error => reject(error);
        });
      }
    }
  }
  };

  // Wrap entity create/update calls so they receive the full current user object
  if (base.entities) {
    Object.keys(base.entities).forEach((name) => {
      const ent = base.entities[name];
      if (!ent) return;
      if (typeof ent.create === 'function') {
        const origCreate = ent.create.bind(ent);
        ent.create = async (data, userArg = null) => {
          const me = await base.auth.me();
          const user = userArg || me;
          return origCreate(data, user);
        };
      }
      if (typeof ent.update === 'function') {
        const origUpdate = ent.update.bind(ent);
        ent.update = async (id, data, userArg = null) => {
          const me = await base.auth.me();
          const user = userArg || me;
          return origUpdate(id, data, user);
        };
      }
      // Wrap toggleLike/toggleDislike to pass current user object
      if (typeof ent.toggleLike === 'function') {
        const origToggleLike = ent.toggleLike.bind(ent);
        ent.toggleLike = async (id, userArg = null) => {
          const me = await base.auth.me();
          const user = userArg || me;
          return origToggleLike(id, user);
        };
      }
      if (typeof ent.toggleDislike === 'function') {
        const origToggleDislike = ent.toggleDislike.bind(ent);
        ent.toggleDislike = async (id, userArg = null) => {
          const me = await base.auth.me();
          const user = userArg || me;
          return origToggleDislike(id, user);
        };
      }
    });
  }

  return base;
})();
