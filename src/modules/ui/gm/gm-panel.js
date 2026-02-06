/**
 * GM Panel UI
 * Main interface for AI Game Master mode + Auto-Play
 */
import { getState } from '../../state/store.js';
import {
  startGMMode,
  stopGMMode,
  processPlayerAction,
  getGMSessionLog,
  isGMModeRunning,
  updateGMSettings,
  getGMSettings
} from '../../ai/gm/gm-engine.js';
import { getCurrentScene } from '../../ai/gm/scene-manager.js';

let updateInterval = null;
let autoPlayState = null; // Cached auto-play state from events

/**
 * Escape HTML to prevent XSS from AI-generated content
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get auto-play controller (lazy import)
 */
async function getAutoPlayController() {
  const { autoPlayController } = await import('../../ai/gm/auto-play-controller.js');
  return autoPlayController;
}

/**
 * Render GM Panel
 */
export function renderGMPanel() {
  const isRunning = isGMModeRunning();
  const settings = getGMSettings();

  if (isRunning) {
    return renderRunningLayout(settings);
  }
  return renderStoppedLayout(settings);
}

/**
 * Layout when GM is running — flex column, log takes max space
 */
function renderRunningLayout(settings) {
  const isAutoPlay = autoPlayState?.running;

  return `
    <div class="gm-panel flex flex-col" style="height: calc(100vh - 4rem);">
      <!-- Compact Header -->
      <div class="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold">${isAutoPlay ? '🤖 Auto-Play' : '🎭 AI Game Master'}</h2>
          <div class="w-2 h-2 rounded-full ${isAutoPlay ? 'bg-violet-500' : 'bg-green-500'} animate-pulse"></div>
        </div>
        <div class="flex items-center gap-2">
          <button
            id="btn-toggle-settings"
            class="p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
            title="Nastavení"
          >⚙️</button>
          <button
            id="btn-copy-log"
            class="p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
            title="Kopírovat log"
          >📋</button>
          ${isAutoPlay ? `
            ${autoPlayState.paused ? `
              <button id="btn-autoplay-resume" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded font-semibold text-sm transition-colors">▶ Pokračovat</button>
            ` : `
              <button id="btn-autoplay-pause" class="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold text-sm transition-colors">⏸ Pauza</button>
            `}
            <button id="btn-autoplay-stop" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded font-semibold text-sm transition-colors">⏹ Stop</button>
          ` : `
            <button
              id="btn-toggle-gm-mode"
              class="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded font-semibold text-sm transition-colors"
            >⏹ Stop</button>
          `}
        </div>
      </div>

      <!-- Auto-Play Progress Bar -->
      ${isAutoPlay ? renderAutoPlayProgress() : ''}

      <!-- Collapsible Settings (hidden by default when running) -->
      <div id="gm-settings-panel" class="hidden bg-neutral-800 border-b border-neutral-700 px-4 py-3">
        ${renderSettingsContent(settings, true)}
      </div>

      <!-- Compact Scene Bar -->
      ${renderSceneBar()}

      <!-- Session Log — main area -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-neutral-900" id="gm-session-log" style="scrollbar-width: thin; min-height: 0;">
        ${renderLogContent()}
      </div>

      <!-- Player Inputs or Auto-Play info — sticky bottom -->
      ${isAutoPlay ? renderAutoPlayBottom() : renderPlayerInputs()}
    </div>
  `;
}

/**
 * Layout when GM is stopped — settings visible, log below
 */
