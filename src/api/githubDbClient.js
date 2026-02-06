
import { Octokit } from "octokit";

/**
 * DATA SHARING ARCHITECTURE
 * 
 * SHARED ENTITIES (All Users See All Items):
 * - Product: Shared across all users, created_by tracks originator
 * - Store: Shared across all users, created_by tracks originator
 * - PriceEntry: Shared across all users (contributes to shared pricing data), created_by tracks originator
 * 
 * PRIVATE ENTITIES (Per-User Only):
 * - ShoppingList: Each user only sees their own lists (filtered by user_id)
 * 
 * SHARED FEATURES (Cross-User):
 * - likes[] array: Each item contains user IDs who liked it (shared across users)
 * - dislikes[] array: Each item contains user IDs who disliked it (shared across users)
 * - edit_history[]: Tracks all edits by any user on shared items
 */

// GitHub Configuration
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';

const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// Cache for file SHAs to avoid extra API calls
const shaCache = {};

/**
 * Validate if data is a proper array
 */
function validateData(data, entityName) {
  if (!Array.isArray(data)) {
    console.error(`Data for ${entityName} is not an array, resetting to empty array.`);
    return [];
  }
  return data;
}

/**
 * Get data from GitHub or localStorage fallback
 */
async function getStorage(entityName) {
  let data = [];
  let source = 'none';
  
  if (octokit && GITHUB_OWNER && GITHUB_REPO) {
    try {
      const { data: githubData } = await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `data/${entityName}.json`,
        ref: GITHUB_BRANCH
      });
      
      shaCache[entityName] = githubData.sha;
      // Decode base64 content to UTF-8 safely (handles non-ASCII characters)
      let decodedContent = null;
      try {
        // Preferred: use TextDecoder on the binary data produced by atob
        const binary = atob(githubData.content);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        decodedContent = new TextDecoder().decode(bytes);
      } catch (err) {
        // Fallback: use decodeURIComponent/escape trick
        try {
          decodedContent = decodeURIComponent(Array.prototype.map.call(atob(githubData.content), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } catch (e) {
          console.error(`Base64 -> UTF8 decode failed for ${entityName}:`, e);
          decodedContent = null;
        }
      }

      try {
        data = decodedContent ? JSON.parse(decodedContent) : [];
        source = 'GitHub';
      } catch (e) {
        console.error(`JSON parse error for ${entityName} from GitHub:`, e);
        data = [];
        source = 'GitHub (parse error)';
      }
    } catch (error) {
      if (error.status === 404) {
        data = []; // File doesn't exist yet
        source = 'GitHub (404 - new file)';
      } else {
        console.error(`GitHub fetch error for ${entityName}:`, error);
        // Fallback to localStorage if GitHub fails
        const localData = localStorage.getItem(`pricepilot_db_data/${entityName}.json`);
        try {
          data = localData ? JSON.parse(localData) : [];
          source = 'localStorage (GitHub fallback)';
        } catch (e) {
          data = [];
          source = 'error (fallback failed)';
        }
      }
    }
  } else {
    // Fallback to localStorage
    const localData = localStorage.getItem(`pricepilot_db_data/${entityName}.json`);
    try {
      data = localData ? JSON.parse(localData) : [];
      source = 'localStorage (no GitHub config)';
    } catch (e) {
      data = [];
      source = 'error (no GitHub)';
    }
  }
  
  // DEBUG: Log data source
  if (data.length > 0 || source.includes('error') || source.includes('404')) {
    console.log(`[DB] ${entityName}: ${data.length} items from ${source}`);
  }
  
  return validateData(data, entityName);
}

/**
 * Save data to GitHub or localStorage fallback
 * Handles 409 (Conflict) by refreshing SHA and retrying
 */
