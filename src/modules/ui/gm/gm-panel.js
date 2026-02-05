/**
 * GM Panel UI
 * Main interface for AI Game Master mode
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

/**
 * Render GM Panel
 */
export function renderGMPanel() {
  const isRunning = isGMModeRunning();
  const settings = getGMSettings();

  return `
    <div class="gm-panel p-6 space-y-4 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold">🎭 AI Game Master</h2>
          <p class="text-sm text-neutral-400 mt-1">Plně autonomní vedení herní session</p>
        </div>
        <button
          id="btn-toggle-gm-mode"
          class="px-6 py-2 rounded font-semibold transition-colors ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }"
        >
          ${isRunning ? '⏹ Stop GM Mode' : '▶️ Start GM Mode'}
        </button>
      </div>

      <!-- Status Indicator -->
      <div class="bg-neutral-800 p-4 rounded border-l-4 ${
        isRunning ? 'border-green-500' : 'border-neutral-600'
      }">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full ${
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'
          }"></div>
          <span class="font-semibold">
            Status: ${isRunning ? 'AI GM is running' : 'AI GM is stopped'}
          </span>
        </div>
      </div>

      <!-- Settings -->
      ${renderSettings(settings, isRunning)}

      <!-- Current Scene -->
      ${isRunning ? renderCurrentScene() : ''}

      <!-- Player Actions Input -->
      ${isRunning ? renderPlayerInputs() : ''}

      <!-- Session Log -->
      ${renderSessionLog()}
    </div>
  `;
}

/**
 * Render settings panel
 */
function renderSettings(settings, isRunning) {
  return `
    <details class="bg-neutral-800 p-4 rounded" ${isRunning ? '' : 'open'}>
      <summary class="cursor-pointer font-semibold mb-4">⚙️ GM Settings</summary>
      <div class="space-y-4 ml-4">
        <!-- Auto Apply Mechanics -->
        <label class="flex items-center gap-3">
          <input
            type="checkbox"
            id="setting-auto-apply"
            ${settings.autoApplyMechanics ? 'checked' : ''}
            ${isRunning ? 'disabled' : ''}
            class="w-4 h-4"
          />
          <span>Auto-apply mechanics (harm, conditions)</span>
        </label>

        <!-- Narrative Style -->
        <div>
          <label class="block mb-2">Narrative Style:</label>
          <select
            id="setting-narrative-style"
            ${isRunning ? 'disabled' : ''}
            class="bg-neutral-700 px-3 py-2 rounded w-full"
          >
            <option value="minimal" ${settings.narrativeStyle === 'minimal' ? 'selected' : ''}>
              Minimal (stručné popisy)
            </option>
            <option value="balanced" ${settings.narrativeStyle === 'balanced' ? 'selected' : ''}>
              Balanced (vyvážené)
            </option>
            <option value="verbose" ${settings.narrativeStyle === 'verbose' ? 'selected' : ''}>
              Verbose (detailní popisy)
            </option>
          </select>
        </div>

        <!-- NPC Autonomy -->
        <div>
          <label class="block mb-2">NPC Autonomy:</label>
          <select
            id="setting-npc-autonomy"
            ${isRunning ? 'disabled' : ''}
            class="bg-neutral-700 px-3 py-2 rounded w-full"
          >
            <option value="low" ${settings.npcAutonomy === 'low' ? 'selected' : ''}>
              Low (NPCs reagují jen na akce)
            </option>
            <option value="medium" ${settings.npcAutonomy === 'medium' ? 'selected' : ''}>
              Medium (občasné akce)
            </option>
            <option value="high" ${settings.npcAutonomy === 'high' ? 'selected' : ''}>
              High (plná autonomie)
            </option>
          </select>
        </div>

        <!-- Ambient Event Frequency -->
        <div>
          <label class="block mb-2">Ambient Events:</label>
          <input
            type="range"
            id="setting-ambient-frequency"
            min="30000"
            max="180000"
            step="30000"
            value="${settings.ambientEventFrequency}"
            ${isRunning ? 'disabled' : ''}
            class="w-full"
          />
          <span class="text-sm text-neutral-400">
            Every ${Math.round(settings.ambientEventFrequency / 1000)}s
          </span>
        </div>

        ${!isRunning ? `
          <button
            id="btn-save-gm-settings"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded mt-4"
          >
            Save Settings
          </button>
        ` : ''}
      </div>
    </details>
  `;
}

/**
 * Render current scene
 */
