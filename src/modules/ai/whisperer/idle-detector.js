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
 * NOTE: Whisperer is currently disabled globally per user preference
 */
export function startWhisperer(mysteryId) {
  // WHISPERER VYPNUT - uživatel nechce automatické generování
  console.log('🔮 Whisperer is disabled globally');
  return;
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
