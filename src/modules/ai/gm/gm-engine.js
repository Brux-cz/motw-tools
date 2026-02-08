/**
 * GM Engine - Autonomous Game Master
 * Main engine for running AI GM mode
 */
import { getState } from '../../state/store.js';
import { parsePlayerAction, getMoveNameCz } from './player-input-parser.js';
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
  narrateHardMove,
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
      combatPacing: 'realistic' // 'cinematic', 'realistic'
    };
    this.lastAmbientEvent = 0;
    this.lastNPCBehavior = 0;
    this.npcBehaviorInProgress = false;
    this.autoPlayActive = false;
    this.processing = false;

    // Keeper move escalation: soft → hard
    // When a failure triggers a soft move (setup), it's stored here.
    // Next player action checks if they addressed or ignored the setup.
    this.pendingSetup = null; // { softMove, result, parsed, context, timestamp }

    // Activity tracking for adaptive rate limiting
    this.activityTracking = {
      recentPlayerActions: [],
      highActivityThreshold: 3  // 3 akce za minutu = vysoká aktivita
    };

    // Story state tracking
    this.storyState = {
      phase: 'teaser', // teaser | investigation | confrontation | resolution
      round: 0,
      discoveredClues: [],
      monsterRevealed: false,
      actionsAtCurrentLocation: 0,
      lastNPCReactionTime: 0,
      softMovesThisScene: 0,
      hardMovesThisScene: 0
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
   * Get current story state for narrative context
   * @returns {Object} Story state
   */
  getStoryState() {
    return { ...this.storyState };
  }

  /**
   * Update story phase based on session events
   * Called after each player action
   */
  updateStoryPhase() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    if (!mystery) return;

    this.storyState.round++;
    this.storyState.actionsAtCurrentLocation++;

    // Check for phase transitions based on keywords in recent log
    const recentEntries = this.sessionLog.slice(-10);
    const recentText = recentEntries.map(e => e.message).join(' ').toLowerCase();

    const monsterName = (mystery.monster?.name || '').toLowerCase();
    const combatKeywords = ['útočí', 'útok', 'bojuj', 'zaútoč', 'tasím', 'střílím', 'sekám', 'bráním se', 'kick_some_ass', 'zbraň'];
    const revealKeywords = [monsterName, 'příšera', 'monstrum', 'odhalení', 'objevil', 'spatřil'].filter(Boolean);

    // Detect monster revealed
    if (!this.storyState.monsterRevealed && monsterName) {
      if (revealKeywords.some(kw => recentText.includes(kw))) {
        this.storyState.monsterRevealed = true;
      }
    }

    // Track discovered clues from investigation moves
    const lastEntry = recentEntries[recentEntries.length - 1];
    if (lastEntry?.roll?.move === 'investigate_a_mystery' && lastEntry?.roll?.outcome !== 'failure') {
      const clue = `Stopa z kola ${this.storyState.round}`;
      if (this.storyState.discoveredClues.length < 5) {
        this.storyState.discoveredClues.push(clue);
      }
    }

    // Phase transition logic
    const countdown = mystery.countdown;
    const currentPhase = countdown?.currentPhase || 0;

    if (this.storyState.phase === 'teaser') {
      // Teaser → investigation: after 3 rounds OR explicit investigation action
      const investigateKeywords = ['vyšetřuj', 'investigate', 'hledám stopy', 'zkoumám', 'prozkoumám', 'pátram', 'stopuji'];
      const hasInvestigation = investigateKeywords.some(kw => recentText.includes(kw));
      if (this.storyState.round >= 3 || hasInvestigation) {
        this.storyState.phase = 'investigation';
        console.log('[Story] Phase transition: teaser → investigation');
      }
    } else if (this.storyState.phase === 'investigation') {
      // Transition to confrontation when:
      // - Monster is revealed, OR
      // - Combat keywords appear, OR
      // - Countdown reaches phase 3+
      const hasCombat = combatKeywords.some(kw => recentText.includes(kw));
      if (this.storyState.monsterRevealed || hasCombat || currentPhase >= 3) {
        this.storyState.phase = 'confrontation';
        console.log('[Story] Phase transition: investigation → confrontation');
      }
    } else if (this.storyState.phase === 'confrontation') {
      // Transition to resolution when countdown reaches phase 5+
      if (currentPhase >= 5) {
        this.storyState.phase = 'resolution';
        console.log('[Story] Phase transition: confrontation → resolution');
      }
    }
  }

  /**
   * Clamp tension to match current story phase
   * Prevents tension from exceeding phase-appropriate levels
   */
  clampTensionToPhase() {
    const scene = getCurrentScene();
    const phaseMaxTension = {
      teaser: 3,
      investigation: 5,
      confrontation: 8,
      resolution: 10
    };
    const maxTension = phaseMaxTension[this.storyState.phase] || 10;
    if (scene.tension > maxTension) {
      updateScene({ tension: maxTension });
    }
  }

  /**
   * Initialize default scene
   */
  async initializeDefaultScene() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    const location = mystery?.locations?.[0] || { name: 'Unknown Location' };
    const hunters = campaign.hunters?.map(h => h.id) || [];
    const npcs = mystery?.bystanders?.map(b => b.id) || [];

    this.currentScene = initializeScene(location, hunters, npcs);

    // Generate opening scene description with mystery context
    const mysteryContext = this.buildMysteryContext();
    const storyState = this.getStoryState();
    const sceneDesc = await generateSceneDescription(location, 'calm', 2, { mysteryContext, storyState });
    this.addToSessionLog({
      type: 'scene',
      message: sceneDesc,
      timestamp: Date.now()
    });
  }

  /**
   * Build full mystery context string for AI prompts
   * @returns {string} Formatted mystery context
   */
  buildMysteryContext() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    if (!mystery) return '';

    const parts = [];

    // Basic mystery info
    parts.push(`ZÁHADA: ${mystery.name || 'Nepojmenovaná záhada'}`);
    if (mystery.concept) parts.push(`KONCEPT: ${mystery.concept}`);
    if (mystery.hook) parts.push(`NÁVNADA: ${mystery.hook}`);

    // Monster
    if (mystery.monster) {
      const m = mystery.monster;
      parts.push('');
      parts.push(`PŘÍŠERA: ${m.name || 'Neznámá'} (${m.type || 'neznámý typ'})`);
      if (m.motivation) parts.push(`- Motivace: ${m.motivation}`);
      if (m.description) parts.push(`- Popis: ${m.description}`);
      if (m.powers?.length) parts.push(`- Schopnosti: ${m.powers.join(', ')}`);
      if (m.weakness) parts.push(`- Slabina: ${m.weakness}`);
      if (m.harm != null) parts.push(`- Výdrž: ${m.harm}${m.armor ? `, Zbroj: ${m.armor}` : ''}`);
    }

    // Bystanders
    if (mystery.bystanders?.length) {
      parts.push('');
      parts.push('PŘIHLÍŽEJÍCÍ:');
      for (const b of mystery.bystanders) {
        parts.push(`- ${b.name} (${b.type || 'bystander'}) — ${b.description || b.motivation || 'bez popisu'}`);
      }
    }

    // Locations
    if (mystery.locations?.length) {
      parts.push('');
      parts.push('LOKACE:');
      for (const loc of mystery.locations) {
        parts.push(`- ${loc.name} (${loc.type || 'lokace'}) — ${loc.description || 'bez popisu'}`);
      }
    }

    // Countdown
    if (mystery.countdown?.phases?.length) {
      const cd = mystery.countdown;
      const currentPhase = cd.currentPhase || 0;
      const phaseNames = ['Den', 'Příšeří', 'Západ', 'Soumrak', 'Noc', 'Půlnoc'];
      parts.push('');
      parts.push(`ODPOČET (fáze ${currentPhase + 1}/${cd.phases.length}):`);
      cd.phases.forEach((phase, i) => {
        const marker = i < currentPhase ? ' ✓' : i === currentPhase ? ' [AKTUÁLNÍ]' : '';
        const phaseName = phaseNames[i] || `Krok ${i + 1}`;
        parts.push(`${i + 1}. ${phaseName}: ${phase.description || ''}${marker}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Build recent session history for AI context
   * @param {number} maxEntries - Max log entries to include
   * @returns {string} Formatted history
   */
  buildRecentHistory(maxEntries = 15) {
    if (this.sessionLog.length === 0) return '';

    // Prioritize player/keeper/scene entries, limit NPC/ambient to prevent flooding
    const candidates = this.sessionLog.slice(-(maxEntries * 2));
    const prioritized = [];
    let npcCount = 0;
    let ambientCount = 0;
    const maxNPC = 3;      // Max NPC entries in history
    const maxAmbient = 1;  // Max ambient entries in history

    // Walk backwards to keep most recent entries, apply limits
    for (let i = candidates.length - 1; i >= 0 && prioritized.length < maxEntries; i--) {
      const entry = candidates[i];
      if (entry.type === 'npc') {
        if (npcCount >= maxNPC) continue;
        npcCount++;
      } else if (entry.type === 'ambient') {
        if (ambientCount >= maxAmbient) continue;
        ambientCount++;
      } else if (entry.type === 'system' || entry.type === 'autoplay') {
        continue; // Skip system/autoplay entries
      }
      prioritized.unshift(entry);
    }

    return prioritized.map(entry => {
      switch (entry.type) {
        case 'player':
          return `[${entry.hunter}]: ${entry.message}`;
        case 'gm':
          return `[Keeper]: ${entry.message}`;
        case 'npc':
          return `[${entry.npc}]: ${entry.message}`;
        case 'scene':
          return `[Scéna]: ${entry.message}`;
        case 'ambient':
          return `[Atmosféra]: ${entry.message}`;
        case 'consequence':
          return `[Důsledek]: ${entry.message}`;
        default:
          return `[Systém]: ${entry.message}`;
      }
    }).join('\n');
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
          this.processing = true;
          try {
            await this.handlePlayerAction(action);
          } finally {
            this.processing = false;
          }
        }

        // Check for ambient events
        await this.checkAmbientEvents();

        // Process NPC behaviors (if high autonomy, skip during auto-play)
        if (this.settings.npcAutonomy === 'high' && !this.autoPlayActive) {
          await this.processNPCBehaviors();
        }
      } catch (error) {
        console.error('[GM Engine] Error in process loop:', error);
      }
    }, 1000); // Run every second
  }

  /**
   * Detect if the player's action addresses the pending soft move setup
   * @param {string} actionText - Player's action text
   * @param {Object} pendingSetup - The pending setup object
   * @returns {boolean} True if player addressed the setup
   */
  detectIfPlayerAddressedSetup(actionText, pendingSetup) {
    const action = actionText.toLowerCase();
    const setup = pendingSetup.softMove.toLowerCase();

    // Defensive/reactive keywords suggest the player is responding to the threat
    const reactiveKeywords = [
      'uhnout', 'uhnu', 'uhýbám', 'uskočím', 'uskočit',
      'bráním', 'bráním se', 'kryt', 'schovám', 'schovávám',
      'utíkám', 'prchám', 'couvám', 'ustupuji',
      'otočím se', 'podívám se', 'zkontroluji', 'prozkoumám',
      'zastavím', 'poslouchám', 'dávám pozor',
      'reaguji', 'připravím se', 'tasím', 'zvedám',
      'varování', 'nebezpečí', 'opatrně', 'pomalu'
    ];

    // Check if action references anything from the soft move
    // Extract key nouns from setup (crude but effective)
    const setupWords = setup.split(/\s+/).filter(w => w.length > 4);
    const referencesSetup = setupWords.some(word => action.includes(word));

    // Check for reactive keywords
    const isReactive = reactiveKeywords.some(kw => action.includes(kw));

    return referencesSetup || isReactive;
  }

  /**
   * Check if pacing rules require forcing a soft move
   * @returns {boolean} True if hard moves should be suppressed
   */
  shouldForceSoftMove() {
    const { softMovesThisScene, hardMovesThisScene } = this.storyState;

    // If 2+ hard moves in a row without a soft move, force soft
    if (hardMovesThisScene >= 2 && softMovesThisScene === 0) {
      return true;
    }

    // Target ratio: at least 2 soft for every 1 hard
    if (hardMovesThisScene > 0 && softMovesThisScene / hardMovesThisScene < 2) {
      return true;
    }

    return false;
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

    // Update story state tracking
    this.updateStoryPhase();
    this.clampTensionToPhase();

    // Build context for AI calls
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    const mysteryContext = this.buildMysteryContext();
    const recentHistory = this.buildRecentHistory(15);
    const storyState = this.getStoryState();
    const aiContext = { mysteryContext, recentHistory, storyState };

    // 2. Resolve pending soft move setup (if any)
    if (this.pendingSetup) {
      const addressed = this.detectIfPlayerAddressedSetup(actionText, this.pendingSetup);

      if (!addressed) {
        // Golden opportunity → hard move (player ignored the warning)
        console.log('[GM Engine] Player ignored setup → golden opportunity → hard move');
        const hardNarrative = await narrateHardMove(this.pendingSetup, actionText, aiContext);

        this.storyState.hardMovesThisScene++;
        this.storyState.softMovesThisScene = 0; // reset soft counter

        this.addToSessionLog({
          type: 'gm',
          message: hardNarrative,
          timestamp: Date.now()
        });

        // Apply mechanical consequences for the ignored setup
        if (this.settings.autoApplyMechanics && this.pendingSetup.result) {
          await this.applyConsequences(hunterId, this.pendingSetup.result, this.pendingSetup.parsed);
        }

        increaseTension(1);
      } else {
        console.log('[GM Engine] Player addressed setup → no hard move');
        // Player reacted — no hard move, just acknowledge
        decreaseTension(0.5);
      }

      this.pendingSetup = null;
    }

    // 3. Determine if move is triggered
    if (parsed.move) {
      console.log(`[GM Engine] Move detected: ${parsed.move}`);

      // Resolve move with dice
      const result = await resolveMove(hunterId, parsed.move, parsed);

      if (!result.success) {
        console.error('[GM Engine] Move resolution failed:', result.error);
        return;
      }

      // 4. Handle outcome with escalation system
      if (result.outcome === 'failure') {
        // FAILURE: Soft move as setup — NOT immediate hard move
        // Exception: if pacing already has too many hard moves, always do soft
        const narrative = await narrateAction(parsed, result, aiContext);

        this.storyState.softMovesThisScene++;

        this.addToSessionLog({
          type: 'gm',
          message: narrative,
          roll: { ...result, moveName_cz: getMoveNameCz(parsed.move) },
          timestamp: Date.now()
        });

        // Store setup for next action — hard move comes IF player ignores
        this.pendingSetup = {
          softMove: narrative,
          result,
          parsed,
          context: aiContext,
          timestamp: Date.now()
        };

        increaseTension(1);

        // Detect story spike
        if (this.detectStorySpike(result, parsed)) {
          triggerStorySpike(180000); // 3 min pause
          console.log('[Story Spike] Triggered by critical failure');
        }

      } else if (result.outcome === 'partial') {
        // PARTIAL: One-step — consequences from MOVE RULES, not keeper choice
        const narrative = await narrateAction(parsed, result, aiContext);

        // Apply move-specific consequences (these come from the rules)
        if (this.settings.autoApplyMechanics) {
          await this.applyConsequences(hunterId, result, parsed);
        }

        this.addToSessionLog({
          type: 'gm',
          message: narrative,
          roll: { ...result, moveName_cz: getMoveNameCz(parsed.move) },
          timestamp: Date.now()
        });

      } else {
        // SUCCESS: One-step — narrate success
        const narrative = await narrateAction(parsed, result, aiContext);

        this.addToSessionLog({
          type: 'gm',
          message: narrative,
          roll: { ...result, moveName_cz: getMoveNameCz(parsed.move) },
          timestamp: Date.now()
        });

        decreaseTension(0.5);
      }

    } else {
      // Just narrative response (no move)
      const scene = getCurrentScene();

      const response = await generateGMResponse(actionText, {
        scene,
        mystery,
        mysteryContext,
        recentHistory,
        storyState,
        hunterName: hunter?.name
      });

      this.addToSessionLog({
        type: 'gm',
        message: response,
        timestamp: Date.now()
      });
    }

    // 5. Check for NPC reactions (limited to 1 per action)
    await this.triggerNPCReactions(parsed, actionText);
  }

  /**
   * Apply consequences of move result
   * Note: Failure consequences are NOT applied here — they go through
   * the soft→hard move escalation system (pendingSetup).
   * This method handles partial success consequences (from move rules).
   */
  async applyConsequences(hunterId, result, parsedAction) {
    const { campaign } = getState();
    const hunter = campaign.hunters.find(h => h.id === hunterId);

    // Move-specific consequences for PARTIAL success only
    // (Failure consequences are deferred to hard move escalation)
    if (result.move === 'kick_some_ass') {
      if (result.outcome === 'partial') {
        // 7-9: Both sides exchange harm (this IS the move rule)
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
      } else if (result.outcome === 'failure') {
        // Failure harm applied via hard move escalation (when/if it fires)
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
      }
    } else if (result.move === 'act_under_pressure') {
      if (result.outcome === 'failure') {
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

    // Cooldown: minimum 10s between NPC reactions
    const now = Date.now();
    if (now - this.storyState.lastNPCReactionTime < 10000) {
      return;
    }

    // Only allow 1 NPC to react per player action (prevent flooding)
    // Prioritize NPC that was directly mentioned, otherwise pick randomly
    let reactingNpcId = null;

    for (const npcId of scene.npcsPresent) {
      const npc = mystery.bystanders?.find(b => b.id === npcId);
      if (npc && actionText.toLowerCase().includes(npc.name.toLowerCase())) {
        reactingNpcId = npcId;
        break;
      }
    }

    // If no NPC was mentioned, check random chance for one NPC
    if (!reactingNpcId) {
      // Shuffle NPCs and pick first one that passes the check
      const shuffled = [...scene.npcsPresent].sort(() => Math.random() - 0.5);
      for (const npcId of shuffled) {
        if (shouldNPCIntervene(npcId, { tension: scene.tension, playerAction: actionText })) {
          reactingNpcId = npcId;
          break;
        }
      }
    }

    if (!reactingNpcId) return;

    const recentHistory = this.buildRecentHistory(10);
    const response = await generateNPCResponse(reactingNpcId, {
      playerAction: actionText,
      situation: 'Player action in scene',
      recentHistory
    });

    if (response) {
      const npc = mystery.bystanders?.find(b => b.id === reactingNpcId);
      this.storyState.lastNPCReactionTime = now;
      this.addToSessionLog({
        type: 'npc',
        npc: npc?.name || 'NPC',
        message: response,
        timestamp: Date.now()
      });
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

    // Set timestamp BEFORE async call to prevent concurrent generations
    this.lastAmbientEvent = now;

    // Generate ambient event with mystery context + history to avoid repetition
    const mysteryContext = this.buildMysteryContext();
    const recentHistory = this.buildRecentHistory(10);
    const storyState = this.getStoryState();
    const event = await generateAmbientEvent(scene, mystery, { mysteryContext, recentHistory, storyState });

    if (event) {
      this.addToSessionLog({
        type: 'ambient',
        message: event,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NPC autonomous behaviors
   */
  async processNPCBehaviors() {
    const now = Date.now();

    // Concurrency guard — only one NPC behavior at a time
    if (this.npcBehaviorInProgress) return;

    // Global cooldown 30s between autonomous NPC actions
    if (now - this.lastNPCBehavior < 30000) return;

    // 5% chance per loop iteration
    if (Math.random() > 0.95) {
      const scene = getCurrentScene();
      const { campaign, currentMysteryId } = getState();
      const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

      if (!mystery || !scene.npcsPresent?.length) {
        return;
      }

      // Set guards BEFORE async call to prevent concurrent generations
      this.npcBehaviorInProgress = true;
      this.lastNPCBehavior = now;

      try {
        const npcId = scene.npcsPresent[Math.floor(Math.random() * scene.npcsPresent.length)];
        const recentHistory = this.buildRecentHistory(10);

        const behavior = await determineNPCBehavior(npcId, {
          description: 'Current scene',
          tension: scene.tension,
          recentHistory
        });

        if (behavior) {
          this.addToSessionLog({
            type: 'npc',
            npc: behavior.npcName,
            message: behavior.action,
            timestamp: Date.now()
          });
        }
      } finally {
        this.npcBehaviorInProgress = false;
      }
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength() {
    return this.playerActionQueue.length;
  }

  /**
   * Set auto-play active flag
   */
  setAutoPlayActive(active) {
    this.autoPlayActive = active;
    if (active) {
      // Suppress ambient events during auto-play (controller handles pacing)
      this.settings.ambientEventFrequency = 300000; // 5 min
    }
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
   * Check if engine is currently processing an action or has queued actions
   */
  isProcessing() {
    return this.processing || this.playerActionQueue.length > 0;
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
export const getGMQueueLength = () => gmEngine.getQueueLength();
export const isGMProcessing = () => gmEngine.isProcessing();
export const setAutoPlayActive = (active) => gmEngine.setAutoPlayActive(active);
