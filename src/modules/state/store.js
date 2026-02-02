/**
 * State Store - Central state management with observer pattern
 */

import { saveCampaign, loadCampaign } from './storage.js';

// Initial state
const initialState = {
  campaign: null,
  currentMystery: null,
  currentTab: 'session',
  isFooterExpanded: false,
  settings: {
    autoSave: true,
    autoSaveDelay: 500
  }
};

let state = { ...initialState };
let listeners = [];
let autoSaveTimeout = null;

/**
 * Subscribe to state changes
 */
export function subscribe(listener) {
  listeners.push(listener);

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

/**
 * Get current state (immutable)
 */
export function getState() {
  return { ...state };
}

/**
 * Update state and notify listeners
 */
export function setState(updates) {
  const oldState = { ...state };
  state = { ...state, ...updates };

  console.log('State updated:', updates);

  // Notify all listeners
  listeners.forEach(listener => {
    try {
      listener(state, oldState);
    } catch (error) {
      console.error('Listener error:', error);
    }
  });

  // Auto-save campaign if enabled
  if (state.settings.autoSave && updates.campaign) {
    scheduleAutoSave();
  }
}

/**
 * Schedule auto-save with debounce
 */
function scheduleAutoSave() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(async () => {
    if (state.campaign) {
      try {
        await saveCampaign(state.campaign);
        console.log('Auto-saved campaign');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, state.settings.autoSaveDelay);
}

/**
 * Load campaign into state
 */
export async function loadCampaignIntoState(campaignId) {
  try {
    const campaign = await loadCampaign(campaignId);
    if (campaign) {
      setState({ campaign });
      return campaign;
    }
    throw new Error('Campaign not found');
  } catch (error) {
    console.error('Failed to load campaign:', error);
    throw error;
  }
}

/**
 * Create new campaign
 */
export function createNewCampaign(name) {
  const campaign = {
    id: generateId(),
    name,
    hunters: [],
    arcs: [],
    mysteries: [],
    npcArchive: [],
    locationArchive: [],
    sessionLog: [],
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  setState({ campaign });
  return campaign;
}

/**
 * Update campaign data
 */
export function updateCampaign(updates) {
  if (!state.campaign) {
    console.warn('No active campaign');
    return;
  }

  const updatedCampaign = {
    ...state.campaign,
    ...updates,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
}

/**
 * Add hunter to campaign
 */
export function addHunter(hunter) {
  if (!state.campaign) return;

  const hunters = [...state.campaign.hunters, { ...hunter, id: generateId() }];
  updateCampaign({ hunters });
}

/**
 * Update hunter
 */
export function updateHunter(hunterId, updates) {
  if (!state.campaign) return;

  const hunters = state.campaign.hunters.map(h =>
    h.id === hunterId ? { ...h, ...updates } : h
  );
  updateCampaign({ hunters });
}

/**
 * Add mystery to campaign
 */
export function addMystery(mystery) {
  if (!state.campaign) return;

  const mysteries = [...state.campaign.mysteries, { ...mystery, id: generateId() }];
  updateCampaign({ mysteries });
}

/**
 * Set current mystery
 */
export function setCurrentMystery(mysteryId) {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (mystery) {
    setState({ currentMystery: mystery });
  }
}

/**
 * Add to NPC archive
 */
export function addNPCToArchive(npc) {
  if (!state.campaign) return;

  const npcArchive = [...state.campaign.npcArchive, { ...npc, id: generateId() }];
  updateCampaign({ npcArchive });
}

/**
 * Add to location archive
 */
export function addLocationToArchive(location) {
  if (!state.campaign) return;

  const locationArchive = [...state.campaign.locationArchive, { ...location, id: generateId() }];
  updateCampaign({ locationArchive });
}

/**
 * Add session log entry
 */
export function addSessionLog(entry) {
  if (!state.campaign) return;

  const sessionLog = [
    ...state.campaign.sessionLog,
    {
      ...entry,
      timestamp: Date.now()
    }
  ];
  updateCampaign({ sessionLog });
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Reset state to initial
 */
export function resetState() {
  state = { ...initialState };
  listeners.forEach(listener => listener(state, initialState));
}

// Export state for debugging
if (typeof window !== 'undefined') {
  window.__MOTW_STATE__ = {
    getState,
    setState,
    subscribe
  };
}
