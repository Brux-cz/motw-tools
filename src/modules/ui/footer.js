/**
 * Hunter Footer Management - Professional Redesign
 * Tabbed navigation, collapsible sections, inline editing
 */

import { setState, getState, setActiveHunter, loadHunterUIState, saveHunterUIState, updateHunterInCampaign } from '../state/store.js';
import { showModal, hideModal } from './modals.js';
import { escapeHtml } from '../../utils/html.js';
import { generateId } from '../../utils/id.js';

/**
 * Initialize footer functionality
 */
export function initFooter() {
  const toggleBtn = document.getElementById('footer-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleFooter);
  }

  // Initialize event delegation
  initFooterEventDelegation();

  // Set initial active hunter (first hunter)
  const { campaign } = getState();
  if (campaign && campaign.hunters && campaign.hunters.length > 0) {
    setActiveHunter(campaign.hunters[0].id);
  }

  // Render initial state
  renderHunterTabs();
  renderActiveHunter();
  renderHuntersCollapsed();

  console.log('Footer initialized');
}

/**
 * Toggle footer expanded/collapsed
 */
export function toggleFooter() {
  const { isFooterExpanded } = getState();

  const footer = document.getElementById('hunter-footer');
  const collapsed = document.getElementById('footer-collapsed');
  const expanded = document.getElementById('footer-expanded');
  const chevron = document.getElementById('footer-chevron');

  if (!footer || !collapsed || !expanded || !chevron) {
    console.error('Footer elements not found');
    return;
  }

  if (isFooterExpanded) {
    // Collapse
    footer.style.height = '48px';
    collapsed.classList.remove('hidden');
    expanded.classList.add('hidden');
    chevron.textContent = 'expand_less';
    updateGridLayout('48px');
  } else {
    // Expand
    collapsed.classList.add('hidden');
    expanded.classList.remove('hidden');
    chevron.textContent = 'expand_more';
    updateFooterHeight();
  }

  setState({ isFooterExpanded: !isFooterExpanded });
}

/**
 * Update grid layout with footer height
 */
function updateGridLayout(height) {
  const grid = document.querySelector('.app-grid');
  if (grid) {
    grid.style.gridTemplateRows = `60px 1fr ${height}`;
  }
}

/**
 * Update footer height dynamically based on content
 */
function updateFooterHeight() {
  const { activeHunterId } = getState();
  const footer = document.getElementById('hunter-footer');

  if (!footer || !activeHunterId) {
    updateGridLayout('200px');
    footer.style.height = '200px';
    return;
  }

  // Calculate needed height
  const tabsHeight = 45;
  const alwaysVisibleHeight = 180;

  // Calculate collapsible content height
  const uiState = loadHunterUIState(activeHunterId);
  let contentHeight = 60; // Section headers

  if (!uiState.sectionsCollapsed.gear) {
    const { campaign } = getState();
    const hunter = campaign.hunters.find(h => h.id === activeHunterId);
    const gearCount = hunter?.gear?.length || 0;
    contentHeight += Math.min(200, 40 + gearCount * 60);
  }

  if (!uiState.sectionsCollapsed.moves) {
    contentHeight += 120;
  }

  if (!uiState.sectionsCollapsed.storyTags) {
    const { campaign } = getState();
    const hunter = campaign.hunters.find(h => h.id === activeHunterId);
    const tagCount = (hunter?.conditions || []).filter(c => c.type === 'story').length;
    contentHeight += Math.min(150, 40 + tagCount * 40);
  }

  const totalHeight = Math.min(
    tabsHeight + alwaysVisibleHeight + contentHeight + 40,
    500
  );

  footer.style.height = `${totalHeight}px`;
  updateGridLayout(`${totalHeight}px`);
}

/**
 * Render hunter tabs
 */
