/**
 * Mystery Generator - localStorage Persistence
 * Independent from campaign IndexedDB storage
 */

const STORAGE_KEY = 'motw-generator-mysteries';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.error('Failed to read generator mysteries from localStorage');
    return [];
  }
}

function writeStore(mysteries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mysteries));
}

/**
 * Load all saved mysteries
 * @returns {Array} Array of mystery objects
 */
export function loadAllMysteries() {
  return readStore();
}

/**
 * Save (upsert) a mystery
 * @param {Object} mystery - Mystery object to save
 */
export function saveMystery(mystery) {
  const mysteries = readStore();
  mystery.lastModified = new Date().toISOString();
  const idx = mysteries.findIndex(m => m.id === mystery.id);
  if (idx >= 0) {
    mysteries[idx] = mystery;
  } else {
    mysteries.push(mystery);
  }
  writeStore(mysteries);
}

/**
 * Delete a mystery by ID
 * @param {string} id - Mystery ID
 */
export function deleteMystery(id) {
  const mysteries = readStore().filter(m => m.id !== id);
  writeStore(mysteries);
}

/**
 * Get a single mystery by ID
 * @param {string} id - Mystery ID
 * @returns {Object|null} Mystery object or null
 */
export function getMysteryById(id) {
  return readStore().find(m => m.id === id) || null;
}
