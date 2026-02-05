/**
 * Idle Detector - Detects user inactivity and triggers whisperer
 */

import { getState } from '../../state/store.js';
import { generateRandomWhisper } from './whisperer-engine.js';

let lastActivity = Date.now();
let whispererInterval = null;
let activityListeners = [];
let currentMysteryId = null;

/**
 * Start whisperer idle detection
 */
export function startWhisperer(mysteryId) {
  console.log('🔮 Starting whisperer for mystery:', mysteryId);

  // Stop existing whisperer if running
  stopWhisperer();

  currentMysteryId = mysteryId;

  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    console.warn('Mystery not found');
    return;
  }

  const whispererSettings = mystery.whispererSettings || {};

  if (whispererSettings.enabled === false) {
    console.log('Whisperer disabled for this mystery');
    return;
  }

  const timeout = whispererSettings.idleTimeout || 30000; // Default 30s

  // Track user activity (bez mousemove - pohyb myši neresetuje timer)
  const activityEvents = ['keydown', 'click', 'scroll', 'touchstart'];

  const updateActivity = () => {
    lastActivity = Date.now();
  };

  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
    activityListeners.push({ event, handler: updateActivity });
  });

  // Check idle periodically
  whispererInterval = setInterval(() => {
    const idle = Date.now() - lastActivity;

    if (idle >= timeout) {
      console.log('🌙 User idle, triggering whisper');
      triggerWhisper(mysteryId);
      lastActivity = Date.now(); // Reset to avoid spam
    }
  }, 10000); // Check every 10s

  console.log('✅ Whisperer started (timeout:', timeout, 'ms)');
}

/**
 * Stop whisperer
 */
export function stopWhisperer() {
  if (whispererInterval) {
    clearInterval(whispererInterval);
    whispererInterval = null;
  }

  // Remove activity listeners
  activityListeners.forEach(({ event, handler }) => {
    document.removeEventListener(event, handler);
  });
  activityListeners = [];

  currentMysteryId = null;

  console.log('🛑 Whisperer stopped');
}

/**
 * Trigger whisper generation
 */
async function triggerWhisper(mysteryId) {
  try {
    await generateRandomWhisper(mysteryId);
  } catch (error) {
    console.error('Failed to trigger whisper:', error);
  }
}

/**
 * Get current idle time
 */
export function getIdleTime() {
  return Date.now() - lastActivity;
}

/**
 * Reset idle timer
 */
export function resetIdleTimer() {
  lastActivity = Date.now();
}

/**
 * Check if whisperer is running
 */
export function isWhispererRunning() {
  return whispererInterval !== null;
}

/**
 * Get current mystery ID for whisperer
 */
export function getWhispererMysteryId() {
  return currentMysteryId;
}

/**
 * Manual whisper trigger (for testing or manual use)
 */
export async function triggerWhisperManually(mysteryId = null) {
  const targetMysteryId = mysteryId || currentMysteryId;

  if (!targetMysteryId) {
    console.warn('No mystery ID for manual whisper trigger');
    return;
  }

  console.log('🎯 Manual whisper trigger');
  await triggerWhisper(targetMysteryId);
}
