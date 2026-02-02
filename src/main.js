/**
 * Main Application Entry Point
 */

// Import modules
import { initDB } from './modules/state/storage.js';
import { subscribe, getState, setState, createNewCampaign } from './modules/state/store.js';
import { initTabs, switchTab } from './modules/ui/tabs.js';
import { initFooter, renderHuntersCollapsed, renderHuntersExpanded } from './modules/ui/footer.js';
import { initTimeline } from './modules/ui/timeline.js';
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
        renderHuntersExpanded();
      }
    });

    // Create demo campaign (temporary - for testing)
    createDemoCampaign();

    // Render session tab
    renderSessionTab();

    // Switch to session tab
    switchTab('session');

    // Render footer hunters after session tab is rendered
    renderHuntersCollapsed();
    renderHuntersExpanded();

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
 * Create demo campaign (temporary)
 */
function createDemoCampaign() {
  const campaign = createNewCampaign('Pine Woods Horror');

  // Add demo hunters
  campaign.hunters = [
    {
      id: 'hunter-1',
      name: 'Sam Winchester',
      playbook: 'Professional',
      harm: 2,
      luck: 5,
      experience: 1
    },
    {
      id: 'hunter-2',
      name: 'Dean Winchester',
      playbook: 'Wronged',
      harm: 3,
      luck: 6,
      experience: 0
    },
    {
      id: 'hunter-3',
      name: 'Castiel',
      playbook: 'Divine',
      harm: 0,
      luck: 7,
      experience: 2
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

  setState({
    campaign,
    currentMysteryId: mystery.id,
    sessionLog: [
      { timestamp: Date.now() - 3600000, text: 'Session started' },
      { timestamp: Date.now() - 1800000, text: 'Hunters arrived in Hollow Creek' },
      { timestamp: Date.now() - 900000, text: 'Interviewed Dave at the bar' }
    ]
  });
  console.log('Demo campaign created with mystery');
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