async function setStorage(entityName, data, message) {
  const validatedData = validateData(data, entityName);
  const jsonString = JSON.stringify(validatedData, null, 2);
  
  if (octokit && GITHUB_OWNER && GITHUB_REPO) {
    try {
      // Encode JSON string as base64 safely for UTF-8 characters
      let content;
      try {
        content = btoa(unescape(encodeURIComponent(jsonString)));
      } catch (err) {
        // Fallback to plain btoa (may fail for some characters)
        content = btoa(jsonString);
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `data/${entityName}.json`,
        message: message || `Update ${entityName}`,
        content,
        sha: shaCache[entityName],
        branch: GITHUB_BRANCH
      });
      
      // Update SHA cache for next operation
      shaCache[entityName] = response.data.content.sha;
      
      // DEBUG: Log save
      console.log(`[DB] ${entityName}: Saved ${validatedData.length} items to GitHub`);
    } catch (error) {
      // Handle 409 Conflict (stale SHA) by refreshing and retrying
      if (error.status === 409) {
        console.warn(`[DB] ${entityName}: SHA conflict detected, refreshing and retrying...`);
        try {
          // Fetch the current file to get fresh SHA
          const currentFile = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: `data/${entityName}.json`,
            ref: GITHUB_BRANCH
          });
          
          shaCache[entityName] = currentFile.data.sha;
          
          // Encode content again
          let content;
          try {
            content = btoa(unescape(encodeURIComponent(jsonString)));
          } catch (err) {
            content = btoa(jsonString);
          }
          
          // Retry with fresh SHA
          const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: `data/${entityName}.json`,
            message: message || `Update ${entityName}`,
            content,
            sha: shaCache[entityName],
            branch: GITHUB_BRANCH
          });
          
          shaCache[entityName] = response.data.content.sha;
          console.log(`[DB] ${entityName}: Retry successful, saved ${validatedData.length} items to GitHub`);
        } catch (retryError) {
          console.error(`GitHub save retry failed for ${entityName}:`, retryError);
          // Fall back to localStorage
          localStorage.setItem(`pricepilot_db_data/${entityName}.json`, jsonString);
          console.log(`[DB] ${entityName}: Saved ${validatedData.length} items to localStorage (GitHub retry failed)`);
        }
      } else {
        console.error(`GitHub save error for ${entityName}:`, error);
        // Always save to localStorage as fallback
        localStorage.setItem(`pricepilot_db_data/${entityName}.json`, jsonString);
        console.log(`[DB] ${entityName}: Saved ${validatedData.length} items to localStorage (GitHub failed)`);
      }
    }
  } else {
    // No GitHub configured, save only to localStorage
    localStorage.setItem(`pricepilot_db_data/${entityName}.json`, jsonString);
    console.log(`[DB] ${entityName}: Saved ${validatedData.length} items to localStorage (no GitHub)`);
  }
}

/**
 * Helper to get current user info from localStorage
 */
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('pricepilot_user');
    if (!userStr) return { id: 'anonymous', name: 'Anonymous' };
    const user = JSON.parse(userStr);
    return {
      id: user.id || 'anonymous',
      name: user.full_name || user.name || 'Anonymous'
    };
  } catch (e) {
    return { id: 'anonymous', name: 'Anonymous' };
  }
}

/**
 * Entities that are private per user
 * These should be filtered by user_id when listing
 */
const PRIVATE_ENTITIES = ['ShoppingList'];

/**
 * Entities that are shared across all users
 * These should never be filtered by user
 */
const SHARED_ENTITIES = ['Product', 'PriceEntry', 'Store', 'User'];

