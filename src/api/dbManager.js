
import { base44 } from './base44Client';

/**
 * Database Management API
 * 
 * This utility provides direct access to the GitHub-backed database
 * for administrative tasks like extracting data, bulk editing, or 
 * deleting records.
 * 
 * Usage in Console:
 * import { dbManager } from './src/api/dbManager';
 * await dbManager.extract('Product');
 */
export const dbManager = {
  /**
   * Extract all records for an entity
   * @param {string} entityName - Product, PriceEntry, Store, ShoppingList, User
   */
  extract: async (entityName) => {
    if (!base44.entities[entityName]) {
      throw new Error(`Entity ${entityName} not found`);
    }
    const data = await base44.entities[entityName].list();
    console.table(data);
    return data;
  },

  /**
   * Get a specific record by ID
   */
  get: async (entityName, id) => {
    return await base44.entities[entityName].get(id);
  },

  /**
   * Update a record
   */
  edit: async (entityName, id, data) => {
    const result = await base44.entities[entityName].update(id, data);
    console.log(`Updated ${entityName} ${id}`);
    return result;
  },

  /**
   * Delete a record
   */
  exclude: async (entityName, id) => {
    const result = await base44.entities[entityName].delete(id);
    console.log(`Deleted ${entityName} ${id}`);
    return result;
  },

  /**
   * Create a new record
   */
  insert: async (entityName, data) => {
    const result = await base44.entities[entityName].create(data);
    console.log(`Created ${entityName} with ID ${result.id}`);
    return result;
  },

  /**
   * Export the entire database as a JSON object
   */
  exportAll: async () => {
    const entities = Object.keys(base44.entities);
    const fullDb = {};
    for (const entity of entities) {
      fullDb[entity] = await base44.entities[entity].list();
    }
    return fullDb;
  }
};

// Attach to window for easy access in browser console during development
if (typeof window !== 'undefined') {
  window.dbManager = dbManager;
}
