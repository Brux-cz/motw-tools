/**
 * Review Panel - Accept/Reject UI for autonomous work
 */

import { getState, updateCampaign, addSessionLog } from '../../state/store.js';
import { showModal, hideModal } from '../modals.js';
import { executeActions } from '../../ai/autonomous/autonomous-actions.js';
import { escapeHtml } from '../../../utils/html.js';
import { renderAutonomousDashboard } from './dashboard.js';
import { showContentModal } from './content-modal.js';
import { showToast } from '../toast.js';

/**
 * Show preview modal for work item
 */
export function showPreview(workId) {
  const { campaign } = getState();
  const workItem = campaign?.aiAutonomous?.workQueue?.find(w => w.id === workId);

  if (!workItem) {
    console.error('Work item not found:', workId);
    return;
  }

  const typeLabels = {
    lore: 'Lore Fragment',
    story: 'Příběh',
    notes: 'Poznámky',
    event: 'Událost',
    twist: 'Twist',
    world: 'Rozšíření světa'
  };

  const content = `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-purple-900/40 rounded-lg flex items-center justify-center">
          <span class="material-symbols-outlined text-purple-400">auto_awesome</span>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold">${escapeHtml(workItem.title)}</h3>
          <div class="flex items-center gap-3 mt-1 text-sm text-gray-400">
            <span class="font-semibold text-purple-400">${typeLabels[workItem.type] || workItem.type}</span>
            ${workItem.autoExecuted ? `
              <span class="px-2 py-0.5 bg-green-900/40 text-green-400 text-xs rounded-full font-semibold">
                Auto-executed
              </span>
            ` : ''}
            <span>·</span>
            <span>${formatDate(workItem.createdAt)}</span>
            <span>·</span>
            <span>${workItem.tokens.input + workItem.tokens.output} tokenů (~$${workItem.cost.toFixed(4)})</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="bg-neutral-900 border border-white/10 rounded-lg p-4 max-h-96 overflow-y-auto">
        <div class="prose prose-invert prose-sm max-w-none">
          ${formatContent(workItem.content)}
        </div>
      </div>

      <!-- AI Notes (if in reason) -->
      ${workItem.goalReason ? `
        <div class="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined text-blue-400 text-sm mt-0.5">info</span>
            <div>
              <div class="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                Důvod AI
              </div>
              <div class="text-sm text-gray-300">
                ${escapeHtml(workItem.goalReason)}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Actions Preview -->
      ${workItem.actions && workItem.actions.length > 0 ? `
        <div class="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
          <div class="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
            Akce které budou provedeny po schválení
          </div>
          <div class="space-y-2">
            ${workItem.actions.map(action => `
              <div class="flex items-center gap-2 text-sm">
                <span class="material-symbols-outlined text-purple-400 text-xs">play_arrow</span>
                <span class="font-mono text-gray-300">${action.action}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  showModal({
    title: 'AI Background Work - Náhled',
    content,
    buttons: [
      {
        id: 'btn-reject-preview',
        label: 'Zamítnout',
        primary: false,
        class: 'bg-red-900/40 hover:bg-red-800/60 border-red-700/50'
      },
      {
        id: 'btn-accept-preview',
        label: 'Schválit a přidat do záhady',
        primary: true,
        class: 'bg-green-900/40 hover:bg-green-800/60 border-green-700/50'
      }
    ]
  });

  // Attach event listeners
  document.getElementById('btn-accept-preview')?.addEventListener('click', () => {
    hideModal();
    handleAccept(workId);
  });

  document.getElementById('btn-reject-preview')?.addEventListener('click', () => {
    hideModal();
    handleReject(workId);
  });
}

/**
 * Handle accept work item
 */
export async function handleAccept(workId) {
  const { campaign, currentMysteryId } = getState();
  const workItem = campaign?.aiAutonomous?.workQueue?.find(w => w.id === workId);

  if (!workItem) {
    console.error('Work item not found:', workId);
    return;
  }

  try {
    console.log('[Review Panel] Accepting work item:', workId);

    // Execute actions
    if (workItem.actions && workItem.actions.length > 0) {
      console.log('[Review Panel] Executing actions...');
      await executeActions(workItem.actions, currentMysteryId);
    }

    // Update work item status
    const updatedQueue = campaign.aiAutonomous.workQueue.map(w =>
      w.id === workId
        ? { ...w, status: 'accepted', reviewedAt: Date.now() }
        : w
    );

    // Cleanup: keep only last 20 accepted items, all pending/processing
    const cleanedQueue = [
      ...updatedQueue.filter(w => w.status !== 'accepted'),
      ...updatedQueue
        .filter(w => w.status === 'accepted')
        .sort((a, b) => (b.reviewedAt || b.createdAt) - (a.reviewedAt || a.createdAt))
        .slice(0, 20)
    ];

    // Update stats
    const stats = campaign.aiAutonomous.stats || {};
    stats.acceptedItems = (stats.acceptedItems || 0) + 1;
    if (stats.byType && stats.byType[workItem.type]) {
      stats.byType[workItem.type].accepted += 1;
    }

    // Update campaign
    updateCampaign({
      aiAutonomous: {
        ...campaign.aiAutonomous,
        workQueue: cleanedQueue,
        stats
      }
    });

    // Add to session log
    addSessionLog({
      text: `Schváleno AI: ${workItem.type} "${workItem.title}"`,
      type: 'autonomous-accepted',
      category: 'ai'
    });

    console.log('[Review Panel] Work item accepted successfully');

    // Show success toast with action to view content
    showToast({
      type: 'success',
      message: `✓ "${workItem.title}" přijato`,
      duration: 5000,
      actions: [
        {
          label: '📖 Zobrazit',
          onClick: () => showContentModal(workItem)
        }
      ]
    });

    // Re-render dashboard
    renderAutonomousDashboard();

  } catch (error) {
    console.error('[Review Panel] Failed to accept work item:', error);
    showToast(`✗ Chyba při přijímání: ${error.message}`, 'error');
  }
}

/**
 * Handle reject work item
 */
export function handleReject(workId) {
  const { campaign } = getState();
  const workItem = campaign?.aiAutonomous?.workQueue?.find(w => w.id === workId);

  if (!workItem) {
    console.error('Work item not found:', workId);
    return;
  }

  console.log('[Review Panel] Rejecting work item:', workId);

  // Update work item status
  const updatedQueue = campaign.aiAutonomous.workQueue.map(w =>
    w.id === workId
      ? { ...w, status: 'rejected', reviewedAt: Date.now() }
      : w
  );

  // Update stats
  const stats = campaign.aiAutonomous.stats || {};
  stats.rejectedItems = (stats.rejectedItems || 0) + 1;
  if (stats.byType && stats.byType[workItem.type]) {
    stats.byType[workItem.type].rejected += 1;
  }

  // Update campaign
  updateCampaign({
    aiAutonomous: {
      ...campaign.aiAutonomous,
      workQueue: updatedQueue,
      stats
    }
  });

  // Add to session log
  addSessionLog({
    text: `Zamítnuto AI: ${workItem.type} "${workItem.title}"`,
    type: 'autonomous-rejected',
    category: 'ai'
  });

  console.log('[Review Panel] Work item rejected');

  // Show toast
  showToast({
    type: 'info',
    message: `"${workItem.title}" zamítnuto`
  });

  // Re-render dashboard
  renderAutonomousDashboard();
}

/**
 * Format content for display
 */
function formatContent(content) {
  // Remove JSON blocks
  let formatted = content.replace(/```json[\s\S]*?```/g, '');

  // Convert markdown headings
  formatted = formatted.replace(/^### (.+)$/gm, '<h4 class="font-bold text-white mt-4 mb-2">$1</h4>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="font-bold text-white text-lg mt-4 mb-2">$1</h3>');
  formatted = formatted.replace(/^# (.+)$/gm, '<h2 class="font-bold text-white text-xl mt-4 mb-2">$1</h2>');

  // Convert markdown bold/italic
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert line breaks
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-2">');
  formatted = `<p>${formatted}</p>`;

  return formatted;
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
