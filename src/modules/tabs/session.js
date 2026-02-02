/**
 * Session Tab - Live game session interface
 *
 * Layout: 3-column grid
 * - Left: Countdown + Game Log
 * - Middle: Pinned Cards (Monster, NPCs, Locations)
 * - Right: Keeper Panel (moves, weapons)
 */

import { getState, setState } from '../state/store.js';
import { $ } from '../../utils/dom.js';

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
        ${renderGameLog(state.sessionLog || [])}
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
          const description = countdownPhases[index]?.description || 'Žádný popis';

          return `
            <button
              class="countdown-phase w-full text-left p-3 rounded border transition ${
                isActive
                  ? 'bg-red-900/30 border-red-700/50 ring-2 ring-red-700/30'
                  : isPast
                  ? 'bg-gray-800/20 border-white/5 hover:bg-gray-700/30'
                  : 'bg-black/20 border-white/5 hover:bg-white/5'
              }"
              data-phase-index="${index}"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="material-symbols-outlined text-sm ${isActive ? 'text-red-400' : 'text-gray-500'}">
                  ${isActive ? 'radio_button_checked' : isPast ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span class="text-xs font-bold uppercase tracking-wider ${isActive ? 'text-red-300' : 'text-gray-400'}">
                  ${phase.label}
                </span>
              </div>
              <p class="text-xs text-gray-400 ml-6 line-clamp-2">${description}</p>
            </button>
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
function renderGameLog(logs) {
  return `
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col flex-1">
      <div class="p-4 border-b border-white/5">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Herní log</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        ${logs.length === 0 ? `
          <p class="text-xs text-gray-500 italic">Zatím žádné záznamy</p>
        ` : logs.map(log => `
          <div class="text-xs border-l-2 border-gray-700 pl-3 py-1">
            <div class="text-gray-500 text-[10px] mb-0.5">${formatTime(log.timestamp)}</div>
            <div class="text-gray-300">${log.text}</div>
          </div>
        `).reverse().join('')}
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

  // NPC cards
  if (mystery.bystanders) {
    mystery.bystanders.forEach(npc => {
      cards.push(renderNPCCard(npc));
    });
  }

  // Location cards
  if (mystery.locations) {
    mystery.locations.forEach(location => {
      cards.push(renderLocationCard(location));
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
    <div class="card bg-gradient-to-br from-red-950/40 to-black/40 border border-red-900/50 rounded-lg overflow-hidden">
      <div class="p-4">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-red-400 text-sm">pest_control</span>
              <span class="text-xs font-bold uppercase tracking-wider text-red-300">Příšera</span>
            </div>
            <h3 class="text-lg font-bold text-white">${monster.name}</h3>
            <p class="text-xs text-gray-400">${monster.type}</p>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${monster.id}" data-card-type="monster">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${monster.description ? `<p class="text-sm text-gray-300 mb-3">${monster.description}</p>` : ''}

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
            <div class="text-xs text-yellow-200">${monster.weakness}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render NPC Card
 */
function renderNPCCard(npc) {
  return `
    <div class="card bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-blue-400 text-sm">person</span>
              <span class="text-xs font-bold uppercase tracking-wider text-blue-300">${npc.type}</span>
            </div>
            <h3 class="text-base font-bold text-white">${npc.name}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${npc.id}" data-card-type="npc">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${npc.description ? `<p class="text-xs text-gray-400">${npc.description}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Location Card
 */
function renderLocationCard(location) {
  return `
    <div class="card bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-green-400 text-sm">place</span>
              <span class="text-xs font-bold uppercase tracking-wider text-green-300">${location.type}</span>
            </div>
            <h3 class="text-base font-bold text-white">${location.name}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${location.id}" data-card-type="location">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${location.description ? `<p class="text-xs text-gray-400">${location.description}</p>` : ''}
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
      } rounded transition" data-harm-index="${i}"></button>
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

  mystery.countdown.currentPhase = currentPhase + 1;

  setState({ campaign: state.campaign });

  // Add log entry
  const phases = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
  handleAddLog(`Odpočet posunut: ${phases[currentPhase + 1]}`);

  renderSessionTab();
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

  mystery.countdown.currentPhase = currentPhase - 1;

  setState({ campaign: state.campaign });

  // Add log entry
  const phases = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
  handleAddLog(`Odpočet vrácen: ${phases[currentPhase - 1]}`);

  renderSessionTab();
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

  mystery.countdown.currentPhase = phaseIndex;

  setState({ campaign: state.campaign });

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
  const sessionLog = state.sessionLog || [];

  sessionLog.push({
    timestamp: Date.now(),
    text: text.trim()
  });

  setState({ sessionLog });

  // Clear input
  const logInput = $('#log-input');
  if (logInput) {
    logInput.value = '';
  }

  renderSessionTab();
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
    const response = await fetch(import.meta.env.BASE_URL + 'data/keeper-moves.json');
    const moves = await response.json();

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
  } catch (error) {
    console.error('Failed to load keeper moves:', error);
    container.innerHTML = '<p class="text-xs text-red-400">Nepodařilo se načíst tahy Strážce</p>';
  }
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
    const response = await fetch(import.meta.env.BASE_URL + 'data/basic-moves.json');
    const moves = await response.json();

    container.innerHTML = `
      <div class="space-y-2">
        ${moves.map(move => renderHunterMove(move)).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load hunter moves:', error);
    container.innerHTML = '<p class="text-xs text-red-400">Nepodařilo se načíst tahy lovců</p>';
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
    const response = await fetch(import.meta.env.BASE_URL + 'data/weapons.json');
    const data = await response.json();

    // Group weapons by category
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
  } catch (error) {
    console.error('Failed to load weapons:', error);
    container.innerHTML = '<p class="text-xs text-red-400">Nepodařilo se načíst zbraně</p>';
  }
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
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}
