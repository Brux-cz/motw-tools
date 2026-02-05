/**
 * Safety Checker - Validace bezpečnosti AI akcí
 *
 * Kontroluje:
 * - Autonomy level permissions
 * - Action parameters (např. harm amount)
 * - Frequency limits
 * - Whitelist/blacklist overrides
 */

import { getState } from '../../state/store.js';

// P0 #4: Mutex to prevent race conditions
let actionExecutionLock = false;

/**
 * Validate safety of action
 * @param {Object} action - Action to validate
 * @param {string} action.type - Action type
 * @param {Object} action.params - Action parameters
 * @param {string} autonomyLevel - Current autonomy level
 * @param {Array<string>} whitelist - Whitelisted actions
 * @param {Array<string>} blacklist - Blacklisted actions
 * @returns {Object} Validation result {safe, reason, warnings}
 */
export function validateSafety(action, autonomyLevel, whitelist = [], blacklist = []) {
  const result = {
    safe: true,
    reason: null,
    warnings: []
  };

  // Check blacklist first (always blocks)
  if (blacklist.includes(action.type)) {
    result.safe = false;
    result.reason = `Action '${action.type}' is blacklisted`;
    return result;
  }

  // Check whitelist (always allows)
  if (whitelist.includes(action.type)) {
    result.warnings.push('Action whitelisted - bypassing normal safety checks');
    return result;
  }

  // Check autonomy level permissions
  const autonomyCheck = checkAutonomyLevel(action.type, autonomyLevel);
  if (!autonomyCheck.allowed) {
    result.safe = false;
    result.reason = autonomyCheck.reason;
    return result;
  }

  // Check action parameters
  const paramsCheck = checkActionParameters(action);
  if (!paramsCheck.safe) {
    result.safe = false;
    result.reason = paramsCheck.reason;
    return result;
  }

  if (paramsCheck.warnings.length > 0) {
    result.warnings.push(...paramsCheck.warnings);
  }

  // Check frequency limits
  const frequencyCheck = checkFrequencyLimits(action.type);
  if (!frequencyCheck.safe) {
    result.safe = false;
    result.reason = frequencyCheck.reason;
    return result;
  }

  if (frequencyCheck.warnings.length > 0) {
    result.warnings.push(...frequencyCheck.warnings);
  }

  return result;
}

/**
 * Check if action is allowed at autonomy level
 * @private
 */
function checkAutonomyLevel(actionType, autonomyLevel) {
  const AUTONOMY_RULES = {
    low: {
      autoExecute: [],
      requiresReview: ['*'] // Everything requires review
    },
    medium: {
      autoExecute: [
        'write_lore',
        'write_story',
        'create_npc',
        'create_location',
        'whisper'
      ],
      requiresReview: [
        'advance_countdown',
        'inflict_harm',
        'create_event'
      ]
    },
    high: {
      autoExecute: [
        'write_lore',
        'write_story',
        'create_npc',
        'create_location',
        'whisper',
        'create_event',
        'advance_countdown'
      ],
      requiresReview: [
        'inflict_harm' // Only harm requires review
      ]
    },
    full: {
      autoExecute: ['*'], // Everything auto-executes
      requiresReview: []
    }
  };

  const rules = AUTONOMY_RULES[autonomyLevel] || AUTONOMY_RULES.low;

  // Check if explicitly allowed
  if (rules.autoExecute.includes('*') || rules.autoExecute.includes(actionType)) {
    return { allowed: true };
  }

  // Check if requires review
  if (rules.requiresReview.includes('*') || rules.requiresReview.includes(actionType)) {
    return {
      allowed: false,
      reason: `Action '${actionType}' requires review at autonomy level '${autonomyLevel}'`
    };
  }

  // Default: not allowed
  return {
    allowed: false,
    reason: `Action '${actionType}' not permitted at autonomy level '${autonomyLevel}'`
  };
}

/**
 * Check action parameters for safety
 * @private
 */
function checkActionParameters(action) {
  const result = {
    safe: true,
    reason: null,
    warnings: []
  };

  // INFLICT_HARM specific checks
  if (action.type === 'inflict_harm') {
    const harm = action.params?.harm || 0;
    const targetType = action.params?.targetType;

    // High harm always requires review
    if (harm > 2) {
      result.safe = false;
      result.reason = `Harm amount ${harm} is too high (max 2 for auto-execute)`;
      return result;
    }

    // Harm on hunter always requires review
    if (targetType === 'hunter') {
      result.safe = false;
      result.reason = 'Inflicting harm on hunter always requires review';
      return result;
    }

    // Warn on any harm
    if (harm > 0) {
      result.warnings.push(`Inflicting ${harm} harm`);
    }
  }

  // ADVANCE_COUNTDOWN specific checks
  if (action.type === 'advance_countdown') {
    const currentPhase = action.params?.currentPhase || 0;

    // Advancing to Midnight requires review
    if (currentPhase >= 5) {
      result.safe = false;
      result.reason = 'Cannot auto-advance to Midnight (phase 6)';
      return result;
    }

    // Warn on rapid advancement
    if (action.params?.skipPhases) {
      result.warnings.push('Skipping countdown phases');
    }
  }

  // CREATE_EVENT specific checks
  if (action.type === 'create_event') {
    const severity = action.params?.severity;

    // Critical events require review
    if (severity === 'critical' || severity === 'catastrophic') {
      result.safe = false;
      result.reason = 'Critical/catastrophic events require review';
      return result;
    }
  }

  return result;
}

