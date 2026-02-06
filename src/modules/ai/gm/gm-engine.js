/**
 * GM Engine - Autonomous Game Master
 * Main engine for running AI GM mode
 */
import { getState } from '../../state/store.js';
import { logThinking } from '../keeper/thinking-logger.js';
import { parsePlayerAction } from './player-input-parser.js';
import { resolveMove, applyHarm, applyCondition } from './mechanics-engine.js';
import { generateNPCResponse, shouldNPCIntervene, determineNPCBehavior } from './npc-engine.js';
import {
  getCurrentScene,
  updateScene,
  initializeScene,
  increaseTension,
  decreaseTension,
  nextTurn,
  recordPlayerAction,
  triggerStorySpike,
  shouldPauseAmbientEvents
} from './scene-manager.js';
import {
  narrateAction,
  generateSceneDescription,
  generateGMResponse,
  generateAmbientEvent,
  narrateConsequence
} from './narrative-engine.js';

class GMEngine {
  constructor() {
    this.running = false;
    this.playerActionQueue = [];
    this.currentScene = null;
    this.loopInterval = null;
    this.sessionLog = [];
    this.settings = {
      autoApplyMechanics: true,
      requireApprovalFor: [], // Action types requiring approval
      narrativeStyle: 'balanced', // 'minimal', 'balanced', 'verbose'
      npcAutonomy: 'high', // 'low', 'medium', 'high'
      ambientEventFrequency: 60000, // ms between ambient events
      combatPacing: 'realistic', // 'cinematic', 'realistic'

      // Novel Mode settings
      novelMode: {
        enabled: false, // Default OFF - users opt-in
        narrativeLength: 'medium', // 'short', 'medium', 'long'
        literaryQuality: 'balanced', // 'balanced', 'high', 'poetic'
        memoryDepth: 'session', // 'recent', 'session', 'full'
        storyPlanning: true, // Enable forward planning
        autoAdvanceActs: true // Auto-detect act transitions
      }
    };
    this.lastAmbientEvent = 0;
    this.lastPlanningCheck = 0;

    // Activity tracking for adaptive rate limiting
    this.activityTracking = {
      recentPlayerActions: [],
      highActivityThreshold: 3  // 3 akce za minutu = vysoká aktivita
    };
  }

