/**
 * Story Spine - Timeline of canonical story events
 */

import { getState } from '../../state/store.js';
import { removeFromSpine, updateSpineEntry } from '../../state/store.js';
import { showAddToSpineModal } from './modals.js';

/**
 * Render story spine
 */
export function renderStorySpine(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    return '<div class="text-gray-500 p-4">Mystery not found</div>';
  }

  const spine = mystery.storySpine || [];

  // Group by session
  const grouped = groupBySession(spine);

  return `
    <div class="story-spine h-full overflow-y-auto p-4 space-y-6">
      <div class="flex items-center justify-between mb-4 sticky top-0 bg-black/90 backdrop-blur-sm pb-3 z-10">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-500">timeline</span>
          Story Spine
        </h2>
        <button id="btn-add-spine-entry" class="bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 px-3 py-1.5 rounded text-sm transition">
          <span class="material-symbols-outlined text-sm align-middle">add</span>
          Přidat událost
        </button>
      </div>

      <div
        class="spine-drop-zone border-2 border-dashed border-blue-500/30 rounded-lg p-6 text-center text-sm text-gray-500 transition hover:border-blue-500/50 hover:bg-blue-900/10"
        id="spine-drop-zone"
      >
        <span class="material-symbols-outlined text-3xl text-blue-500/30 mb-2 block">move_down</span>
        <p>📦 Přetáhni položky z Content Pool sem</p>
      </div>

      ${renderSessionGroup('past', '⏮️ MINULOST', grouped.past || [])}
      ${Object.entries(grouped.sessions || {})
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([num, entries]) =>
          renderSessionGroup(num, `📅 SESSION ${num}`, entries)
        ).join('')}
      ${renderSessionGroup('now', '🔴 TEĎ', grouped.now || [])}
    </div>
  `;
}

/**
 * Group spine entries by session
 */
function groupBySession(spine) {
  const grouped = {
    past: [],
    sessions: {},
    now: []
  };

  spine.forEach(entry => {
    if (entry.session === 'past') {
      grouped.past.push(entry);
    } else if (entry.session === 'now') {
      grouped.now.push(entry);
    } else {
      // Session number
      const sessionNum = entry.session;
      if (!grouped.sessions[sessionNum]) {
        grouped.sessions[sessionNum] = [];
      }
      grouped.sessions[sessionNum].push(entry);
    }
  });

  // Sort each group chronologically
  grouped.past.sort((a, b) => a.timestamp - b.timestamp);
  grouped.now.sort((a, b) => a.timestamp - b.timestamp);
  Object.values(grouped.sessions).forEach(entries => {
    entries.sort((a, b) => a.timestamp - b.timestamp);
  });

  return grouped;
}

/**
 * Render session group
 */
function renderSessionGroup(session, title, entries) {
  return `
    <div class="session-group">
      <div class="flex items-center gap-3 mb-3">
        <h3 class="text-lg font-bold text-white">${title}</h3>
        <div class="flex-1 border-t border-white/10"></div>
        <span class="text-xs text-gray-500">${entries.length} events</span>
      </div>

      ${entries.length === 0 ? `
        <div class="text-sm text-gray-500 italic ml-8 py-2">Žádné události</div>
      ` : `
        <div class="space-y-3 ml-8">
          ${entries.map(entry => renderSpineEntry(entry)).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render single spine entry
 */
function renderSpineEntry(entry) {
  const categoryIcons = {
    countdown: '🎬',
    monster: '👹',
    npc: '👥',
    location: '📍',
    clue: '🔍',
    combat: '⚔️',
    world: '🌍',
    people: '👥',
    environment: '🏔️',
    news: '📻'
  };

  const icon = categoryIcons[entry.category] || '📝';
  const time = formatTime(entry.timestamp);

  return `
    <div
      class="spine-entry bg-neutral-800/50 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition group"
      data-spine-id="${entry.id}"
    >
      <div class="flex items-start gap-3">
        <div class="text-xl shrink-0">${icon}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            ${entry.title ? `<div class="font-semibold text-white">${escapeHtml(entry.title)}</div>` : ''}
            <div class="text-xs text-gray-500">${time}</div>
            ${entry.sourcePoolId ? `
              <span class="text-xs text-blue-400 flex items-center gap-1">
                <span class="material-symbols-outlined" style="font-size: 12px;">source</span>
                Pool
              </span>
            ` : ''}
          </div>
          <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">${escapeHtml(entry.content)}</p>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            class="btn-spine-edit p-1.5 hover:bg-white/10 rounded transition"
            data-spine-id="${entry.id}"
            title="Upravit"
          >
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            class="btn-spine-delete p-1.5 hover:bg-red-900/40 rounded text-red-400 transition"
            data-spine-id="${entry.id}"
            title="Smazat"
          >
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for spine
 */
export function attachSpineEventListeners(mysteryId) {
  // Edit buttons
  document.querySelectorAll('.btn-spine-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const spineId = e.currentTarget.dataset.spineId;
      handleEditSpineEntry(mysteryId, spineId);
    });
  });

  // Delete buttons
  document.querySelectorAll('.btn-spine-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const spineId = e.currentTarget.dataset.spineId;
      handleDeleteSpineEntry(mysteryId, spineId);
    });
  });

  // Add entry button
  document.getElementById('btn-add-spine-entry')?.addEventListener('click', () => {
    handleAddSpineManually(mysteryId);
  });

  // Drop zone
  attachSpineDragDrop(mysteryId);
}

/**
 * Attach drag & drop to spine
 */
export function attachSpineDragDrop(mysteryId) {
  const dropZone = document.getElementById('spine-drop-zone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('border-blue-500', 'bg-blue-900/20');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-900/20');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-900/20');

    const poolId = e.dataTransfer.getData('poolId');
    if (poolId) {
      await handleDropToSpine(mysteryId, poolId);
    }
  });
}

/**
 * Handle drop to spine
 */
async function handleDropToSpine(mysteryId, poolItemId) {
  // Show modal to customize before adding
  showAddToSpineModal(mysteryId, poolItemId);
}

/**
 * Handle edit spine entry
 */
function handleEditSpineEntry(mysteryId, spineId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);
  const entry = mystery?.storySpine?.find(e => e.id === spineId);

  if (!entry) return;

  const newContent = prompt('Upravit obsah události:', entry.content);
  if (newContent && newContent.trim() !== '') {
    updateSpineEntry(mysteryId, spineId, { content: newContent.trim() });

    // Re-render spine
    refreshSpine(mysteryId);
  }
}

/**
 * Handle delete spine entry
 */
function handleDeleteSpineEntry(mysteryId, spineId) {
  if (confirm('Smazat tuto událost ze Story Spine?')) {
    removeFromSpine(mysteryId, spineId);

    // Re-render spine
    refreshSpine(mysteryId);
  }
}

/**
 * Handle add spine entry manually
 */
function handleAddSpineManually(mysteryId) {
  showAddToSpineModal(mysteryId, null);
}

/**
 * Refresh spine display
 */
function refreshSpine(mysteryId) {
  const container = document.querySelector('.story-spine-panel');
  if (container) {
    container.innerHTML = renderStorySpine(mysteryId);
    attachSpineEventListeners(mysteryId);
  }
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `Dnes ${timeStr}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Včera ${timeStr}`;
  } else {
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