const createEntityClient = (entityName) => ({
  list: async (sort = null, limit = null, userId = null) => {
    let items = await getStorage(entityName);
    
    // Apply user filtering ONLY for private entities
    if (PRIVATE_ENTITIES.includes(entityName) && userId) {
      items = items.filter(item => String(item.user_id) === String(userId));
    }
    
    // Apply sorting
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      items.sort((a, b) => {
        if (a[field] < b[field]) return isDesc ? 1 : -1;
        if (a[field] > b[field]) return isDesc ? -1 : 1;
        return 0;
      });
    }
    if (limit) items = items.slice(0, limit);
    return items;
  },
  
  filter: async (filters) => {
    const items = await getStorage(entityName);
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => String(item[key]) === String(value));
    });
  },
  
  get: async (id) => {
    const data = await getStorage(entityName);
    return data.find(item => String(item.id) === String(id));
  },
  
  create: async (data, userId = null) => {
    const items = await getStorage(entityName);
    const user = getCurrentUser();
    const finalUserId = userId || user.id;
    const finalUserName = user.name;

    const newItem = { 
      ...data, 
      id: Math.random().toString(36).substr(2, 9), 
      created_date: new Date().toISOString(),
      created_by: finalUserId,
      created_by_name: finalUserName,
      updated_date: new Date().toISOString(),
      updated_by: finalUserId,
      updated_by_name: finalUserName,
      likes: [],
      dislikes: [],
      edit_history: []
    };
    items.push(newItem);
    await setStorage(entityName, items, `Create ${entityName}: ${newItem.id}`);
    return newItem;
  },
  
  update: async (id, data, userId = null) => {
    const items = await getStorage(entityName);
    const user = getCurrentUser();
    const index = items.findIndex(item => String(item.id) === String(id));
    if (index !== -1) {
      const oldItem = { ...items[index] };
      const currentUserId = userId || user.id;
      const currentUserName = user.name;
      
      const changes = [];
      Object.keys(data).forEach(key => {
        if (key !== 'edit_history' && JSON.stringify(oldItem[key]) !== JSON.stringify(data[key])) {
          changes.push({
            field: key,
            old: oldItem[key],
            new: data[key]
          });
        }
      });
      
      if (changes.length > 0) {
        const historyEntry = {
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          changes
        };
        
        items[index] = { 
          ...oldItem, 
          ...data,
          updated_date: new Date().toISOString(),
          updated_by: currentUserId,
          updated_by_name: currentUserName,
          edit_history: [...(oldItem.edit_history || []), historyEntry]
        };
        
        await setStorage(entityName, items, `Update ${entityName}: ${id}`);
      }
      return items[index];
    }
    return null;
  },
  
  delete: async (id) => {
    const items = await getStorage(entityName);
    const filtered = items.filter(item => String(item.id) !== String(id));
    await setStorage(entityName, filtered, `Delete ${entityName}: ${id}`);
    return true;
  },

  toggleLike: async (id, userId) => {
    const items = await getStorage(entityName);
    const index = items.findIndex(item => String(item.id) === String(id));
    if (index !== -1) {
      const item = items[index];
      if (!item.likes) item.likes = [];
      if (!item.dislikes) item.dislikes = [];
      
      const likeIndex = item.likes.indexOf(userId);
      if (likeIndex !== -1) {
        item.likes.splice(likeIndex, 1);
      } else {
        item.likes.push(userId);
        const dislikeIndex = item.dislikes.indexOf(userId);
        if (dislikeIndex !== -1) item.dislikes.splice(dislikeIndex, 1);
      }
      
      await setStorage(entityName, items, `Toggle Like ${entityName}: ${id}`);
      return item;
    }
    return null;
  },

  toggleDislike: async (id, userId) => {
    const items = await getStorage(entityName);
    const index = items.findIndex(item => String(item.id) === String(id));
    if (index !== -1) {
      const item = items[index];
      if (!item.likes) item.likes = [];
      if (!item.dislikes) item.dislikes = [];
      
      const dislikeIndex = item.dislikes.indexOf(userId);
      if (dislikeIndex !== -1) {
        item.dislikes.splice(dislikeIndex, 1);
      } else {
        item.dislikes.push(userId);
        const likeIndex = item.likes.indexOf(userId);
        if (likeIndex !== -1) item.likes.splice(likeIndex, 1);
      }
      
      await setStorage(entityName, items, `Toggle Dislike ${entityName}: ${id}`);
      return item;
    }
    return null;
  }
});

export const githubDbClient = {
  entities: {
    Product: createEntityClient('Product'),
    PriceEntry: createEntityClient('PriceEntry'),
    Store: createEntityClient('Store'),
    ShoppingList: createEntityClient('ShoppingList'),
    User: createEntityClient('User'),
  }
};

// Upload a binary file (base64 content without data: prefix) to the repo
async function uploadFile(path, base64Content, message) {
  if (!octokit || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('GitHub not configured');
  }

  try {
    // Try to get existing file to populate shaCache for this path (optional)
    try {
      const existing = await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path,
        ref: GITHUB_BRANCH
      });
      shaCache[path] = existing.data.sha;
    } catch (e) {
      // Ignore 404 -- file doesn't exist yet
    }

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path,
      message: message || `Add ${path}`,
      content: base64Content,
      sha: shaCache[path],
      branch: GITHUB_BRANCH
    });

    shaCache[path] = response.data.content.sha;

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
    return { rawUrl };
  } catch (error) {
    console.error(`GitHub upload error for ${path}:`, error);
    throw error;
  }
}

// Attach upload helper to exported client for use by integrations
githubDbClient.uploadFile = uploadFile;
