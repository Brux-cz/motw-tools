/**
 * Toast Notifications
 */

/**
 * Show toast notification
 */
export function showToast({ type = 'info', message, duration = 3000 }) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg border z-50 animate-slide-in-up transition-opacity`;

  const colors = {
    info: 'bg-blue-900/90 border-blue-700/50 text-blue-100',
    success: 'bg-green-900/90 border-green-700/50 text-green-100',
    error: 'bg-red-900/90 border-red-700/50 text-red-100',
    warning: 'bg-yellow-900/90 border-yellow-700/50 text-yellow-100'
  };

  toast.className += ` ${colors[type] || colors.info}`;

  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-sm">${message}</span>
      <button class="toast-close hover:opacity-70 transition">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  // Close button
  toast.querySelector('.toast-close')?.addEventListener('click', () => {
    removeToast(toast);
  });

  // Auto-remove
  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

/**
 * Remove toast
 */
function removeToast(toast) {
  toast.style.opacity = '0';
  setTimeout(() => {
    toast.remove();
  }, 300);
}

// Make globally available
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
