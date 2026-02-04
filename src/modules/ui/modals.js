/**
 * Modal System - Shared modal functionality
 */

import { $ } from '../../utils/dom.js';

/**
 * Create and show modal
 */
export function showModal(config) {
  const { title, content, buttons = [], onClose } = config;

  // Remove existing modal if any
  hideModal();

  const modalHTML = `
    <div id="modal-overlay" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div class="modal-container bg-gray-900 border border-white/10 rounded-lg shadow-2xl max-w-2xl w-full mx-4 animate-slide-up">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10">
          <h2 class="text-xl font-bold text-white">${title}</h2>
          <button id="modal-close" class="text-gray-400 hover:text-white transition">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Content -->
        <div id="modal-content" class="p-6 max-h-[70vh] overflow-y-auto">
          ${content}
        </div>

        <!-- Footer -->
        ${buttons.length > 0 ? `
          <div class="flex items-center justify-end gap-3 p-6 border-t border-white/10">
            ${buttons.map(btn => `
              <button
                id="${btn.id}"
                class="px-4 py-2 rounded border transition font-semibold text-sm ${btn.primary
                  ? 'bg-red-900/40 hover:bg-red-800/60 border-red-700/50 text-white'
                  : 'bg-gray-700/40 hover:bg-gray-600/60 border-gray-600/50 text-gray-300'
                }"
                ${btn.disabled ? 'disabled' : ''}
              >
                ${btn.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Close button handler
  const closeBtn = $('#modal-close');
  const overlay = $('#modal-overlay');

  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
    }
  };

  const closeHandler = () => {
    document.removeEventListener('keydown', escHandler);
    hideModal();
    if (onClose) onClose();
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeHandler);
  }

  // Click overlay to close
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeHandler();
      }
    });
  }

  // ESC key to close
  document.addEventListener('keydown', escHandler);

  return {
    updateContent: (newContent) => {
      const contentEl = $('#modal-content');
      if (contentEl) {
        contentEl.innerHTML = newContent;
      }
    },
    close: closeHandler
  };
}

/**
 * Hide current modal
 */
export function hideModal() {
  const overlay = $('#modal-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Show confirmation dialog
 */
export function showConfirmDialog(config) {
  const { title, message, confirmText = 'Potvrdit', cancelText = 'Zrušit', onConfirm, onCancel } = config;

  const modal = showModal({
    title,
    content: `<p class="text-gray-300">${message}</p>`,
    buttons: [
      {
        id: 'btn-cancel',
        label: cancelText,
        primary: false
      },
      {
        id: 'btn-confirm',
        label: confirmText,
        primary: true
      }
    ],
    onClose: onCancel
  });

  // Attach button handlers
  const cancelBtn = $('#btn-cancel');
  const confirmBtn = $('#btn-confirm');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.close();
      if (onCancel) onCancel();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      modal.close();
      if (onConfirm) onConfirm();
    });
  }

  return modal;
}