function renderStoppedLayout(settings) {
  const hasLog = getGMSessionLog().length > 0;
  const showExport = autoPlayState?.endReason && hasLog;

  return `
    <div class="gm-panel p-6 space-y-4 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">🎭 AI Game Master</h2>
        <button
          id="btn-toggle-gm-mode"
          class="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
        >▶️ Start GM Mode</button>
      </div>

      <!-- Auto-Play Section -->
      <div class="bg-neutral-800 p-4 rounded border border-violet-700/50">
        <h3 class="font-semibold mb-4 text-violet-400">🤖 Auto-Play</h3>
        <p class="text-sm text-neutral-400 mb-4">AI hraje za GM i za lovce. Hra proběhne automaticky.</p>
        <div class="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label class="block text-xs text-neutral-400 mb-1">Max kol</label>
            <input type="range" id="autoplay-max-rounds" min="10" max="50" step="5" value="30" class="w-32" />
            <span id="autoplay-max-rounds-label" class="text-sm text-neutral-300 ml-2">30</span>
          </div>
          <div>
            <label class="block text-xs text-neutral-400 mb-1">Rychlost</label>
            <select id="autoplay-speed" class="bg-neutral-700 px-3 py-1.5 rounded text-sm">
              <option value="slow">Pomalá (12s)</option>
              <option value="normal" selected>Normální (8s)</option>
              <option value="fast">Rychlá (5s)</option>
            </select>
          </div>
          <button
            id="btn-start-autoplay"
            class="px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded font-semibold transition-colors"
          >🤖 Spustit Auto-Play</button>
        </div>
      </div>

      <!-- Settings (open by default) -->
      <div class="bg-neutral-800 p-4 rounded">
        <h3 class="font-semibold mb-4">⚙️ Settings</h3>
        ${renderSettingsContent(settings, false)}
      </div>

      <!-- Session Log -->
      <div class="bg-neutral-900 p-4 rounded">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-lg">📜 Session Log</h3>
          <div class="flex gap-2">
            ${showExport ? `
              <button
                id="btn-export-story"
                class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
              >📖 Exportovat příběh</button>
            ` : ''}
            <button
              id="btn-copy-log"
              class="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
              title="Kopírovat log do schránky"
            >📋 Kopírovat</button>
            <button
              id="btn-clear-log"
              class="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
            >Smazat log</button>
          </div>
        </div>
        <div id="gm-session-log" class="space-y-2 overflow-y-auto pr-2" style="scrollbar-width: thin; max-height: 40vh;">
          ${renderLogContent()}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render auto-play progress bar
 */
function renderAutoPlayProgress() {
  if (!autoPlayState) return '';
  const { currentRound, maxRounds, paused } = autoPlayState;
  const pct = maxRounds > 0 ? Math.round((currentRound / maxRounds) * 100) : 0;

  return `
    <div class="px-4 py-2 bg-neutral-800 border-b border-neutral-700">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-violet-400 font-semibold">Kolo ${currentRound}/${maxRounds}</span>
        <span class="text-neutral-400">${paused ? '⏸ Pozastaveno' : 'Probíhá...'}</span>
      </div>
      <div class="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
        <div class="h-full bg-violet-500 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

/**
 * Render auto-play bottom bar (replaces player inputs)
 */
function renderAutoPlayBottom() {
  return `
    <div class="px-4 py-3 bg-neutral-800 border-t border-neutral-700 text-center text-sm text-violet-400">
      🤖 AI hraje za lovce automaticky...
    </div>
  `;
}

/**
 * Render settings content (shared between running/stopped)
 */
function renderSettingsContent(settings, isRunning) {
  return `
    <div class="grid grid-cols-2 gap-4 text-sm">
      <label class="flex items-center gap-2">
        <input type="checkbox" id="setting-auto-apply" ${settings.autoApplyMechanics ? 'checked' : ''} ${isRunning ? 'disabled' : ''} class="w-4 h-4" />
        <span>Auto-apply mechanics</span>
      </label>
      <div class="flex items-center gap-2">
        <label>Style:</label>
        <select id="setting-narrative-style" ${isRunning ? 'disabled' : ''} class="bg-neutral-700 px-2 py-1 rounded text-sm">
          <option value="minimal" ${settings.narrativeStyle === 'minimal' ? 'selected' : ''}>Minimal</option>
          <option value="balanced" ${settings.narrativeStyle === 'balanced' ? 'selected' : ''}>Balanced</option>
          <option value="verbose" ${settings.narrativeStyle === 'verbose' ? 'selected' : ''}>Verbose</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label>NPC Autonomy:</label>
        <select id="setting-npc-autonomy" ${isRunning ? 'disabled' : ''} class="bg-neutral-700 px-2 py-1 rounded text-sm">
          <option value="low" ${settings.npcAutonomy === 'low' ? 'selected' : ''}>Low</option>
          <option value="medium" ${settings.npcAutonomy === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${settings.npcAutonomy === 'high' ? 'selected' : ''}>High</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label>Ambient:</label>
        <input type="range" id="setting-ambient-frequency" min="30000" max="180000" step="30000" value="${settings.ambientEventFrequency}" ${isRunning ? 'disabled' : ''} class="w-24" />
        <span class="text-neutral-400">${Math.round(settings.ambientEventFrequency / 1000)}s</span>
      </div>
    </div>
    ${!isRunning ? `
      <button id="btn-save-gm-settings" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded mt-4 text-sm">
        Uložit nastavení
      </button>
    ` : ''}
  `;
}

/**
 * Render compact scene bar (1 line)
 */
function renderSceneBar() {
  const scene = getCurrentScene();

  return `
    <div id="gm-scene-bar" class="flex items-center gap-4 px-4 py-2 bg-neutral-800/50 border-b border-neutral-700 text-sm">
      <span class="font-semibold">📍 ${escapeHtml(scene.location?.name || 'Neznámá lokace')}</span>
      <span class="text-neutral-500">|</span>
      <div class="flex items-center gap-1.5">
        <span class="text-neutral-400">Napětí:</span>
        ${renderTensionBar(scene.tension)}
        <span class="text-neutral-400">${scene.tension}/10</span>
      </div>
      <span class="text-neutral-500">|</span>
      <span class="text-neutral-400">Lovci: ${scene.huntersPresent?.length || 0}</span>
      <span class="text-neutral-400">NPC: ${scene.npcsPresent?.length || 0}</span>
      ${scene.threats?.length > 0 ? `<span class="text-red-400">Hrozby: ${scene.threats.length}</span>` : ''}
    </div>
  `;
}

/**
 * Render tension bar
 */
function renderTensionBar(tension) {
  const bars = Array.from({ length: 10 }, (_, i) => {
    const filled = i < tension;
    const color = tension > 7 ? 'bg-red-500' : tension > 4 ? 'bg-yellow-500' : 'bg-green-500';
    return `<div class="w-2 h-2 ${filled ? color : 'bg-neutral-700'} rounded-sm"></div>`;
  });
  return `<div class="inline-flex gap-0.5">${bars.join('')}</div>`;
}

/**
 * Render player input fields (compact, sticky bottom)
 */
function renderPlayerInputs() {
  const { campaign } = getState();

  if (!campaign.hunters || campaign.hunters.length === 0) {
    return `
      <div class="px-4 py-3 bg-neutral-800 border-t border-neutral-700 text-sm text-neutral-400">
        Žádní lovci. Nejprve vytvořte lovce v záložce Kampaň.
      </div>
    `;
  }

  return `
    <div class="px-4 py-3 bg-neutral-800 border-t border-neutral-700 space-y-2">
      ${campaign.hunters.map(hunter => `
        <div class="flex gap-2 items-center">
          <span class="font-semibold text-sm min-w-[80px] truncate">${escapeHtml(hunter.name)}:</span>
          <input
            type="text"
            class="player-action-input flex-1 bg-neutral-700 px-3 py-1.5 rounded border border-neutral-600 focus:border-blue-500 focus:outline-none text-sm"
            data-hunter-id="${hunter.id}"
            placeholder="Co děláš?"
          />
          <button
            class="btn-submit-action px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded font-semibold text-sm transition-colors"
            data-hunter-id="${hunter.id}"
          >▶</button>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render session log entries
 */
function renderLogContent() {
  const log = getGMSessionLog();
  if (log.length === 0) {
    return `<p class="text-neutral-500 italic">Session log je prázdný. Spusťte GM mód.</p>`;
  }
  return log.map(entry => renderLogEntry(entry)).join('');
}

/**
 * Render single log entry
 */
function renderLogEntry(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const msg = escapeHtml(entry.message);

  switch (entry.type) {
    case 'system':
      return `
        <div class="text-neutral-400 text-sm italic">
          [${time}] ${msg}
        </div>
      `;

    case 'scene':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-blue-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Scéna</div>
          <div>${msg}</div>
        </div>
      `;

    case 'player': {
      const hunter = escapeHtml(entry.hunter);
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-green-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] ${hunter}</div>
          <div><strong>${hunter}:</strong> ${msg}</div>
        </div>
      `;
    }

    case 'gm':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-purple-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Keeper</div>
          <div>${msg}</div>
          ${entry.roll ? `
            <div class="mt-2 text-sm text-neutral-400">
              🎲 Roll: ${entry.roll.roll.die1} + ${entry.roll.roll.die2} + ${entry.roll.statValue} = ${entry.roll.total}
              (${escapeHtml(entry.roll.outcome)})
            </div>
          ` : ''}
        </div>
      `;

    case 'npc': {
      const npc = escapeHtml(entry.npc);
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-yellow-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] ${npc}</div>
          <div><strong>${npc}:</strong> ${msg}</div>
        </div>
      `;
    }

    case 'ambient':
      return `
        <div class="text-neutral-400 italic p-2">
          [${time}] <em>${msg}</em>
        </div>
      `;

    case 'consequence':
      return `
        <div class="bg-red-900/20 p-3 rounded border-l-4 border-red-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Důsledek</div>
          <div>${msg}</div>
        </div>
      `;

    case 'autoplay':
      return `
        <div class="bg-violet-900/20 p-3 rounded border-l-4 border-violet-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Auto-Play</div>
          <div class="text-violet-300">${msg}</div>
        </div>
      `;

    default:
      return `
        <div class="text-neutral-400 text-sm">
          [${time}] ${msg}
        </div>
      `;
  }
}

