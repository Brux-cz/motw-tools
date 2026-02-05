/**
 * Storage Layer - IndexedDB for campaign data, localStorage for settings
 */

import { openDB } from 'idb';

const DB_NAME = 'motw-db';
const DB_VERSION = 3; // Incremented for aiAutonomousWork store

// Store names
const STORES = {
  campaigns: 'campaigns',
  settings: 'settings'
};

let dbInstance = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);

        // Campaigns store
        if (!db.objectStoreNames.contains(STORES.campaigns)) {
          const campaignStore = db.createObjectStore(STORES.campaigns, {
            keyPath: 'id',
            autoIncrement: false
          });
          campaignStore.createIndex('name', 'name', { unique: false });
          campaignStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Settings store (for future use)
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, {
            keyPath: 'key'
          });
        }

        // AI Conversations store (v2)
        if (!db.objectStoreNames.contains('aiConversations')) {
          const aiStore = db.createObjectStore('aiConversations', { keyPath: 'id' });
          aiStore.createIndex('mysteryId', 'mysteryId', { unique: false });
          aiStore.createIndex('timestamp', 'lastMessageAt', { unique: false });
        }

        // AI Autonomous Work store (v3)
        if (!db.objectStoreNames.contains('aiAutonomousWork')) {
          const workStore = db.createObjectStore('aiAutonomousWork', { keyPath: 'id' });
          workStore.createIndex('mysteryId', 'mysteryId', { unique: false });
          workStore.createIndex('type', 'type', { unique: false });
          workStore.createIndex('status', 'status', { unique: false });
          workStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }
    });

    console.log('IndexedDB initialized');
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

/**
 * Save campaign to IndexedDB
 */
export async function saveCampaign(campaign) {
  const db = await initDB();

  const campaignData = {
    ...campaign,
    lastModified: Date.now()
  };

  try {
    await db.put(STORES.campaigns, campaignData);
    console.log('Campaign saved:', campaign.id);
    return campaignData;
  } catch (error) {
    console.error('Failed to save campaign:', error);
    throw error;
  }
}

/**
 * Load campaign from IndexedDB
 */
export async function loadCampaign(id) {
  const db = await initDB();

  try {
    const campaign = await db.get(STORES.campaigns, id);
    if (campaign) {
      console.log('Campaign loaded:', id);
      return campaign;
    }
    return null;
  } catch (error) {
    console.error('Failed to load campaign:', error);
    throw error;
  }
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns() {
  const db = await initDB();

  try {
    const campaigns = await db.getAll(STORES.campaigns);
    return campaigns.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Failed to get campaigns:', error);
    throw error;
  }
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id) {
  const db = await initDB();

  try {
    await db.delete(STORES.campaigns, id);
    console.log('Campaign deleted:', id);
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    throw error;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem('motw-settings', JSON.stringify(settings));
    console.log('Settings saved');
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Load settings from localStorage
 */
export function loadSettings() {
  try {
    const data = localStorage.getItem('motw-settings');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

/**
 * Check storage quota
 */
export async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage / estimate.quota) * 100;

    console.log('Storage usage:', {
      used: formatBytes(estimate.usage),
      total: formatBytes(estimate.quota),
      percent: percentUsed.toFixed(2) + '%'
    });

    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed
    };
  }
  return null;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Export campaign as JSON
 */
export async function exportCampaignJSON(campaignId) {
  const campaign = await loadCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const json = JSON.stringify(campaign, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `campaign-${campaign.name}-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  console.log('Campaign exported:', campaignId);
}

/**
 * Import campaign from JSON
 */
export async function importCampaignJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const campaign = JSON.parse(e.target.result);

        // Validate campaign structure
        if (!campaign.id || !campaign.name) {
          throw new Error('Invalid campaign format');
        }

        // Save to IndexedDB
        await saveCampaign(campaign);
        resolve(campaign);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
