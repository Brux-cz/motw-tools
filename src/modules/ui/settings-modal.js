/**
 * Settings Modal - Application settings including AI configuration
 */

import { showModal, hideModal } from './modals.js';
import { getSettings, updateSettings, getState } from '../state/store.js';
import { testApiKey, getAvailableModels } from '../ai/client.js';
import { escapeHtml } from '../../utils/html.js';

/**
 * Show settings modal
 * @param {string} initialTab - Initial tab to show ('general', 'ai', or 'autonomous')
 */
export function showSettingsModal(initialTab = 'general') {
  const settings = getSettings();

  const content = `
    <div class="settings-container">
      <!-- Tabs -->
      <div class="flex gap-4 border-b border-white/10 mb-6">
        <button
          id="settings-tab-general"
          class="settings-tab pb-2 px-1 text-sm font-semibold transition ${
            initialTab === 'general' ? 'text-white border-b-2 border-red-700' : 'text-gray-400 hover:text-gray-200'
          }"
        >
          Obecné
        </button>
        <button
          id="settings-tab-ai"
          class="settings-tab pb-2 px-1 text-sm font-semibold transition ${
            initialTab === 'ai' ? 'text-white border-b-2 border-red-700' : 'text-gray-400 hover:text-gray-200'
          }"
        >
          AI
        </button>
      </div>

      <!-- General Tab -->
      <div id="settings-general" class="${initialTab === 'general' ? '' : 'hidden'}">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Auto-save</label>
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="setting-autosave"
                ${settings.autoSave ? 'checked' : ''}
                class="w-4 h-4 bg-neutral-800 border border-white/20 rounded"
              />
              <span class="text-sm text-gray-400">Automaticky ukládat změny v kampani</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Auto-save delay (ms)
            </label>
            <input
              type="number"
              id="setting-autosave-delay"
              value="${settings.autoSaveDelay || 500}"
              min="100"
              max="5000"
              step="100"
              class="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p class="text-xs text-gray-500 mt-1">Zpoždění před uložením změn (100-5000 ms)</p>
          </div>
        </div>
      </div>

      <!-- AI Tab -->
      <div id="settings-ai" class="${initialTab === 'ai' ? '' : 'hidden'}">
        <div class="space-y-4">
          <!-- API Key -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Anthropic API Key
              <span class="text-red-400">*</span>
            </label>
            <div class="flex gap-2">
              <input
                type="password"
                id="setting-api-key"
                value="${escapeHtml(settings.ai?.apiKey || '')}"
                placeholder="sk-ant-..."
                class="flex-1 bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
              <button
                id="btn-test-api-key"
                class="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded-lg text-sm font-semibold transition"
              >
                Test
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Získej na <a href="https://console.anthropic.com" target="_blank" class="text-purple-400 hover:text-purple-300">console.anthropic.com</a>
            </p>
            <div id="api-key-status" class="mt-2"></div>
          </div>

          <!-- Model Selection -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Model</label>
            <select
              id="setting-model"
              class="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              ${getAvailableModels()
                .map(
                  model => `
                <option value="${model.id}" ${settings.ai?.model === model.id ? 'selected' : ''}>
                  ${model.name} - ${model.description}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <!-- Temperature -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Temperature: <span id="temperature-value">${(settings.ai?.temperature || 0.7).toFixed(1)}</span>
            </label>
            <input
              type="range"
              id="setting-temperature"
              min="0"
              max="1"
              step="0.1"
              value="${settings.ai?.temperature || 0.7}"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              Nižší = konzistentnější, vyšší = kreativnější (doporučeno: 0.7)
            </p>
          </div>

          <!-- Max Tokens -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Max Tokens</label>
            <input
              type="number"
              id="setting-max-tokens"
              value="${settings.ai?.maxTokens || 4000}"
              min="512"
              max="8192"
              step="512"
              class="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p class="text-xs text-gray-500 mt-1">
              Maximální délka AI odpovědi (512-8192)
            </p>
          </div>

          <!-- Max History Messages -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Historie zpráv
            </label>
            <input
              type="number"
              id="setting-max-history"
              value="${settings.ai?.maxHistoryMessages || 50}"
              min="10"
              max="200"
              step="10"
              class="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p class="text-xs text-gray-500 mt-1">
              Kolik zpráv z historie poslat AI (10-200)
            </p>
          </div>

        </div>
      </div>
    </div>
  `;

  showModal({
    title: 'Nastavení',
    content,
    buttons: [
      {
        id: 'btn-cancel-settings',
        label: 'Zrušit',
        primary: false
      },
      {
        id: 'btn-save-settings',
        label: 'Uložit',
        primary: true
      }
    ]
  });

  // Wait for DOM to be ready, then initialize
  setTimeout(() => {
    // Initialize tab switching
    initTabSwitching();

    // Initialize temperature slider
    const temperatureSlider = document.getElementById('setting-temperature');
    const temperatureValue = document.getElementById('temperature-value');
    if (temperatureSlider && temperatureValue) {
      temperatureSlider.addEventListener('input', () => {
        temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(1);
      });
    }

    // Test API key button
    const testBtn = document.getElementById('btn-test-api-key');
    if (testBtn) {
      testBtn.addEventListener('click', handleTestApiKey);
    }

    // Save button
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSaveSettings);
    }

    // Cancel button
    const cancelBtn = document.getElementById('btn-cancel-settings');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', hideModal);
    }
  }, 0);
}

/**
 * Initialize tab switching
 */
function initTabSwitching() {
  const tabs = {
    general: {
      btn: document.getElementById('settings-tab-general'),
      content: document.getElementById('settings-general')
    },
    ai: {
      btn: document.getElementById('settings-tab-ai'),
      content: document.getElementById('settings-ai')
    }
  };

  Object.entries(tabs).forEach(([tabName, tab]) => {
    if (tab.btn && tab.content) {
      tab.btn.addEventListener('click', () => {
        // Deactivate all tabs
        Object.values(tabs).forEach(t => {
          if (t.btn && t.content) {
            t.btn.classList.remove('text-white', 'border-b-2', 'border-red-700');
            t.btn.classList.add('text-gray-400', 'hover:text-gray-200');
            t.content.classList.add('hidden');
          }
        });

        // Activate clicked tab
        tab.btn.classList.add('text-white', 'border-b-2', 'border-red-700');
        tab.btn.classList.remove('text-gray-400', 'hover:text-gray-200');
        tab.content.classList.remove('hidden');

        console.log(`Settings: Switched to ${tabName} tab`);
      });
    } else {
      console.error(`Settings tab ${tabName}: Missing button or content element`);
    }
  });

  console.log('Settings tabs initialized');
}

/**
 * Test API key
 */
async function handleTestApiKey() {
  const apiKeyInput = document.getElementById('setting-api-key');
  const statusEl = document.getElementById('api-key-status');
  const testBtn = document.getElementById('btn-test-api-key');

  if (!apiKeyInput || !statusEl || !testBtn) return;

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    statusEl.innerHTML = `
      <div class="text-xs text-yellow-400 flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">warning</span>
        <span>Prosím zadej API klíč</span>
      </div>
    `;
    return;
  }

  // Show loading
  testBtn.disabled = true;
  testBtn.textContent = 'Testuji...';
  statusEl.innerHTML = `
    <div class="text-xs text-gray-400">Testuji API klíč...</div>
  `;

  try {
    const isValid = await testApiKey(apiKey);

    if (isValid) {
      statusEl.innerHTML = `
        <div class="text-xs text-green-400 flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">check_circle</span>
          <span>API klíč je platný ✓</span>
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="text-xs text-red-400 flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">error</span>
          <span>API klíč je neplatný</span>
        </div>
      `;
    }
  } catch (error) {
    statusEl.innerHTML = `
      <div class="text-xs text-red-400 flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">error</span>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test';
  }
}

/**
 * Save settings
 */
function handleSaveSettings() {
  // General settings
  const autoSave = document.getElementById('setting-autosave')?.checked;
  const autoSaveDelay = parseInt(document.getElementById('setting-autosave-delay')?.value || '500');

  // AI settings
  const apiKey = document.getElementById('setting-api-key')?.value?.trim() || '';
  const model = document.getElementById('setting-model')?.value || 'claude-3-5-sonnet-20241022';
  const temperature = parseFloat(document.getElementById('setting-temperature')?.value || '0.7');
  const maxTokens = parseInt(document.getElementById('setting-max-tokens')?.value || '4000');
  const maxHistoryMessages = parseInt(document.getElementById('setting-max-history')?.value || '50');

  const newSettings = {
    autoSave,
    autoSaveDelay,
    ai: {
      provider: 'anthropic',
      apiKey,
      model,
      temperature,
      maxTokens,
      maxHistoryMessages,
      autoActions: true,
      requireConfirmation: false
    }
  };

  updateSettings(newSettings);

  hideModal();

  // Show success message (optional)
  console.log('Settings saved:', newSettings);
}
