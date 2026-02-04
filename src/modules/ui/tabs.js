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
  }

  console.log('Switched to tab:', tabId);
}