// --- Named event handlers (module-level to enable remove+add pattern) ---

function handleSessionUpdate() {
  refreshSessionLog();
}

function handleAutoPlayProgress(e) {
  autoPlayState = e.detail;
  // Update progress bar without full re-render
  const progressContainer = document.querySelector('.gm-panel > div:nth-child(2)');
  if (progressContainer && autoPlayState.running) {
    const temp = document.createElement('div');
    temp.innerHTML = renderAutoPlayProgress();
    const newEl = temp.firstElementChild;
    if (newEl && progressContainer.querySelector('.bg-violet-500')) {
      progressContainer.replaceWith(newEl);
    }
  }
  // Update header pause/resume buttons
  refreshAutoPlayButtons();
}

function handleAutoPlayComplete(e) {
  autoPlayState = { ...autoPlayState, ...e.detail, running: false };
  // Stop GM mode when auto-play finishes
  stopGMMode();
  refreshGMPanel();
}

function handleAutoPlayRateLimited(e) {
  showToast(e.detail?.message || 'API limit — pauza');
}

/**
 * Attach event listeners
 */
export function attachGMPanelListeners() {
  // Toggle GM Mode
  const toggleBtn = document.getElementById('btn-toggle-gm-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const isRunning = isGMModeRunning();
      if (isRunning) {
        stopGMMode();
      } else {
        await startGMMode();
      }
      refreshGMPanel();
    });
  }

  // Toggle settings panel (running mode)
  const toggleSettingsBtn = document.getElementById('btn-toggle-settings');
  if (toggleSettingsBtn) {
    toggleSettingsBtn.addEventListener('click', () => {
      const panel = document.getElementById('gm-settings-panel');
      if (panel) {
        panel.classList.toggle('hidden');
      }
    });
  }

  // Submit player actions
  const submitButtons = document.querySelectorAll('.btn-submit-action');
  submitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const hunterId = btn.getAttribute('data-hunter-id');
      const input = document.querySelector(`.player-action-input[data-hunter-id="${hunterId}"]`);
      if (input && input.value.trim()) {
        processPlayerAction(hunterId, input.value.trim());
        input.value = '';
      }
    });
  });

  // Enter key to submit
  const inputs = document.querySelectorAll('.player-action-input');
  inputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const hunterId = input.getAttribute('data-hunter-id');
        if (input.value.trim()) {
          processPlayerAction(hunterId, input.value.trim());
          input.value = '';
        }
      }
    });
  });

  // Save settings
  const saveSettingsBtn = document.getElementById('btn-save-gm-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const autoApply = document.getElementById('setting-auto-apply').checked;
      const narrativeStyle = document.getElementById('setting-narrative-style').value;
      const npcAutonomy = document.getElementById('setting-npc-autonomy').value;
      const ambientFrequency = parseInt(document.getElementById('setting-ambient-frequency').value);

      updateGMSettings({
        autoApplyMechanics: autoApply,
        narrativeStyle,
        npcAutonomy,
        ambientEventFrequency: ambientFrequency
      });

      alert('Nastavení uloženo!');
    });
  }

  // Copy log
  const copyLogBtn = document.getElementById('btn-copy-log');
  if (copyLogBtn) {
    copyLogBtn.addEventListener('click', () => {
      const log = getGMSessionLog();
      if (log.length === 0) return;

      const text = log.map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        switch (entry.type) {
          case 'player': return `[${time}] ${entry.hunter}: ${entry.message}`;
          case 'gm': {
            let line = `[${time}] Keeper: ${entry.message}`;
            if (entry.roll) line += `\n  🎲 ${entry.roll.roll.die1}+${entry.roll.roll.die2}+${entry.roll.statValue}=${entry.roll.total} (${entry.roll.outcome})`;
            return line;
          }
          case 'npc': return `[${time}] ${entry.npc}: ${entry.message}`;
          case 'scene': return `[${time}] [Scéna] ${entry.message}`;
          case 'ambient': return `[${time}] *${entry.message}*`;
          case 'consequence': return `[${time}] [Důsledek] ${entry.message}`;
          case 'autoplay': return `[${time}] [Auto-Play] ${entry.message}`;
          default: return `[${time}] ${entry.message}`;
        }
      }).join('\n\n');

      navigator.clipboard.writeText(text).then(() => {
        const origText = copyLogBtn.textContent;
        copyLogBtn.textContent = '✓ Zkopírováno';
        setTimeout(() => { copyLogBtn.textContent = origText; }, 2000);
      });
    });
  }

  // Clear log
  const clearLogBtn = document.getElementById('btn-clear-log');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      if (confirm('Smazat session log?')) {
        import('../../ai/gm/gm-engine.js').then(({ gmEngine }) => {
          gmEngine.clearSessionLog();
          autoPlayState = null;
          refreshGMPanel();
        });
      }
    });
  }

  // --- Auto-Play controls ---

  // Max rounds slider label
  const roundsSlider = document.getElementById('autoplay-max-rounds');
  if (roundsSlider) {
    roundsSlider.addEventListener('input', () => {
      const label = document.getElementById('autoplay-max-rounds-label');
      if (label) label.textContent = roundsSlider.value;
    });
  }

  // Start Auto-Play
  const startAutoPlayBtn = document.getElementById('btn-start-autoplay');
  if (startAutoPlayBtn) {
    startAutoPlayBtn.addEventListener('click', async () => {
      const maxRounds = parseInt(document.getElementById('autoplay-max-rounds')?.value || '30');
      const speed = document.getElementById('autoplay-speed')?.value || 'normal';

      startAutoPlayBtn.disabled = true;
      startAutoPlayBtn.textContent = '⏳ Startuje...';

      const controller = await getAutoPlayController();
      controller.start({ maxRounds, speed });

      // UI updates happen via events — wait a moment then refresh
      setTimeout(() => refreshGMPanel(), 500);
    });
  }

  // Pause Auto-Play
  const pauseBtn = document.getElementById('btn-autoplay-pause');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', async () => {
      const controller = await getAutoPlayController();
      controller.pause();
    });
  }

  // Resume Auto-Play
  const resumeBtn = document.getElementById('btn-autoplay-resume');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', async () => {
      const controller = await getAutoPlayController();
      controller.resume();
    });
  }

  // Stop Auto-Play
  const stopAutoPlayBtn = document.getElementById('btn-autoplay-stop');
  if (stopAutoPlayBtn) {
    stopAutoPlayBtn.addEventListener('click', async () => {
      const controller = await getAutoPlayController();
      controller.stop();
    });
  }

  // Export Story
  const exportBtn = document.getElementById('btn-export-story');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.textContent = '⏳ Generuji příběh...';

      try {
        const { exportStory } = await import('../../ai/gm/story-exporter.js');
        const log = getGMSessionLog();
        const { campaign, currentMysteryId } = getState();
        const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

        const story = await exportStory(log, mystery);
        showStoryModal(story);
      } catch (error) {
        console.error('[GM Panel] Story export error:', error);
        alert('Chyba při generování příběhu: ' + error.message);
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = '📖 Exportovat příběh';
      }
    });
  }

  // --- Event listeners for auto-play events ---
  // Remove old listeners before adding to prevent duplicates on re-attach
  window.removeEventListener('gm-session-update', handleSessionUpdate);
  window.removeEventListener('autoplay-progress', handleAutoPlayProgress);
  window.removeEventListener('autoplay-complete', handleAutoPlayComplete);
  window.removeEventListener('autoplay-rate-limited', handleAutoPlayRateLimited);

  window.addEventListener('gm-session-update', handleSessionUpdate);
  window.addEventListener('autoplay-progress', handleAutoPlayProgress);
  window.addEventListener('autoplay-complete', handleAutoPlayComplete);
  window.addEventListener('autoplay-rate-limited', handleAutoPlayRateLimited);

  // Auto-refresh scene if running
  if (isGMModeRunning() && !updateInterval) {
    updateInterval = setInterval(() => {
      refreshSceneBar();
    }, 5000);
  } else if (!isGMModeRunning() && updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/**
 * Refresh auto-play buttons (pause/resume)
 */
function refreshAutoPlayButtons() {
  if (!autoPlayState?.running) return;

  const pauseBtn = document.getElementById('btn-autoplay-pause');
  const resumeBtn = document.getElementById('btn-autoplay-resume');

  if (autoPlayState.paused && pauseBtn) {
    // Switch to resume button
    pauseBtn.id = 'btn-autoplay-resume';
    pauseBtn.textContent = '▶ Pokračovat';
    pauseBtn.className = 'px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded font-semibold text-sm transition-colors';
    pauseBtn.onclick = async () => {
      const controller = await getAutoPlayController();
      controller.resume();
    };
  } else if (!autoPlayState.paused && resumeBtn) {
    // Switch to pause button
    resumeBtn.id = 'btn-autoplay-pause';
    resumeBtn.textContent = '⏸ Pauza';
    resumeBtn.className = 'px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold text-sm transition-colors';
    resumeBtn.onclick = async () => {
      const controller = await getAutoPlayController();
      controller.pause();
    };
  }
}

/**
 * Show story in modal
 */
function showStoryModal(story) {
  // Remove existing modal
  const existing = document.getElementById('story-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'story-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4';
  modal.innerHTML = `
    <div class="bg-neutral-900 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col border border-neutral-700">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
        <h2 class="text-xl font-bold">📖 Příběh</h2>
        <div class="flex gap-2">
          <button id="btn-copy-story" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">📋 Kopírovat</button>
          <button id="btn-close-story" class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm">Zavřít</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-4 prose prose-invert max-w-none" style="scrollbar-width: thin;">
        ${renderMarkdown(story)}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  document.getElementById('btn-close-story').addEventListener('click', () => {
    modal.remove();
  });

  // Click backdrop to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Copy story
  document.getElementById('btn-copy-story').addEventListener('click', () => {
    navigator.clipboard.writeText(story).then(() => {
      const btn = document.getElementById('btn-copy-story');
      btn.textContent = '✓ Zkopírováno';
      setTimeout(() => { btn.textContent = '📋 Kopírovat'; }, 2000);
    });
  });
}

/**
 * Simple markdown to HTML renderer (headings, bold, italic, paragraphs)
 */
function renderMarkdown(md) {
  return md
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      // Headings — escape content
      if (block.startsWith('# ')) return `<h1 class="text-2xl font-bold mb-4 mt-6">${escapeHtml(block.slice(2))}</h1>`;
      if (block.startsWith('## ')) return `<h2 class="text-xl font-semibold mb-3 mt-5">${escapeHtml(block.slice(3))}</h2>`;
      if (block.startsWith('### ')) return `<h3 class="text-lg font-semibold mb-2 mt-4">${escapeHtml(block.slice(4))}</h3>`;
      // Escape first, then apply bold/italic on safe content
      block = escapeHtml(block);
      block = block.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      block = block.replace(/\*(.+?)\*/g, '<em>$1</em>');
      block = block.replace(/_(.+?)_/g, '<em>$1</em>');
      return `<p class="mb-3 leading-relaxed">${block}</p>`;
    })
    .join('\n');
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 bg-yellow-600 text-white rounded-lg shadow-lg text-sm font-semibold animate-pulse';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/**
 * Refresh entire GM panel
 */
function refreshGMPanel() {
  const container = document.getElementById('gm-tab-content');
  if (container) {
    container.innerHTML = renderGMPanel();
    attachGMPanelListeners();
  }
}

/**
 * Refresh only session log
 */
function refreshSessionLog() {
  const logContainer = document.getElementById('gm-session-log');
  if (logContainer) {
    const log = getGMSessionLog();
    logContainer.innerHTML = log.length === 0
      ? `<p class="text-neutral-500 italic">Session log je prázdný.</p>`
      : log.map(entry => renderLogEntry(entry)).join('');

    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

/**
 * Refresh scene bar
 */
function refreshSceneBar() {
  const sceneBar = document.getElementById('gm-scene-bar');
  if (sceneBar && isGMModeRunning()) {
    const temp = document.createElement('div');
    temp.innerHTML = renderSceneBar();
    sceneBar.replaceWith(temp.firstElementChild);
  }
}
