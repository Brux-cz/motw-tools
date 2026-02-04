/**
 * Main Application Entry Point
 */

// Import modules
import { initDB, getAllCampaigns, loadCampaign } from './modules/state/storage.js';
import { subscribe, getState, setState, createNewCampaign } from './modules/state/store.js';
import { initTabs, switchTab } from './modules/ui/tabs.js';
import { initFooter, renderHuntersCollapsed, renderActiveHunter, renderHunterTabs } from './modules/ui/footer.js';
import { initTimeline } from './modules/ui/timeline.js';
import { initTooltips } from './modules/ui/tooltips.js';
import { renderSessionTab } from './modules/tabs/session.js';
import { $, $$ } from './utils/dom.js';

/**
 * Initialize application
 */
async function init() {
  console.log('🎲 Initializing Strážcovský panel...');

  try {
    // Initialize IndexedDB
    await initDB();
    console.log('✓ Database initialized');

    // Initialize UI components
    initTabs();
    initFooter();
    initTooltips();

    // Initialize header buttons
    initHeaderButtons();

    console.log('✓ UI components initialized');

    // Subscribe to state changes
    subscribe((newState, oldState) => {
      console.log('State changed:', { newState, oldState });

      // Update UI when campaign changes
      if (newState.campaign !== oldState.campaign) {
        updateCampaignUI(newState.campaign);
      }

      // Update footer when hunters change
      if (newState.campaign?.hunters !== oldState.campaign?.hunters) {
        renderHuntersCollapsed();
        renderHunterTabs();
        renderActiveHunter();
      }
    });

    // Try to load existing campaign, or create demo campaign
    await loadOrCreateCampaign();

    // Render session tab
    renderSessionTab();

    // Switch to session tab
    switchTab('session');

    // Render footer hunters after session tab is rendered
    renderHuntersCollapsed();
    renderHunterTabs();
    renderActiveHunter();

    // Add beforeunload handler for saving on window close
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('✓ Application initialized');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showErrorMessage('Nepodařilo se načíst aplikaci. Zkuste obnovit stránku.');
  }
}

/**
 * Update campaign UI
 */
function updateCampaignUI(campaign) {
  if (!campaign) return;

  // Update header
  const campaignNameEl = $('#campaign-name');
  if (campaignNameEl) {
    campaignNameEl.textContent = campaign.name;
  }
}

/**
 * Load existing campaign or create demo campaign
 */
async function loadOrCreateCampaign() {
  try {
    // Try to get all campaigns from IndexedDB
    const campaigns = await getAllCampaigns();

    if (campaigns && campaigns.length > 0) {
      // Load the most recently modified campaign
      const latestCampaign = campaigns.sort((a, b) => b.lastModified - a.lastModified)[0];
      console.log('Loading existing campaign:', latestCampaign.name);

      setState({
        campaign: latestCampaign,
        currentMysteryId: latestCampaign.mysteries?.[0]?.id || null
      });
    } else {
      // No campaigns exist, create demo campaign
      console.log('No existing campaigns, creating demo campaign');
      createDemoCampaign();
    }
  } catch (error) {
    console.error('Failed to load campaigns, creating demo campaign:', error);
    createDemoCampaign();
  }
}

/**
 * Create demo campaign (temporary)
 */
