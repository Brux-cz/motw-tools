/**
 * State Store - Central state management with observer pattern
 */

import { saveCampaign, loadCampaign } from './storage.js';

// Initial state
const initialState = {
  campaign: null,
  currentMysteryId: null,
  currentTab: 'session',
  sessionLog: [],
  isFooterExpanded: false,
  activeHunterId: null,
  hunterUIState: {},
  aiTyping: false,
  currentConversationId: null,
  lastUserActivity: Date.now(),
  settings: {
    autoSave: true,
    autoSaveDelay: 500,
    ai: {
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4000,
      autoActions: true,
      requireConfirmation: false,
      maxHistoryMessages: 50
    }
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
  // Deep copy campaign to prevent direct mutations
  return {
    ...state,
    campaign: state.campaign ? JSON.parse(JSON.stringify(state.campaign)) : null
  };
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
    stories: [],
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

  const newMystery = {
    ...mystery,
    id: generateId()
  };

  const mysteries = [...state.campaign.mysteries, newMystery];
  updateCampaign({ mysteries });
}

/**
 * Update mystery in campaign
 */
export function updateMystery(mysteryId, updates) {
  if (!state.campaign) return;

  const mysteries = state.campaign.mysteries.map(m =>
    m.id === mysteryId ? { ...m, ...updates } : m
  );
  updateCampaign({ mysteries });
}

/**
 * Validate mystery structure
 */
export function validateMystery(mystery) {
  const errors = [];
  const warnings = [];

  // Critical: Monster must have weakness
  if (!mystery.monster?.weakness || mystery.monster.weakness.trim().length === 0) {
    errors.push('KRITICKÉ: Příšera musí mít definovanou slabinu!');
  }

  // Countdown must have exactly 6 phases
  if (!mystery.countdown?.phases || mystery.countdown.phases.length !== 6) {
    errors.push('Odpočet musí mít přesně 6 fází');
  }

  // Check if all countdown phases have descriptions
  if (mystery.countdown?.phases) {
    mystery.countdown.phases.forEach((phase, index) => {
      if (!phase.description || phase.description.trim().length === 0) {
        warnings.push(`Fáze ${index + 1} (${phase.day}) nemá popis`);
      }
    });
  }

  // Recommend at least 2 bystanders
  if (!mystery.bystanders || mystery.bystanders.length < 2) {
    warnings.push('Doporučeno minimálně 2 NPC (přihlížející)');
  }

  // Hook should not be too short
  if (!mystery.hook || mystery.hook.trim().length < 10) {
    warnings.push('Návnada je příliš krátká nebo chybí');
  }

  // Monster should have description
  if (!mystery.monster?.description || mystery.monster.description.trim().length === 0) {
    warnings.push('Příšera by měla mít popis');
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Advance countdown to next phase
 */
export function advanceCountdown(mysteryId, reason = 'Postup událostí') {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) return;

  const currentPhase = mystery.countdown.currentPhase || 0;
  const maxPhase = mystery.countdown.phases.length - 1;

  if (currentPhase >= maxPhase) {
    console.warn('Countdown is already at Midnight');
    return;
  }

  // Initialize history if it doesn't exist
  const history = mystery.countdown.history || [];
  history.push({
    timestamp: Date.now(),
    fromPhase: currentPhase,
    toPhase: currentPhase + 1,
    reason
  });

  updateMystery(mysteryId, {
    countdown: {
      ...mystery.countdown,
      currentPhase: currentPhase + 1,
      history
    }
  });
}

/**
 * Set countdown to specific phase
 */
export function setCountdownPhase(mysteryId, phase, reason = 'Ruční změna') {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) return;

  const maxPhase = mystery.countdown.phases.length - 1;
  if (phase < 0 || phase > maxPhase) {
    console.warn(`Invalid phase: ${phase}`);
    return;
  }

  const currentPhase = mystery.countdown.currentPhase || 0;

  // Initialize history if it doesn't exist
  const history = mystery.countdown.history || [];
  history.push({
    timestamp: Date.now(),
    fromPhase: currentPhase,
    toPhase: phase,
    reason
  });

  updateMystery(mysteryId, {
    countdown: {
      ...mystery.countdown,
      currentPhase: phase,
      history
    }
  });
}

/**
 * Add custom move to mystery
 */
export function addCustomMove(mysteryId, customMove) {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) return;

  const customMoves = mystery.customMoves || [];
  customMoves.push({
    ...customMove,
    id: generateId(),
    createdAt: Date.now()
  });

  updateMystery(mysteryId, { customMoves });
}

/**
 * Remove custom move from mystery
 */
export function removeCustomMove(mysteryId, moveId) {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) return;

  const customMoves = (mystery.customMoves || []).filter(m => m.id !== moveId);

  updateMystery(mysteryId, { customMoves });
}

/**
 * Set current mystery
 */
export function setCurrentMystery(mysteryId) {
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (mystery) {
    setState({ currentMysteryId: mysteryId });
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
function generateId(prefix = '') {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Set active hunter
 */
export function setActiveHunter(hunterId) {
  setState({ activeHunterId: hunterId });
}

/**
 * Load hunter UI state from localStorage
 */
export function loadHunterUIState(hunterId) {
  const { campaign } = state;
  if (!campaign) return getDefaultHunterUIState();

  const key = `motw-hunter-ui-${campaign.id}`;
  try {
    const allStates = JSON.parse(localStorage.getItem(key) || '{}');
    return allStates[hunterId] || getDefaultHunterUIState();
  } catch (error) {
    console.error('Failed to load hunter UI state:', error);
    return getDefaultHunterUIState();
  }
}

/**
 * Save hunter UI state to localStorage
 */
export function saveHunterUIState(hunterId, uiState) {
  const { campaign } = state;
  if (!campaign) return;

  const key = `motw-hunter-ui-${campaign.id}`;
  try {
    const allStates = JSON.parse(localStorage.getItem(key) || '{}');
    allStates[hunterId] = uiState;
    localStorage.setItem(key, JSON.stringify(allStates));
  } catch (error) {
    console.error('Failed to save hunter UI state:', error);
  }
}

/**
 * Get default hunter UI state
 */
function getDefaultHunterUIState() {
  return {
    sectionsCollapsed: {
      gear: false,
      moves: true,
      storyTags: true
    }
  };
}

/**
 * Update hunter in campaign (immutable)
 */
export function updateHunterInCampaign(hunterId, updates) {
  const { campaign } = state;
  if (!campaign) return;

  const updatedHunters = campaign.hunters.map(h =>
    h.id === hunterId ? { ...h, ...updates } : h
  );

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
}

/**
 * Get settings
 */
export function getSettings() {
  return state.settings || initialState.settings;
}

/**
 * Update settings
 */
export function updateSettings(updates) {
  const newSettings = { ...state.settings, ...updates };
  setState({ settings: newSettings });

  // Save to storage
  import('./storage.js').then(({ saveSettings }) => {
    saveSettings(newSettings);
  });
}

/**
 * Update last activity time
 */
export function updateLastActivity() {
  setState({ lastUserActivity: Date.now() });
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
