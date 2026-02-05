/**
 * Work Notification - Badge and notifications for autonomous work
 */

import { getState, subscribe } from '../../state/store.js';

let notificationBadge = null;

/**
 * Initialize work notifications
 */
export function initWorkNotifications() {
  // Create badge element
  createNotificationBadge();

  // Subscribe to state changes
  subscribe((newState, oldState) => {
    updateNotificationBadge(newState);
  });

  // Listen for autonomous work events
  window.addEventListener('autonomous-work-ready', handleWorkReady);
  window.addEventListener('autonomous-error', handleAutonomousError);

  console.log('[Work Notification] Initialized');
}

/**
 * Create notification badge
 */
export function createNotificationBadge() {
  const autonomousButton = document.querySelector('[data-tab="autonomous"]');
  if (!autonomousButton) {
    console.warn('[Work Notification] Autonomous tab button not found');
    return;
  }

  // Check if badge already exists
  notificationBadge = autonomousButton.querySelector('.notification-badge');

  if (!notificationBadge) {
    notificationBadge = document.createElement('span');
    notificationBadge.className = 'notification-badge hidden absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold';
    autonomousButton.style.position = 'relative';
    autonomousButton.appendChild(notificationBadge);
  }

  // Initialize count
  updateNotificationBadge(getState());
}

/**
 * Update notification badge
 */
function updateNotificationBadge(state) {
  if (!notificationBadge) return;

  const campaign = state.campaign;
  if (!campaign?.aiAutonomous?.workQueue) {
    hideNotificationBadge();
    return;
  }

  const pendingCount = campaign.aiAutonomous.workQueue.filter(
    w => w.status === 'pending'
  ).length;

  if (pendingCount > 0) {
    showWorkNotification(pendingCount);
  } else {
    hideNotificationBadge();
  }
}

/**
 * Show work notification badge
 */
export function showWorkNotification(count) {
  if (!notificationBadge) {
    createNotificationBadge();
  }

  if (notificationBadge) {
    notificationBadge.textContent = count > 9 ? '9+' : count.toString();
    notificationBadge.classList.remove('hidden');

    // Pulse animation
    notificationBadge.style.animation = 'none';
    setTimeout(() => {
      notificationBadge.style.animation = 'pulse 2s infinite';
    }, 10);
  }
}

/**
 * Hide notification badge
 */
export function hideNotificationBadge() {
  if (notificationBadge) {
    notificationBadge.classList.add('hidden');
  }
}

/**
 * Handle work ready event
 */
function handleWorkReady(event) {
  const { workItem } = event.detail;

  console.log('[Work Notification] New work ready:', workItem.title);

  // Show desktop notification if permitted
  if (Notification.permission === 'granted') {
    new Notification('AI Background Work', {
      body: `Nový ${workItem.type}: ${workItem.title}`,
      icon: '/icon.png',
      tag: 'autonomous-work'
    });
  }

  // Show toast notification
  showToast(`🤖 AI vytvořilo: ${workItem.title}`);

  // Update badge
  const { campaign } = getState();
  const pendingCount = campaign?.aiAutonomous?.workQueue?.filter(
    w => w.status === 'pending'
  ).length || 0;

  showWorkNotification(pendingCount);
}

/**
 * Handle autonomous error event
 */
function handleAutonomousError(event) {
  const { error } = event.detail;

  console.error('[Work Notification] Autonomous error:', error);

  // Show error toast
  showToast(`⚠️ Chyba autonomous agenta: ${error.message}`, 'error');
}

/**
 * Request notification permission
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('[Work Notification] Notification permission:', permission);
    });
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-green-900/90 border-green-700',
    error: 'bg-red-900/90 border-red-700',
    info: 'bg-purple-900/90 border-purple-700'
  };

  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 ${colors[type]} border px-4 py-3 rounded-lg text-sm font-semibold z-50 shadow-xl`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Fade in
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