function renderCurrentScene() {
  const scene = getCurrentScene();

  return `
    <div class="bg-neutral-800 p-4 rounded">
      <h3 class="font-bold mb-3 text-lg">📍 Current Scene</h3>
      <div class="space-y-2 text-sm">
        <div><span class="font-semibold">Location:</span> ${scene.location?.name || 'Unknown'}</div>
        <div><span class="font-semibold">Tension:</span>
          <div class="inline-flex items-center gap-1">
            ${renderTensionBar(scene.tension)}
            <span class="ml-2">${scene.tension}/10</span>
          </div>
        </div>
        <div><span class="font-semibold">Hunters Present:</span> ${scene.huntersPresent?.length || 0}</div>
        <div><span class="font-semibold">NPCs Present:</span> ${scene.npcsPresent?.length || 0}</div>
        ${scene.threats?.length > 0 ? `
          <div><span class="font-semibold">Active Threats:</span> ${scene.threats.length}</div>
        ` : ''}
      </div>
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
    return `<div class="w-3 h-3 ${filled ? color : 'bg-neutral-700'} rounded-sm"></div>`;
  });
  return `<div class="inline-flex gap-1">${bars.join('')}</div>`;
}

/**
 * Render player input fields
 */
function renderPlayerInputs() {
  const { campaign } = getState();

  if (!campaign.hunters || campaign.hunters.length === 0) {
    return `
      <div class="bg-neutral-800 p-4 rounded">
        <p class="text-neutral-400">No hunters available. Create hunters first.</p>
      </div>
    `;
  }

  return `
    <div class="bg-neutral-800 p-4 rounded">
      <h3 class="font-bold mb-3 text-lg">🎬 Player Actions</h3>
      <div class="space-y-3">
        ${campaign.hunters.map(hunter => `
          <div class="flex gap-2 items-center">
            <span class="font-semibold min-w-[120px]">${hunter.name}:</span>
            <input
              type="text"
              class="player-action-input flex-1 bg-neutral-700 px-3 py-2 rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
              data-hunter-id="${hunter.id}"
              placeholder="Co děláš? (např. 'Útočím na upíra mečem')"
            />
            <button
              class="btn-submit-action px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
              data-hunter-id="${hunter.id}"
            >
              Submit
            </button>
          </div>
        `).join('')}
      </div>
      <div class="mt-4 text-sm text-neutral-400">
        <p>💡 Tip: Be specific about your action. AI will detect MOTW moves automatically.</p>
      </div>
    </div>
  `;
}

/**
 * Render session log
 */
function renderSessionLog() {
  const log = getGMSessionLog();

  return `
    <div class="bg-neutral-900 p-4 rounded">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg">📜 Session Log</h3>
        <button
          id="btn-clear-log"
          class="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
        >
          Clear Log
        </button>
      </div>
      <div
        id="gm-session-log"
        class="space-y-2 max-h-96 overflow-y-auto pr-2"
        style="scrollbar-width: thin;"
      >
        ${log.length === 0 ? `
          <p class="text-neutral-500 italic">Session log is empty. Start GM mode to begin.</p>
        ` : log.map(entry => renderLogEntry(entry)).join('')}
      </div>
    </div>
  `;
}

/**
 * Render single log entry
 */
function renderLogEntry(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString();

  switch (entry.type) {
    case 'system':
      return `
        <div class="text-neutral-400 text-sm italic">
          [${time}] ${entry.message}
        </div>
      `;

    case 'scene':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-blue-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Scene Description</div>
          <div>${entry.message}</div>
        </div>
      `;

    case 'player':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-green-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] ${entry.hunter}</div>
          <div><strong>${entry.hunter}:</strong> ${entry.message}</div>
        </div>
      `;

    case 'gm':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-purple-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Keeper</div>
          <div>${entry.message}</div>
          ${entry.roll ? `
            <div class="mt-2 text-sm text-neutral-400">
              🎲 Roll: ${entry.roll.roll.die1} + ${entry.roll.roll.die2} + ${entry.roll.statValue} = ${entry.roll.total}
              (${entry.roll.outcome})
            </div>
          ` : ''}
        </div>
      `;

    case 'npc':
      return `
        <div class="bg-neutral-800 p-3 rounded border-l-4 border-yellow-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] ${entry.npc}</div>
          <div><strong>${entry.npc}:</strong> ${entry.message}</div>
        </div>
      `;

    case 'ambient':
      return `
        <div class="text-neutral-400 italic p-2">
          [${time}] <em>${entry.message}</em>
        </div>
      `;

    case 'consequence':
      return `
        <div class="bg-red-900/20 p-3 rounded border-l-4 border-red-500">
          <div class="text-xs text-neutral-400 mb-1">[${time}] Consequence</div>
          <div>${entry.message}</div>
        </div>
      `;

    default:
      return `
        <div class="text-neutral-400 text-sm">
          [${time}] ${entry.message}
        </div>
      `;
  }
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

      alert('Settings saved!');
    });
  }

  // Clear log
  const clearLogBtn = document.getElementById('btn-clear-log');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      if (confirm('Clear session log?')) {
        const { gmEngine } = require('../../ai/gm/gm-engine.js');
        gmEngine.clearSessionLog();
        refreshGMPanel();
      }
    });
  }

  // Listen for session updates
  window.addEventListener('gm-session-update', () => {
    refreshSessionLog();
  });

  // Auto-refresh if running
  if (isGMModeRunning() && !updateInterval) {
    updateInterval = setInterval(() => {
      refreshCurrentScene();
    }, 5000); // Refresh scene every 5s
  } else if (!isGMModeRunning() && updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
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
      ? `<p class="text-neutral-500 italic">Session log is empty.</p>`
      : log.map(entry => renderLogEntry(entry)).join('');

    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

/**
 * Refresh current scene display
 */
function refreshCurrentScene() {
  const sceneContainer = document.querySelector('.gm-panel > div:nth-child(4)');
  if (sceneContainer && isGMModeRunning()) {
    const newScene = renderCurrentScene();
    const temp = document.createElement('div');
    temp.innerHTML = newScene;
    sceneContainer.replaceWith(temp.firstElementChild);
  }
}
