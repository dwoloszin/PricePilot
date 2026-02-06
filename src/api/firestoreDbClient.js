import { db, serverTimestamp } from './firebaseClient';
import {
  collection,
  query,
  where,
  orderBy,
  limit as limitFn,
  getDocs,
  getDoc,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

function validateData(data, entityName) {
  if (!Array.isArray(data)) return [];
  return data;
}

const PRIVATE_ENTITIES = ['ShoppingList'];
const SHARED_ENTITIES = ['Product', 'PriceEntry', 'Store', 'User'];

const createEntityClient = (entityName) => ({
  list: async (sort = null, limit = null, userId = null) => {
    try {
      const col = collection(db, entityName);
      let q = col;
      const constraints = [];
      if (PRIVATE_ENTITIES.includes(entityName) && userId) {
        constraints.push(where('user_id', '==', String(userId)));
      }
      if (sort) {
        const isDesc = sort.startsWith('-');
        const field = isDesc ? sort.substring(1) : sort;
        try { constraints.push(orderBy(field, isDesc ? 'desc' : 'asc')); } catch(e) { /* ignore */ }
      }
      if (limit) {
        constraints.push(limitFn(limit));
      }
      if (constraints.length > 0) q = query(col, ...constraints);

      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return validateData(items, entityName);
    } catch (e) {
      console.error('Firestore list error', entityName, e);
      return [];
    }
  },

  filter: async (filters) => {
    try {
      const col = collection(db, entityName);
      const constraints = Object.entries(filters).map(([k,v]) => where(k, '==', v));
      const q = query(col, ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Firestore filter error', e);
      return [];
    }
  },

  get: async (id) => {
    try {
      const d = await getDoc(doc(db, entityName, id));
      return d.exists() ? { id: d.id, ...d.data() } : null;
    } catch (e) {
      console.error('Firestore get error', e);
      return null;
    }
  },

  create: async (data, user = null) => {
    try {
      // user may be a string userId or an object { id, username, full_name }
      const userId = user && typeof user === 'string' ? user : (user && user.id) || data.created_by || null;
      const userName = user && typeof user === 'object' ? (user.username || user.full_name || user.name) : (data.created_by_name || null);
      const now = new Date().toISOString();
      const entry = {
        action: 'create',
        date: now,
        by: userId,
        by_name: userName,
        data: data
      };

      const payload = {
        ...data,
        created_date: now,
        created_by: userId,
        created_by_name: userName,
        updated_date: now,
        updated_by: userId,
        updated_by_name: userName,
        likes: data.likes || [],
        dislikes: data.dislikes || [],
        edit_history: (data.edit_history || []).concat([entry])
      };

      const ref = await addDoc(collection(db, entityName), payload);
      return { id: ref.id, ...payload };
    } catch (e) {
      console.error('Firestore create error', e);
      throw e;
    }
  },

  update: async (id, data, user = null) => {
    try {
      const ref = doc(db, entityName, id);
      const now = new Date().toISOString();

      // Resolve user id and name
      const userId = user && typeof user === 'string' ? user : (user && user.id) || data.updated_by || null;
      const userName = user && typeof user === 'object' ? (user.username || user.full_name || user.name) : (data.updated_by_name || null);

      // Read existing document to create a history entry
      const existingSnap = await getDoc(ref);
      const existing = existingSnap.exists() ? existingSnap.data() : {};
      const changes = {};
      Object.keys(data).forEach(k => {
        const before = existing[k] === undefined ? null : existing[k];
        const after = data[k];
        if (JSON.stringify(before) !== JSON.stringify(after)) changes[k] = { before, after };
      });

      const historyEntry = {
        action: 'update',
        date: now,
        by: userId,
        by_name: userName,
        changes
      };

      const updates = {
        ...data,
        updated_date: now,
        updated_by: userId,
        updated_by_name: userName,
      };

      // Apply update and push history entry
      await updateDoc(ref, { ...updates, edit_history: arrayUnion(historyEntry) });
      const updated = await getDoc(ref);
      return { id: updated.id, ...updated.data() };
    } catch (e) {
      console.error('Firestore update error', e);
      throw e;
    }
  },

  delete: async (id) => {
    try {
      await deleteDoc(doc(db, entityName, id));
      return true;
    } catch (e) {
      console.error('Firestore delete error', e);
      return false;
    }
  },

  toggleLike: async (id, userId) => {
    try {
      // userId may be a string id or an object { id, username, full_name }
      const uid = userId && typeof userId === 'string' ? userId : (userId && userId.id) || null;
      const uname = userId && typeof userId === 'object' ? (userId.username || userId.full_name || userId.name) : null;
      const ref = doc(db, entityName, id);
      const d = await getDoc(ref);
      if (!d.exists()) return null;
      const item = d.data();
      const likes = item.likes || [];
      if (!uid) return null;

      if (likes.includes(uid)) {
        // remove id and name if present
        const updates = { likes: arrayRemove(uid) };
        if (uname) updates.likes_names = arrayRemove(uname);
        await updateDoc(ref, updates);
      } else {
        const updates = { likes: arrayUnion(uid), dislikes: arrayRemove(uid) };
        if (uname) {
          updates.likes_names = arrayUnion(uname);
          updates.dislikes_names = arrayRemove(uname);
        }
        await updateDoc(ref, updates);
      }
      const updated = await getDoc(ref);
      return { id: updated.id, ...updated.data() };
    } catch (e) {
      console.error('Firestore toggleLike error', e);
      return null;
    }
  },

  toggleDislike: async (id, userId) => {
    try {
      const uid = userId && typeof userId === 'string' ? userId : (userId && userId.id) || null;
      const uname = userId && typeof userId === 'object' ? (userId.username || userId.full_name || userId.name) : null;
      const ref = doc(db, entityName, id);
      const d = await getDoc(ref);
      if (!d.exists()) return null;
      const item = d.data();
      const dislikes = item.dislikes || [];
      if (!uid) return null;

      if (dislikes.includes(uid)) {
        const updates = { dislikes: arrayRemove(uid) };
        if (uname) updates.dislikes_names = arrayRemove(uname);
        await updateDoc(ref, updates);
      } else {
        const updates = { dislikes: arrayUnion(uid), likes: arrayRemove(uid) };
        if (uname) {
          updates.dislikes_names = arrayUnion(uname);
          updates.likes_names = arrayRemove(uname);
        }
        await updateDoc(ref, updates);
      }
      const updated = await getDoc(ref);
      return { id: updated.id, ...updated.data() };
    } catch (e) {
      console.error('Firestore toggleDislike error', e);
      return null;
    }
  }
});

export const firestoreDbClient = {
  entities: {
    Product: createEntityClient('Product'),
    PriceEntry: createEntityClient('PriceEntry'),
    Store: createEntityClient('Store'),
    ShoppingList: createEntityClient('ShoppingList'),
    User: createEntityClient('User'),
  }
};
