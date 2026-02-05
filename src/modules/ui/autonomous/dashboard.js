/**
 * Autonomous Dashboard - Main UI for autonomous AI work
 */

import { getState } from '../../state/store.js';
import { showPreview, handleAccept, handleReject } from './review-panel.js';
import { getAgentState } from '../../ai/autonomous/agent-core.js';
import { escapeHtml } from '../../../utils/html.js';

/**
 * Render autonomous dashboard
 */
export function renderAutonomousDashboard() {
  const container = document.getElementById('tab-autonomous');
  if (!container) return;

  const { campaign } = getState();

  if (!campaign) {
    container.innerHTML = `
      <div class="p-6 text-center text-gray-400">
        <span class="material-symbols-outlined text-6xl mb-4 block">auto_awesome</span>
        <p>Není načtena žádná kampaň</p>
      </div>
    `;
    return;
  }

  const autonomous = campaign.aiAutonomous || {};
  const workQueue = autonomous.workQueue || [];
  const pendingWork = workQueue.filter(w => w.status === 'pending');
  const recentAccepted = workQueue.filter(w => w.status === 'accepted').slice(-3);

  container.innerHTML = `
    <div class="h-full overflow-y-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold flex items-center gap-3">
            <span class="material-symbols-outlined text-purple-500">auto_awesome</span>
            AI Background Work
          </h2>
          <p class="text-sm text-gray-400 mt-1">
            Autonomní AI vytváří obsah na pozadí zatímco nejsi aktivní
          </p>
        </div>
        <button
          id="btn-autonomous-settings"
          class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          <span class="material-symbols-outlined text-sm">settings</span>
          Nastavení
        </button>
      </div>

      <!-- Statistics Card -->
      ${renderStatistics(autonomous.stats || {})}

      <!-- Agent Status Card -->
      ${renderAgentStatus(autonomous)}

      <!-- Pending Work Queue -->
      ${pendingWork.length > 0 ? `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-yellow-500">pending</span>
              Čeká na schválení
              <span class="px-2 py-0.5 bg-yellow-900/40 text-yellow-400 text-xs rounded-full">
                ${pendingWork.length}
              </span>
            </h3>
            ${pendingWork.length > 1 ? `
              <button
                id="btn-accept-all"
                class="px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 border border-green-700/50 rounded-lg text-sm font-semibold transition"
              >
                <span class="material-symbols-outlined text-sm">done_all</span>
                Schválit vše
              </button>
            ` : ''}
          </div>
          <div class="space-y-3">
            ${pendingWork.map(work => renderWorkItemCard(work)).join('')}
          </div>
        </div>
      ` : `
        <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-8 text-center">
          <span class="material-symbols-outlined text-5xl text-gray-600 mb-3 block">
            inbox
          </span>
          <p class="text-gray-400">Žádné nové AI práce k schválení</p>
          <p class="text-sm text-gray-500 mt-1">
            Agent vytvoří obsah automaticky když budeš neaktivní
          </p>
        </div>
      `}

      <!-- Recently Accepted -->
      ${recentAccepted.length > 0 ? `
        <div class="space-y-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-green-500">check_circle</span>
            Nedávno schváleno
          </h3>
          <div class="space-y-2">
            ${recentAccepted.map(work => renderAcceptedWorkCard(work)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Attach event listeners
  attachEventListeners();
}

/**
 * Render statistics card
 */
function renderStatistics(stats) {
  const totalCost = (stats.estimatedCost || 0).toFixed(4);
  const avgCostPerItem = stats.totalWorkItems > 0
    ? (stats.estimatedCost / stats.totalWorkItems).toFixed(4)
    : '0.0000';

  return `
    <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-6">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Statistiky
      </h3>
      <div class="grid grid-cols-4 gap-4">
        <div>
          <div class="text-2xl font-bold text-white">${stats.totalWorkItems || 0}</div>
          <div class="text-xs text-gray-500">Celkem vygenerováno</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-400">${stats.acceptedItems || 0}</div>
          <div class="text-xs text-gray-500">Schváleno</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-red-400">${stats.rejectedItems || 0}</div>
          <div class="text-xs text-gray-500">Zamítnuto</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-400">${stats.totalRuns || 0}</div>
          <div class="text-xs text-gray-500">Běhů agenta</div>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-gray-400">Celkové tokeny:</span>
          <span class="font-mono text-white">${(stats.totalTokensUsed || 0).toLocaleString()}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-400">Odhadovaná cena:</span>
          <span class="font-mono text-white">$${totalCost}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render agent status card
 */
function renderAgentStatus(autonomous) {
  const agentState = getAgentState();
  const isEnabled = autonomous.enabled || false;
  const lastRun = autonomous.lastAgentRun;
  const state = autonomous.agentState || 'idle';

  let statusIcon = 'hourglass_empty';
  let statusColor = 'gray';
  let statusText = 'Idle';

  if (!isEnabled) {
    statusIcon = 'pause';
    statusColor = 'gray';
    statusText = 'Vypnuto';
  } else if (state === 'assessing') {
    statusIcon = 'psychology';
    statusColor = 'blue';
    statusText = 'Analyzuje stav hry';
  } else if (state === 'generating') {
    statusIcon = 'edit_note';
    statusColor = 'purple';
    statusText = 'Generuje obsah';
  } else {
    statusIcon = 'check';
    statusColor = 'green';
    statusText = 'Připraven';
  }

  const lastRunText = lastRun
    ? timeSince(lastRun)
    : 'Nikdy';

  return `
    <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-${statusColor}-900/40 rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-${statusColor}-400">${statusIcon}</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Status agenta</h3>
            <p class="text-sm text-gray-400">${statusText}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            id="btn-run-agent-now"
            class="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            title="Spusť agenta hned (test)"
          >
            <span class="material-symbols-outlined text-sm">play_arrow</span>
            Run Now
          </button>
          <button
            id="btn-toggle-autonomous"
            class="px-4 py-2 ${isEnabled ? 'bg-red-900/40 hover:bg-red-800/60 border-red-700/50' : 'bg-green-900/40 hover:bg-green-800/60 border-green-700/50'} border rounded-lg text-sm font-semibold transition"
          >
            ${isEnabled ? 'Pozastavit' : 'Spustit'}
          </button>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
        <div class="flex justify-between">
          <span>Poslední běh:</span>
          <span>${lastRunText}</span>
        </div>
        <div class="flex justify-between mt-2">
          <span>Idle timeout:</span>
          <span>${(autonomous.idleTimeout || 60000) / 60000} min</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render work item card
 */
function renderWorkItemCard(work) {
  const typeIcons = {
    lore: 'auto_stories',
    story: 'book',
    notes: 'description',
    event: 'event',
    twist: 'magic_wand',
    world: 'public'
  };

  const typeColors = {
    lore: 'purple',
    story: 'blue',
    notes: 'green',
    event: 'orange',
    twist: 'pink',
    world: 'cyan'
  };

  const icon = typeIcons[work.type] || 'article';
  const color = typeColors[work.type] || 'gray';

  const timeAgo = timeSince(work.createdAt);

  return `
    <div class="bg-neutral-800/50 border border-white/10 rounded-lg p-4 hover:border-${color}-500/30 transition">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 bg-${color}-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-${color}-400 text-xl">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold uppercase tracking-wider text-${color}-400">
              ${work.type}
            </span>
            <span class="text-xs text-gray-500">${timeAgo}</span>
          </div>
          <h4 class="text-base font-semibold mb-2">${escapeHtml(work.title)}</h4>
          <p class="text-sm text-gray-400 line-clamp-2 mb-3">
            ${work.goalReason ? escapeHtml(work.goalReason) : 'AI vygenerovalo tento obsah pro rozšíření záhady'}
          </p>
          <div class="flex items-center gap-2">
            <button
              data-work-id="${work.id}"
              data-action="preview"
              class="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 border border-white/10 rounded text-xs font-semibold transition flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-xs">visibility</span>
              Náhled
            </button>
            <button
              data-work-id="${work.id}"
              data-action="accept"
              class="px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 border border-green-700/50 rounded text-xs font-semibold transition flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-xs">check</span>
              Schválit
            </button>
            <button
              data-work-id="${work.id}"
              data-action="reject"
              class="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-xs font-semibold transition flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-xs">close</span>
              Zamítnout
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render accepted work card (compact)
 */
function renderAcceptedWorkCard(work) {
  const timeAgo = timeSince(work.reviewedAt || work.createdAt);

  return `
    <div class="bg-neutral-800/30 border border-white/5 rounded-lg p-3 flex items-center gap-3">
      <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">${escapeHtml(work.title)}</div>
        <div class="text-xs text-gray-500">${work.type} · ${timeAgo}</div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Preview/accept/reject buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const workId = e.currentTarget.dataset.workId;
      const action = e.currentTarget.dataset.action;

      if (action === 'preview') {
        showPreview(workId);
      } else if (action === 'accept') {
        handleAccept(workId);
      } else if (action === 'reject') {
        handleReject(workId);
      }
    });
  });

  // Accept all button
  const acceptAllBtn = document.getElementById('btn-accept-all');
  if (acceptAllBtn) {
    acceptAllBtn.addEventListener('click', handleAcceptAll);
  }

  // Toggle autonomous button
  const toggleBtn = document.getElementById('btn-toggle-autonomous');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', handleToggleAutonomous);
  }

  // Run now button
  const runNowBtn = document.getElementById('btn-run-agent-now');
  if (runNowBtn) {
    runNowBtn.addEventListener('click', handleRunAgentNow);
  }

  // Settings button
  const settingsBtn = document.getElementById('btn-autonomous-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      import('../settings-modal.js').then(({ showSettingsModal }) => {
        showSettingsModal('autonomous');
      });
    });
  }
}

