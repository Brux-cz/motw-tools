/**
 * GM Engine - Autonomous Game Master
 * Main engine for running AI GM mode
 */
import { getState, updateCampaign } from '../../state/store.js';
import { parsePlayerAction, getMoveNameCz } from './player-input-parser.js';
import { resolveMove, applyHarm, applyCondition, applyMonsterHarm } from './mechanics-engine.js';
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
  narrateConsequence,
  narrateCountdown,
  narrateMonsterHarmMove,
  generateTeaserScene,
  generateHookDelivery,
  generateCombinedOpeningScene,
  generateSceneTransition
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

    // Countdown cooldown: max 1 advance per 30s
    this.lastCountdownAdvance = 0;

    // Session data — runtime data separate from mystery prep
    this.sessionData = null;

    // Activity tracking for adaptive rate limiting
    this.activityTracking = {
      recentPlayerActions: [],
      highActivityThreshold: 3  // 3 akce za minutu = vysoká aktivita
    };

    // Story state tracking
    this.storyState = {
      phase: 'investigation', // investigation | confrontation | resolution
      round: 0,
      discoveredClues: [],
      monsterRevealed: false,
      actionsAtCurrentLocation: 0,
      lastNPCReactionTime: 0,
      softMovesThisScene: 0,
      hardMovesThisScene: 0,
      weaknessDiscovered: false
    };
  }

  /**
   * Initialize session data for a mystery run
   * @param {string} mysteryId - ID of the active mystery
   */
  initializeSessionData(mysteryId) {
    this.sessionData = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mysteryId,
      startedAt: Date.now(),
      improvisedLocations: [],
      improvisedNPCs: [],
      currentLocationId: null,
      visitedLocationIds: []
    };
    console.log('[GM Engine] Session data initialized:', this.sessionData.id);
  }

  /**
   * Get current session data
   * @returns {Object|null} Session data or null if not started
   */
  getSessionData() {
    return this.sessionData ? { ...this.sessionData } : null;
  }

  /**
   * Get all locations (mystery prep + improvised)
   * @returns {Array} Combined locations array
   */
  getAllLocations() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);
    const mysteryLocations = mystery?.locations || [];
    const improvised = this.sessionData?.improvisedLocations || [];
    return [...mysteryLocations, ...improvised];
  }

  /**
   * Get all NPCs (mystery bystanders + improvised)
   * @returns {Array} Combined NPCs array
   */
  getAllNPCs() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);
    const mysteryNPCs = mystery?.bystanders || [];
    const improvised = this.sessionData?.improvisedNPCs || [];
    return [...mysteryNPCs, ...improvised];
  }

  /**
   * Add an improvised location created by AI during session
   * @param {Object} loc - Location object { name, type, description }
   */
  addImprovisedLocation(loc) {
    if (!this.sessionData) return;
    const location = {
      ...loc,
      id: `imp-loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      improvised: true
    };
    this.sessionData.improvisedLocations.push(location);
    console.log('[GM Engine] Improvised location added:', location.name);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-entity-created', {
        detail: { type: 'location', entity: location }
      }));
    }
    return location;
  }

  /**
   * Add an improvised NPC created by AI during session
   * @param {Object} npc - NPC object { name, type, motivation, description }
   */
  addImprovisedNPC(npc) {
    if (!this.sessionData) return;
    const character = {
      ...npc,
      id: `imp-npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      improvised: true
    };
    this.sessionData.improvisedNPCs.push(character);
    console.log('[GM Engine] Improvised NPC added:', character.name);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-entity-created', {
        detail: { type: 'npc', entity: character }
      }));
    }
    return character;
  }

  /**
   * Get current location object (from sessionData.currentLocationId)
   * @returns {Object|null} Current location or null
   */
  getCurrentLocation() {
    if (!this.sessionData?.currentLocationId) return null;
    return this.getAllLocations().find(l => l.id === this.sessionData.currentLocationId) || null;
  }

  /**
   * Change scene to a different location
   * @param {string} locationId - ID of the target location
   * @returns {Promise<boolean>} True if scene changed successfully
   */
  async changeScene(locationId) {
    if (!this.sessionData) return false;

    const allLocations = this.getAllLocations();
    const targetLocation = allLocations.find(l => l.id === locationId);
    if (!targetLocation) {
      console.warn('[GM Engine] Location not found:', locationId);
      return false;
    }

    const previousLocation = this.getCurrentLocation();
    if (previousLocation?.id === locationId) {
      console.log('[GM Engine] Already at this location');
      return false;
    }

    // Update session data
    this.sessionData.currentLocationId = locationId;
    if (!this.sessionData.visitedLocationIds.includes(locationId)) {
      this.sessionData.visitedLocationIds.push(locationId);
    }

    // Reset location action counter
    this.storyState.actionsAtCurrentLocation = 0;

    // Reinitialize scene with new location
    const { campaign } = getState();
    const hunters = campaign.hunters?.map(h => h.id) || [];
    // NPCs at new location: for now, keep all mystery NPCs available
    const npcs = this.getAllNPCs().map(n => n.id);
    const currentTension = getCurrentScene().tension;
    this.currentScene = initializeScene(targetLocation, hunters, npcs);
    updateScene({ tension: Math.max(2, currentTension - 1) }); // Slight tension decrease on move

    // Generate transition narrative
    const mysteryContext = this.buildMysteryContext();
    const recentHistory = this.buildRecentHistory(10);
    const storyState = this.getStoryState();

    const transition = await generateSceneTransition(previousLocation, targetLocation, {
      mysteryContext, recentHistory, storyState
    });

    this.addToSessionLog({
      type: 'scene',
      message: transition,
      timestamp: Date.now()
    });

    console.log(`[GM Engine] Scene changed: ${previousLocation?.name || '?'} → ${targetLocation.name}`);
    return true;
  }

  /**
   * Detect if player action mentions moving to a location
   * @param {string} actionText - Player's action text
   * @returns {Object|null} Target location or null
   */
  detectLocationMove(actionText) {
    const text = actionText.toLowerCase();
    const moveKeywords = [
      'jdeme do', 'jdu do', 'jdeme na', 'jdu na',
      'jedeme do', 'jedu do', 'jedeme na', 'jedu na',
      'přesuneme se', 'přesunu se', 'přesouvám se',
      'vydáme se', 'vydám se', 'míříme do', 'míříme na',
      'zamíříme do', 'zamíříme na', 'jdeme k', 'jdu k'
    ];

    const hasMovementIntent = moveKeywords.some(kw => text.includes(kw));
    if (!hasMovementIntent) return null;

    // Match against known locations
    const allLocations = this.getAllLocations();
    for (const loc of allLocations) {
      if (loc.id === this.sessionData?.currentLocationId) continue; // Skip current location
      if (text.includes(loc.name.toLowerCase())) {
        return loc;
      }
    }

    return null;
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

    // Initialize session data
    const { currentMysteryId } = getState();
    if (currentMysteryId) {
      this.initializeSessionData(currentMysteryId);
    }

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

    // Detect weakness discovered
    if (!this.storyState.weaknessDiscovered && mystery.monster?.weakness) {
      const weaknessWords = mystery.monster.weakness.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (weaknessWords.some(w => recentText.includes(w))) {
        this.storyState.weaknessDiscovered = true;
        console.log('[Story] Monster weakness discovered!');
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

    if (this.storyState.phase === 'investigation') {
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
   * Initialize default scene based on mystery's teaserType:
   * - attack_dramatization (type 1): 3-step — cold open + hook + scene description
   * - hook_in_action (type 2): 2-step — combined opening + scene description
   * - hook_debate (type 3): 1-step — combined opening only (no location desc)
   * - at_crime_scene (type 4): 2-step — combined opening + scene description, tension=4
   */
  async initializeDefaultScene() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    const allLocations = this.getAllLocations();
    const hunters = campaign.hunters?.map(h => h.id) || [];
    const npcs = mystery?.bystanders?.map(b => b.id) || [];
    const mysteryContext = this.buildMysteryContext();
    const teaserType = mystery?.teaserType || 'attack_dramatization';

    // Determine starting location based on teaser type
    let startingLocation;
    if (teaserType === 'at_crime_scene') {
      // Crime scene — first location makes sense as the crime scene
      startingLocation = allLocations[0] || { name: 'Místo činu' };
    } else if (teaserType === 'hook_debate') {
      // Debate — hunters are elsewhere (bar, motel), no specific location
      startingLocation = null;
    } else {
      // attack_dramatization / hook_in_action — first location or generic
      startingLocation = allLocations[0] || { name: 'Unknown Location' };
    }

    // Set session data current location
    if (this.sessionData && startingLocation?.id) {
      this.sessionData.currentLocationId = startingLocation.id;
      this.sessionData.visitedLocationIds.push(startingLocation.id);
    }

    if (teaserType === 'attack_dramatization') {
      // Type 1: Original 3-step flow — cold open + hook + scene
      if (mystery?.monster) {
        const teaser = await generateTeaserScene(mystery.monster, mystery.bystanders, mysteryContext);
        this.addToSessionLog({ type: 'scene', message: teaser, timestamp: Date.now() });
      }

      const hook = await generateHookDelivery(mystery?.hook, campaign.hunters, allLocations, mysteryContext);
      this.addToSessionLog({ type: 'scene', message: hook, timestamp: Date.now() });

      this.storyState.phase = 'investigation';
      this.currentScene = initializeScene(startingLocation, hunters, npcs);

      const storyState = this.getStoryState();
      const sceneDesc = await generateSceneDescription(startingLocation, 'calm', 2, { mysteryContext, storyState });
      this.addToSessionLog({ type: 'scene', message: sceneDesc, timestamp: Date.now() });

    } else {
      // Types 2-4: Combined opening scene (hunters present from start)
      const opening = await generateCombinedOpeningScene(teaserType, {
        hook: mystery?.hook,
        hunters: campaign.hunters,
        location: startingLocation,
        locations: allLocations,
        monster: mystery?.monster,
        bystanders: mystery?.bystanders,
        mysteryContext
      });
      this.addToSessionLog({ type: 'scene', message: opening, timestamp: Date.now() });

      this.storyState.phase = 'investigation';
      this.currentScene = initializeScene(startingLocation || { name: 'Neznámé místo' }, hunters, npcs);

      // hook_debate: no location description (hunters are elsewhere — bar, motel, car)
      if (teaserType !== 'hook_debate' && startingLocation) {
        const tension = teaserType === 'at_crime_scene' ? 4 : 2;
        const atmosphere = teaserType === 'at_crime_scene' ? 'unsettling' : 'calm';
        const storyState = this.getStoryState();
        const sceneDesc = await generateSceneDescription(startingLocation, atmosphere, tension, { mysteryContext, storyState });
        this.addToSessionLog({ type: 'scene', message: sceneDesc, timestamp: Date.now() });
      }

      // at_crime_scene: start with higher tension
      if (teaserType === 'at_crime_scene') {
        updateScene({ tension: 4 });
      }
    }
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

    // Current location
    const currentLocation = this.getCurrentLocation();
    if (currentLocation) {
      parts.push('');
      parts.push(`AKTUÁLNÍ LOKACE: ${currentLocation.name} (${currentLocation.type || 'lokace'}) — ${currentLocation.description || 'bez popisu'}`);
    } else if (this.sessionData) {
      parts.push('');
      parts.push('AKTUÁLNÍ LOKACE: Lovci zatím nejsou na konkrétním místě');
    }

    // All available locations (prep + improvised)
    const allLocations = this.getAllLocations();
    if (allLocations.length) {
      parts.push('');
      parts.push('DOSTUPNÉ LOKACE:');
      for (const loc of allLocations) {
        const tag = loc.improvised ? ' [IMPROVIZOVANÉ]' : '';
        const visited = this.sessionData?.visitedLocationIds?.includes(loc.id) ? ' ✓' : '';
        parts.push(`- ${loc.name} (${loc.type || 'lokace'}) — ${loc.description || 'bez popisu'}${tag}${visited}`);
      }
    } else if (mystery.locations?.length) {
      // Fallback when session not active
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

        // Hard move (keeper threat move) → advance countdown
        await this.checkCountdownAdvancement(null);
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
        // Check if hunter is doomed (luck exhausted)
        const isDoomed = hunter?.conditions?.includes('doomed');

        if (isDoomed) {
          // DOOMED: Skip soft move, go STRAIGHT to hard move
          console.log(`[GM Engine] ${hunter.name} is DOOMED → immediate hard move`);
          const narrative = await narrateAction(parsed, result, aiContext);

          this.storyState.hardMovesThisScene++;

          this.addToSessionLog({
            type: 'gm',
            message: narrative,
            roll: { ...result, moveName_cz: getMoveNameCz(parsed.move) },
            timestamp: Date.now()
          });

          // XP on failure (MotW rule: mark experience on miss)
          if (hunter) {
            hunter.experience = (hunter.experience || 0) + 1;
            updateCampaign({ hunters: campaign.hunters });
            console.log(`[Mechanics] ${hunter.name} gains 1 XP (now ${hunter.experience})`);
          }

          // Immediate consequences (no pending setup)
          if (this.settings.autoApplyMechanics) {
            await this.applyConsequences(hunterId, result, parsed);
          }

          increaseTension(2); // Harder escalation for doomed

          // Detect story spike
          if (this.detectStorySpike(result, parsed)) {
            triggerStorySpike(180000);
            console.log('[Story Spike] Triggered by doomed failure');
          }
        } else {
          // NORMAL: Soft move as setup — NOT immediate hard move
          const narrative = await narrateAction(parsed, result, aiContext);

          this.storyState.softMovesThisScene++;

          this.addToSessionLog({
            type: 'gm',
            message: narrative,
            roll: { ...result, moveName_cz: getMoveNameCz(parsed.move) },
            timestamp: Date.now()
          });

          // XP on failure (MotW rule: mark experience on miss)
          if (hunter) {
            hunter.experience = (hunter.experience || 0) + 1;
            updateCampaign({ hunters: campaign.hunters });
            console.log(`[Mechanics] ${hunter.name} gains 1 XP (now ${hunter.experience})`);
          }

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
      // Check for explicit location move first
      const targetLocation = this.detectLocationMove(actionText);
      if (targetLocation) {
        await this.changeScene(targetLocation.id);
      } else {
        // Generate GM response (may include tool calls for creating entities/moving)
        const scene = getCurrentScene();

        const response = await generateGMResponse(actionText, {
          scene,
          mystery,
          mysteryContext,
          recentHistory,
          storyState,
          hunterName: hunter?.name
        });

        // Handle tool_use response (new format: { text, toolCalls })
        const responseText = typeof response === 'string' ? response : response.text;
        const toolCalls = typeof response === 'string' ? [] : (response.toolCalls || []);

        // Process any tool calls (create locations, NPCs, move hunters)
        if (toolCalls.length > 0) {
          const { processToolCalls } = await import('./gm-tools.js');
          const results = processToolCalls(toolCalls, this);

          // Handle move_hunters results (async scene change)
          for (const result of results) {
            if (result.success && result.type === 'move') {
              await this.changeScene(result.locationId);
            }
          }
        }

        if (responseText) {
          this.addToSessionLog({
            type: 'gm',
            message: responseText,
            timestamp: Date.now()
          });
        }
      }
    }

    // 5. Check countdown advancement
    await this.checkCountdownAdvancement(parsed);

    // 6. Check for NPC reactions (limited to 1 per action)
    await this.triggerNPCReactions(parsed, actionText);

    // 7. Check end conditions
    const endReason = this.checkEndConditions();
    if (endReason) {
      await this.handleSessionEnd(endReason);
      return;
    }
  }

  /**
   * Evaluate end-of-session XP based on 4 MotW questions
   * AI analyzes the session log and awards 1 XP per "yes" to all hunters
   * @param {string} endReason - Why the session ended
   */
  async evaluateSessionXP(endReason) {
    const { campaign } = getState();
    if (!campaign.hunters?.length) return;

    const recentHistory = this.buildRecentHistory(30);
    const mysteryContext = this.buildMysteryContext();

    const questions = [
      'Vyřešili lovci záhadu? (Porazili příšeru / zastavili hrozbu?)',
      'Zachránili někoho, kdo by jinak zemřel nebo vážně utrpěl?',
      'Zjistili něco nového a důležitého o světě (nadpřirozenu, organizacích, historii)?',
      'Zjistili něco nového o svém lovci (vztahy, motivace, minulost)?'
    ];

    const prompt = `Na základě průběhu session vyhodnoť tyto otázky (odpověz ANO/NE + stručné zdůvodnění):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Důvod konce session: ${endReason}

Kontext záhady:
${mysteryContext}

Session log:
${recentHistory}

Odpověz POUZE validním JSON (žádný jiný text):
{ "answers": [{ "yes": true, "reason": "..." }, { "yes": false, "reason": "..." }, ...] }`;

    try {
      const { callAI } = await import('../client.js');
      const response = await callAI(prompt, { max_tokens: 500, temperature: 0.3 });

      // Parse JSON from response (handle potential markdown wrapping)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[GM Engine] Failed to parse XP evaluation response');
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.answers || !Array.isArray(parsed.answers)) return;

      // Count "yes" answers and build result text
      let totalXP = 0;
      const lines = [];
      for (let i = 0; i < Math.min(parsed.answers.length, questions.length); i++) {
        const answer = parsed.answers[i];
        const isYes = answer.yes === true;
        if (isYes) totalXP++;
        lines.push(`${isYes ? '✓' : '✗'} ${questions[i].split('?')[0]}?${isYes ? ' (+1 XP)' : ''}`);
        if (answer.reason) lines.push(`  → ${answer.reason}`);
      }

      lines.unshift('--- ZKUŠENOSTI NA KONCI SESSION ---');
      lines.push(`Celkem: +${totalXP} XP pro každého lovce`);

      // Award XP to all hunters
      if (totalXP > 0) {
        for (const hunter of campaign.hunters) {
          hunter.experience = (hunter.experience || 0) + totalXP;
        }
        updateCampaign({ hunters: campaign.hunters });
        console.log(`[Mechanics] All hunters gain ${totalXP} end-of-session XP`);
      }

      // Log results
      this.addToSessionLog({
        type: 'system',
        message: lines.join('\n'),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[GM Engine] Error evaluating session XP:', error);
    }
  }

  /**
   * Check if session should end
   * @returns {string|null} End reason or null
   */
  checkEndConditions() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);

    // 1. Monster defeated
    if (mystery?.monster) {
      const maxHarm = mystery.monster.harm || 10;
      const currentHarm = mystery.monster.currentHarm || 0;
      if (currentHarm >= maxHarm) {
        return 'monster_defeated';
      }
    }

    // 2. Countdown reached midnight
    if (mystery?.countdown?.phases?.length) {
      const currentPhase = mystery.countdown.currentPhase || 0;
      const maxPhase = mystery.countdown.phases.length - 1;
      if (currentPhase >= maxPhase) {
        return 'countdown_midnight';
      }
    }

    // 3. All hunters dead (harm >= 7)
    if (campaign.hunters?.length > 0) {
      const allDead = campaign.hunters.every(h => (h.harm || 0) >= 7);
      if (allDead) {
        return 'hunters_dead';
      }
    }

    return null;
  }

  /**
   * Handle session end — generate closing narrative, log, emit event, stop
   * @param {string} endReason - Why the session ended
   */
  async handleSessionEnd(endReason) {
    const reasonMessages = {
      monster_defeated: 'Příšera byla poražena! Lovci zvítězili.',
      countdown_midnight: 'Odpočet dosáhl půlnoci. Plán příšery se naplnil.',
      hunters_dead: 'Všichni lovci padli. Příšera zvítězila.'
    };

    const scene = getCurrentScene();
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    const mysteryContext = this.buildMysteryContext();
    const recentHistory = this.buildRecentHistory(15);
    const storyState = this.getStoryState();

    // Generate closing narrative
    const closingPrompt = `Session končí: ${reasonMessages[endReason] || endReason}. Napiš závěrečný narativ (3-5 vět).`;
    const closingResponse = await generateGMResponse(closingPrompt, {
      scene,
      mystery,
      mysteryContext,
      recentHistory,
      storyState
    });
    const closing = typeof closingResponse === 'string' ? closingResponse : closingResponse.text;

    this.addToSessionLog({
      type: 'scene',
      message: closing,
      timestamp: Date.now()
    });

    this.addToSessionLog({
      type: 'system',
      message: `--- SESSION END: ${reasonMessages[endReason] || endReason} ---`,
      timestamp: Date.now()
    });

    // Evaluate end-of-session XP (4 MotW questions)
    await this.evaluateSessionXP(endReason);

    // Save session record to campaign.sessionHistory
    if (this.sessionData) {
      const sessionRecord = {
        id: this.sessionData.id,
        mysteryId: this.sessionData.mysteryId,
        startedAt: this.sessionData.startedAt,
        endedAt: Date.now(),
        endReason,
        improvisedLocations: [...this.sessionData.improvisedLocations],
        improvisedNPCs: [...this.sessionData.improvisedNPCs],
        visitedLocationIds: [...this.sessionData.visitedLocationIds],
        rounds: this.storyState.round
      };

      const { campaign: currentCampaign } = getState();
      if (currentCampaign) {
        const sessionHistory = [...(currentCampaign.sessionHistory || []), sessionRecord];
        updateCampaign({ sessionHistory });
      }
    }

    // Emit event for UI — include improvised entities for promotion dialog
    const hasImprovised = (this.sessionData?.improvisedLocations?.length > 0) ||
                          (this.sessionData?.improvisedNPCs?.length > 0);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-session-end', {
        detail: {
          endReason,
          message: reasonMessages[endReason],
          improvisedLocations: this.sessionData?.improvisedLocations || [],
          improvisedNPCs: this.sessionData?.improvisedNPCs || [],
          hasImprovised
        }
      }));
    }

    this.stop();
    console.log(`[GM Engine] Session ended: ${endReason}`);
  }

  /**
   * Check if countdown should advance automatically
   * Conditions:
   * 1. Deterministic on failure of investigative/defensive moves (investigate, act_under_pressure, protect, read_bad_situation)
   * 2. After hard move (parsed === null, called from golden opportunity handler)
   * 3. Every 8 rounds (safety valve)
   * 4. 5+ actions at same location
   * Cooldown: max 1 advance per 30s
   */
  async checkCountdownAdvancement(parsed) {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    if (!mystery?.countdown?.phases?.length) return;

    const currentPhase = mystery.countdown.currentPhase || 0;
    const maxPhase = mystery.countdown.phases.length - 1;
    if (currentPhase >= maxPhase) return;

    // Cooldown: max 1 advance per 30s
    const now = Date.now();
    if (now - this.lastCountdownAdvance < 30000) return;

    let shouldAdvance = false;
    let reason = '';

    // Condition 1: Deterministic on failure of investigative/defensive moves
    const investigativeMoves = ['investigate', 'act_under_pressure', 'protect', 'read_bad_situation'];
    if (parsed?.move && investigativeMoves.includes(parsed.move) && this.sessionLog.length > 0) {
      const lastGMEntry = [...this.sessionLog].reverse().find(e => e.type === 'gm');
      if (lastGMEntry?.roll?.outcome === 'failure') {
        shouldAdvance = true;
        reason = 'Selhání při vyšetřování/obraně';
      }
    }

    // Condition 2: After hard move (keeper threat move) — parsed is null
    if (!shouldAdvance && parsed === null) {
      shouldAdvance = true;
      reason = 'Tah hrozby';
    }

    // Condition 3: Every 8 rounds (safety valve)
    if (!shouldAdvance && this.storyState.round > 0 && this.storyState.round % 8 === 0) {
      shouldAdvance = true;
      reason = 'Čas plyne — automatický postup';
    }

    // Condition 4: 5+ actions at same location without progress
    if (!shouldAdvance && this.storyState.actionsAtCurrentLocation >= 5) {
      shouldAdvance = true;
      reason = 'Příliš dlouho na jednom místě';
    }

    if (!shouldAdvance) return;

    this.lastCountdownAdvance = now;

    const { advanceCountdown } = await import('../../state/store.js');
    advanceCountdown(currentMysteryId, reason);

    const newPhase = currentPhase + 1;
    const narrative = await narrateCountdown(mystery.countdown, newPhase);
    this.addToSessionLog({
      type: 'scene',
      message: narrative,
      timestamp: Date.now()
    });

    increaseTension(1);
    console.log(`[Story] Countdown advanced to phase ${newPhase}: ${reason}`);

    // Phase 3+ → confrontation, phase 5+ → resolution
    if (newPhase >= 5 && this.storyState.phase !== 'resolution') {
      this.storyState.phase = 'resolution';
      console.log('[Story] Phase transition: → resolution (countdown phase 5+)');
    } else if (newPhase >= 3 && this.storyState.phase === 'investigation') {
      this.storyState.phase = 'confrontation';
      console.log('[Story] Phase transition: → confrontation (countdown phase 3+)');
    }
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
      if (result.outcome === 'success' || result.outcome === 'partial') {
        // Hunter deals harm to monster (1 base, +1 extra on full success)
        const monsterHarm = result.outcome === 'success' ? 2 : 1;
        const monsterResult = await applyMonsterHarm(monsterHarm, this.storyState.weaknessDiscovered);

        if (monsterResult.immortal) {
          // Monster escapes — narrate escape (not regeneration)
          const immortalNarrative = await narrateConsequence(
            { type: 'monster_immortal', monster: monsterResult.monster },
            { hunter: hunter.name }
          );
          this.addToSessionLog({
            type: 'consequence',
            message: immortalNarrative,
            timestamp: Date.now()
          });
        } else if (monsterResult.harmDealt > 0) {
          // Monster took harm but isn't at immortal cap — narrate harm reaction
          const mysteryContext = this.buildMysteryContext();
          const recentHistory = this.buildRecentHistory(10);
          const storyState = this.getStoryState();
          const harmNarrative = await narrateMonsterHarmMove(
            monsterResult.harmDealt, monsterResult.totalHarm, monsterResult.maxHarm,
            monsterResult.monster, { mysteryContext, recentHistory, storyState }
          );
          this.addToSessionLog({
            type: 'consequence',
            message: harmNarrative,
            timestamp: Date.now()
          });
        }
      }

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

// Expose on window for cross-module access (session tab, gm panel)
if (typeof window !== 'undefined') {
  window.__MOTW_GM_ENGINE__ = gmEngine;
}

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
