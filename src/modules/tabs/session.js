/**
 * Session Tab - Live game session interface
 *
 * Layout: 3-column grid
 * - Left: Countdown + Game Log
 * - Middle: Pinned Cards (Monster, NPCs, Locations)
 * - Right: Keeper Panel (moves, weapons)
 */

import { getState, setState, advanceCountdown, setCountdownPhase } from '../state/store.js';
import { $ } from '../../utils/dom.js';
import { showModal, hideModal } from '../ui/modals.js';
import { generateNPC } from '../generators/npc.js';
import { escapeHtml } from '../../utils/html.js';
import { generateId } from '../../utils/id.js';

// JSON Cache for performance optimization with TTL
const dataCache = {
  keeperMoves: { data: null, timestamp: 0, ttl: 300000 }, // 5 min TTL
  hunterMoves: { data: null, timestamp: 0, ttl: 300000 },
  weapons: { data: null, timestamp: 0, ttl: 300000 }
};

/**
 * Render Session Tab
 */
export function renderSessionTab() {
  const container = $('#tab-session');
  if (!container) return;

  const state = getState();
  const currentMystery = state.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  container.innerHTML = `
    <div class="grid grid-cols-12 gap-6 h-full">
      <!-- LEFT COLUMN: Countdown + Game Log -->
      <div class="col-span-3 flex flex-col gap-6">
        ${renderCountdown(currentMystery)}
        ${renderGameLog(state.campaign)}
      </div>

      <!-- MIDDLE COLUMN: Pinned Cards -->
      <div class="col-span-5 flex flex-col gap-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Připnuté karty</h2>
          <div class="flex gap-2">
            <button id="btn-add-card" class="text-xs bg-red-900/40 hover:bg-red-800/60 px-3 py-1 rounded border border-red-700/50 transition">
              + Karta
            </button>
            <button id="btn-generate-npc" class="text-xs bg-gray-700/40 hover:bg-gray-600/60 px-3 py-1 rounded border border-gray-600/50 transition">
              🎲 NPC
            </button>
          </div>
        </div>
        <div id="pinned-cards-container" class="flex-1 overflow-y-auto space-y-4">
          ${renderPinnedCards(currentMystery)}
        </div>
      </div>

      <!-- RIGHT COLUMN: Keeper Panel -->
      <div class="col-span-4 flex flex-col">
        ${renderKeeperPanel()}
      </div>
    </div>
  `;

  // Initialize event listeners
  initSessionEvents();
}

/**
 * Render Countdown Timeline
 */
