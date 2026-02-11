/**
 * Tab Management
 */

import { setState, getState } from '../state/store.js';
import { renderRulesTab } from '../tabs/rules.js';

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
  } else if (tabId === 'gm') {
    import('./gm/gm-panel.js').then(({ renderGMPanel, attachGMPanelListeners }) => {
      const container = document.getElementById('gm-tab-content');
      if (container) {
        container.innerHTML = renderGMPanel();
        attachGMPanelListeners();
      }
    });
  } else if (tabId === 'prompt-lab') {
    import('../tabs/prompt-lab.js').then(({ renderPromptLabTab }) => {
      renderPromptLabTab(document.getElementById('prompt-lab-content'));
    });
  } else if (tabId === 'campaign') {
    import('../tabs/campaign.js').then(({ renderCampaignTab }) => {
      renderCampaignTab();
    });
  } else if (tabId === 'generator') {
    import('../generator/generator-tab.js').then(({ renderGeneratorTab }) => {
      renderGeneratorTab();
    });
  }

  console.log('Switched to tab:', tabId);
}
