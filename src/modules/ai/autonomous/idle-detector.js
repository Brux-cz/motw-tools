/**
 * Idle Detector - Detects user inactivity for autonomous agent triggering
 */

import { getState } from '../../state/store.js';

let lastActivityTime = Date.now();
let idleCheckInterval = null;
let isPageVisible = true;
let onIdleTriggerCallback = null;

/**
 * Initialize idle detection
 */
export function initIdleDetection() {
  console.log('[Autonomous] Initializing idle detection');

  // Track user activity
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

  activityEvents.forEach(event => {
    document.addEventListener(event, trackActivity, { passive: true });
  });

  // Page Visibility API
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Periodic idle check (every 10 seconds)
  idleCheckInterval = setInterval(checkAndTrigger, 10000);

  console.log('[Autonomous] Idle detection initialized');
}

/**
 * Stop idle detection
 */
export function stopIdleDetection() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }

  console.log('[Autonomous] Idle detection stopped');
}

/**
 * Track user activity
 */
export function trackActivity() {
  lastActivityTime = Date.now();

  // Notify store (for persistence)
  try {
    const { updateLastActivity } = require('../../state/store.js');
    if (updateLastActivity) {
      updateLastActivity();
    }
  } catch (error) {
    // Store function may not be available yet
  }
}

/**
 * Handle page visibility change
 */
function handleVisibilityChange() {
  isPageVisible = !document.hidden;

  if (document.hidden) {
    console.log('[Autonomous] Page hidden - potential autonomous trigger point');
    // When user leaves tab, that's a potential trigger
    setTimeout(checkAndTrigger, 1000);
  } else {
    console.log('[Autonomous] Page visible - user returned');
    trackActivity(); // Reset activity timer
  }
}

/**
 * Check if should trigger autonomous agent
 */
function checkAndTrigger() {
  if (shouldTriggerAgent()) {
    console.log('[Autonomous] Idle threshold reached - triggering agent');
    if (onIdleTriggerCallback) {
      onIdleTriggerCallback();
    }
  }
}

/**
 * Check if user is idle
 */
export function isUserIdle() {
  const { campaign } = getState();
  const idleTimeout = campaign?.aiAutonomous?.idleTimeout || 180000; // Default 3 min
  const idleTime = Date.now() - lastActivityTime;

  return idleTime > idleTimeout;
}

/**
 * Check if autonomous agent should be triggered
 */
export function shouldTriggerAgent() {
  const { campaign } = getState();

  // Check if autonomous mode is enabled
  if (!campaign?.aiAutonomous?.enabled) {
    return false;
  }

  // Check if agent is already running
  if (campaign?.aiAutonomous?.agentState !== 'idle' && campaign?.aiAutonomous?.agentState !== undefined) {
    return false;
  }

  // Check idle time
  if (!isUserIdle()) {
    return false;
  }

  // Check max work items limit
  const pendingWork = campaign?.aiAutonomous?.workQueue?.filter(w => w.status === 'pending') || [];
  const maxItems = campaign?.aiAutonomous?.maxWorkItemsPerSession || 5;

  if (pendingWork.length >= maxItems) {
    console.log('[Autonomous] Max work items reached, pausing agent');
    return false;
  }

  // Check cooldown (don't run too frequently)
  const lastRun = campaign?.aiAutonomous?.lastAgentRun || 0;
  const cooldownPeriod = 60000; // 1 minute minimum between runs

  if (Date.now() - lastRun < cooldownPeriod) {
    return false;
  }

  return true;
}

/**
 * Get current idle time in milliseconds
 */
export function getIdleTime() {
  return Date.now() - lastActivityTime;
}

/**
 * Get last activity timestamp
 */
export function getLastActivityTime() {
  return lastActivityTime;
}

/**
 * Check if page is visible
 */
export function getPageVisibility() {
  return isPageVisible;
}

/**
 * Set callback for when idle trigger occurs
 */
export function onIdleTrigger(callback) {
  onIdleTriggerCallback = callback;
}

/**
 * Manually reset idle timer
 */
export function resetIdleTimer() {
  trackActivity();
}