/**
 * Check frequency limits
 * @private
 */
function checkFrequencyLimits(actionType) {
  const result = {
    safe: true,
    reason: null,
    warnings: []
  };

  const { campaign } = getState();
  const keeper = campaign?.aiKeeper;

  if (!keeper) {
    return result;
  }

  // P0 #4: Check if action execution is locked (race condition prevention)
  if (actionExecutionLock) {
    result.safe = false;
    result.reason = 'Another action is currently being executed (lock active)';
    return result;
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Get actions in last hour
  const actionsInLastHour = (keeper.actionsInLastHour || []).filter(
    a => now - a.timestamp < oneHour
  );

  // Check max actions per hour
  const maxActionsPerHour = keeper.maxActionsPerHour || 10;
  if (actionsInLastHour.length >= maxActionsPerHour) {
    result.safe = false;
    result.reason = `Too many actions in last hour (${actionsInLastHour.length}/${maxActionsPerHour})`;
    return result;
  }

  // Check cooldown between actions
  const lastActionTime = keeper.lastActionTime || 0;
  const cooldown = keeper.cooldownBetweenActions || 60000; // 1 minute

  if (now - lastActionTime < cooldown) {
    const secondsRemaining = Math.ceil((cooldown - (now - lastActionTime)) / 1000);
    result.safe = false;
    result.reason = `Cooldown active (${secondsRemaining}s remaining)`;
    return result;
  }

  // Warn if approaching limit
  if (actionsInLastHour.length >= maxActionsPerHour * 0.8) {
    result.warnings.push(`Approaching action limit (${actionsInLastHour.length}/${maxActionsPerHour})`);
  }

  return result;
}

/**
 * Acquire lock for action execution (P0 #4: Race condition prevention)
 * @returns {boolean} True if lock acquired
 */
export function acquireActionLock() {
  if (actionExecutionLock) {
    return false;
  }
  actionExecutionLock = true;
  return true;
}

/**
 * Release action execution lock
 */
export function releaseActionLock() {
  actionExecutionLock = false;
}

/**
 * Record action execution (for frequency tracking)
 * @param {string} actionType - Action type that was executed
 */
export function recordActionExecution(actionType) {
  const { campaign } = getState();

  if (!campaign?.aiKeeper) {
    return;
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const MAX_ACTIONS_HISTORY = 100; // P1 #6: Hard limit to prevent unbounded growth

  // Update last action time
  const lastActionTime = now;

  // Add to actions in last hour
  let actionsInLastHour = campaign.aiKeeper.actionsInLastHour || [];

  // Clean up old actions (older than 1 hour)
  actionsInLastHour = actionsInLastHour.filter(
    a => now - a.timestamp < oneHour
  );

  // Add new action
  actionsInLastHour.push({
    type: actionType,
    timestamp: now
  });

  // P1 #6: Enforce hard limit on array size
  if (actionsInLastHour.length > MAX_ACTIONS_HISTORY) {
    actionsInLastHour = actionsInLastHour.slice(-MAX_ACTIONS_HISTORY);
  }

  // Update state
  import('../../state/store.js').then(({ updateCampaign }) => {
    updateCampaign({
      aiKeeper: {
        ...campaign.aiKeeper,
        lastActionTime,
        actionsInLastHour
      }
    });
  });
}

/**
 * Check if action can bypass review (whitelist check)
 * @param {string} actionType - Action type
 * @returns {boolean}
 */
export function isWhitelisted(actionType) {
  const { campaign } = getState();
  const whitelist = campaign?.aiKeeper?.whitelist || [];
  return whitelist.includes(actionType);
}

/**
 * Check if action is blocked (blacklist check)
 * @param {string} actionType - Action type
 * @returns {boolean}
 */
export function isBlacklisted(actionType) {
  const { campaign } = getState();
  const blacklist = campaign?.aiKeeper?.blacklist || [];
  return blacklist.includes(actionType);
}

/**
 * Get current autonomy level
 * @returns {string} Autonomy level (low, medium, high, full)
 */
export function getAutonomyLevel() {
  const { campaign } = getState();
  return campaign?.aiKeeper?.autonomyLevel || 'medium';
}

/**
 * Get frequency limit statistics
 * @returns {Object} Statistics
 */
export function getFrequencyStats() {
  const { campaign } = getState();
  const keeper = campaign?.aiKeeper;

  if (!keeper) {
    return {
      actionsInLastHour: 0,
      maxActionsPerHour: 10,
      cooldownRemaining: 0
    };
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  const actionsInLastHour = (keeper.actionsInLastHour || []).filter(
    a => now - a.timestamp < oneHour
  );

  const lastActionTime = keeper.lastActionTime || 0;
  const cooldown = keeper.cooldownBetweenActions || 60000;
  const cooldownRemaining = Math.max(0, cooldown - (now - lastActionTime));

  return {
    actionsInLastHour: actionsInLastHour.length,
    maxActionsPerHour: keeper.maxActionsPerHour || 10,
    cooldownRemaining: Math.ceil(cooldownRemaining / 1000) // seconds
  };
}
