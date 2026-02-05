/**
 * Content Modal - Display autonomous AI content with actions
 */

import { getState, updateCampaign } from '../../state/store.js';
import { showToast } from '../toast.js';
import { escapeHtml } from '../../../utils/html.js';

/**
 * Show content modal for approved work item
 */
export function showContentModal(workItem) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) {
    showToast({ type: 'error', message: 'Mystery nenalezena' });
    return;
  }

  // Find the content that was added
  const content = findContentByWorkItem(mystery, workItem);

  if (!content) {
    showToast({ type: 'error', message: 'Obsah nenalezen - možná byl smazán' });
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'content-modal';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-content max-w-2xl">
      <!-- Header -->
      <div class="modal-header">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${getIconForType(workItem.type)}</span>
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-bold">${escapeHtml(content.title || workItem.title || 'AI Content')}</h2>
              <span class="badge-ai">🤖 AI Generated</span>
            </div>
            <div class="text-sm text-gray-400 mt-1">
              ${formatContentType(workItem.type)} •
              ${formatDate(content.createdAt || workItem.createdAt)}
            </div>
          </div>
        </div>
        <button class="modal-close" data-action="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        ${renderContentBody(content, workItem.type)}
      </div>

      <!-- Actions -->
      <div class="modal-footer flex gap-2 flex-wrap">
        <button class="btn-secondary" data-action="mark-used" data-content-id="${escapeHtml(content.id || workItem.id)}" data-work-type="${escapeHtml(workItem.type)}">
          <span class="material-symbols-outlined">check_circle</span>
          Označit jako použité
        </button>
        <button class="btn-danger" data-action="delete" data-content-id="${escapeHtml(content.id || workItem.id)}" data-work-type="${escapeHtml(workItem.type)}" data-work-item-id="${escapeHtml(workItem.id)}">
          <span class="material-symbols-outlined">delete</span>
          Smazat
        </button>
        <div class="flex-1"></div>
        <button class="btn-secondary" data-action="close">
          Zavřít
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event delegation for modal actions
  modal.addEventListener('click', (e) => {
    // Close on overlay click
    if (e.target === modal) {
      closeContentModal();
      return;
    }

    // Handle button clicks
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'close':
        closeContentModal();
        break;
      case 'mark-used':
        markContentAsUsed(button.dataset.contentId, button.dataset.workType);
        break;
      case 'delete':
        deleteContent(button.dataset.contentId, button.dataset.workType, button.dataset.workItemId);
        break;
    }
  });

  // Close on ESC key
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeContentModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

/**
 * Close content modal
 */
export function closeContentModal() {
  const modal = document.getElementById('content-modal');
  if (modal) modal.remove();
}

/**
 * Mark content as used
 */
export function markContentAsUsed(contentId, type) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) return;

  const field = getFieldNameForType(type);
  if (!field || !mystery[field]) return;

  const updatedContent = mystery[field].map(item =>
    (item.id === contentId || !item.id)
      ? { ...item, id: item.id || contentId, used: true, usedAt: Date.now() }
      : item
  );

  const updatedMysteries = campaign.mysteries.map(m =>
    m.id === currentMysteryId
      ? { ...m, [field]: updatedContent }
      : m
  );

  updateCampaign({
    mysteries: updatedMysteries
  });

  showToast({
    type: 'success',
    message: '✓ Označeno jako použité'
  });

  closeContentModal();
}

/**
 * Delete content
 */
export function deleteContent(contentId, type, workItemId) {
  if (!confirm('Opravdu smazat tento obsah?')) return;

  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) return;

  const field = getFieldNameForType(type);
  if (!field || !mystery[field]) return;

  // Filter out the content
  const updatedContent = mystery[field].filter(item => item.id !== contentId);

  // Also remove from work queue
  const updatedQueue = campaign.aiAutonomous.workQueue.filter(w => w.id !== workItemId);

  const updatedMysteries = campaign.mysteries.map(m =>
    m.id === currentMysteryId
      ? { ...m, [field]: updatedContent }
      : m
  );

  updateCampaign({
    mysteries: updatedMysteries,
    aiAutonomous: {
      ...campaign.aiAutonomous,
      workQueue: updatedQueue
    }
  });

  showToast({
    type: 'success',
    message: '✓ Obsah smazán'
  });

  closeContentModal();

  // Refresh dashboard if it exists
  if (typeof window.renderAutonomousDashboard === 'function') {
    window.renderAutonomousDashboard();
  }
}

/**
 * Render content body based on type
 */
