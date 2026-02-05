/**
 * Thinking Panel - UI for viewing AI Keeper's thinking process
 */

import { getState, subscribe } from '../../state/store.js';
import { getThinkingLog, getThinkingStats, exportThinkingLog, clearThinkingLog } from '../../ai/keeper/thinking-logger.js';
import { escapeHtml } from '../../../utils/html.js';

let subscriptionId = null;

/**
 * Initialize thinking panel
 */
export function initThinkingPanel() {
  // Subscribe to state changes
  subscriptionId = subscribe((state, oldState) => {
    // Re-render if thinking log changed OR mystery changed
    if (state.campaign?.aiKeeperLog !== oldState.campaign?.aiKeeperLog ||
        state.currentMysteryId !== oldState.currentMysteryId) {
      renderThinkingPanel();
    }
  });

  // Initial render
  renderThinkingPanel();
}

/**
 * Cleanup thinking panel
 */
export function cleanupThinkingPanel() {
  if (subscriptionId) {
    subscriptionId();
    subscriptionId = null;
  }
}

/**
 * Render thinking panel
 */
export function renderThinkingPanel() {
  const container = document.getElementById('tab-keeper');
  if (!container) return;

  const { campaign, currentMysteryId } = getState();

  if (!campaign) {
    container.innerHTML = `
      <div class="p-6 text-center text-gray-400">
        <span class="material-symbols-outlined text-6xl mb-4 block">psychology</span>
        <p>Není načtena žádná kampaň</p>
      </div>
    `;
    return;
  }

  if (!currentMysteryId) {
    container.innerHTML = `
      <div class="p-6 text-center text-gray-400">
        <span class="material-symbols-outlined text-6xl mb-4 block">psychology</span>
        <p>Není vybráno žádné mystery</p>
      </div>
    `;
    return;
  }

  const thinkingLog = getThinkingLog(currentMysteryId);
  const stats = getThinkingStats(currentMysteryId);

  // Build HTML with fixed color classes (P0 #3: Fix Tailwind dynamic classes)
  const headerHTML = `
    <div class="h-full overflow-y-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold flex items-center gap-3">
            <span class="material-symbols-outlined text-blue-500">psychology</span>
            AI Keeper Mind
          </h2>
          <p class="text-sm text-gray-400 mt-1">
            Transparentní log jak AI přemýšlí a rozhoduje
          </p>
        </div>
        <div class="flex gap-2">
          <button
            id="btn-export-thinking"
            class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            title="Export thinking log jako JSON"
          >
            <span class="material-symbols-outlined text-sm">download</span>
            Export
          </button>
          ${thinkingLog.length > 0 ? `
            <button
              id="btn-clear-thinking"
              class="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              title="Vymazat thinking log"
            >
              <span class="material-symbols-outlined text-sm">delete</span>
              Vymazat
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Statistics -->
      ${renderThinkingStats(stats)}

      <!-- Thinking Timeline -->
      ${thinkingLog.length > 0 ? `
        <div class="space-y-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-500">timeline</span>
            Thinking Timeline
            <span class="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-xs rounded-full">
              ${thinkingLog.length}
            </span>
          </h3>
          <div id="thinking-entries" class="space-y-2">
            ${thinkingLog.map(entry => renderThinkingEntry(entry)).join('')}
          </div>
        </div>
      ` : `
        <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-8 text-center">
          <span class="material-symbols-outlined text-5xl text-gray-600 mb-3 block">
            psychology
          </span>
          <p class="text-gray-400">Zatím žádné AI myšlenky</p>
          <p class="text-sm text-gray-500 mt-1">
            Thinking log se objeví když AI Keeper začne pracovat
          </p>
        </div>
      `}
    </div>
  `;

  container.innerHTML = headerHTML;

  // Attach event listeners using event delegation (P0 #1: Fix memory leak)
  attachEventListeners();
}

/**
 * Render thinking statistics
 */
function renderThinkingStats(stats) {
  return `
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-4">
        <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Celkem</div>
        <div class="text-2xl font-bold text-blue-400">${stats.total || 0}</div>
      </div>
      <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-4">
        <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Úspěšnost</div>
        <div class="text-2xl font-bold text-green-400">
          ${stats.successRate ? `${Math.round(stats.successRate * 100)}%` : '-'}
        </div>
      </div>
      <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-4">
        <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Jistota</div>
        <div class="text-2xl font-bold text-yellow-400">
          ${stats.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}%` : '-'}
        </div>
      </div>
      <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-4">
        <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Fáze</div>
        <div class="text-xs text-gray-300 mt-1 space-y-0.5">
          ${Object.entries(stats.byPhase || {}).map(([phase, count]) => `
            <div>${getPhaseLabel(phase)}: ${count}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render single thinking entry
 */
function renderThinkingEntry(entry) {
  const phaseIcon = getPhaseIcon(entry.phase);
  const phaseLabel = getPhaseLabel(entry.phase);
  const timeAgo = getTimeAgo(entry.timestamp);

  // P0 #3: Fixed color classes (no template strings)
  const phaseColorClasses = {
    assessing: { bg: 'bg-blue-900/20', text: 'text-blue-400' },
    deciding: { bg: 'bg-yellow-900/20', text: 'text-yellow-400' },
    planning: { bg: 'bg-purple-900/20', text: 'text-purple-400' },
    executing: { bg: 'bg-green-900/20', text: 'text-green-400' },
    reflecting: { bg: 'bg-gray-900/20', text: 'text-gray-400' }
  };

  const colorClasses = phaseColorClasses[entry.phase] || phaseColorClasses.reflecting;

  return `
    <div class="thinking-entry bg-neutral-800/50 border border-white/10 rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 p-4 border-b border-white/5 ${colorClasses.bg}">
        <span class="material-symbols-outlined ${colorClasses.text}">${phaseIcon}</span>
        <div class="flex-1">
          <div class="font-semibold ${colorClasses.text}">${phaseLabel}</div>
          <div class="text-xs text-gray-500">${timeAgo}</div>
        </div>
        <button
          class="btn-toggle-thinking p-2 hover:bg-white/5 rounded transition"
          data-entry-id="${entry.id}"
        >
          <span class="material-symbols-outlined text-sm">expand_more</span>
        </button>
      </div>

      <!-- Content (collapsible) -->
      <div class="thinking-content hidden p-4 space-y-3 text-sm">
        ${entry.observation ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Pozorování</div>
            <div class="text-gray-300">${escapeHtml(entry.observation)}</div>
          </div>
        ` : ''}

        ${entry.reasoning && entry.reasoning.length > 0 ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Reasoning</div>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              ${entry.reasoning.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${entry.options && entry.options.length > 0 ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Možnosti</div>
            <div class="space-y-2">
              ${entry.options.map(opt => `
                <div class="bg-neutral-900/50 p-2 rounded">
                  <div class="font-semibold text-gray-200">${escapeHtml(opt.action)}</div>
                  <div class="text-xs text-gray-400">Priority: ${opt.priority}</div>
                  <div class="text-xs text-gray-500">${escapeHtml(opt.reason)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${entry.decision ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Rozhodnutí</div>
            <div class="bg-green-900/20 border border-green-700/30 p-3 rounded">
              <div class="font-semibold text-green-400">${escapeHtml(entry.decision.selected)}</div>
              ${entry.decision.confidence ? `
                <div class="text-xs text-gray-400 mt-1">Jistota: ${Math.round(entry.decision.confidence * 100)}%</div>
              ` : ''}
              ${entry.decision.reasoning ? `
                <div class="text-xs text-gray-300 mt-1">${escapeHtml(entry.decision.reasoning)}</div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${entry.plan ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Plán</div>
            <div class="space-y-1">
              <div class="text-gray-300"><strong>Cíl:</strong> ${escapeHtml(entry.plan.goal)}</div>
              ${entry.plan.steps && entry.plan.steps.length > 0 ? `
                <div class="text-gray-400">
                  <strong>Kroky:</strong>
                  <ol class="list-decimal list-inside ml-2 mt-1">
                    ${entry.plan.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}
              ${entry.plan.expectedOutcome ? `
                <div class="text-gray-500 text-xs">→ ${escapeHtml(entry.plan.expectedOutcome)}</div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${entry.result ? `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Výsledek</div>
            <div class="${entry.result.success ? 'bg-green-900/20 border-green-700/30' : 'bg-red-900/20 border-red-700/30'} border p-3 rounded">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined ${entry.result.success ? 'text-green-400' : 'text-red-400'}">
                  ${entry.result.success ? 'check_circle' : 'error'}
                </span>
                <span class="font-semibold ${entry.result.success ? 'text-green-400' : 'text-red-400'}">
                  ${entry.result.success ? 'Úspěch' : 'Selhání'}
                </span>
              </div>
              ${entry.result.workItemId ? `
                <div class="text-xs text-gray-400 mt-1">Work Item: ${entry.result.workItemId}</div>
              ` : ''}
              ${entry.result.error ? `
                <div class="text-xs text-gray-300 mt-1">Chyba: ${escapeHtml(entry.result.error)}</div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${entry.contextSnapshot ? `
          <details class="text-xs">
            <summary class="cursor-pointer text-gray-500 hover:text-gray-400">
              Context Snapshot
            </summary>
            <pre class="mt-2 p-2 bg-neutral-900/50 rounded overflow-x-auto text-gray-400">${JSON.stringify(entry.contextSnapshot, null, 2)}</pre>
          </details>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Attach event listeners using event delegation (P0 #1: Fix memory leak)
 */
function attachEventListeners() {
  const container = document.getElementById('tab-keeper');
  if (!container) return;

  // Event delegation for toggle buttons (no memory leak!)
  container.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.btn-toggle-thinking');
    if (toggleBtn) {
      const entry = toggleBtn.closest('.thinking-entry');
      const content = entry.querySelector('.thinking-content');
      const icon = toggleBtn.querySelector('.material-symbols-outlined');

      content.classList.toggle('hidden');
      icon.textContent = content.classList.contains('hidden') ? 'expand_more' : 'expand_less';
      return;
    }

    // Export thinking log
    if (e.target.closest('#btn-export-thinking')) {
      const { currentMysteryId } = getState();
      if (!currentMysteryId) return;

      const json = exportThinkingLog(currentMysteryId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keeper-thinking-${currentMysteryId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Clear thinking log
    if (e.target.closest('#btn-clear-thinking')) {
      const { currentMysteryId } = getState();
      if (!currentMysteryId) return;

      if (confirm('Opravdu chceš vymazat celý thinking log?')) {
        clearThinkingLog(currentMysteryId);
      }
      return;
    }
  });
}

/**
 * Get phase color
 */
function getPhaseColor(phase) {
  const colors = {
    assessing: 'blue',
    deciding: 'yellow',
    planning: 'purple',
    executing: 'green',
    reflecting: 'gray'
  };
  return colors[phase] || 'gray';
}

/**
 * Get phase icon
 */
function getPhaseIcon(phase) {
  const icons = {
    assessing: 'search',
    deciding: 'psychology',
    planning: 'list',
    executing: 'play_arrow',
    reflecting: 'lightbulb'
  };
  return icons[phase] || 'circle';
}

/**
 * Get phase label
 */
function getPhaseLabel(phase) {
  const labels = {
    assessing: 'Assessing',
    deciding: 'Deciding',
    planning: 'Planning',
    executing: 'Executing',
    reflecting: 'Reflecting'
  };
  return labels[phase] || phase;
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'před chvílí';
  if (seconds < 3600) return `před ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `před ${Math.floor(seconds / 3600)} h`;
  return `před ${Math.floor(seconds / 86400)} dny`;
}
