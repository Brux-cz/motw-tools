/**
 * Hunter Footer Management
 */

import { setState, getState } from '../state/store.js';

/**
 * Initialize footer functionality
 */
export function initFooter() {
  const toggleBtn = document.getElementById('footer-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleFooter);
  }

  // Collapsed hunter items - expand on click
  document.querySelectorAll('[data-hunter-index]').forEach(item => {
    item.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.hunterIndex);
      expandSpecific(index);
    });
  });

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
  const grid = document.querySelector('.app-grid');

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
    if (grid) {
      grid.style.gridTemplateRows = '60px 1fr 48px';
    }
  } else {
    // Expand
    footer.style.height = '300px';
    collapsed.classList.add('hidden');
    expanded.classList.remove('hidden');
    chevron.textContent = 'expand_more';
    if (grid) {
      grid.style.gridTemplateRows = '60px 1fr 300px';
    }
  }

  setState({ isFooterExpanded: !isFooterExpanded });
}

/**
 * Expand footer and scroll to specific hunter
 */
export function expandSpecific(index) {
  const { isFooterExpanded } = getState();

  if (!isFooterExpanded) {
    toggleFooter();
  }

  // TODO: Scroll to specific hunter section
  console.log('Expand to hunter:', index);
}

/**
 * Render hunters in footer (collapsed view)
 */
export function renderHuntersCollapsed() {
  const { campaign } = getState();
  if (!campaign || !campaign.hunters) return;

  const container = document.getElementById('footer-collapsed');
  if (!container) return;

  const huntersHTML = campaign.hunters.map((hunter, index) => `
    <div class="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-3 py-1 rounded transition" data-hunter-index="${index}">
      <span class="material-symbols-outlined text-gray-400">person</span>
      <span class="text-xs font-semibold text-gray-300">${hunter.name || `Hunter ${index + 1}`}</span>
      <div class="flex gap-1">
        <span class="text-[10px] text-red-500" title="Harm">${hunter.harm || 0}/7</span>
        <span class="text-[10px] text-blue-500" title="Luck">${hunter.luck || 7}/7</span>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="h-[48px] flex items-center justify-between px-6">
      <div class="flex items-center gap-6">
        ${huntersHTML || '<span class="text-xs text-gray-500">No hunters yet</span>'}
      </div>
      <button id="btn-add-hunter" class="text-gray-400 hover:text-white transition">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>
  `;

  // Re-attach event listeners
  container.querySelectorAll('[data-hunter-index]').forEach(item => {
    item.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.hunterIndex);
      expandSpecific(index);
    });
  });
}

/**
 * Render hunters in footer (expanded view)
 */
export function renderHuntersExpanded() {
  const { campaign } = getState();
  if (!campaign || !campaign.hunters) return;

  const container = document.getElementById('footer-expanded');
  if (!container) return;

  const huntersHTML = campaign.hunters.map((hunter, index) => `
    <div class="border-b border-white/5 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-gray-400">person</span>
          <div>
            <h4 class="font-semibold text-gray-200">${hunter.name || `Hunter ${index + 1}`}</h4>
            <span class="text-xs text-gray-500">${hunter.playbook || 'Unknown Playbook'}</span>
          </div>
        </div>
        <button class="text-gray-400 hover:text-red-500 transition">
          <span class="material-symbols-outlined">edit</span>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Harm -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">Harm (${hunter.harm || 0}/7)</div>
          <div class="flex gap-1">
            ${Array.from({ length: 7 }, (_, i) => `
              <div class="harm-box ${i < (hunter.harm || 0) ? 'harm-box-filled' : ''}" data-hunter="${hunter.id}" data-type="harm" data-index="${i}"></div>
            `).join('')}
          </div>
        </div>

        <!-- Luck -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">Luck (${hunter.luck || 7}/7)</div>
          <div class="flex gap-1">
            ${Array.from({ length: 7 }, (_, i) => `
              <div class="luck-box ${i < (hunter.luck || 7) ? 'luck-box-filled' : ''}" data-hunter="${hunter.id}" data-type="luck" data-index="${i}"></div>
            `).join('')}
          </div>
        </div>

        <!-- XP -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">XP (${hunter.experience || 0}/5)</div>
          <div class="flex items-center gap-2">
            <button class="xp-decrement text-gray-400 hover:text-red-500 transition" data-hunter="${hunter.id}">
              <span class="material-symbols-outlined text-lg">remove</span>
            </button>
            <div class="text-2xl font-bold text-green-500 min-w-[2rem] text-center">${hunter.experience || 0}</div>
            <button class="xp-increment text-gray-400 hover:text-green-500 transition" data-hunter="${hunter.id}">
              <span class="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="h-[300px] overflow-y-auto">
      ${huntersHTML || '<div class="p-6 text-center text-gray-500">No hunters yet</div>'}
    </div>
  `;

  // Attach event listeners to harm/luck/xp
  initHarmLuckHandlers();
}

/**
 * Initialize harm/luck/xp click handlers
 */
function initHarmLuckHandlers() {
  // Harm boxes
  document.querySelectorAll('.harm-box').forEach(box => {
    box.addEventListener('click', (e) => {
      const hunterId = e.target.dataset.hunter;
      const index = parseInt(e.target.dataset.index);
      toggleHarm(hunterId, index);
    });
  });

  // Luck boxes
  document.querySelectorAll('.luck-box').forEach(box => {
    box.addEventListener('click', (e) => {
      const hunterId = e.target.dataset.hunter;
      const index = parseInt(e.target.dataset.index);
      toggleLuck(hunterId, index);
    });
  });

  // XP increment
  document.querySelectorAll('.xp-increment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hunterId = e.currentTarget.dataset.hunter;
      modifyXP(hunterId, 1);
    });
  });

  // XP decrement
  document.querySelectorAll('.xp-decrement').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hunterId = e.currentTarget.dataset.hunter;
      modifyXP(hunterId, -1);
    });
  });
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

  // If clicking on the first empty box, increment harm
  if (clickedIndex === currentHarm) {
    hunter.harm = Math.min(7, currentHarm + 1);
  }
  // If clicking on a filled box, decrement to that position
  else if (clickedIndex < currentHarm) {
    hunter.harm = clickedIndex;
  }

  setState({ campaign });
  renderHuntersExpanded();
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

  // If clicking on the last filled box, decrement luck
  if (clickedIndex === currentLuck - 1) {
    hunter.luck = Math.max(0, currentLuck - 1);
  }
  // If clicking on an empty box, increment to that position + 1
  else if (clickedIndex >= currentLuck) {
    hunter.luck = Math.min(7, clickedIndex + 1);
  }

  setState({ campaign });
  renderHuntersExpanded();
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
  hunter.experience = Math.max(0, Math.min(5, currentXP + delta));

  // If XP reaches 5, level up (reset to 0 and advance playbook)
  if (hunter.experience === 5 && delta > 0) {
    // TODO: Trigger level up modal
    console.log('Level up!', hunter.name);
  }

  setState({ campaign });
  renderHuntersExpanded();
  renderHuntersCollapsed();
}