export function renderHunterTabs() {
  const { campaign, activeHunterId } = getState();
  if (!campaign || !campaign.hunters) return;

  const container = document.getElementById('footer-tabs');
  if (!container) return;

  const hunters = campaign.hunters;

  if (hunters.length === 0) {
    container.innerHTML = `
      <div class="text-gray-500 text-xs">No hunters yet</div>
      <button id="btn-add-hunter-tab" class="tab-add">
        <span class="material-symbols-outlined">add</span>
      </button>
    `;
    return;
  }

  const tabsHTML = hunters.map(hunter => {
    const isActive = hunter.id === activeHunterId;
    const activeClass = isActive ? 'tab-item-active' : '';
    const closeable = hunters.length > 1;

    return `
      <div class="tab-item ${activeClass}" data-hunter-id="${hunter.id}">
        <span>${escapeHtml(hunter.name)}</span>
        ${closeable ? `<button class="tab-close" data-hunter-id="${hunter.id}">×</button>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    ${tabsHTML}
    <button id="btn-add-hunter-tab" class="tab-add">
      <span class="material-symbols-outlined">add</span>
    </button>
  `;
}

/**
 * Switch to specific hunter
 */
export function switchToHunter(hunterId) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  setActiveHunter(hunterId);
  renderHunterTabs();
  renderActiveHunter();
  updateFooterHeight();
}

/**
 * Remove hunter from campaign
 */
function handleRemoveHunterTab(hunterId) {
  const { campaign, activeHunterId } = getState();
  if (!campaign) return;

  const hunter = campaign.hunters.find(h => h.id === hunterId);
  const hunterName = hunter?.name || 'this hunter';

  showModal({
    title: 'Remove Hunter?',
    content: `<p class="text-gray-300">Are you sure you want to remove <strong class="text-white">${escapeHtml(hunterName)}</strong>? This cannot be undone.</p>`,
    buttons: [
      { id: 'btn-cancel-remove', label: 'Cancel', primary: false },
      { id: 'btn-confirm-remove', label: 'Remove', primary: true }
    ]
  });

  document.getElementById('btn-cancel-remove')?.addEventListener('click', () => {
    hideModal();
  });

  document.getElementById('btn-confirm-remove')?.addEventListener('click', () => {
    const updatedHunters = campaign.hunters.filter(h => h.id !== hunterId);

    const updatedCampaign = {
      ...campaign,
      hunters: updatedHunters,
      lastModified: Date.now()
    };

    setState({ campaign: updatedCampaign });

    if (hunterId === activeHunterId && updatedHunters.length > 0) {
      setActiveHunter(updatedHunters[0].id);
    }

    renderHunterTabs();
    renderActiveHunter();
    renderHuntersCollapsed();
    hideModal();
  });
}

/**
 * Render active hunter card
 */
export function renderActiveHunter() {
  const { campaign, activeHunterId } = getState();
  if (!campaign || !activeHunterId) {
    renderEmptyState();
    return;
  }

  const hunter = campaign.hunters.find(h => h.id === activeHunterId);
  if (!hunter) {
    renderEmptyState();
    return;
  }

  const container = document.getElementById('footer-hunter-content');
  if (!container) return;

  const uiState = loadHunterUIState(hunter.id);

  container.innerHTML = `
    <div class="hunter-card">
      ${renderHunterHeader(hunter)}
      ${renderStatsBar(hunter.stats || {})}
      ${renderCoreTrackers(hunter)}
      ${renderConditionsBadges(hunter)}

      <div class="collapsible-sections">
        ${renderGearSection(hunter, uiState.sectionsCollapsed.gear)}
        ${renderMovesSection(hunter, uiState.sectionsCollapsed.moves)}
        ${renderStoryTagsSection(hunter, uiState.sectionsCollapsed.storyTags)}
      </div>
    </div>
  `;

  updateFooterHeight();
}

/**
 * Render empty state
 */
function renderEmptyState() {
  const container = document.getElementById('footer-hunter-content');
  if (!container) return;

  container.innerHTML = `
    <div class="hunter-card text-center py-12">
      <span class="material-symbols-outlined text-6xl text-gray-600 mb-4 block">person_off</span>
      <p class="text-gray-400">No hunters in this campaign yet</p>
      <button id="btn-add-hunter-empty" class="mt-4 px-4 py-2 bg-red-900/40 hover:bg-red-800/60 rounded border border-red-700/50 text-sm transition font-semibold">
        <span class="material-symbols-outlined text-sm align-middle mr-1">add</span>
        Add Hunter
      </button>
    </div>
  `;

  document.getElementById('btn-add-hunter-empty')?.addEventListener('click', handleAddHunter);
}

/**
 * Render hunter header
 */
function renderHunterHeader(hunter) {
  return `
    <div class="hunter-header">
      <div class="hunter-title">
        <span class="material-symbols-outlined text-gray-400 text-2xl">person</span>
        <div>
          <div class="hunter-name">${escapeHtml(hunter.name)}</div>
          <div class="hunter-playbook">${escapeHtml(hunter.playbook || 'Unknown')}</div>
        </div>
      </div>
      <div>
        <button class="btn-edit-hunter" data-hunter="${hunter.id}">
          <span class="material-symbols-outlined">edit</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render stats bar
 */
function renderStatsBar(stats) {
  const statNames = {
    charm: { label: 'CHM', full: 'Charm' },
    cool: { label: 'COL', full: 'Cool' },
    sharp: { label: 'SHP', full: 'Sharp' },
    tough: { label: 'TGH', full: 'Tough' },
    weird: { label: 'WRD', full: 'Weird' }
  };

  const statsHTML = Object.entries(statNames).map(([key, { label, full }]) => {
    const value = stats[key] || 0;
    const valueClass = value > 0 ? 'stat-value-positive' : value < 0 ? 'stat-value-negative' : '';
    const displayValue = value >= 0 ? `+${value}` : value;

    return `
      <div class="stat-item" title="${full}">
        <div class="stat-label">${label}</div>
        <div class="stat-value ${valueClass}">${displayValue}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="stats-bar">
      ${statsHTML}
    </div>
  `;
}

/**
 * Render core trackers
 */
function renderCoreTrackers(hunter) {
  const harmBoxes = Array.from({ length: 7 }, (_, i) => {
    const filled = i < (hunter.harm || 0);
    return `<div class="harm-box ${filled ? 'harm-box-filled' : ''}"
                 data-hunter="${hunter.id}"
                 data-type="harm"
                 data-index="${i}"></div>`;
  }).join('');

  const luckBoxes = Array.from({ length: 7 }, (_, i) => {
    const filled = i < (hunter.luck || 7);
    return `<div class="luck-box ${filled ? 'luck-box-filled' : ''}"
                 data-hunter="${hunter.id}"
                 data-type="luck"
                 data-index="${i}"></div>`;
  }).join('');

  return `
    <div class="core-trackers">
      <div class="tracker-item">
        <div class="tracker-label">HARM (${hunter.harm || 0}/7)</div>
        <div class="tracker-boxes">${harmBoxes}</div>
      </div>
      <div class="tracker-item">
        <div class="tracker-label">LUCK (${hunter.luck || 7}/7)</div>
        <div class="tracker-boxes">${luckBoxes}</div>
      </div>
      <div class="tracker-item">
        <div class="tracker-label">XP (${hunter.experience || 0}/5)</div>
        <div class="xp-controls">
          <button class="xp-decrement" data-hunter="${hunter.id}">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <div class="xp-value">${hunter.experience || 0}</div>
          <button class="xp-increment" data-hunter="${hunter.id}">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render conditions badges
 */
function renderConditionsBadges(hunter) {
  const conditions = hunter.conditions || [];
  const gameConditions = conditions.filter(c => c.type === 'game');

  const badgesHTML = gameConditions.map(c => `
    <div class="condition-badge condition-game" data-condition-id="${c.id}">
      <span>${escapeHtml(c.name_cz || c.name)}</span>
      ${c.removable !== false ? `
        <button class="btn-remove-condition"
                data-hunter="${hunter.id}"
                data-condition="${c.id}">×</button>
      ` : ''}
    </div>
  `).join('');

  return `
    <div class="conditions-bar">
      ${badgesHTML}
      <button class="btn-add-condition" data-hunter="${hunter.id}">
        <span class="material-symbols-outlined text-xs">add</span>
        <span>Add</span>
      </button>
    </div>
  `;
}

/**
 * Generic collapsible section renderer
 */
function renderCollapsibleSection(hunterId, sectionType, title, count, content, isCollapsed) {
  return `
    <div class="collapsible-section" data-section="${sectionType}">
      <div class="section-header" data-hunter="${hunterId}" data-toggle="${sectionType}">
        <span class="chevron">${isCollapsed ? '▶' : '▼'}</span>
        <span class="title">${title}</span>
        <span class="count">(${count})</span>
        <button class="btn-add-item" data-type="${sectionType}" data-hunter="${hunterId}">
          [+Add]
        </button>
      </div>
      <div class="section-content ${isCollapsed ? 'collapsed' : ''}">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Toggle section collapsed state
 */
function toggleSection(hunterId, sectionType) {
  const uiState = loadHunterUIState(hunterId);
  uiState.sectionsCollapsed[sectionType] = !uiState.sectionsCollapsed[sectionType];
  saveHunterUIState(hunterId, uiState);

  renderActiveHunter();
}

/**
 * Render gear section
 */
function renderGearSection(hunter, isCollapsed) {
  const gearList = hunter.gear || [];
  const content = gearList.length > 0
    ? gearList.map(item => renderGearItem(item, hunter.id)).join('')
    : '<div class="text-gray-500 text-xs p-2">No gear yet. Click [+Add] to add weapons or equipment.</div>';

  return renderCollapsibleSection(
    hunter.id,
    'gear',
    'Gear & Weapons',
    gearList.length,
    content,
    isCollapsed
  );
}

/**
 * Render single gear item
 */
function renderGearItem(item, hunterId) {
  let icon, stats;

  if (item.type === 'weapon') {
    icon = 'swords';
    const tags = item.tags ? item.tags.join(' ') : '';
    stats = `${item.harm}-harm ${item.range_cz || item.range} ${tags}`;
  } else if (item.type === 'armor') {
    icon = 'shield';
    stats = `${item.armour}-armour`;
  } else {
    icon = 'inventory_2';
    stats = item.description || '';
  }

  return `
    <div class="gear-item" data-gear-id="${item.id}">
      <span class="material-symbols-outlined">${icon}</span>
      <div class="gear-details">
        <div class="gear-name">${escapeHtml(item.name_cz || item.name)}</div>
        <div class="gear-stats">(${stats})</div>
      </div>
      <button class="btn-remove-gear"
              data-hunter="${hunterId}"
              data-gear="${item.id}">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  `;
}

/**
 * Render moves section
 */
function renderMovesSection(hunter, isCollapsed) {
  const moves = hunter.moves || [];

  const content = moves.length > 0
    ? moves.map(move => `
        <div class="move-item">
          <strong>${escapeHtml(move.name)}</strong>
          <div class="text-xs text-gray-500">${escapeHtml(move.description || '')}</div>
        </div>
      `).join('')
    : '<div class="text-gray-500 text-xs p-2">Playbook moves will be implemented in future update.</div>';

  return renderCollapsibleSection(
    hunter.id,
    'moves',
    'Playbook Moves',
    moves.length,
    content,
    isCollapsed
  );
}

/**
 * Render story tags section
 */
function renderStoryTagsSection(hunter, isCollapsed) {
  const conditions = hunter.conditions || [];
  const storyTags = conditions.filter(c => c.type === 'story');

  const content = storyTags.length > 0
    ? storyTags.map(tag => `
        <div class="story-tag" data-tag-id="${tag.id}">
          <span class="material-symbols-outlined">label</span>
          <span>${escapeHtml(tag.name)}</span>
          <button class="btn-remove-tag"
                  data-hunter="${hunter.id}"
                  data-tag="${tag.id}">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      `).join('')
    : '<div class="text-gray-500 text-xs p-2">No story tags yet. Click [+Add] to add custom tags.</div>';

  return renderCollapsibleSection(
    hunter.id,
    'storyTags',
    'Story Tags',
    storyTags.length,
    content,
    isCollapsed
  );
}

/**
 * Render hunters in footer (collapsed view)
 */
export function renderHuntersCollapsed() {
  const { campaign } = getState();
  if (!campaign || !campaign.hunters) return;

  const container = document.getElementById('footer-collapsed');
  if (!container) return;

  const huntersHTML = campaign.hunters.map((hunter, index) => {
    const harm = hunter.harm || 0;
    const luck = hunter.luck !== undefined ? hunter.luck : 7;
    const xp = hunter.experience || 0;

    const isCritical = harm >= 6;
    const isUnlucky = luck === 0;
    const canLevelUp = xp >= 5;

    const warningClasses = [];
    if (isCritical) warningClasses.push('hunter-critical');
    if (isUnlucky) warningClasses.push('hunter-unlucky');
    if (canLevelUp) warningClasses.push('hunter-levelup');

    return `
    <div class="flex items-center gap-4 cursor-pointer hover:bg-white/5 px-4 py-2 rounded-lg transition border border-transparent ${warningClasses.join(' ')}"
         data-hunter-index="${index}"
         data-tooltip="${isCritical ? 'KRITICKÉ ZRANĚNÍ! Lovec je v ohrožení života.' : isUnlucky ? 'Žádné štěstí! Další selhání může být osudné.' : canLevelUp ? 'Připraven k postupu! 5/5 XP' : ''}">
      ${isCritical ? '<span class="material-symbols-outlined text-red-500 animate-pulse-slow absolute -left-1 -top-1">warning</span>' : ''}
      <span class="material-symbols-outlined text-2xl text-gray-400">person</span>
      <div class="flex flex-col gap-0.5 min-w-[120px]">
        <span class="text-sm font-bold text-white">${escapeHtml(hunter.name) || `Hunter ${index + 1}`}</span>
        <span class="text-[10px] text-gray-500 uppercase tracking-wide">${escapeHtml(hunter.playbook) || 'Unknown'}</span>
      </div>
      <div class="flex items-center gap-4 ml-auto">
        <div class="flex items-center gap-1.5" data-tooltip="Zranění: ${harm}/7${isCritical ? '\\nKRITICKÝ STAV!' : ''}">
          <span class="material-symbols-outlined text-base ${isCritical ? 'text-red-500 animate-pulse-slow' : 'text-red-400'}">favorite</span>
          <span class="text-sm font-semibold ${isCritical ? 'text-red-500' : 'text-red-400'}">${harm}</span>
          <span class="text-xs text-gray-600">/7</span>
        </div>
        <div class="flex items-center gap-1.5" data-tooltip="Štěstí: ${luck}/7${isUnlucky ? '\\nŽádné štěstí zbývá!' : ''}">
          <span class="material-symbols-outlined text-base ${isUnlucky ? 'text-amber-500' : 'text-amber-400'}">star</span>
          <span class="text-sm font-semibold ${isUnlucky ? 'text-amber-500' : 'text-amber-400'}">${luck}</span>
          <span class="text-xs text-gray-600">/7</span>
        </div>
        ${canLevelUp ? `
          <div class="flex items-center gap-1" data-tooltip="Připraven k postupu! ${xp}/5 XP">
            <span class="material-symbols-outlined text-base text-amber-400 animate-pulse-slow">grade</span>
          </div>
        ` : ''}
      </div>
    </div>
  `}).join('');

  container.innerHTML = `
    <div class="h-[48px] flex items-center justify-between px-6">
      <div id="hunters-list-collapsed" class="flex items-center gap-6">
        ${huntersHTML || '<span class="text-xs text-gray-500">No hunters yet</span>'}
      </div>
      <button id="btn-add-hunter" class="text-gray-400 hover:text-white transition">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>
  `;

  document.getElementById('btn-add-hunter')?.addEventListener('click', handleAddHunter);

  document.querySelectorAll('[data-hunter-index]').forEach(item => {
    item.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.hunterIndex);
      expandSpecific(index);
    });
  });
}

/**
 * Expand footer and scroll to specific hunter
 */
export function expandSpecific(index) {
  const { isFooterExpanded, campaign } = getState();

  if (!isFooterExpanded) {
    toggleFooter();
  }

  if (campaign && campaign.hunters && campaign.hunters[index]) {
    switchToHunter(campaign.hunters[index].id);
  }
}

/**
 * Initialize footer event delegation
 */
function initFooterEventDelegation() {
  const footer = document.getElementById('hunter-footer');
  if (!footer) return;

  if (footer._delegatedListener) {
    footer.removeEventListener('click', footer._delegatedListener);
  }

  const listener = (e) => {
    // Tab click
    const tab = e.target.closest('.tab-item:not(.tab-close)');
    if (tab && !e.target.closest('.tab-close')) {
      const hunterId = tab.dataset.hunterId;
      switchToHunter(hunterId);
      return;
    }

    // Tab close
    const tabClose = e.target.closest('.tab-close');
    if (tabClose) {
      e.stopPropagation();
      const hunterId = tabClose.dataset.hunterId;
      handleRemoveHunterTab(hunterId);
      return;
    }

    // Add hunter tab
    if (e.target.closest('#btn-add-hunter-tab')) {
      handleAddHunter();
      return;
    }

    // Section toggle
    const sectionHeader = e.target.closest('.section-header:not(.btn-add-item)');
    if (sectionHeader && !e.target.closest('.btn-add-item')) {
      const hunterId = sectionHeader.dataset.hunter;
      const sectionType = sectionHeader.dataset.toggle;
      toggleSection(hunterId, sectionType);
      return;
    }

    // Add item buttons
    const btnAddItem = e.target.closest('.btn-add-item');
    if (btnAddItem) {
      const hunterId = btnAddItem.dataset.hunter;
      const type = btnAddItem.dataset.type;

      if (type === 'gear') handleAddGear(hunterId);
      else if (type === 'moves') {/* Future */}
      else if (type === 'storyTags') handleAddCondition(hunterId);
      return;
    }

    // Remove gear
    const btnRemoveGear = e.target.closest('.btn-remove-gear');
    if (btnRemoveGear) {
      const hunterId = btnRemoveGear.dataset.hunter;
      const gearId = btnRemoveGear.dataset.gear;
      removeGearFromHunter(hunterId, gearId);
      return;
    }

    // Add condition
    const btnAddCondition = e.target.closest('.btn-add-condition');
    if (btnAddCondition) {
      const hunterId = btnAddCondition.dataset.hunter;
      handleAddCondition(hunterId);
      return;
    }

    // Remove condition
    const btnRemoveCondition = e.target.closest('.btn-remove-condition');
    if (btnRemoveCondition) {
      const hunterId = btnRemoveCondition.dataset.hunter;
      const conditionId = btnRemoveCondition.dataset.condition;
      removeConditionFromHunter(hunterId, conditionId);
      return;
    }

    // Remove story tag
    const btnRemoveTag = e.target.closest('.btn-remove-tag');
    if (btnRemoveTag) {
      const hunterId = btnRemoveTag.dataset.hunter;
      const tagId = btnRemoveTag.dataset.tag;
      removeConditionFromHunter(hunterId, tagId);
      return;
    }

    // Harm boxes
    const harmBox = e.target.closest('.harm-box');
    if (harmBox) {
      const hunterId = harmBox.dataset.hunter;
      const index = parseInt(harmBox.dataset.index);
      toggleHarm(hunterId, index);
      return;
    }

    // Luck boxes
    const luckBox = e.target.closest('.luck-box');
    if (luckBox) {
      const hunterId = luckBox.dataset.hunter;
      const index = parseInt(luckBox.dataset.index);
      toggleLuck(hunterId, index);
      return;
    }

    // XP increment
    const xpIncrement = e.target.closest('.xp-increment');
    if (xpIncrement) {
      const hunterId = xpIncrement.dataset.hunter;
      modifyXP(hunterId, 1);
      return;
    }

    // XP decrement
    const xpDecrement = e.target.closest('.xp-decrement');
    if (xpDecrement) {
      const hunterId = xpDecrement.dataset.hunter;
      modifyXP(hunterId, -1);
      return;
    }
  };

  footer.addEventListener('click', listener);
  footer._delegatedListener = listener;
}

/**
 * Toggle harm for hunter
 */
function toggleHarm(hunterId, clickedIndex) {
  const { campaign } = getState();
  if (!campaign) return;

  const hunter = campaign.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const currentHarm = hunter.harm || 0;
  let newHarm = currentHarm;

  if (clickedIndex === currentHarm) {
    newHarm = Math.min(7, currentHarm + 1);
  } else if (clickedIndex < currentHarm) {
    newHarm = clickedIndex;
  }

  updateHunterInCampaign(hunterId, { harm: newHarm });
  renderActiveHunter();
  renderHuntersCollapsed();
}

/**
 * Toggle luck for hunter
 */
function toggleLuck(hunterId, clickedIndex) {
  const { campaign } = getState();
  if (!campaign) return;

  const hunter = campaign.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const currentLuck = hunter.luck || 7;
  let newLuck = currentLuck;

  if (clickedIndex === currentLuck - 1) {
    newLuck = Math.max(0, currentLuck - 1);
  } else if (clickedIndex >= currentLuck) {
    newLuck = Math.min(7, clickedIndex + 1);
  }

  updateHunterInCampaign(hunterId, { luck: newLuck });
  renderActiveHunter();
  renderHuntersCollapsed();
}

/**
 * Modify XP for hunter
 */
function modifyXP(hunterId, delta) {
  const { campaign } = getState();
  if (!campaign) return;

  const hunter = campaign.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const currentXP = hunter.experience || 0;
  const newXP = Math.max(0, Math.min(5, currentXP + delta));

  if (newXP === 5 && delta > 0) {
    console.log('Level up!', hunter.name);
  }

  updateHunterInCampaign(hunterId, { experience: newXP });
  renderActiveHunter();
  renderHuntersCollapsed();
}

/**
 * Handle Add Hunter button
 */
function handleAddHunter() {
  const playbookOptions = [
    'The Chosen', 'The Crooked', 'The Divine', 'The Expert', 'The Flake',
    'The Initiate', 'The Monstrous', 'The Mundane', 'The Professional',
    'The Spell-slinger', 'The Spooky', 'The Wronged'
  ];

  const content = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-gray-300 mb-2">Jméno lovce *</label>
        <input
          type="text"
          id="hunter-name"
          class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50"
          placeholder="např. John Winchester"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-300 mb-2">Playbook *</label>
        <select
          id="hunter-playbook"
          class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50"
        >
          <option value="">Vyber playbook...</option>
          ${playbookOptions.map(pb => `<option value="${pb}">${pb}</option>`).join('')}
        </select>
      </div>

      <div class="grid grid-cols-5 gap-3">
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Charm</label>
          <input type="number" id="hunter-charm" value="0" min="-2" max="3" class="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Cool</label>
          <input type="number" id="hunter-cool" value="0" min="-2" max="3" class="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Sharp</label>
          <input type="number" id="hunter-sharp" value="0" min="-2" max="3" class="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Tough</label>
          <input type="number" id="hunter-tough" value="0" min="-2" max="3" class="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Weird</label>
          <input type="number" id="hunter-weird" value="0" min="-2" max="3" class="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Harm</label>
          <input type="number" id="hunter-harm" value="0" min="0" max="7" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Luck</label>
          <input type="number" id="hunter-luck" value="7" min="0" max="7" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-400 mb-2">Experience</label>
          <input type="number" id="hunter-xp" value="0" min="0" max="5" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-center text-gray-200 focus:outline-none focus:border-red-700/50" />
        </div>
      </div>

      <div class="bg-yellow-900/20 border border-yellow-700/30 rounded p-3">
        <p class="text-xs text-yellow-200">
          <span class="material-symbols-outlined text-sm align-middle mr-1">info</span>
          Výchozí hodnoty: Harm 0/7, Luck 7/7, XP 0/5
        </p>
      </div>
    </div>
  `;

  showModal({
    title: 'Přidat lovce',
    content,
    buttons: [
      { id: 'btn-cancel-hunter', label: 'Zrušit', primary: false },
      { id: 'btn-save-hunter', label: 'Přidat lovce', primary: true }
    ]
  });

  document.getElementById('btn-cancel-hunter')?.addEventListener('click', () => hideModal());

  document.getElementById('btn-save-hunter')?.addEventListener('click', () => {
    const name = document.getElementById('hunter-name')?.value?.trim();
    const playbook = document.getElementById('hunter-playbook')?.value;

    if (!name) {
      alert('Zadej jméno lovce');
      return;
    }

    if (!playbook) {
      alert('Vyber playbook');
      return;
    }

    const newHunter = {
      id: generateId(),
      name,
      playbook,
      stats: {
        charm: parseInt(document.getElementById('hunter-charm')?.value) || 0,
        cool: parseInt(document.getElementById('hunter-cool')?.value) || 0,
        sharp: parseInt(document.getElementById('hunter-sharp')?.value) || 0,
        tough: parseInt(document.getElementById('hunter-tough')?.value) || 0,
        weird: parseInt(document.getElementById('hunter-weird')?.value) || 0
      },
      harm: parseInt(document.getElementById('hunter-harm')?.value) || 0,
      luck: parseInt(document.getElementById('hunter-luck')?.value) || 7,
      experience: parseInt(document.getElementById('hunter-xp')?.value) || 0,
      moves: [],
      gear: [],
      conditions: [],
      improvements: []
    };

    if (newHunter.harm < 0 || newHunter.harm > 7) {
      alert('Harm musí být 0-7');
      return;
    }

    if (newHunter.luck < 0 || newHunter.luck > 7) {
      alert('Luck musí být 0-7');
      return;
    }

    if (newHunter.experience < 0 || newHunter.experience > 5) {
      alert('Experience musí být 0-5');
      return;
    }

    addHunterToCampaign(newHunter);
    hideModal();
  });
}

/**
 * Add hunter to campaign
 */
function addHunterToCampaign(hunter) {
  const { campaign } = getState();
  if (!campaign) return;

  const updatedHunters = [...(campaign.hunters || []), hunter];

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Set as active hunter
  setActiveHunter(hunter.id);

  renderHunterTabs();
  renderActiveHunter();
  renderHuntersCollapsed();

  console.log('Hunter added:', hunter.name);
}

/**
 * Handle add gear button
 */
async function handleAddGear(hunterId) {
  let weapons = [];
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'data/weapons.json');
    if (response.ok) {
      const data = await response.json();
      weapons = data.weapons || [];
    }
  } catch (error) {
    console.error('Failed to load weapons:', error);
  }

  showGearPickerModal(hunterId, weapons);
}

/**
 * Show gear picker modal
 */
function showGearPickerModal(hunterId, weapons) {
  const categories = {};
  weapons.forEach(w => {
    const cat = w.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(w);
  });

  const categoryLabels = {
    firearms: 'Firearms',
    melee: 'Melee',
    explosives: 'Explosives',
    magic: 'Magic',
    improvised: 'Improvised',
    other: 'Other'
  };

  const categoriesHTML = Object.entries(categories).map(([cat, items]) => `
    <div class="gear-category">
      <h4>${categoryLabels[cat] || cat}</h4>
      ${items.map((w, idx) => `
        <button class="weapon-option" data-weapon-cat="${cat}" data-weapon-idx="${idx}">
          <div>
            <strong>${w.name_cz || w.name}</strong>
            <div class="text-xs text-gray-500">${w.harm}-harm ${w.range_cz || w.range} ${w.tags.join(' ')}</div>
          </div>
        </button>
      `).join('')}
    </div>
  `).join('');

  const content = `
    <div class="gear-picker">
      <input type="text"
             id="gear-search"
             class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 mb-4"
             placeholder="Search weapons..." />

      <div class="gear-categories" style="max-height: 400px; overflow-y: auto;">
        ${categoriesHTML}

        <h4>Custom Gear</h4>
        <button id="btn-custom-gear" class="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-left hover:bg-white/10">
          + Add Custom Gear
        </button>
      </div>
    </div>
  `;

  showModal({
    title: 'Add Gear/Weapon',
    content,
    buttons: [
      { id: 'btn-cancel-gear', label: 'Cancel', primary: false }
    ]
  });

  const modal = document.getElementById('modal-overlay');
  modal.querySelectorAll('.weapon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.weaponCat;
      const idx = parseInt(btn.dataset.weaponIdx);
      const weapon = categories[cat][idx];
      if (weapon) {
        addGearToHunter(hunterId, {
          type: 'weapon',
          ...weapon,
          custom: false
        });
        hideModal();
      }
    });
  });

  document.getElementById('btn-custom-gear')?.addEventListener('click', () => {
    hideModal();
    setTimeout(() => showCustomGearModal(hunterId), 100);
  });

  document.getElementById('gear-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    modal.querySelectorAll('.weapon-option').forEach(opt => {
      const text = opt.textContent.toLowerCase();
      opt.style.display = text.includes(query) ? 'block' : 'none';
    });
  });

  document.getElementById('btn-cancel-gear')?.addEventListener('click', () => {
    hideModal();
  });
}

/**
 * Show custom gear creation modal
 */
function showCustomGearModal(hunterId) {
  const content = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-gray-300 mb-2">Type</label>
        <select id="custom-gear-type" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2">
          <option value="weapon">Weapon</option>
          <option value="armor">Armor</option>
          <option value="gear">Gear/Equipment</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-300 mb-2">Name</label>
        <input type="text" id="custom-gear-name" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2" placeholder="e.g., Silver dagger" />
      </div>

      <div id="weapon-fields">
        <label class="block text-sm font-semibold text-gray-300 mb-2">Harm</label>
        <input type="number" id="custom-gear-harm" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2" min="0" max="5" value="2" />

        <label class="block text-sm font-semibold text-gray-300 mb-2 mt-2">Range</label>
        <select id="custom-gear-range" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2">
          <option value="intimate">Intimate (na tělo)</option>
          <option value="hand">Hand (v ruce)</option>
          <option value="close">Close (na blízko)</option>
          <option value="far">Far (daleko)</option>
        </select>

        <label class="block text-sm font-semibold text-gray-300 mb-2 mt-2">Tags (comma separated)</label>
        <input type="text" id="custom-gear-tags" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2" placeholder="e.g., silver, messy, loud" />
      </div>

      <div id="armor-fields" style="display: none;">
        <label class="block text-sm font-semibold text-gray-300 mb-2">Armour</label>
        <input type="number" id="custom-gear-armour" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2" min="0" max="3" value="1" />
      </div>
    </div>
  `;

  showModal({
    title: 'Create Custom Gear',
    content,
    buttons: [
      { id: 'btn-cancel-custom', label: 'Cancel', primary: false },
      { id: 'btn-save-custom', label: 'Add Gear', primary: true }
    ]
  });

  document.getElementById('custom-gear-type')?.addEventListener('change', (e) => {
    const weaponFields = document.getElementById('weapon-fields');
    const armorFields = document.getElementById('armor-fields');
    if (e.target.value === 'weapon') {
      weaponFields.style.display = 'block';
      armorFields.style.display = 'none';
    } else if (e.target.value === 'armor') {
      weaponFields.style.display = 'none';
      armorFields.style.display = 'block';
    } else {
      weaponFields.style.display = 'none';
      armorFields.style.display = 'none';
    }
  });

  document.getElementById('btn-save-custom')?.addEventListener('click', () => {
    const type = document.getElementById('custom-gear-type')?.value;
    const name = document.getElementById('custom-gear-name')?.value?.trim();

    if (!name) {
      alert('Please enter a name');
      return;
    }

    const gearData = {
      type,
      name,
      name_cz: name,
      custom: true
    };

    if (type === 'weapon') {
      gearData.harm = parseInt(document.getElementById('custom-gear-harm')?.value) || 0;
      gearData.range = document.getElementById('custom-gear-range')?.value || 'hand';
      const tagsInput = document.getElementById('custom-gear-tags')?.value || '';
      gearData.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    } else if (type === 'armor') {
      gearData.armour = parseInt(document.getElementById('custom-gear-armour')?.value) || 0;
    }

    addGearToHunter(hunterId, gearData);
    hideModal();
  });

  document.getElementById('btn-cancel-custom')?.addEventListener('click', () => {
    hideModal();
  });
}

/**
 * Add gear to hunter
 */
function addGearToHunter(hunterId, gearData) {
  const { campaign } = getState();
  if (!campaign) return;

  const newGear = {
    id: generateId(),
    ...gearData
  };

  const updatedHunters = campaign.hunters.map(h => {
    if (h.id === hunterId) {
      return {
        ...h,
        gear: [...(h.gear || []), newGear]
      };
    }
    return h;
  });

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  renderActiveHunter();
}

/**
 * Remove gear from hunter
 */
function removeGearFromHunter(hunterId, gearId) {
  const { campaign } = getState();
  if (!campaign) return;

  const updatedHunters = campaign.hunters.map(h => {
    if (h.id === hunterId) {
      return {
        ...h,
        gear: (h.gear || []).filter(g => g.id !== gearId)
      };
    }
    return h;
  });

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  renderActiveHunter();
}

/**
 * Handle add condition/tag button
 */
function handleAddCondition(hunterId) {
  showConditionPickerModal(hunterId);
}

/**
 * Show condition picker modal
 */
function showConditionPickerModal(hunterId) {
  const predefinedConditions = [
    { type: 'game', name: 'Wounded', name_cz: 'Zraněný', effect: '-1 ongoing to physical actions' },
    { type: 'game', name: 'Cursed', name_cz: 'Prokletý', effect: '-1 ongoing to all actions' },
    { type: 'game', name: 'Possessed', name_cz: 'Posedlý', effect: 'No control over actions' },
    { type: 'game', name: 'Poisoned', name_cz: 'Otrávený', effect: 'Takes 1-harm per interval' },
    { type: 'game', name: 'Disoriented', name_cz: 'Dezorientovaný', effect: '-1 to Sharp actions' },
    { type: 'game', name: 'Frightened', name_cz: 'Vyděšený', effect: '-1 to act against source of fear' },
    { type: 'game', name: 'Confused', name_cz: 'Zmatený', effect: 'May act unpredictably' }
  ];

  const conditionsHTML = predefinedConditions.map((c, i) => `
    <button class="condition-option" data-condition-idx="${i}">
      <div>
        <strong class="text-red-400">${c.name_cz}</strong>
        <div class="text-xs text-gray-500">${c.effect}</div>
      </div>
    </button>
  `).join('');

  const content = `
    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-semibold text-gray-300 mb-2">Game Conditions (mechanical effects)</h4>
        <div class="space-y-1" style="max-height: 300px; overflow-y: auto;">
          ${conditionsHTML}
        </div>
      </div>

      <div class="border-t border-white/10 pt-4">
        <h4 class="text-sm font-semibold text-gray-300 mb-2">Story Tag (custom)</h4>
        <input type="text"
               id="custom-tag-input"
               class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 mb-2"
               placeholder="e.g., Owes favor to FBI agent" />
        <button id="btn-add-custom-tag" class="w-full bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-400 hover:bg-red-900/30">
          Add Custom Story Tag
        </button>
      </div>
    </div>
  `;

  showModal({
    title: 'Add Condition/Tag',
    content,
    buttons: [
      { id: 'btn-cancel-condition', label: 'Cancel', primary: false }
    ]
  });

  document.querySelectorAll('.condition-option').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      addConditionToHunter(hunterId, predefinedConditions[idx]);
      hideModal();
    });
  });

  document.getElementById('btn-add-custom-tag')?.addEventListener('click', () => {
    const name = document.getElementById('custom-tag-input')?.value?.trim();
    if (!name) {
      alert('Please enter a tag name');
      return;
    }

    addConditionToHunter(hunterId, {
      type: 'story',
      name,
      effect: null,
      removable: true
    });
    hideModal();
  });

  document.getElementById('btn-cancel-condition')?.addEventListener('click', () => {
    hideModal();
  });
}

/**
 * Add condition to hunter
 */
function addConditionToHunter(hunterId, conditionData) {
  const { campaign } = getState();
  if (!campaign) return;

  const newCondition = {
    id: generateId(),
    ...conditionData,
    removable: true
  };

  const updatedHunters = campaign.hunters.map(h => {
    if (h.id === hunterId) {
      return {
        ...h,
        conditions: [...(h.conditions || []), newCondition]
      };
    }
    return h;
  });

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  renderActiveHunter();
}

/**
 * Remove condition from hunter
 */
function removeConditionFromHunter(hunterId, conditionId) {
  const { campaign } = getState();
  if (!campaign) return;

  const updatedHunters = campaign.hunters.map(h => {
    if (h.id === hunterId) {
      return {
        ...h,
        conditions: (h.conditions || []).filter(c => c.id !== conditionId)
      };
    }
    return h;
  });

  const updatedCampaign = {
    ...campaign,
    hunters: updatedHunters,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  renderActiveHunter();
}
