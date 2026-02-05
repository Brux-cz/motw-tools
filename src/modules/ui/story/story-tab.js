/**
 * Story Tab - Main story system interface
 */

import { getState, subscribe } from '../../state/store.js';
import { renderContentPool, attachPoolEventListeners } from './content-pool.js';
import { renderStorySpine, attachSpineEventListeners } from './story-spine.js';
import { showAddToPoolModal } from './modals.js';
import { startWhisperer, stopWhisperer } from '../../ai/whisperer/idle-detector.js';

let unsubscribe = null;

/**
 * Render story tab
 */
export function renderStoryTab() {
  const container = document.getElementById('tab-story');
  if (!container) return;

  const { campaign, currentMysteryId } = getState();

  if (!campaign) {
    container.innerHTML = renderNoDataState('campaign', 'Nejprve načti nebo vytvoř kampaň');
    return;
  }

  if (!currentMysteryId) {
    container.innerHTML = renderNoDataState('mystery', 'Nejprve vytvoř nebo vyber záhadu');
    return;
  }

  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);
  if (!mystery) {
    container.innerHTML = renderNoDataState('error', 'Záhada nenalezena');
    return;
  }

  // Render main layout
  container.innerHTML = `
    <div class="story-tab-container h-full flex">
      <!-- Content Pool (left side) -->
      <div class="content-pool-panel w-1/3 border-r border-white/10 overflow-hidden">
        ${renderContentPool(currentMysteryId)}
      </div>

      <!-- Story Spine (right side) -->
      <div class="story-spine-panel w-2/3 overflow-hidden">
        ${renderStorySpine(currentMysteryId)}
      </div>
    </div>
  `;

  // Attach event listeners
  attachPoolEventListeners(currentMysteryId);
  attachSpineEventListeners(currentMysteryId);

  // Start whisperer
  startWhispererForMystery(currentMysteryId);

  // Listen for new whispers
  window.addEventListener('whisper:new', handleNewWhisper);

  // Subscribe to state changes
  if (unsubscribe) {
    unsubscribe();
  }

  unsubscribe = subscribe((newState, oldState) => {
    // Re-render if content pool or spine changed
    if (newState.campaign !== oldState.campaign) {
      const mystery = newState.campaign?.mysteries.find(m => m.id === newState.currentMysteryId);
      const oldMystery = oldState.campaign?.mysteries.find(m => m.id === oldState.currentMysteryId);

      if (mystery && oldMystery) {
        const poolChanged = JSON.stringify(mystery.contentPool) !== JSON.stringify(oldMystery.contentPool);
        const spineChanged = JSON.stringify(mystery.storySpine) !== JSON.stringify(oldMystery.storySpine);

        if (poolChanged || spineChanged) {
          refreshStoryTab();
        }
      }
    }

    // Re-start whisperer if mystery changed
    if (newState.currentMysteryId !== oldState.currentMysteryId) {
      if (newState.currentMysteryId) {
        startWhispererForMystery(newState.currentMysteryId);
      } else {
        stopWhisperer();
      }
    }
  });
}

/**
 * Start whisperer for mystery
 */
function startWhispererForMystery(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) return;

  const whispererSettings = mystery.whispererSettings || {};

  if (whispererSettings.enabled !== false) {
    startWhisperer(mysteryId);
  }
}

/**
 * Handle new whisper event
 */
function handleNewWhisper(event) {
  const { whisper } = event.detail;
  console.log('📨 New whisper received:', whisper);

  // Refresh pool to show new whisper
  const { currentMysteryId } = getState();
  if (currentMysteryId) {
    refreshPool(currentMysteryId);
  }
}

/**
 * Refresh pool display
 */
function refreshPool(mysteryId) {
  const poolPanel = document.querySelector('.content-pool-panel');
  if (poolPanel) {
    poolPanel.innerHTML = renderContentPool(mysteryId);
    attachPoolEventListeners(mysteryId);
  }
}

/**
 * Refresh spine display
 */
function refreshSpine(mysteryId) {
  const spinePanel = document.querySelector('.story-spine-panel');
  if (spinePanel) {
    spinePanel.innerHTML = renderStorySpine(mysteryId);
    attachSpineEventListeners(mysteryId);
  }
}

/**
 * Refresh entire story tab
 */
function refreshStoryTab() {
  const { currentMysteryId } = getState();
  if (currentMysteryId) {
    refreshPool(currentMysteryId);
    refreshSpine(currentMysteryId);
  }
}

/**
 * Render no data state
 */
function renderNoDataState(type, message) {
  const icons = {
    campaign: 'campaign',
    mystery: 'mystery',
    error: 'error'
  };

  return `
    <div class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400">
        <span class="material-symbols-outlined text-6xl mb-4 block">${icons[type] || 'info'}</span>
        <p>${message}</p>
      </div>
    </div>
  `;
}

/**
 * Cleanup on tab change
 */
export function cleanupStoryTab() {
  // Remove whisper listener
  window.removeEventListener('whisper:new', handleNewWhisper);

  // Unsubscribe from state
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // Stop whisperer
  stopWhisperer();
}
