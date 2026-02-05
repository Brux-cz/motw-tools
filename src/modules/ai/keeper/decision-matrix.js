/**
 * Decision Matrix - Priority scoring a rozhodování co dělat
 *
 * Evaluuje stav hry a vrací priority akce podle urgence a důležitosti
 */

/**
 * Priority levels
 */
export const PRIORITIES = {
  CRITICAL: 10, // CREATE_EVENT at countdown >= 5
  URGENT: 9, // HUNTER_DANGER
  HIGH: 7, // LONG_IDLE
  MEDIUM: 6, // STORY_ENRICHMENT
  LOW: 4, // AMBIENT_ATMOSPHERE
  MINIMAL: 1 // Background tasks
};

/**
 * P2 #9: Configuration constants (no more magic numbers!)
 */
export const DECISION_CONFIG = {
  // Countdown thresholds
  COUNTDOWN_CRITICAL_PHASE: 5,
  COUNTDOWN_MAX_PHASE: 5,

  // Hunter danger thresholds
  HUNTER_HIGH_HARM: 4,
  HUNTER_LOW_LUCK: 1,

  // Time thresholds
  LONG_IDLE_MS: 10 * 60 * 1000, // 10 minutes
  SHORT_IDLE_MIN_MS: 30 * 1000, // 30 seconds
  SHORT_IDLE_MAX_MS: 5 * 60 * 1000, // 5 minutes
  RECENT_SESSION_WINDOW_MS: 30 * 60 * 1000, // 30 minutes
  COUNTDOWN_STALE_THRESHOLD_MS: 60 * 60 * 1000, // 1 hour

  // Content thresholds
  MIN_LORE_RECOMMENDED: 3,
  MIN_STORY_RECOMMENDED: 2,
  MIN_NPC_RECOMMENDED: 3,
  MIN_LOCATION_RECOMMENDED: 2,
  MIN_SESSION_ENTRIES_FOR_COUNTDOWN: 5
};

/**
 * Action types
 */
export const ACTION_TYPES = {
  // Critical actions
  CREATE_EVENT: 'create_event',
  ADVANCE_COUNTDOWN: 'advance_countdown',
  INFLICT_HARM: 'inflict_harm',

  // Story actions
  WRITE_LORE: 'write_lore',
  WRITE_STORY: 'write_story',
  CREATE_NPC: 'create_npc',
  CREATE_LOCATION: 'create_location',

  // Ambient actions
  WHISPER: 'whisper',

  // UI operations
  CAPTURE_SCREENSHOT: 'capture_screenshot'
};

/**
 * Execution methods
 */
export const EXECUTION_METHODS = {
  DIRECT_API: 'direct_api', // Použít direct API calls
  AUTONOMOUS: 'autonomous', // Použít autonomous agent (AI generation)
  WHISPER: 'whisper', // Použít whisperer
  PLAYWRIGHT: 'playwright' // Použít Playwright pro UI operace
};

/**
 * Evaluate priorities based on game state
 * @param {Object} gameState - Current game state
 * @param {Object} gameState.mystery - Current mystery
 * @param {Array} gameState.hunters - Hunters in campaign
 * @param {Array} gameState.sessionLog - Session log
 * @param {number} gameState.idleTime - How long user has been idle (ms)
 * @returns {Array<Object>} Sorted array of possible actions with priorities
 */
