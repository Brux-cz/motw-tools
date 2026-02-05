/**
 * Tab Management
 */

import { setState, getState } from '../state/store.js';
import { renderRulesTab } from '../tabs/rules.js';
import { renderChatTab } from '../tabs/chat.js';

/**
 * Initialize tab switching
 */
export function initTabs() {
  const tabButtons = document.querySelectorAll('[data-tab]');

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = e.currentTarget.dataset.tab;
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  console.log('Tabs initialized');
}

/**
 * Switch to a specific tab
 */
export function switchTab(tabId) {
  const { currentTab } = getState();

  // P0 #5: Cleanup previous tab before switching
  if (currentTab === 'keeper') {
    import('./keeper/thinking-panel.js').then(({ cleanupThinkingPanel }) => {
      cleanupThinkingPanel();
    });
  }

  // Hide current tab
  const currentTabEl = document.getElementById(`tab-${currentTab}`);
  if (currentTabEl) {
    currentTabEl.classList.add('hidden');
  }

  // Show new tab
  const newTabEl = document.getElementById(`tab-${tabId}`);
  if (newTabEl) {
    newTabEl.classList.remove('hidden');
  }

  // Update sidebar active states
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.remove('sidebar-item-active');
  });

  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('sidebar-item-active');
  }

  // Update state
  setState({ currentTab: tabId });

  // Trigger tab-specific render functions
  if (tabId === 'rules') {
    renderRulesTab();
  } else if (tabId === 'chat') {
    renderChatTab();
  } else if (tabId === 'story') {
    import('./story/story-tab.js').then(({ renderStoryTab }) => {
      renderStoryTab();
    });
  } else if (tabId === 'autonomous') {
    import('./autonomous/dashboard.js').then(({ renderAutonomousDashboard }) => {
      renderAutonomousDashboard();
    });
  } else if (tabId === 'keeper') {
    import('./keeper/thinking-panel.js').then(({ initThinkingPanel }) => {
      initThinkingPanel();
    });
  } else if (tabId === 'gm') {
    import('./gm/gm-panel.js').then(({ renderGMPanel, attachGMPanelListeners }) => {
      const container = document.getElementById('gm-tab-content');
      if (container) {
        container.innerHTML = renderGMPanel();
        attachGMPanelListeners();
      }
    });
  }

  console.log('Switched to tab:', tabId);
}