/**
 * Handle accept all
 */
async function handleAcceptAll() {
  const { campaign } = getState();
  const pendingWork = campaign?.aiAutonomous?.workQueue?.filter(w => w.status === 'pending') || [];

  for (const work of pendingWork) {
    await handleAccept(work.id);
  }

  renderAutonomousDashboard();
}

/**
 * Handle run agent now
 */
async function handleRunAgentNow() {
  const button = document.getElementById('btn-run-agent-now');
  if (!button) return;

  // Disable button
  button.disabled = true;
  button.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Běží...';

  try {
    // Import and run agent
    const { runAgentCycle } = await import('../../ai/autonomous/agent-core.js');
    await runAgentCycle();

    // Show success
    button.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Hotovo!';

    // Reset after 2s
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = '<span class="material-symbols-outlined text-sm">play_arrow</span> Run Now';
      renderAutonomousDashboard(); // Refresh to show new work
    }, 2000);

  } catch (error) {
    console.error('Failed to run agent:', error);

    // Show error
    button.innerHTML = '<span class="material-symbols-outlined text-sm">error</span> Chyba';

    // Reset after 2s
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = '<span class="material-symbols-outlined text-sm">play_arrow</span> Run Now';
    }, 2000);
  }
}

/**
 * Handle toggle autonomous
 */
function handleToggleAutonomous() {
  import('../../state/store.js').then(({ updateAutonomousSettings }) => {
    const { campaign } = getState();
    const currentlyEnabled = campaign?.aiAutonomous?.enabled || false;

    updateAutonomousSettings({ enabled: !currentlyEnabled });

    if (!currentlyEnabled) {
      // Starting - also start the agent
      import('../../ai/autonomous/agent-core.js').then(({ startAutonomousAgent }) => {
        startAutonomousAgent();
      });
    } else {
      // Stopping
      import('../../ai/autonomous/agent-core.js').then(({ stopAutonomousAgent }) => {
        stopAutonomousAgent();
      });
    }

    renderAutonomousDashboard();
  });
}

/**
 * Time since helper
 */
function timeSince(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'před chvílí';
  if (seconds < 3600) return `před ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `před ${Math.floor(seconds / 3600)} h`;
  return `před ${Math.floor(seconds / 86400)} dny`;
}