function renderCountdown(mystery) {
  if (!mystery) {
    return `
      <div class="bg-black/40 border border-white/5 rounded-lg p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Odpočet</h2>
        <p class="text-sm text-gray-500">Žádná aktivní záhada</p>
      </div>
    `;
  }

  const phases = [
    { key: 'day', label: 'Den' },
    { key: 'shadows', label: 'Příšeří' },
    { key: 'sunset', label: 'Západ' },
    { key: 'dusk', label: 'Soumrak' },
    { key: 'nightfall', label: 'Noc' },
    { key: 'midnight', label: 'Půlnoc' }
  ];

  const currentPhase = mystery.countdown?.currentPhase || 0;
  const countdownPhases = mystery.countdown?.phases || [];

  return `
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col">
      <div class="p-4 border-b border-white/5">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Odpočet</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        ${phases.map((phase, index) => {
          const isActive = index === currentPhase;
          const isPast = index < currentPhase;
          const isFuture = index > currentPhase;
          const description = countdownPhases[index]?.description || 'Žádný popis';

          return `
            <details class="countdown-phase w-full rounded border transition ${
                isActive
                  ? 'bg-red-900/30 border-red-700/50 ring-2 ring-red-700/30'
                  : isPast
                  ? 'bg-gray-800/20 border-white/5 opacity-60 line-through'
                  : 'bg-black/20 border-white/5'
              }"
              data-phase-index="${index}"
            >
              <summary class="cursor-pointer p-3 hover:bg-white/5 transition list-none">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm ${isActive ? 'text-red-400' : isPast ? 'text-green-500' : 'text-gray-500'}">
                    ${isPast ? 'check_circle' : isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span class="text-xs font-bold uppercase tracking-wider ${isActive ? 'text-red-300' : isPast ? 'text-gray-600' : 'text-gray-400'}">
                    ${phase.label}
                  </span>
                  ${isActive ? '<span class="ml-auto text-xs text-red-400">● Aktuální</span>' : ''}
                </div>
              </summary>
              <div class="px-3 pb-3 pt-2 border-t border-white/5">
                <p class="text-xs text-gray-300 ml-6">${description}</p>
              </div>
            </details>
          `;
        }).join('')}
      </div>

      <div class="p-4 border-t border-white/5 flex gap-2">
        <button id="btn-back-countdown" class="flex-1 bg-gray-700/40 hover:bg-gray-600/60 px-4 py-2 rounded border border-gray-600/50 transition text-sm font-semibold flex items-center justify-center gap-2"
          ${currentPhase <= 0 ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">skip_previous</span>
          ◂ Zpět
        </button>
        <button id="btn-advance-countdown" class="flex-1 bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded border border-red-700/50 transition text-sm font-semibold flex items-center justify-center gap-2"
          ${currentPhase >= 5 ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">skip_next</span>
          Posunout ▸
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Game Log
 */
function renderGameLog(campaign) {
  const logs = campaign?.sessionLog || [];

  return `
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col flex-1">
      <div class="p-4 border-b border-white/5">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Herní log</h2>
      </div>

      <div id="game-log-scroll" class="flex-1 overflow-y-auto p-4 space-y-2">
        ${logs.length === 0 ? `
          <p class="text-xs text-gray-500 italic">Zatím žádné záznamy</p>
        ` : logs.map(log => `
          <div class="text-xs border-l-2 border-gray-700 pl-3 py-1">
            <div class="text-gray-500 text-[10px] mb-0.5">${formatTime(log.timestamp)}</div>
            <div class="text-gray-300">${escapeHtml(log.text)}</div>
          </div>
        `).join('')}
      </div>

      <div class="p-4 border-t border-white/5">
        <div class="flex gap-2">
          <input
            type="text"
            id="log-input"
            placeholder="Přidat poznámku..."
            class="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-700/50"
          />
          <button id="btn-add-log" class="bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded border border-red-700/50 transition text-sm">
            <span class="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get improvised entities from GM engine session data (if available)
 * @returns {{ locations: Array, npcs: Array }}
 */
function getImprovisedEntities() {
  try {
    // Dynamic import check — gmEngine may not be loaded
    const gmModule = window.__MOTW_GM_ENGINE__;
    if (gmModule?.getSessionData) {
      const sessionData = gmModule.getSessionData();
      return {
        locations: sessionData?.improvisedLocations || [],
        npcs: sessionData?.improvisedNPCs || []
      };
    }
  } catch (e) {
    // GM engine not available
  }
  return { locations: [], npcs: [] };
}

/**
 * Render Pinned Cards
 */
function renderPinnedCards(mystery) {
  if (!mystery) {
    return `
      <div class="text-center py-12 text-gray-500">
        <span class="material-symbols-outlined text-4xl mb-2 block opacity-20">style</span>
        <p class="text-sm">Žádné připnuté karty</p>
      </div>
    `;
  }

  const cards = [];

  // Monster card
  if (mystery.monster) {
    cards.push(renderMonsterCard(mystery.monster));
  }

  // NPC cards (from mystery prep)
  if (mystery.bystanders) {
    mystery.bystanders.forEach(npc => {
      cards.push(renderNPCCard(npc, false));
    });
  }

  // Location cards (from mystery prep)
  if (mystery.locations) {
    mystery.locations.forEach(location => {
      cards.push(renderLocationCard(location, false));
    });
  }

  // Improvised entities from GM session
  const improvised = getImprovisedEntities();

  if (improvised.npcs.length > 0) {
    improvised.npcs.forEach(npc => {
      cards.push(renderNPCCard(npc, true));
    });
  }

  if (improvised.locations.length > 0) {
    improvised.locations.forEach(location => {
      cards.push(renderLocationCard(location, true));
    });
  }

  if (cards.length === 0) {
    return `
      <div class="text-center py-12 text-gray-500">
        <span class="material-symbols-outlined text-4xl mb-2 block opacity-20">style</span>
        <p class="text-sm">Žádné připnuté karty</p>
        <p class="text-xs mt-1">Přidej kartu nebo vygeneruj NPC</p>
      </div>
    `;
  }

  return cards.join('');
}

/**
 * Render Monster Card
 */
function renderMonsterCard(monster) {
  return `
    <div class="card bg-gradient-to-br from-red-950/40 to-black/40 border border-red-900/50 rounded-lg overflow-hidden cursor-pointer hover:border-red-700/70 transition"
         data-card-id="${monster.id}"
         data-card-type="monster">
      <div class="p-4">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-red-400 text-sm">pest_control</span>
              <span class="text-xs font-bold uppercase tracking-wider text-red-300">Příšera</span>
            </div>
            <h3 class="text-lg font-bold text-white">${escapeHtml(monster.name)}</h3>
            <p class="text-xs text-gray-400">${escapeHtml(monster.type)}</p>
          </div>
          <button class="text-gray-400 hover:text-white transition z-10" data-close-card="${monster.id}" data-card-type="monster" onclick="event.stopPropagation()">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${monster.description ? `<p class="text-sm text-gray-300 mb-3">${escapeHtml(monster.description)}</p>` : ''}

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="text-gray-500 uppercase text-[10px] tracking-wider mb-1">Zranění</div>
            <div class="flex gap-1">
              ${renderHarmTrack(monster.harm || 10, monster.currentHarm || 0)}
            </div>
          </div>
          <div>
            <div class="text-gray-500 uppercase text-[10px] tracking-wider mb-1">Zbroj</div>
            <div class="text-white font-semibold">${monster.armor || 0}</div>
          </div>
        </div>

        ${monster.weakness ? `
          <div class="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded">
            <div class="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">Slabina</div>
            <div class="text-xs text-yellow-200">${escapeHtml(monster.weakness)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render NPC Card
 * @param {Object} npc - NPC data
 * @param {boolean} isImprovised - Whether this NPC was created during session
 */
function renderNPCCard(npc, isImprovised = false) {
  const borderClass = isImprovised
    ? 'border-amber-500/50 hover:border-amber-400/70'
    : 'border-white/10 hover:border-blue-500/50';
  const iconColor = isImprovised ? 'text-amber-400' : 'text-blue-400';
  const labelColor = isImprovised ? 'text-amber-300' : 'text-blue-300';

  return `
    <div class="card bg-black/40 border ${borderClass} rounded-lg overflow-hidden cursor-pointer transition"
         data-card-id="${npc.id}"
         data-card-type="npc">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined ${iconColor} text-sm">person</span>
              <span class="text-xs font-bold uppercase tracking-wider ${labelColor}">${escapeHtml(npc.type)}</span>
              ${isImprovised ? '<span class="text-[10px] bg-amber-700/40 text-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Improvizované</span>' : ''}
            </div>
            <h3 class="text-base font-bold text-white">${escapeHtml(npc.name)}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition z-10" data-close-card="${npc.id}" data-card-type="npc" onclick="event.stopPropagation()">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${npc.description ? `<p class="text-xs text-gray-400">${escapeHtml(npc.description)}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Location Card
 * @param {Object} location - Location data
 * @param {boolean} isImprovised - Whether this location was created during session
 */
function renderLocationCard(location, isImprovised = false) {
  const borderClass = isImprovised
    ? 'border-amber-500/50 hover:border-amber-400/70'
    : 'border-white/10 hover:border-green-500/50';
  const iconColor = isImprovised ? 'text-amber-400' : 'text-green-400';
  const labelColor = isImprovised ? 'text-amber-300' : 'text-green-300';

  return `
    <div class="card bg-black/40 border ${borderClass} rounded-lg overflow-hidden cursor-pointer transition"
         data-card-id="${location.id}"
         data-card-type="location">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined ${iconColor} text-sm">place</span>
              <span class="text-xs font-bold uppercase tracking-wider ${labelColor}">${escapeHtml(location.type)}</span>
              ${isImprovised ? '<span class="text-[10px] bg-amber-700/40 text-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Improvizované</span>' : ''}
            </div>
            <h3 class="text-base font-bold text-white">${escapeHtml(location.name)}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition z-10" data-close-card="${location.id}" data-card-type="location" onclick="event.stopPropagation()">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${location.description ? `<p class="text-xs text-gray-400">${escapeHtml(location.description)}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Harm Track
 */
function renderHarmTrack(maxHarm, currentHarm) {
  const boxes = [];
  for (let i = 0; i < maxHarm; i++) {
    const isFilled = i < currentHarm;
    boxes.push(`
      <button class="harm-box w-5 h-5 border ${
        isFilled
          ? 'bg-red-700 border-red-600'
          : 'bg-black/40 border-white/20 hover:border-red-700/50'
      } rounded transition"
        data-harm-index="${i}"
        data-tooltip="Klikni: přidat/odebrat harm | Shift+Klik: -1"></button>
    `);
  }
  return boxes.join('');
}

/**
 * Render Keeper Panel
 */
function renderKeeperPanel() {
  return `
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col h-full">
      <!-- Tabs -->
      <div class="flex border-b border-white/5">
        <button class="keeper-tab keeper-tab-active flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition" data-keeper-tab="moves">
          Tahy SM
        </button>
        <button class="keeper-tab flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition border-l border-r border-white/5" data-keeper-tab="hunter-moves">
          Tahy lovců
        </button>
        <button class="keeper-tab flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition" data-keeper-tab="weapons">
          Zbraně
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div id="keeper-content-moves" class="keeper-content">
          <div class="text-xs text-gray-400">Načítání tahů Strážce...</div>
        </div>
        <div id="keeper-content-hunter-moves" class="keeper-content hidden">
          <div class="text-xs text-gray-400">Načítání tahů lovců...</div>
        </div>
        <div id="keeper-content-weapons" class="keeper-content hidden">
          <div class="text-xs text-gray-400">Načítání zbraní...</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize Session Events
 */
function initSessionEvents() {
  // Countdown controls
  const btnAdvance = $('#btn-advance-countdown');
  if (btnAdvance) {
    btnAdvance.addEventListener('click', handleAdvanceCountdown);
  }

  const btnBack = $('#btn-back-countdown');
  if (btnBack) {
    btnBack.addEventListener('click', handleBackCountdown);
  }

  // Phase buttons - click to jump to any phase
  const phaseButtons = document.querySelectorAll('.countdown-phase');
  phaseButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phaseIndex = parseInt(e.currentTarget.dataset.phaseIndex);
      handleSetCountdownPhase(phaseIndex);
    });
  });

  // Add log entry
  const btnAddLog = $('#btn-add-log');
  const logInput = $('#log-input');
  if (btnAddLog && logInput) {
    btnAddLog.addEventListener('click', () => handleAddLog(logInput.value));
    logInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddLog(logInput.value);
      }
    });
  }

  // Add Card button
  const btnAddCard = $('#btn-add-card');
  if (btnAddCard) {
    btnAddCard.addEventListener('click', handleAddCard);
  }

  // Generate NPC button
  const btnGenerateNPC = $('#btn-generate-npc');
  if (btnGenerateNPC) {
    btnGenerateNPC.addEventListener('click', handleGenerateNPC);
  }

  // Card interactions - use event delegation
  const pinnedCardsContainer = $('#pinned-cards-container');
  if (pinnedCardsContainer) {
    pinnedCardsContainer.addEventListener('click', (e) => {
      // IMPORTANT: Check harm boxes FIRST (most specific)
      const harmBox = e.target.closest('[data-harm-index]');
      if (harmBox) {
        e.stopPropagation();
        const index = parseInt(harmBox.dataset.harmIndex);
        handleMonsterHarmClick(index, e.shiftKey);
        return;
      }

      // Check if close button was clicked
      const closeBtn = e.target.closest('[data-close-card]');
      if (closeBtn) {
        const cardId = closeBtn.dataset.closeCard;
        const cardType = closeBtn.dataset.cardType;
        handleCloseCard(cardId, cardType);
        return;
      }

      // Check if card was clicked (for editing) - LAST (most general)
      const card = e.target.closest('[data-card-id]');
      if (card) {
        const cardId = card.dataset.cardId;
        const cardType = card.dataset.cardType;
        handleCardClick(cardType, cardId);
        return;
      }
    });
  }

  // Keeper panel tabs
  const keeperTabs = document.querySelectorAll('.keeper-tab');
  keeperTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.keeperTab;
      switchKeeperTab(tabName);
    });
  });

  // Load keeper moves on initial render
  loadKeeperMoves();

  // Listen for GM improvised entity creation — re-render pinned cards
  window.removeEventListener('gm-entity-created', handleEntityCreated);
  window.addEventListener('gm-entity-created', handleEntityCreated);
}

/**
 * Handle gm-entity-created event — re-render pinned cards
 */
function handleEntityCreated() {
  const state = getState();
  const currentMystery = state.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);
  const container = document.getElementById('pinned-cards-container');
  if (container && currentMystery) {
    container.innerHTML = renderPinnedCards(currentMystery);
  }
}

/**
 * Handle Advance Countdown
 */
function handleAdvanceCountdown() {
  const state = getState();
  const mystery = state.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  if (!mystery || !mystery.countdown) return;

  const currentPhase = mystery.countdown.currentPhase || 0;
  if (currentPhase >= 5) return; // Already at midnight

  // Use store function which handles history tracking
  advanceCountdown(state.currentMysteryId, 'Postup událostí');

  // Get updated mystery
  const updatedState = getState();
  const updatedMystery = updatedState.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  // Partial update - countdown display
  updateCountdownDisplay(updatedMystery);

  // Add log entry
  const phases = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
  handleAddLog(`Odpočet posunut: ${phases[currentPhase + 1]}`);
}

/**
 * Handle Back Countdown
 */
function handleBackCountdown() {
  const state = getState();
  const mystery = state.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  if (!mystery || !mystery.countdown) return;

  const currentPhase = mystery.countdown.currentPhase || 0;
  if (currentPhase <= 0) return; // Already at first phase

  // Use store function which handles history tracking
  setCountdownPhase(state.currentMysteryId, currentPhase - 1, 'Vrácení odpočtu');

  // Get updated mystery
  const updatedState = getState();
  const updatedMystery = updatedState.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  // Partial update - countdown display
  updateCountdownDisplay(updatedMystery);

  // Add log entry
  const phases = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
  handleAddLog(`Odpočet vrácen: ${phases[currentPhase - 1]}`);
}

/**
 * Handle Set Countdown Phase - jump to specific phase
 */
function handleSetCountdownPhase(phaseIndex) {
  const state = getState();
  const mystery = state.campaign?.mysteries?.find(m => m.id === state.currentMysteryId);

  if (!mystery || !mystery.countdown) return;

  const currentPhase = mystery.countdown.currentPhase || 0;
  if (phaseIndex === currentPhase) return; // Already at this phase

  // Use store function which handles history tracking
  setCountdownPhase(state.currentMysteryId, phaseIndex, 'Manuální nastavení fáze');

  // Add log entry
  const phases = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
  const action = phaseIndex > currentPhase ? 'posunut' : 'vrácen';
  handleAddLog(`Odpočet ${action} na: ${phases[phaseIndex]}`);

  renderSessionTab();
}

/**
 * Handle Add Log
 */
function handleAddLog(text) {
  if (!text || !text.trim()) return;

  const state = getState();
  if (!state.campaign) return;

  // IMMUTABLE UPDATE - add log to campaign.sessionLog
  const sessionLog = [
    ...(state.campaign.sessionLog || []),
    {
      timestamp: Date.now(),
      text: text.trim()
    }
  ];

  const updatedCampaign = {
    ...state.campaign,
    sessionLog,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Partial update - just log container
  updateGameLogContainer(sessionLog);

  // Clear input
  const logInput = $('#log-input');
  if (logInput) {
    logInput.value = '';
  }
}

/**
 * Update game log container (partial update)
 */
function updateGameLogContainer(logs) {
  const container = document.getElementById('game-log-scroll');
  if (!container) return;

  container.innerHTML = logs.length === 0 ? `
    <p class="text-xs text-gray-500 italic">Zatím žádné záznamy</p>
  ` : logs.map(log => `
    <div class="text-xs border-l-2 border-gray-700 pl-3 py-1">
      <div class="text-gray-500 text-[10px] mb-0.5">${formatTime(log.timestamp)}</div>
      <div class="text-gray-300">${escapeHtml(log.text)}</div>
    </div>
  `).join('');

  // Auto-scroll to bottom
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
}

/**
 * Update countdown display (partial update)
 */
function updateCountdownDisplay(mystery) {
  const phases = [
    { key: 'day', label: 'Den' },
    { key: 'shadows', label: 'Příšeří' },
    { key: 'sunset', label: 'Západ' },
    { key: 'dusk', label: 'Soumrak' },
    { key: 'nightfall', label: 'Noc' },
    { key: 'midnight', label: 'Půlnoc' }
  ];

  const currentPhase = mystery.countdown?.currentPhase || 0;
  const countdownPhases = mystery.countdown?.phases || [];

  // Update phase buttons
  const phaseButtons = document.querySelectorAll('.countdown-phase');
  phaseButtons.forEach((btn, index) => {
    const isActive = index === currentPhase;
    const isPast = index < currentPhase;

    // Update classes
    btn.className = `countdown-phase w-full text-left p-3 rounded border transition ${
      isActive
        ? 'bg-red-900/30 border-red-700/50 ring-2 ring-red-700/30'
        : isPast
        ? 'bg-gray-800/20 border-white/5 hover:bg-gray-700/30'
        : 'bg-black/20 border-white/5 hover:bg-white/5'
    }`;

    // Update icon and text colors
    const icon = btn.querySelector('.material-symbols-outlined');
    const label = btn.querySelector('.text-xs.font-bold');

    if (icon) {
      icon.className = `material-symbols-outlined text-sm ${isActive ? 'text-red-400' : 'text-gray-500'}`;
      icon.textContent = isActive ? 'radio_button_checked' : isPast ? 'check_circle' : 'radio_button_unchecked';
    }

    if (label) {
      label.className = `text-xs font-bold uppercase tracking-wider ${isActive ? 'text-red-300' : 'text-gray-400'}`;
    }
  });

  // Update buttons state
  const btnBack = $('#btn-back-countdown');
  const btnAdvance = $('#btn-advance-countdown');

  if (btnBack) {
    btnBack.disabled = currentPhase <= 0;
  }

  if (btnAdvance) {
    btnAdvance.disabled = currentPhase >= 5;
  }
}

/**
 * Switch Keeper Tab
 */
function switchKeeperTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.keeper-tab').forEach(tab => {
    if (tab.dataset.keeperTab === tabName) {
      tab.classList.add('keeper-tab-active');
    } else {
      tab.classList.remove('keeper-tab-active');
    }
  });

  // Show/hide content
  document.querySelectorAll('.keeper-content').forEach(content => {
    content.classList.add('hidden');
  });

  const targetContent = $(`#keeper-content-${tabName}`);
  if (targetContent) {
    targetContent.classList.remove('hidden');
  }

  // Load content if needed
  if (tabName === 'moves') {
    loadKeeperMoves();
  } else if (tabName === 'hunter-moves') {
    loadHunterMoves();
  } else if (tabName === 'weapons') {
    loadWeapons();
  }
}

/**
 * Load Keeper Moves
 */
async function loadKeeperMoves() {
  const container = $('#keeper-content-moves');
  if (!container) return;

  try {
    const now = Date.now();
    const cached = dataCache.keeperMoves;

    let moves;

    // Check cache validity
    if (cached.data && (now - cached.timestamp) < cached.ttl) {
      // Use cached data
      moves = cached.data;
    } else {
      // Fetch new data
      const response = await fetch(import.meta.env.BASE_URL + 'data/keeper-moves.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      moves = await response.json();

      // Update cache
      dataCache.keeperMoves = {
        data: moves,
        timestamp: Date.now(),
        ttl: 300000
      };
    }

    renderKeeperMovesContent(moves, container);
  } catch (error) {
    console.error('Failed to load keeper moves:', error);

    // Try to use stale cache
    if (dataCache.keeperMoves.data) {
      console.warn('Using stale cache');
      renderKeeperMovesContent(dataCache.keeperMoves.data, container);
    } else {
      container.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-xs text-red-400 mb-2">Nepodařilo se načíst tahy Strážce</p>
          <button id="btn-retry-keeper-moves" class="text-xs bg-gray-700/40 px-3 py-1 rounded">
            Zkusit znovu
          </button>
        </div>
      `;

      // Retry button
      const retryBtn = $('#btn-retry-keeper-moves');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadKeeperMoves());
      }
    }
  }
}

function renderKeeperMovesContent(moves, container) {
  const softMoves = moves.filter(m => m.type === 'soft');
  const hardMoves = moves.filter(m => m.type === 'hard');
  const otherMoves = moves.filter(m => m.type !== 'soft' && m.type !== 'hard');

  container.innerHTML = `
    <div class="space-y-4">
      ${softMoves.length > 0 ? `
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Měkké tahy</h3>
          <div class="space-y-1">
            ${softMoves.map(move => renderKeeperMove(move)).join('')}
          </div>
        </div>
      ` : ''}

      ${hardMoves.length > 0 ? `
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tvrdé tahy</h3>
          <div class="space-y-1">
            ${hardMoves.map(move => renderKeeperMove(move)).join('')}
          </div>
        </div>
      ` : ''}

      ${otherMoves.length > 0 ? `
        <div class="space-y-1">
          ${otherMoves.map(move => renderKeeperMove(move)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Keeper Move
 */
function renderKeeperMove(move) {
  return `
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-200">${move.name_cz}</span>
        <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div class="px-3 pb-3 pt-2 border-t border-white/5 space-y-2">
        <p class="text-xs text-gray-400">${move.description}</p>
        ${move.examples && move.examples.length > 0 ? `
          <div class="mt-2">
            <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Příklady:</div>
            <div class="space-y-1">
              ${move.examples.map(ex => `
                <div class="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-700">${ex}</div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </details>
  `;
}

/**
 * Load Hunter Moves
 */
async function loadHunterMoves() {
  const container = $('#keeper-content-hunter-moves');
  if (!container) return;

  try {
    const now = Date.now();
    const cached = dataCache.hunterMoves;

    let moves;

    // Check cache validity
    if (cached.data && (now - cached.timestamp) < cached.ttl) {
      moves = cached.data;
    } else {
      const response = await fetch(import.meta.env.BASE_URL + 'data/basic-moves.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      moves = await response.json();

      dataCache.hunterMoves = {
        data: moves,
        timestamp: Date.now(),
        ttl: 300000
      };
    }

    container.innerHTML = `
      <div class="space-y-2">
        ${moves.map(move => renderHunterMove(move)).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load hunter moves:', error);

    if (dataCache.hunterMoves.data) {
      console.warn('Using stale cache');
      container.innerHTML = `
        <div class="space-y-2">
          ${dataCache.hunterMoves.data.map(move => renderHunterMove(move)).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-xs text-red-400 mb-2">Nepodařilo se načíst tahy lovců</p>
          <button id="btn-retry-hunter-moves" class="text-xs bg-gray-700/40 px-3 py-1 rounded">
            Zkusit znovu
          </button>
        </div>
      `;

      const retryBtn = $('#btn-retry-hunter-moves');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadHunterMoves());
      }
    }
  }
}

/**
 * Render Hunter Move
 */
function renderHunterMove(move) {
  return `
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-200">${move.name_cz}</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider">+${move.stat_cz}</span>
        </div>
        <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div class="px-3 pb-3 pt-2 border-t border-white/5 space-y-2">
        <div class="text-xs text-gray-400 italic">${move.trigger_cz}</div>

        <div class="space-y-2 mt-3">
          <div>
            <div class="text-[10px] text-green-400 uppercase tracking-wider mb-1">10+</div>
            <div class="text-xs text-gray-300">${move.result_10plus}</div>
            ${move.result_10plus_options ? `
              <ul class="mt-1 space-y-1">
                ${move.result_10plus_options.map(opt => `
                  <li class="text-xs text-gray-400 ml-3">• ${opt}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>

          <div>
            <div class="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">7-9</div>
            <div class="text-xs text-gray-300">${move.result_7_9}</div>
          </div>

          <div>
            <div class="text-[10px] text-red-400 uppercase tracking-wider mb-1">6-</div>
            <div class="text-xs text-gray-300">${move.result_6_minus}</div>
          </div>

          ${move.questions && move.questions.length > 0 ? `
            <div class="mt-2">
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Otázky:</div>
              <ul class="space-y-1">
                ${move.questions.map(q => `
                  <li class="text-xs text-gray-400 ml-3">• ${q}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    </details>
  `;
}

/**
 * Load Weapons
 */
async function loadWeapons() {
  const container = $('#keeper-content-weapons');
  if (!container) return;

  try {
    const now = Date.now();
    const cached = dataCache.weapons;

    let data;

    // Check cache validity
    if (cached.data && (now - cached.timestamp) < cached.ttl) {
      data = cached.data;
    } else {
      const response = await fetch(import.meta.env.BASE_URL + 'data/weapons.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      data = await response.json();

      dataCache.weapons = {
        data: data,
        timestamp: Date.now(),
        ttl: 300000
      };
    }

    renderWeaponsContent(data, container);
  } catch (error) {
    console.error('Failed to load weapons:', error);

    if (dataCache.weapons.data) {
      console.warn('Using stale cache');
      renderWeaponsContent(dataCache.weapons.data, container);
    } else {
      container.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-xs text-red-400 mb-2">Nepodařilo se načíst zbraně</p>
          <button id="btn-retry-weapons" class="text-xs bg-gray-700/40 px-3 py-1 rounded">
            Zkusit znovu
          </button>
        </div>
      `;

      const retryBtn = $('#btn-retry-weapons');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadWeapons());
      }
    }
  }
}

function renderWeaponsContent(data, container) {
  const categories = {
    improvised: { name: 'Improvizované', weapons: [] },
    melee: { name: 'Chladné zbraně', weapons: [] },
    firearms: { name: 'Střelné zbraně', weapons: [] },
    heavy: { name: 'Těžké zbraně', weapons: [] },
    special: { name: 'Speciální', weapons: [] },
    magic: { name: 'Magie', weapons: [] },
    natural: { name: 'Přirozené', weapons: [] }
  };

  data.weapons.forEach(weapon => {
    if (categories[weapon.category]) {
      categories[weapon.category].weapons.push(weapon);
    }
  });

  container.innerHTML = `
    <div class="space-y-4">
      ${Object.entries(categories).map(([key, cat]) => {
        if (cat.weapons.length === 0) return '';
        return `
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">${cat.name}</h3>
            <div class="space-y-1">
              ${cat.weapons.map(weapon => renderWeapon(weapon, data.tags)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render Weapon
 */
function renderWeapon(weapon, allTags) {
  const tagDetails = weapon.tags.map(tagName => {
    const tag = allTags.find(t => t.name === tagName);
    return tag ? `${tag.name_cz}: ${tag.description}` : tagName;
  });

  return `
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <div class="flex items-center gap-3 flex-1">
          <span class="text-sm font-semibold text-gray-200">${weapon.name_cz}</span>
          <span class="text-xs text-gray-500">${weapon.harm}-harm</span>
          <span class="text-xs text-gray-500">${weapon.range_cz}</span>
        </div>
        ${weapon.tags.length > 0 ? `
          <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
        ` : ''}
      </summary>
      ${weapon.tags.length > 0 ? `
        <div class="px-3 pb-2 pt-1 border-t border-white/5">
          <div class="flex flex-wrap gap-1">
            ${weapon.tags.map((tag, idx) => `
              <span class="text-[10px] bg-gray-700/40 px-2 py-0.5 rounded border border-gray-600/50" title="${tagDetails[idx]}">
                ${allTags.find(t => t.name === tag)?.name_cz || tag}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </details>
  `;
}

/**
 * Handle Add Card - open modal for adding new card
 */
function handleAddCard() {
  const content = `
    <div class="space-y-6">
      <!-- Card Type Selection -->
      <div>
        <label class="block text-sm font-bold text-gray-300 mb-3">Typ karty</label>
        <div class="grid grid-cols-3 gap-3">
          <button class="card-type-btn p-4 border rounded hover:border-red-700/50 transition" data-type="monster">
            <span class="material-symbols-outlined text-3xl text-red-400 mb-2 block">pest_control</span>
            <span class="text-sm font-semibold text-gray-300">Příšera</span>
          </button>
          <button class="card-type-btn p-4 border rounded hover:border-blue-700/50 transition" data-type="npc">
            <span class="material-symbols-outlined text-3xl text-blue-400 mb-2 block">person</span>
            <span class="text-sm font-semibold text-gray-300">NPC</span>
          </button>
          <button class="card-type-btn p-4 border rounded hover:border-green-700/50 transition" data-type="location">
            <span class="material-symbols-outlined text-3xl text-green-400 mb-2 block">place</span>
            <span class="text-sm font-semibold text-gray-300">Lokace</span>
          </button>
        </div>
      </div>

      <!-- Form Container (populated based on type) -->
      <div id="card-form-container" class="hidden"></div>
    </div>
  `;

  const modal = showModal({
    title: 'Přidat kartu',
    content,
    buttons: [
      { id: 'btn-cancel-card', label: 'Zrušit', primary: false },
      { id: 'btn-save-card', label: 'Přidat', primary: true, disabled: true }
    ]
  });

  // Card type selection handlers
  document.querySelectorAll('.card-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;

      // Update button states
      document.querySelectorAll('.card-type-btn').forEach(b => {
        b.classList.remove('border-red-700/50', 'border-blue-700/50', 'border-green-700/50', 'bg-white/5');
        b.classList.add('border-white/10');
      });
      e.currentTarget.classList.remove('border-white/10');
      e.currentTarget.classList.add('bg-white/5');

      if (type === 'monster') {
        e.currentTarget.classList.add('border-red-700/50');
      } else if (type === 'npc') {
        e.currentTarget.classList.add('border-blue-700/50');
      } else if (type === 'location') {
        e.currentTarget.classList.add('border-green-700/50');
      }

      // Show form
      showCardForm(type);

      // Enable save button
      const saveBtn = $('#btn-save-card');
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    });
  });

  // Cancel button
  const cancelBtn = $('#btn-cancel-card');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => hideModal());
  }

  // Save button
  const saveBtn = $('#btn-save-card');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveCard();
      hideModal();
    });
  }
}

/**
 * Show card form based on type
 */
function showCardForm(type) {
  const container = $('#card-form-container');
  if (!container) return;

  container.classList.remove('hidden');

  if (type === 'monster') {
    container.innerHTML = `
      <div class="space-y-4 border-t border-white/10 pt-6">
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Jméno příšery *</label>
          <input type="text" id="card-name" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" placeholder="např. Upír, Vlkodlak..." />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Typ</label>
          <input type="text" id="card-type" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" placeholder="např. Nemrtvý, Démon..." />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Popis</label>
          <textarea id="card-description" rows="3" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" placeholder="Krátký popis..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Zdraví (Harm)</label>
            <input type="number" id="card-harm" value="10" min="1" max="20" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Zbroj</label>
            <input type="number" id="card-armor" value="0" min="0" max="10" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Slabina</label>
          <input type="text" id="card-weakness" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-700/50" placeholder="např. Stříbro, Sluneční světlo..." />
        </div>
      </div>
    `;
  } else if (type === 'npc') {
    container.innerHTML = `
      <div class="space-y-4 border-t border-white/10 pt-6">
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Jméno NPC *</label>
          <input type="text" id="card-name" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-700/50" placeholder="např. Jan Novák..." />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Typ</label>
          <select id="card-npc-type" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-700/50">
            <option value="Klevetník">Klevetník</option>
            <option value="Svědek">Svědek</option>
            <option value="Úředník">Úředník</option>
            <option value="Oběť">Oběť</option>
            <option value="Pomocník">Pomocník</option>
            <option value="Všetečný">Všetečný</option>
            <option value="Detektiv">Detektiv</option>
            <option value="Skeptik">Skeptik</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Popis</label>
          <textarea id="card-description" rows="2" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-700/50" placeholder="Krátký popis..."></textarea>
        </div>
      </div>
    `;
  } else if (type === 'location') {
    container.innerHTML = `
      <div class="space-y-4 border-t border-white/10 pt-6">
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Název lokace *</label>
          <input type="text" id="card-name" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-green-700/50" placeholder="např. Opuštěná továrna..." />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Typ</label>
          <input type="text" id="card-type" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-green-700/50" placeholder="např. Budova, Les, Jeskyně..." />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-300 mb-2">Popis</label>
          <textarea id="card-description" rows="3" class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-green-700/50" placeholder="Krátký popis..."></textarea>
        </div>
      </div>
    `;
  }
}

/**
 * Save card to mystery
 */
function saveCard() {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery) return;

  // Determine card type based on active button
  const activeBtn = document.querySelector('.card-type-btn.bg-white\\/5');
  if (!activeBtn) return;

  const cardType = activeBtn.dataset.type;
  const name = $('#card-name')?.value?.trim();

  if (!name) return;

  const newCard = {
    id: generateId(),
    name
  };

  const updatedMystery = { ...mystery };

  if (cardType === 'monster') {
    newCard.type = $('#card-type')?.value?.trim() || 'Neznámý typ';
    newCard.description = $('#card-description')?.value?.trim() || 'Žádný popis';
    newCard.harm = parseInt($('#card-harm')?.value) || 10;
    newCard.currentHarm = 0;
    newCard.armor = parseInt($('#card-armor')?.value) || 0;
    newCard.weakness = $('#card-weakness')?.value?.trim() || 'Neznámá slabina';

    updatedMystery.monster = newCard;
  } else if (cardType === 'npc') {
    newCard.type = $('#card-npc-type')?.value || 'Klevetník';
    newCard.description = $('#card-description')?.value?.trim() || 'Žádný popis';

    updatedMystery.bystanders = [...(mystery.bystanders || []), newCard];
  } else if (cardType === 'location') {
    newCard.type = $('#card-type')?.value?.trim() || 'Lokace';
    newCard.description = $('#card-description')?.value?.trim() || 'Žádný popis';

    updatedMystery.locations = [...(mystery.locations || []), newCard];
  }

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Add log entry
  handleAddLog(`Přidána karta: ${name} (${cardType === 'monster' ? 'Příšera' : cardType === 'npc' ? 'NPC' : 'Lokace'})`);

  renderSessionTab();
}

/**
 * Generate unique ID
 */

/**
 * Handle Generate NPC - randomly generate NPC and add to mystery
 */
async function handleGenerateNPC() {
  const state = getState();
  const currentMysteryId = state.currentMysteryId; // Capture mystery ID immediately

  let currentNPC = await generateNPC();

  const renderNPCPreview = (npc) => `
    <div class="space-y-4">
      <div class="bg-black/40 border border-blue-700/30 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-symbols-outlined text-blue-400 text-4xl">person</span>
          <div>
            <h3 class="text-2xl font-bold text-white">${escapeHtml(npc.name)}</h3>
            <p class="text-sm text-blue-400">${escapeHtml(npc.type)}</p>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Popis</div>
            <p class="text-sm text-gray-300">${escapeHtml(npc.description)}</p>
          </div>

          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Motivace</div>
            <p class="text-sm text-gray-300">${escapeHtml(npc.motivation)}</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center">
        <button id="btn-reroll-npc" class="px-4 py-2 bg-gray-700/40 hover:bg-gray-600/60 border border-gray-600/50 rounded transition font-semibold text-sm flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">refresh</span>
          Znovu vygenerovat
        </button>
      </div>
    </div>
  `;

  const modal = showModal({
    title: '🎲 Generovat NPC',
    content: renderNPCPreview(currentNPC),
    buttons: [
      { id: 'btn-cancel-npc', label: 'Zrušit', primary: false },
      { id: 'btn-add-generated-npc', label: 'Přidat do záhady', primary: true }
    ]
  });

  // Reroll button handler
  const attachRerollHandler = () => {
    const rerollBtn = $('#btn-reroll-npc');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', async () => {
        currentNPC = await generateNPC();
        modal.updateContent(renderNPCPreview(currentNPC));
        attachRerollHandler(); // Re-attach after content update
      });
    }
  };

  attachRerollHandler();

  // Cancel button
  const cancelBtn = $('#btn-cancel-npc');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => hideModal());
  }

  // Add button
  const addBtn = $('#btn-add-generated-npc');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addNPCToMysteryById(currentNPC, currentMysteryId);
      hideModal();
    });
  }
}

/**
 * Add NPC to specific mystery by ID
 */
function addNPCToMysteryById(npc, mysteryId) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) {
    console.warn('Mystery not found:', mysteryId);
    return;
  }

  const updatedMystery = {
    ...mystery,
    bystanders: [...(mystery.bystanders || []), npc]
  };

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Add log entry
  handleAddLog(`Přidán NPC: ${npc.name} (${npc.type})`);

  renderSessionTab();
}

/**
 * Add NPC to current mystery
 */
function addNPCToMystery(npc) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery) return;

  const updatedMystery = {
    ...mystery,
    bystanders: [...(mystery.bystanders || []), npc]
  };

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Add log entry
  handleAddLog(`Přidán NPC: ${npc.name} (${npc.type})`);

  renderSessionTab();
}

/**
 * Handle Close Card - remove card from pinned cards
 */
function handleCloseCard(cardId, cardType) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery) return;

  // IMMUTABLE UPDATE - remove card based on type
  const updatedMystery = { ...mystery };

  if (cardType === 'monster') {
    updatedMystery.monster = null;
  } else if (cardType === 'npc') {
    updatedMystery.bystanders = mystery.bystanders.filter(npc => npc.id !== cardId);
  } else if (cardType === 'location') {
    updatedMystery.locations = mystery.locations.filter(loc => loc.id !== cardId);
  }

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  renderSessionTab();
}

/**
 * Handle card click for editing
 */
function handleCardClick(cardType, cardId) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery) return;

  let cardData;
  if (cardType === 'monster') {
    cardData = mystery.monster;
  } else if (cardType === 'npc') {
    cardData = mystery.bystanders.find(npc => npc.id === cardId);
  } else if (cardType === 'location') {
    cardData = mystery.locations.find(loc => loc.id === cardId);
  }

  if (!cardData) return;

  showCardEditModal(cardType, cardId, cardData);
}

/**
 * Show edit modal for card
 */
function showCardEditModal(cardType, cardId, cardData) {
  if (!cardData) {
    console.error('No card data provided');
    return;
  }

  let title, content;

  if (cardType === 'monster') {
    title = 'Upravit příšeru';
    content = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Jméno</label>
          <input type="text" id="edit-name" value="${escapeHtml(cardData.name || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Typ</label>
          <input type="text" id="edit-type" value="${escapeHtml(cardData.type || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Popis</label>
          <textarea id="edit-description" rows="3"
                    class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">${escapeHtml(cardData.description || '')}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Maximální zranění</label>
            <input type="number" id="edit-harm" value="${cardData.harm || 10}" min="1" max="20"
                   class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Zbroj</label>
            <input type="number" id="edit-armor" value="${cardData.armor || 0}" min="0" max="10"
                   class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Slabina</label>
          <input type="text" id="edit-weakness" value="${escapeHtml(cardData.weakness || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50">
        </div>
        <div class="flex gap-2 justify-end">
          <button id="btn-cancel-edit" class="px-4 py-2 bg-gray-700/40 hover:bg-gray-600/60 rounded border border-gray-600/50 transition">
            Zrušit
          </button>
          <button id="btn-save-edit" class="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 rounded border border-red-700/50 transition">
            Uložit
          </button>
        </div>
      </div>
    `;
  } else if (cardType === 'npc') {
    title = 'Upravit NPC';
    content = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Jméno</label>
          <input type="text" id="edit-name" value="${escapeHtml(cardData.name || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-blue-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Typ</label>
          <input type="text" id="edit-type" value="${escapeHtml(cardData.type || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-blue-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Popis</label>
          <textarea id="edit-description" rows="3"
                    class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-blue-500/50">${escapeHtml(cardData.description || '')}</textarea>
        </div>
        <div class="flex gap-2 justify-end">
          <button id="btn-cancel-edit" class="px-4 py-2 bg-gray-700/40 hover:bg-gray-600/60 rounded border border-gray-600/50 transition">
            Zrušit
          </button>
          <button id="btn-save-edit" class="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 rounded border border-blue-700/50 transition">
            Uložit
          </button>
        </div>
      </div>
    `;
  } else if (cardType === 'location') {
    title = 'Upravit lokaci';
    content = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Název</label>
          <input type="text" id="edit-name" value="${escapeHtml(cardData.name || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-green-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Typ</label>
          <input type="text" id="edit-type" value="${escapeHtml(cardData.type || '')}"
                 class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-green-500/50">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Popis</label>
          <textarea id="edit-description" rows="3"
                    class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-green-500/50">${escapeHtml(cardData.description || '')}</textarea>
        </div>
        <div class="flex gap-2 justify-end">
          <button id="btn-cancel-edit" class="px-4 py-2 bg-gray-700/40 hover:bg-gray-600/60 rounded border border-gray-600/50 transition">
            Zrušit
          </button>
          <button id="btn-save-edit" class="px-4 py-2 bg-green-900/40 hover:bg-green-800/60 rounded border border-green-700/50 transition">
            Uložit
          </button>
        </div>
      </div>
    `;
  }

  showModal({
    title,
    content,
    onClose: () => {}
  });

  // Attach event handlers
  $('#btn-cancel-edit')?.addEventListener('click', hideModal);
  $('#btn-save-edit')?.addEventListener('click', () => {
    handleSaveCardEdit(cardType, cardId);
  });
}

/**
 * Save card edits
 */
function handleSaveCardEdit(cardType, cardId) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery) return;

  // Collect form data
  const name = $('#edit-name')?.value.trim();
  const type = $('#edit-type')?.value.trim();
  const description = $('#edit-description')?.value.trim();

  if (!name) {
    alert('Jméno je povinné');
    return;
  }

  const updatedMystery = { ...mystery };

  if (cardType === 'monster') {
    const harm = parseInt($('#edit-harm')?.value) || 10;
    const armor = parseInt($('#edit-armor')?.value) || 0;
    const weakness = $('#edit-weakness')?.value.trim();

    updatedMystery.monster = {
      ...mystery.monster,
      name,
      type,
      description,
      harm,
      armor,
      weakness
    };
  } else if (cardType === 'npc') {
    updatedMystery.bystanders = mystery.bystanders.map(npc =>
      npc.id === cardId ? { ...npc, name, type, description } : npc
    );
  } else if (cardType === 'location') {
    updatedMystery.locations = mystery.locations.map(loc =>
      loc.id === cardId ? { ...loc, name, type, description } : loc
    );
  }

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });
  hideModal();
  renderSessionTab();
}

/**
 * Handle monster harm box click
 */
function handleMonsterHarmClick(index, isShiftKey) {
  const state = getState();
  if (!state.campaign) return;

  const mystery = state.campaign.mysteries.find(m => m.id === state.currentMysteryId);
  if (!mystery || !mystery.monster) return;

  const currentHarm = mystery.monster.currentHarm || 0;
  const maxHarm = mystery.monster.harm || 10;
  let newHarm;

  if (isShiftKey) {
    // Shift+click: Decrease harm by 1
    newHarm = Math.max(0, currentHarm - 1);
  } else {
    const clickedBox = index;
    const isBoxFilled = clickedBox < currentHarm;

    if (isBoxFilled) {
      // Clicking on filled box: empty it and all after it
      newHarm = clickedBox;
    } else {
      // Clicking on empty box: fill it and all before it
      newHarm = Math.min(maxHarm, clickedBox + 1);
    }
  }

  const updatedMonster = {
    ...mystery.monster,
    currentHarm: newHarm
  };

  const updatedMystery = {
    ...mystery,
    monster: updatedMonster
  };

  const updatedMysteries = state.campaign.mysteries.map(m =>
    m.id === updatedMystery.id ? updatedMystery : m
  );

  const updatedCampaign = {
    ...state.campaign,
    mysteries: updatedMysteries,
    lastModified: Date.now()
  };

  setState({ campaign: updatedCampaign });

  // Partial update - just re-render the monster card
  const container = $('#pinned-cards-container');
  if (container) {
    const monsterCardElement = container.querySelector('[data-card-type="monster"]');
    if (monsterCardElement) {
      const newCardHTML = renderMonsterCard(updatedMonster);
      const temp = document.createElement('div');
      temp.innerHTML = newCardHTML;
      monsterCardElement.replaceWith(temp.firstElementChild);
    }
  }
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}