  /**
   * Start GM loop
   */
  async start() {
    if (this.running) {
      console.warn('[GM Engine] Already running');
      return;
    }

    this.running = true;
    console.log('[GM Engine] Starting autonomous GM mode');

    // Initialize scene if not exists
    if (!this.currentScene) {
      await this.initializeDefaultScene();
    }

    // Start processing loop
    this.processLoop();

    // Log to session
    this.addToSessionLog({
      type: 'system',
      message: 'AI Game Master mode activated.',
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Stop GM loop
   */
  stop() {
    this.running = false;
    console.log('[GM Engine] Stopping GM mode');

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    this.addToSessionLog({
      type: 'system',
      message: 'AI Game Master mode deactivated.',
      timestamp: Date.now()
    });
  }

  /**
   * Initialize default scene
   */
  async initializeDefaultScene() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    const location = mystery?.locations?.[0] || { name: 'Unknown Location' };
    const hunters = campaign.hunters?.map(h => h.id) || [];

    this.currentScene = initializeScene(location, hunters, []);

    // Initialize Novel Mode systems if enabled
    if (this.settings.novelMode?.enabled && currentMysteryId) {
      this.initializeNovelModeSystems(currentMysteryId);
    }

    // Generate opening scene description
    const sceneDesc = await generateSceneDescription(location, 'mysterious', 5);
    this.addToSessionLog({
      type: 'scene',
      message: sceneDesc,
      timestamp: Date.now()
    });
  }

  /**
   * Initialize Novel Mode systems (narrative memory, story arc, etc.)
   */
  initializeNovelModeSystems(mysteryId) {
    console.log('[GM Engine] Initializing Novel Mode systems...');

    // Import and initialize systems
    import('./narrative-memory.js').then(({ addToNarrativeMemory }) => {
      // Initialize with opening beat
      addToNarrativeMemory(mysteryId, {
        type: 'story_start',
        summary: 'Mystery begins',
        significance: 'high'
      });
    });

    import('./story-arc-manager.js').then(({ initializeStoryArc }) => {
      initializeStoryArc(mysteryId);
    });

    console.log('[GM Engine] Novel Mode systems initialized');
  }

  /**
   * Get adaptive ambient event interval based on activity
   * @returns {number} Interval in ms
   */
  getAdaptiveAmbientInterval() {
    const now = Date.now();

    // Clean old actions (starší než 1 min)
    this.activityTracking.recentPlayerActions =
      this.activityTracking.recentPlayerActions.filter(t => now - t < 60000);

    const actionsInLastMinute = this.activityTracking.recentPlayerActions.length;

    if (actionsInLastMinute >= 3) {
      return 180000;  // 3 minuty při vysoké aktivitě
    } else if (actionsInLastMinute >= 1) {
      return 120000;  // 2 minuty při střední aktivitě
    } else {
      return 60000;   // 1 minuta při nízké aktivitě
    }
  }

  /**
   * Detect if action result is a story spike
   * @param {Object} result - Move result
   * @param {Object} parsedAction - Parsed action
   * @returns {boolean} True if story spike
   */
  detectStorySpike(result, parsedAction) {
    // Critical failure (6 nebo méně)
    if (result.outcome === 'failure' && result.total <= 6) {
      return true;
    }

    // Monster combat moves
    if (['kick_some_ass', 'protect_someone', 'act_under_pressure'].includes(parsedAction.move)) {
      if (result.outcome === 'failure') {
        return true;
      }
    }

    // Keywords indicating high stakes
    const highStakesKeywords = ['death', 'kill', 'attack', 'monster', 'harm', 'smrt', 'zabít', 'útok'];
    const actionText = parsedAction.raw.toLowerCase();
    if (highStakesKeywords.some(kw => actionText.includes(kw))) {
      return true;
    }

    return false;
  }

  /**
   * Process player action
   */
  async processPlayerAction(hunterId, actionText) {
    if (!this.running) {
      console.warn('[GM Engine] Not running, cannot process action');
      return;
    }

    this.playerActionQueue.push({
      hunterId,
      actionText,
      timestamp: Date.now()
    });

    console.log(`[GM Engine] Queued action from hunter ${hunterId}: ${actionText}`);
  }

  /**
   * Main processing loop
   */
  async processLoop() {
    // Use interval instead of while loop to avoid blocking
    this.loopInterval = setInterval(async () => {
      if (!this.running) {
        clearInterval(this.loopInterval);
        return;
      }

      try {
        // Process player actions
        if (this.playerActionQueue.length > 0) {
          const action = this.playerActionQueue.shift();
          await this.handlePlayerAction(action);
        }

        // Check for ambient events
        await this.checkAmbientEvents();

        // Process NPC behaviors (if high autonomy)
        if (this.settings.npcAutonomy === 'high') {
          await this.processNPCBehaviors();
        }
      } catch (error) {
        console.error('[GM Engine] Error in process loop:', error);
        logThinking('GM Engine Error', error.message);
      }
    }, 1000); // Run every second
  }

  /**
   * Handle single player action
   */
  async handlePlayerAction({ hunterId, actionText }) {
    console.log(`[GM Engine] Processing action: ${actionText}`);

    // Record player action for activity tracking
    this.activityTracking.recentPlayerActions.push(Date.now());
    recordPlayerAction();

    // Add player action to log
    const { campaign, currentMysteryId } = getState();
    const hunter = campaign.hunters.find(h => h.id === hunterId);
    this.addToSessionLog({
      type: 'player',
      hunter: hunter?.name || 'Unknown',
      message: actionText,
      timestamp: Date.now()
    });

    // 1. Parse action
    const parsed = parsePlayerAction(actionText);

    // 2. Determine if move is triggered
    if (parsed.move) {
      console.log(`[GM Engine] Move detected: ${parsed.move}`);

      // Resolve move with dice
      const result = await resolveMove(hunterId, parsed.move, parsed);

      if (!result.success) {
        console.error('[GM Engine] Move resolution failed:', result.error);
        return;
      }

      // 3. Narrate outcome
      const narrative = await narrateAction(parsed, result);

      // 4. Apply consequences if auto-apply enabled
      if (this.settings.autoApplyMechanics) {
        await this.applyConsequences(hunterId, result, parsed);
      }

      // 5. Post to session log
      this.addToSessionLog({
        type: 'gm',
        message: narrative,
        roll: result,
        timestamp: Date.now()
      });

      // 6. Increase tension on failures
      if (result.outcome === 'failure') {
        increaseTension(1);

        // Detect story spike
        if (this.detectStorySpike(result, parsed)) {
          triggerStorySpike(180000); // 3 min pause
          console.log('[Story Spike] Triggered by critical failure');
        }
      } else if (result.outcome === 'success') {
        decreaseTension(0.5);
      }

      // 7. Novel Mode: Record to narrative memory and story arc
      if (this.settings.novelMode?.enabled && currentMysteryId) {
        this.recordNovelModeEvent(currentMysteryId, {
          type: parsed.move || 'action',
          summary: narrative.substring(0, 200),
          significance: result.outcome === 'failure' ? 'medium' : 'low',
          roll: result,
          relatedNPCs: [],
          relatedLocations: [this.currentScene?.location?.name].filter(Boolean)
        }, parsed, result);
      }
    } else {
      // Just narrative response (no move)
      const scene = getCurrentScene();
      const mystery = campaign.mysteries.find(m => m.id === getState().currentMysteryId);

      const response = await generateGMResponse(actionText, {
        scene,
        mystery
      });

      this.addToSessionLog({
        type: 'gm',
        message: response,
        timestamp: Date.now()
      });
    }

    // 7. Check for NPC reactions
    await this.triggerNPCReactions(parsed, actionText);
  }

  /**
   * Apply consequences of move result
   */
  async applyConsequences(hunterId, result, parsedAction) {
    const { campaign } = getState();
    const hunter = campaign.hunters.find(h => h.id === hunterId);

    // Move-specific consequences
    if (result.move === 'kick_some_ass') {
      if (result.outcome === 'failure') {
        // Take harm without dealing damage
        const harmResult = await applyHarm(hunterId, 2, parsedAction.target || 'enemy');
        const narrative = await narrateConsequence(
          { type: 'harm', amount: 2, source: parsedAction.target },
          { hunter: hunter.name }
        );
        this.addToSessionLog({
          type: 'consequence',
          message: narrative,
          timestamp: Date.now()
        });
      } else if (result.outcome === 'partial') {
        // Deal damage but take harm
        const harmResult = await applyHarm(hunterId, 1, parsedAction.target || 'enemy');
        const narrative = await narrateConsequence(
          { type: 'harm', amount: 1, source: parsedAction.target },
          { hunter: hunter.name }
        );
        this.addToSessionLog({
          type: 'consequence',
          message: narrative,
          timestamp: Date.now()
        });
      }
    } else if (result.move === 'act_under_pressure') {
      if (result.outcome === 'failure') {
        // Something goes badly wrong
        increaseTension(2);
      }
    }
  }

  /**
   * Trigger NPC reactions to player action
   */
  async triggerNPCReactions(parsed, actionText) {
    const scene = getCurrentScene();
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    if (!mystery || !scene.npcsPresent?.length) {
      return;
    }

    // Check each NPC if they should react
    for (const npcId of scene.npcsPresent) {
      const shouldReact = shouldNPCIntervene(npcId, {
        tension: scene.tension,
        playerAction: actionText
      });

      if (shouldReact) {
        const response = await generateNPCResponse(npcId, {
          playerAction: actionText,
          situation: 'Player action in scene'
        });

        if (response) {
          const npc = mystery.bystanders?.find(b => b.id === npcId);
          this.addToSessionLog({
            type: 'npc',
            npc: npc?.name || 'NPC',
            message: response,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Check and trigger ambient events
   */
  async checkAmbientEvents() {
    const now = Date.now();

    // Check if should pause
    if (shouldPauseAmbientEvents()) {
      return;
    }

    // Use adaptive interval
    const adaptiveInterval = this.getAdaptiveAmbientInterval();
    if (now - this.lastAmbientEvent < adaptiveInterval) {
      return;
    }

    const scene = getCurrentScene();
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    if (!mystery) {
      return;
    }

    // Generate ambient event
    const event = await generateAmbientEvent(scene, mystery);

    if (event) {
      this.addToSessionLog({
        type: 'ambient',
        message: event,
        timestamp: Date.now()
      });

      this.lastAmbientEvent = now;
    }
  }

  /**
   * Process NPC autonomous behaviors
   */
  async processNPCBehaviors() {
    const scene = getCurrentScene();
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    if (!mystery || !scene.npcsPresent?.length) {
      return;
    }

    // Randomly pick an NPC to act (low frequency)
    if (Math.random() > 0.95) { // 5% chance per loop iteration
      const npcId = scene.npcsPresent[Math.floor(Math.random() * scene.npcsPresent.length)];

      const behavior = await determineNPCBehavior(npcId, {
        description: 'Current scene',
        tension: scene.tension
      });

      if (behavior) {
        this.addToSessionLog({
          type: 'npc',
          npc: behavior.npcName,
          message: behavior.action,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Record Novel Mode event (memory + story arc)
   */
  recordNovelModeEvent(mysteryId, eventData, parsedAction, result) {
    const scene = this.currentScene;

    // Add to narrative memory
    import('./narrative-memory.js').then(({ addToNarrativeMemory }) => {
      addToNarrativeMemory(mysteryId, eventData);
    });

    // Detect and record story beat
    import('./story-arc-manager.js').then(({ recordStoryBeat, detectBeatType }) => {
      const beatType = detectBeatType({
        move: parsedAction.move,
        outcome: result.outcome,
        tension: scene?.tension || 5,
        isMonsterEncounter: false, // TODO: Detect monster encounters
        isNPCIntroduction: false,
        isClueDiscovery: parsedAction.move === 'investigate_a_mystery'
      });

      recordStoryBeat(mysteryId, {
        type: beatType,
        name: `${parsedAction.move || 'Action'}: ${result.outcome}`,
        description: eventData.summary,
        outcomes: [result.outcome]
      });
    });

    // Check for story planning triggers
    this.checkPlanningTriggers(mysteryId);

    // Check for planned beat triggers
    import('./story-planner.js').then(({ checkBeatTriggers, executePlannedBeat }) => {
      const triggeredBeats = checkBeatTriggers(mysteryId, {
        actionText: parsedAction.raw,
        location: scene?.location?.name
      });

      triggeredBeats.forEach(async (beat) => {
        const execution = await executePlannedBeat(mysteryId, beat.id);
        if (execution) {
          this.addToSessionLog({
            type: 'planned_beat',
            message: execution.narrative,
            beat: execution.beat,
            timestamp: Date.now()
          });
        }
      });
    });
  }

  /**
   * Check if story planning should trigger
   */
  checkPlanningTriggers(mysteryId) {
    const now = Date.now();

    // Run planning max once per minute
    if (now - this.lastPlanningCheck < 60000) {
      return;
    }

    if (!this.settings.novelMode?.storyPlanning) {
      return;
    }

    import('./story-arc-manager.js').then(({ getBeatsSinceLastPlan }) => {
      const beatsSinceLastPlan = getBeatsSinceLastPlan(mysteryId);

      // Trigger planning every 3 beats
      if (beatsSinceLastPlan >= 3) {
        console.log('[GM Engine] Triggering story planning...');
        this.lastPlanningCheck = now;

        import('./story-planner.js').then(({ generateStoryPlan }) => {
          generateStoryPlan(mysteryId).catch(err => {
            console.error('[GM Engine] Story planning error:', err);
          });
        });
      }
    });
  }

  /**
   * Add entry to session log
   */
  addToSessionLog(entry) {
    this.sessionLog.push(entry);

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-session-update', {
        detail: entry
      }));
    }

    console.log('[GM Session]', entry);
  }

  /**
   * Get session log
   */
  getSessionLog() {
    return [...this.sessionLog];
  }

  /**
   * Clear session log
   */
  clearSessionLog() {
    this.sessionLog = [];
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Check if running
   */
  isRunning() {
    return this.running;
  }
}

// Singleton instance
export const gmEngine = new GMEngine();

// Export helper functions
export const startGMMode = () => gmEngine.start();
export const stopGMMode = () => gmEngine.stop();
export const processPlayerAction = (hunterId, text) => gmEngine.processPlayerAction(hunterId, text);
export const getGMSessionLog = () => gmEngine.getSessionLog();
export const isGMModeRunning = () => gmEngine.isRunning();
export const updateGMSettings = (settings) => gmEngine.updateSettings(settings);
export const getGMSettings = () => gmEngine.getSettings();