function renderContentBody(content, type) {
  switch (type) {
    case 'lore':
      return `
        <div class="lore-content space-y-3">
          ${content.category ? `<div class="category-badge">${escapeHtml(content.category)}</div>` : ''}
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.content || content.text || '')}</div>
          ${content.source ? `<div class="text-sm text-gray-500 mt-2">Zdroj: ${escapeHtml(content.source)}</div>` : ''}
        </div>
      `;

    case 'story':
      return `
        <div class="story-content space-y-3">
          ${content.timeframe ? `<div class="text-sm text-purple-400 font-semibold">${escapeHtml(content.timeframe)}</div>` : ''}
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.content || content.text || '')}</div>
          ${content.impacts_game ? '<div class="badge-warning mt-2">⚠️ Ovlivňuje aktuální hru</div>' : ''}
        </div>
      `;

    case 'notes':
      return `
        <div class="notes-content space-y-3">
          ${content.categories && content.categories.length > 0 ? `
            <div class="flex gap-2 flex-wrap">
              ${content.categories.map(cat => `<span class="category-badge">${escapeHtml(cat)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.content || content.text || '')}</div>
        </div>
      `;

    case 'event':
      return `
        <div class="event-content space-y-3">
          ${content.urgency ? `<div class="text-sm text-orange-400 font-semibold">Urgency: ${content.urgency}/10</div>` : ''}
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.description || content.content || '')}</div>
          ${content.trigger ? `
            <div class="bg-neutral-800 border border-white/10 rounded p-3 mt-3">
              <div class="text-xs text-gray-400 uppercase font-semibold mb-1">Trigger</div>
              <div class="text-sm">${escapeHtml(content.trigger)}</div>
            </div>
          ` : ''}
        </div>
      `;

    case 'twist':
      return `
        <div class="twist-content space-y-3">
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.reveal || content.content || '')}</div>
          ${content.impact ? `
            <div class="bg-neutral-800 border border-white/10 rounded p-3 mt-3">
              <div class="text-xs text-gray-400 uppercase font-semibold mb-1">Impact</div>
              <div class="text-sm">${escapeHtml(content.impact)}</div>
            </div>
          ` : ''}
          ${content.hidden_clues && content.hidden_clues.length > 0 ? `
            <div class="bg-neutral-800 border border-white/10 rounded p-3 mt-3">
              <div class="text-xs text-gray-400 uppercase font-semibold mb-2">Hidden Clues</div>
              <ul class="list-disc list-inside space-y-1 text-sm">
                ${content.hidden_clues.map(clue => `<li>${escapeHtml(clue)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;

    case 'world':
      return `
        <div class="world-content space-y-3">
          ${content.type ? `<div class="type-badge">${escapeHtml(content.type)}</div>` : ''}
          <div class="content-text whitespace-pre-wrap">${escapeHtml(content.description || content.content || '')}</div>
          ${content.relevance ? `
            <div class="text-sm text-gray-500 mt-2">Relevance: ${escapeHtml(content.relevance)}</div>
          ` : ''}
        </div>
      `;

    default:
      return `<div class="content-text whitespace-pre-wrap">${escapeHtml(content.content || content.text || JSON.stringify(content))}</div>`;
  }
}

/**
 * Find content in mystery by work item
 */
function findContentByWorkItem(mystery, workItem) {
  const searchTime = workItem.reviewedAt || workItem.createdAt || Date.now();
  const timeWindow = 10000; // 10s tolerance

  const field = getFieldNameForType(workItem.type);
  if (!field || !mystery[field]) return null;

  // Find most recent item that matches
  const items = [...mystery[field]].reverse();

  // First try to find by source and time
  let content = items.find(item =>
    (item.source === 'autonomous' || !item.source) &&
    Math.abs((item.createdAt || 0) - searchTime) < timeWindow
  );

  // Fallback: just get the most recent autonomous item
  if (!content) {
    content = items.find(item => item.source === 'autonomous' || !item.source);
  }

  // Last resort: get the most recent item
  if (!content && items.length > 0) {
    content = items[0];
  }

  return content;
}

/**
 * Get field name for content type
 */
function getFieldNameForType(type) {
  const mapping = {
    'lore': 'customLore',
    'story': 'autonomousStories',
    'notes': 'compiledNotes',
    'event': 'autonomousEvents',
    'twist': 'autonomousTwists',
    'world': 'worldExpansions'
  };
  return mapping[type];
}

/**
 * Get icon for content type
 */
function getIconForType(type) {
  const icons = {
    'lore': '📜',
    'story': '📖',
    'notes': '📝',
    'event': '⚡',
    'twist': '🎭',
    'world': '🌍'
  };
  return icons[type] || '📄';
}

/**
 * Format content type for display
 */
function formatContentType(type) {
  const labels = {
    'lore': 'Lore Fragment',
    'story': 'Příběh',
    'notes': 'Poznámky',
    'event': 'Událost',
    'twist': 'Twist',
    'world': 'Rozšíření světa'
  };
  return labels[type] || type;
}

/**
 * Format date
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.showContentModal = showContentModal;
  window.closeContentModal = closeContentModal;
  window.markContentAsUsed = markContentAsUsed;
  window.deleteContent = deleteContent;
}
