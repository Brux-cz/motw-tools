/**
 * Pool Storage — localStorage persistence for generator data pools
 * Key: motw-generator-pools
 * Stored data = complete replacement of defaults (not merge)
 */

const STORAGE_KEY = 'motw-generator-pools';

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const poolStorage = {
  /** Get stored pool data by key, or null if not stored */
  get(key) {
    const all = loadAll();
    return all[key] || null;
  },

  /** Store pool data for a key (complete replacement) */
  set(key, data) {
    const all = loadAll();
    all[key] = data;
    saveAll(all);
  },

  /** Reset a single pool to defaults (remove from storage) */
  reset(key) {
    const all = loadAll();
    delete all[key];
    saveAll(all);
  },

  /** Reset all pools to defaults (clear storage) */
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