function createDemoCampaign() {
  const campaign = createNewCampaign('Pine Woods Horror');

  // Add demo hunters
  campaign.hunters = [
    {
      id: 'hunter-1',
      name: 'Sam Winchester',
      playbook: 'The Professional',
      stats: { charm: 1, cool: 2, sharp: 3, tough: -1, weird: 0 },
      harm: 2,
      luck: 5,
      experience: 1,
      gear: [],
      conditions: [],
      moves: [],
      improvements: []
    },
    {
      id: 'hunter-2',
      name: 'Dean Winchester',
      playbook: 'The Wronged',
      stats: { charm: 0, cool: 2, sharp: 1, tough: 3, weird: -1 },
      harm: 3,
      luck: 6,
      experience: 0,
      gear: [],
      conditions: [],
      moves: [],
      improvements: []
    },
    {
      id: 'hunter-3',
      name: 'Castiel',
      playbook: 'The Divine',
      stats: { charm: -1, cool: 1, sharp: 0, tough: 2, weird: 3 },
      harm: 0,
      luck: 7,
      experience: 2,
      gear: [],
      conditions: [],
      moves: [],
      improvements: []
    }
  ];

  // Add demo mystery
  const mystery = {
    id: 'mystery-1',
    name: 'Hollow Creek Disappearances',
    status: 'active',
    hook: 'Teenagers are vanishing in the woods around Hollow Creek. Local authorities are baffled.',
    monster: {
      id: 'monster-1',
      name: 'Rev. Silas Thorne',
      type: 'Sorcerer',
      motivation: 'Gain supernatural power',
      description: 'Former minister turned to dark magic, seeks immortality',
      powers: ['Magic', 'Mind Control', 'Telekinesis'],
      attack: { description: 'Dark energy blast', harm: 3, range: 'close' },
      harm: 10,
      currentHarm: 3,
      armor: 1,
      weakness: 'Break his staff of power'
    },
    bystanders: [
      {
        id: 'npc-1',
        name: 'Dave Holloway',
        type: 'Gossip',
        motivation: 'Spread rumors',
        description: 'Bartender at Rusty Nail, knows everyone\'s business'
      },
      {
        id: 'npc-2',
        name: 'Sheriff Morgan',
        type: 'Official',
        motivation: 'Maintain order',
        description: 'Small-town sheriff, skeptical of supernatural'
      }
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Rusty Nail Bar',
        type: 'Crossroads',
        motivation: 'Bring people together',
        description: 'Only bar in town, gossip central'
      }
    ],
    countdown: {
      structure: 'escalation',
      currentPhase: 2,
      phases: [
        { day: 'Day', description: 'First teenager goes missing from campsite' },
        { day: 'Shadows', description: 'Second victim taken near the old church ruins' },
        { day: 'Sunset', description: 'Silas performs ritual, gains more power' },
        { day: 'Dusk', description: 'Mass disappearance at high school football game' },
        { day: 'Nightfall', description: 'Silas opens portal to shadow realm' },
        { day: 'Midnight', description: 'Portal fully open, shadow creatures flood town' }
      ]
    }
  };

  campaign.mysteries = [mystery];

  // Add sessionLog to campaign object
  campaign.sessionLog = [
    { timestamp: Date.now() - 3600000, text: 'Session started' },
    { timestamp: Date.now() - 1800000, text: 'Hunters arrived in Hollow Creek' },
    { timestamp: Date.now() - 900000, text: 'Interviewed Dave at the bar' }
  ];

  setState({
    campaign,
    currentMysteryId: mystery.id
  });
  console.log('Demo campaign created with mystery');
}

/**
 * Initialize header buttons
 */
function initHeaderButtons() {
  // New Element button
  const btnNewElement = $('#btn-new-element');
  if (btnNewElement) {
    btnNewElement.addEventListener('click', handleNewElement);
  }

  // Settings button
  const btnSettings = $('#btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', handleSettings);
  }
}

/**
 * Handle New Element button
 */
function handleNewElement() {
  import('./modules/ui/mystery-wizard.js').then(({ showMysteryWizard }) => {
    showMysteryWizard();
  }).catch(error => {
    console.error('Failed to load mystery wizard:', error);
    alert('Nepodařilo se načíst průvodce vytvořením záhady');
  });
}

/**
 * Handle Settings button
 */
function handleSettings() {
  // TODO: Implement settings modal
  console.log('Settings button clicked - modal to be implemented');
  alert('Nastavení bude implementováno v další verzi');
}

/**
 * Handle beforeunload - save campaign before closing window
 */
function handleBeforeUnload(e) {
  const state = getState();
  if (state.campaign) {
    // Trigger auto-save immediately
    // Note: async operations might not complete in time, but we try
    import('./modules/state/storage.js').then(({ saveCampaign }) => {
      saveCampaign(state.campaign);
    });
  }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 border border-red-700 text-white px-6 py-3 rounded-lg shadow-xl z-50';
  errorDiv.textContent = message;

  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
if (typeof window !== 'undefined') {
  window.__MOTW__ = {
    getState,
    setState,
    switchTab,
    initTimeline,
    renderSessionTab
  };
}
