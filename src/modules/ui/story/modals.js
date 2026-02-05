/**
 * Story System Modals
 */

import { getState } from '../../state/store.js';
import { addToStorySpine, usePoolItem, addToContentPool } from '../../state/store.js';
import { renderContentPool, attachPoolEventListeners } from './content-pool.js';
import { renderStorySpine, attachSpineEventListeners } from './story-spine.js';

/**
 * Show "Add to Spine" modal
 */
export function showAddToSpineModal(mysteryId, poolItemId = null) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) return;

  // Get pool item if provided
  const poolItem = poolItemId
    ? mystery.contentPool?.find(i => i.id === poolItemId)
    : null;

  const defaultContent = poolItem?.content || '';
  const defaultTitle = poolItem?.title || '';
  const defaultCategory = poolItem?.category || 'world';

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-neutral-900 border border-white/10 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Přidat do Story Spine</h3>
          <button id="modal-close" class="text-gray-400 hover:text-white transition">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form id="add-to-spine-form" class="space-y-4">
          <!-- Session -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Session
            </label>
            <select
              name="session"
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-purple-500 outline-none"
            >
              <option value="past">⏮️ Minulost</option>
              <option value="1">📅 Session 1</option>
              <option value="2">📅 Session 2</option>
              <option value="3">📅 Session 3</option>
              <option value="4">📅 Session 4</option>
              <option value="5">📅 Session 5</option>
              <option value="now" selected>🔴 Teď</option>
            </select>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Kategorie
            </label>
            <select
              name="category"
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-purple-500 outline-none"
            >
              <option value="countdown" ${defaultCategory === 'countdown' ? 'selected' : ''}>🎬 Countdown</option>
              <option value="monster" ${defaultCategory === 'monster' ? 'selected' : ''}>👹 Monster</option>
              <option value="npc" ${defaultCategory === 'npc' || defaultCategory === 'people' ? 'selected' : ''}>👥 NPC/People</option>
              <option value="location" ${defaultCategory === 'location' ? 'selected' : ''}>📍 Location</option>
              <option value="clue" ${defaultCategory === 'clues' ? 'selected' : ''}>🔍 Clue</option>
              <option value="combat" ${defaultCategory === 'combat' ? 'selected' : ''}>⚔️ Combat</option>
              <option value="world" ${defaultCategory === 'world' || defaultCategory === 'environment' || defaultCategory === 'news' ? 'selected' : ''}>🌍 World</option>
            </select>
          </div>

          <!-- Title (optional) -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Název (volitelné)
            </label>
            <input
              type="text"
              name="title"
              value="${escapeHtml(defaultTitle)}"
              placeholder="Krátký popisný název..."
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-purple-500 outline-none"
            />
          </div>

          <!-- Content -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Obsah *
            </label>
            <textarea
              name="content"
              rows="6"
              required
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-purple-500 outline-none resize-none"
              placeholder="Co se stalo..."
            >${escapeHtml(defaultContent)}</textarea>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <button
              type="submit"
              class="flex-1 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 px-4 py-2 rounded font-semibold transition"
            >
              <span class="material-symbols-outlined text-sm align-middle">add</span>
              Přidat do Spine
            </button>
            <button
              type="button"
              id="modal-cancel"
              class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded transition"
            >
              Zrušit
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const close = () => {
    modal.remove();
  };

  modal.querySelector('#modal-close')?.addEventListener('click', close);
  modal.querySelector('#modal-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Form submit
  modal.querySelector('#add-to-spine-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
      session: formData.get('session') === 'past' || formData.get('session') === 'now'
        ? formData.get('session')
        : parseInt(formData.get('session')),
      category: formData.get('category'),
      title: formData.get('title')?.trim() || '',
      content: formData.get('content')?.trim()
    };

    if (!data.content) {
      alert('Obsah je povinný');
      return;
    }

    if (poolItemId) {
      // Move from pool to spine
      usePoolItem(mysteryId, poolItemId, data);
    } else {
      // Add directly to spine
      addToStorySpine(mysteryId, {
        ...data,
        source: 'user',
        sourcePoolId: null,
        metadata: {}
      });
    }

    // Refresh UI
    refreshStoryUI(mysteryId);

    close();
  });
}

/**
 * Show "Add to Pool" modal
 */
export function showAddToPoolModal(mysteryId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-neutral-900 border border-white/10 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Přidat do Content Pool</h3>
          <button id="modal-close" class="text-gray-400 hover:text-white transition">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form id="add-to-pool-form" class="space-y-4">
          <!-- Type -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Typ
            </label>
            <select
              name="type"
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
            >
              <option value="whisper">💭 Whisper</option>
              <option value="lore">📖 Lore Fragment</option>
              <option value="event">🎭 Event</option>
              <option value="npc">👤 NPC</option>
              <option value="place">📍 Place</option>
              <option value="twist">🎲 Twist</option>
            </select>
          </div>

          <!-- Category (for whispers) -->
          <div id="category-field">
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Kategorie
            </label>
            <select
              name="category"
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
            >
              <option value="world">🌍 World</option>
              <option value="people">👥 People</option>
              <option value="environment">🏔️ Environment</option>
              <option value="news">📻 News</option>
              <option value="clues">🔍 Clues</option>
            </select>
          </div>

          <!-- Title (optional) -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Název (volitelné)
            </label>
            <input
              type="text"
              name="title"
              placeholder="Krátký popisný název..."
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
            />
          </div>

          <!-- Content -->
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Obsah *
            </label>
            <textarea
              name="content"
              rows="6"
              required
              class="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none resize-none"
              placeholder="Tvůj nápad..."
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <button
              type="submit"
              class="flex-1 bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/50 px-4 py-2 rounded font-semibold transition"
            >
              <span class="material-symbols-outlined text-sm align-middle">add</span>
              Přidat do Pool
            </button>
            <button
              type="button"
              id="modal-cancel"
              class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded transition"
            >
              Zrušit
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const close = () => {
    modal.remove();
  };

  modal.querySelector('#modal-close')?.addEventListener('click', close);
  modal.querySelector('#modal-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Show/hide category based on type
  const typeSelect = modal.querySelector('select[name="type"]');
  const categoryField = modal.querySelector('#category-field');

  typeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'whisper') {
      categoryField.style.display = 'block';
    } else {
      categoryField.style.display = 'none';
    }
  });

  // Form submit
  modal.querySelector('#add-to-pool-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
      type: formData.get('type'),
      category: formData.get('category') || formData.get('type'),
      title: formData.get('title')?.trim() || '',
      content: formData.get('content')?.trim(),
      source: 'user'
    };

    if (!data.content) {
      alert('Obsah je povinný');
      return;
    }

    addToContentPool(mysteryId, data);

    // Refresh UI
    refreshStoryUI(mysteryId);

    close();
  });
}

/**
 * Refresh story UI
 */
function refreshStoryUI(mysteryId) {
  // Refresh pool
  const poolContainer = document.querySelector('.content-pool');
  if (poolContainer) {
    poolContainer.outerHTML = renderContentPool(mysteryId);
    attachPoolEventListeners(mysteryId);
  }

  // Refresh spine
  const spineContainer = document.querySelector('.story-spine');
  if (spineContainer) {
    spineContainer.outerHTML = renderStorySpine(mysteryId);
    attachSpineEventListeners(mysteryId);
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
