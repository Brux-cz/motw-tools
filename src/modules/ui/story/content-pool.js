/**
 * Content Pool - Bank of story ideas and whispers
 */

import { getState } from '../../state/store.js';
import { removeFromPool, updatePoolItem } from '../../state/store.js';
import { showAddToSpineModal, showAddToPoolModal } from './modals.js';

/**
 * Render content pool
 */
export function renderContentPool(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    return '<div class="text-gray-500 p-4">Mystery not found</div>';
  }

  const pool = mystery.contentPool || [];

  // Filter pending items
  const pending = pool.filter(item => item.status === 'pending');

  // Group by type
  const grouped = {
    whispers: pending.filter(i => i.type === 'whisper'),
    lore: pending.filter(i => i.type === 'lore'),
    events: pending.filter(i => i.type === 'event'),
    npcs: pending.filter(i => i.type === 'npc'),
    places: pending.filter(i => i.type === 'place'),
    twists: pending.filter(i => i.type === 'twist')
  };

  return `
    <div class="content-pool h-full overflow-y-auto p-4 space-y-4">
      <div class="flex items-center justify-between mb-4 sticky top-0 bg-black/90 backdrop-blur-sm pb-3 z-10">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-500">inventory_2</span>
          Content Pool
        </h2>
        <button id="btn-add-pool-manual" class="bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 px-3 py-1.5 rounded text-sm transition">
          <span class="material-symbols-outlined text-sm align-middle">add</span>
          Přidat
        </button>
      </div>

      ${renderWhispersSection(grouped.whispers)}
      ${renderGroupSection('lore', '📖 Lore Fragments', grouped.lore)}
      ${renderGroupSection('events', '🎭 Events', grouped.events)}
      ${renderGroupSection('npcs', '👤 NPCs', grouped.npcs)}
      ${renderGroupSection('places', '📍 Places', grouped.places)}
      ${renderGroupSection('twists', '🎲 Twists', grouped.twists)}
    </div>
  `;
}

/**
 * Render whispers section
 */
function renderWhispersSection(whispers) {
  if (whispers.length === 0) {
    return `
      <div class="bg-neutral-800/30 border border-white/5 rounded-lg p-4 text-center">
        <span class="material-symbols-outlined text-gray-600 text-3xl">psychology</span>
        <p class="text-sm text-gray-500 mt-2">Žádné nové whispers</p>
        <p class="text-xs text-gray-600 mt-1">AI vygeneruje nápady když jsi idle</p>
      </div>
    `;
  }

  return `
    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        💭 Whispers
        <span class="text-xs bg-blue-900/40 px-2 py-0.5 rounded-full">${whispers.length}</span>
      </h3>
      ${whispers.map(whisper => renderPoolItem(whisper)).join('')}
    </div>
  `;
}

/**
 * Render generic group section
 */
function renderGroupSection(type, title, items) {
  if (items.length === 0) {
    return '';
  }

  return `
    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        ${title}
        <span class="text-xs bg-blue-900/40 px-2 py-0.5 rounded-full">${items.length}</span>
      </h3>
      ${items.map(item => renderPoolItem(item)).join('')}
    </div>
  `;
}

/**
 * Render single pool item
 */
function renderPoolItem(item) {
  const categoryIcons = {
    world: '🌍',
    people: '👥',
    environment: '🏔️',
    news: '📻',
    clues: '🔍'
  };

  const icon = categoryIcons[item.category] || '💭';
  const timeAgo = formatTimeAgo(item.createdAt);

  return `
    <div
      class="pool-item bg-neutral-800/50 border border-white/10 rounded-lg p-3 hover:border-blue-500/30 transition cursor-move group"
      draggable="true"
      data-pool-id="${item.id}"
      data-type="${item.type}"
    >
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">${icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-gray-400 mb-1.5">
            ${item.category || item.type} • ${timeAgo}
            ${item.source === 'ai-whisperer' ? '<span class="text-purple-400">• AI</span>' : ''}
          </div>
          ${item.title ? `<div class="font-semibold text-sm mb-1">${escapeHtml(item.title)}</div>` : ''}
          <p class="text-sm text-gray-300 leading-relaxed">${escapeHtml(item.content)}</p>
          <div class="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition">
            <button
              class="btn-pool-use px-2 py-1 bg-green-900/40 hover:bg-green-800/60 border border-green-700/50 rounded text-xs transition"
              data-pool-id="${item.id}"
              title="Přidat do Story Spine"
            >
              <span class="material-symbols-outlined text-xs align-middle">arrow_forward</span>
              Use
            </button>
            <button
              class="btn-pool-edit px-2 py-1 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 rounded text-xs transition"
              data-pool-id="${item.id}"
              title="Upravit"
            >
              <span class="material-symbols-outlined text-xs align-middle">edit</span>
              Edit
            </button>
            <button
              class="btn-pool-reject px-2 py-1 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-xs transition"
              data-pool-id="${item.id}"
              title="Smazat"
            >
              <span class="material-symbols-outlined text-xs align-middle">close</span>
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for pool
 */
export function attachPoolEventListeners(mysteryId) {
  // Use button
  document.querySelectorAll('.btn-pool-use').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const poolId = e.currentTarget.dataset.poolId;
      handleUsePoolItem(mysteryId, poolId);
    });
  });

  // Edit button
  document.querySelectorAll('.btn-pool-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const poolId = e.currentTarget.dataset.poolId;
      handleEditPoolItem(mysteryId, poolId);
    });
  });

  // Reject button
  document.querySelectorAll('.btn-pool-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const poolId = e.currentTarget.dataset.poolId;
      handleRejectPoolItem(mysteryId, poolId);
    });
  });

  // Drag start
  document.querySelectorAll('.pool-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });

  // Add manual button
  document.getElementById('btn-add-pool-manual')?.addEventListener('click', () => {
    handleAddPoolManually(mysteryId);
  });
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  const poolId = e.currentTarget.dataset.poolId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('poolId', poolId);
  e.currentTarget.classList.add('opacity-50');
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  e.currentTarget.classList.remove('opacity-50');
}

/**
 * Handle use pool item
 */
function handleUsePoolItem(mysteryId, poolItemId) {
  showAddToSpineModal(mysteryId, poolItemId);
}

/**
 * Handle edit pool item
 */
function handleEditPoolItem(mysteryId, poolItemId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);
  const item = mystery?.contentPool?.find(i => i.id === poolItemId);

  if (!item) return;

  const newContent = prompt('Upravit obsah:', item.content);
  if (newContent && newContent.trim() !== '') {
    updatePoolItem(mysteryId, poolItemId, { content: newContent.trim() });

    // Re-render pool
    const container = document.querySelector('.content-pool-panel');
    if (container) {
      container.innerHTML = renderContentPool(mysteryId);
      attachPoolEventListeners(mysteryId);
    }
  }
}

/**
 * Handle reject pool item
 */
function handleRejectPoolItem(mysteryId, poolItemId) {
  if (confirm('Smazat tento nápad z poolu?')) {
    removeFromPool(mysteryId, poolItemId);

    // Re-render pool
    const container = document.querySelector('.content-pool-panel');
    if (container) {
      container.innerHTML = renderContentPool(mysteryId);
      attachPoolEventListeners(mysteryId);
    }
  }
}

/**
 * Handle add pool item manually
 */
function handleAddPoolManually(mysteryId) {
  showAddToPoolModal(mysteryId);
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'právě teď';
  if (seconds < 3600) return `před ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `před ${Math.floor(seconds / 3600)} h`;
  return `před ${Math.floor(seconds / 86400)} dny`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