export function evaluatePriorities(gameState) {
  const priorities = [];

  const {
    mystery,
    hunters = [],
    sessionLog = [],
    idleTime = 0,
    autonomous = {}
  } = gameState;

  if (!mystery) {
    return priorities;
  }

  // === PRIORITY 10: CREATE_EVENT (countdown >= 5) ===
  const countdownPhase = mystery.countdown?.currentPhase || 0;
  if (countdownPhase >= DECISION_CONFIG.COUNTDOWN_CRITICAL_PHASE) {
    priorities.push({
      action: ACTION_TYPES.CREATE_EVENT,
      priority: PRIORITIES.CRITICAL,
      reason: 'Countdown je na Midnight! Nutné vytvořit kulminační událost.',
      urgency: 'critical',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  // === PRIORITY 9: HUNTER_DANGER ===
  const huntersInDanger = hunters.filter(h => {
    return h.harm >= DECISION_CONFIG.HUNTER_HIGH_HARM ||
           (h.luck !== undefined && h.luck <= DECISION_CONFIG.HUNTER_LOW_LUCK) ||
           h.conditions?.some(c => c.severity === 'critical');
  });

  if (huntersInDanger.length > 0) {
    priorities.push({
      action: ACTION_TYPES.INFLICT_HARM,
      priority: PRIORITIES.URGENT,
      reason: `${huntersInDanger.length} lovců v nebezpečí - zvážit eskalaci nebo consequence`,
      urgency: 'urgent',
      method: EXECUTION_METHODS.AUTONOMOUS,
      metadata: { huntersInDanger: huntersInDanger.map(h => h.id) }
    });
  }

  // === PRIORITY 8: COUNTDOWN ADVANCEMENT ===
  // If countdown hasn't moved in a while and there's been activity
  const recentSessionEntries = sessionLog.filter(
    e => Date.now() - e.timestamp < DECISION_CONFIG.RECENT_SESSION_WINDOW_MS
  );

  if (countdownPhase < DECISION_CONFIG.COUNTDOWN_MAX_PHASE &&
      recentSessionEntries.length > DECISION_CONFIG.MIN_SESSION_ENTRIES_FOR_COUNTDOWN) {
    const lastCountdownAdvance = mystery.countdown?.history?.slice(-1)[0];
    const timeSinceLastAdvance = lastCountdownAdvance
      ? Date.now() - lastCountdownAdvance.timestamp
      : Infinity;

    if (timeSinceLastAdvance > DECISION_CONFIG.COUNTDOWN_STALE_THRESHOLD_MS) {
      priorities.push({
        action: ACTION_TYPES.ADVANCE_COUNTDOWN,
        priority: 8,
        reason: 'Hodně aktivity, ale countdown se nepohnul přes hodinu',
        urgency: 'high',
        method: EXECUTION_METHODS.DIRECT_API
      });
    }
  }

  // === PRIORITY 7: LONG_IDLE (>10 min) ===
  if (idleTime > DECISION_CONFIG.LONG_IDLE_MS) {
    // Dlouhý idle - vytvořit story enrichment
    priorities.push({
      action: ACTION_TYPES.WRITE_STORY,
      priority: PRIORITIES.HIGH,
      reason: `Neaktivita ${Math.floor(idleTime / 60000)} minut - obohacení příběhu`,
      urgency: 'medium',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  // === PRIORITY 6: STORY_ENRICHMENT ===
  const loreCount = autonomous.generatedLore?.length || 0;
  const storyCount = autonomous.generatedStories?.length || 0;

  if (loreCount < DECISION_CONFIG.MIN_LORE_RECOMMENDED) {
    priorities.push({
      action: ACTION_TYPES.WRITE_LORE,
      priority: PRIORITIES.MEDIUM,
      reason: `Málo lore entries (${loreCount}/${DECISION_CONFIG.MIN_LORE_RECOMMENDED} doporučeno)`,
      urgency: 'low',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  if (storyCount < DECISION_CONFIG.MIN_STORY_RECOMMENDED) {
    priorities.push({
      action: ACTION_TYPES.WRITE_STORY,
      priority: PRIORITIES.MEDIUM,
      reason: `Málo story entries (${storyCount}/${DECISION_CONFIG.MIN_STORY_RECOMMENDED} doporučeno)`,
      urgency: 'low',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  // === PRIORITY 5: NPC/LOCATION CREATION ===
  const npcCount = mystery.bystanders?.length || 0;
  const locationCount = mystery.locations?.length || 0;

  if (npcCount < DECISION_CONFIG.MIN_NPC_RECOMMENDED) {
    priorities.push({
      action: ACTION_TYPES.CREATE_NPC,
      priority: 5,
      reason: `Málo NPC (${npcCount}/${DECISION_CONFIG.MIN_NPC_RECOMMENDED} doporučeno)`,
      urgency: 'low',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  if (locationCount < DECISION_CONFIG.MIN_LOCATION_RECOMMENDED) {
    priorities.push({
      action: ACTION_TYPES.CREATE_LOCATION,
      priority: 5,
      reason: `Málo lokací (${locationCount}/${DECISION_CONFIG.MIN_LOCATION_RECOMMENDED} doporučeno)`,
      urgency: 'low',
      method: EXECUTION_METHODS.AUTONOMOUS
    });
  }

  // === PRIORITY 4: AMBIENT_ATMOSPHERE (whisperer) ===
  if (idleTime > DECISION_CONFIG.SHORT_IDLE_MIN_MS &&
      idleTime < DECISION_CONFIG.SHORT_IDLE_MAX_MS) {
    // Short idle (30s - 5min) - použít whisperer pro ambient
    priorities.push({
      action: ACTION_TYPES.WHISPER,
      priority: PRIORITIES.LOW,
      reason: 'Krátkodobá neaktivita - ambient atmosphere',
      urgency: 'minimal',
      method: EXECUTION_METHODS.WHISPER
    });
  }

  // Sort by priority (highest first)
  return priorities.sort((a, b) => b.priority - a.priority);
}

/**
 * Choose execution method for action
 * @param {string} actionType - Action type
 * @returns {string} Execution method
 */
export function chooseExecutionMethod(actionType) {
  const directAPIMethods = [
    ACTION_TYPES.ADVANCE_COUNTDOWN,
    ACTION_TYPES.INFLICT_HARM
  ];

  const autonomousMethods = [
    ACTION_TYPES.CREATE_EVENT,
    ACTION_TYPES.WRITE_LORE,
    ACTION_TYPES.WRITE_STORY,
    ACTION_TYPES.CREATE_NPC,
    ACTION_TYPES.CREATE_LOCATION
  ];

  const whisperMethods = [
    ACTION_TYPES.WHISPER
  ];

  const playwrightMethods = [
    ACTION_TYPES.CAPTURE_SCREENSHOT
  ];

  if (directAPIMethods.includes(actionType)) {
    return EXECUTION_METHODS.DIRECT_API;
  }

  if (autonomousMethods.includes(actionType)) {
    return EXECUTION_METHODS.AUTONOMOUS;
  }

  if (whisperMethods.includes(actionType)) {
    return EXECUTION_METHODS.WHISPER;
  }

  if (playwrightMethods.includes(actionType)) {
    return EXECUTION_METHODS.PLAYWRIGHT;
  }

  // Default to autonomous
  return EXECUTION_METHODS.AUTONOMOUS;
}

/**
 * Get action display name
 * @param {string} actionType - Action type
 * @returns {string} Human-readable name
 */
export function getActionDisplayName(actionType) {
  const names = {
    [ACTION_TYPES.CREATE_EVENT]: 'Vytvořit událost',
    [ACTION_TYPES.ADVANCE_COUNTDOWN]: 'Posunout countdown',
    [ACTION_TYPES.INFLICT_HARM]: 'Způsobit zranění',
    [ACTION_TYPES.WRITE_LORE]: 'Napsat lore',
    [ACTION_TYPES.WRITE_STORY]: 'Napsat příběh',
    [ACTION_TYPES.CREATE_NPC]: 'Vytvořit NPC',
    [ACTION_TYPES.CREATE_LOCATION]: 'Vytvořit lokaci',
    [ACTION_TYPES.WHISPER]: 'Šeptat atmosféru',
    [ACTION_TYPES.CAPTURE_SCREENSHOT]: 'Vyfotit screenshot'
  };

  return names[actionType] || actionType;
}

/**
 * Check if action requires review at given autonomy level
 * @param {string} actionType - Action type
 * @param {string} autonomyLevel - Autonomy level (low, medium, high, full)
 * @returns {boolean} True if requires review
 */
export function requiresReview(actionType, autonomyLevel) {
  // Low: Everything requires review
  if (autonomyLevel === 'low') {
    return true;
  }

  // Medium: Critical actions require review
  if (autonomyLevel === 'medium') {
    const criticalActions = [
      ACTION_TYPES.ADVANCE_COUNTDOWN,
      ACTION_TYPES.INFLICT_HARM,
      ACTION_TYPES.CREATE_EVENT
    ];
    return criticalActions.includes(actionType);
  }

  // High: Only very critical actions require review
  if (autonomyLevel === 'high') {
    const veryCriticalActions = [
      ACTION_TYPES.INFLICT_HARM,
      ACTION_TYPES.ADVANCE_COUNTDOWN
    ];
    return veryCriticalActions.includes(actionType);
  }

  // Full: Nothing requires review
  if (autonomyLevel === 'full') {
    return false;
  }

  // Default: require review
  return true;
}
