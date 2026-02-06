/**
 * Auto-Play Controller - Orchestrates fully automated game sessions
 * AI plays both GM (Keeper) and hunters
 */
import { getState, advanceCountdown as storeAdvanceCountdown } from '../../state/store.js';
import {
  gmEngine,
  processPlayerAction,
  getGMSessionLog,
  isGMModeRunning,
  isGMProcessing,
  setAutoPlayActive
} from './gm-engine.js';
import { generateAction, checkMonsterDefeated } from './player-agent.js';
import { getCurrentScene } from './scene-manager.js';

/**
 * Speed presets (delay between hunter actions in ms)
 */
const SPEED_PRESETS = {
  slow: 12000,
  normal: 8000,
  fast: 5000
};

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class AutoPlayController {
  constructor() {
    this.running = false;
    this.paused = false;
    this.currentRound = 0;
    this.maxRounds = 30;
    this.speed = 'normal';
    this.endReason = null;
    this._stopRequested = false;
  }

  /**
   * Start auto-play session
   * @param {Object} options
   * @param {number} options.maxRounds - Maximum rounds (10-50)
   * @param {string} options.speed - 'slow' | 'normal' | 'fast'
   */
  async start(options = {}) {
    if (this.running) {
      console.warn('[AutoPlay] Already running');
      return;
    }

    this.maxRounds = Math.min(50, Math.max(10, options.maxRounds || 30));
    this.speed = options.speed || 'normal';
    this.currentRound = 0;
    this.endReason = null;
    this._stopRequested = false;
    this.paused = false;
    this.running = true;

    // Activate auto-play mode on GM engine
    setAutoPlayActive(true);

    // Start GM mode if not already running
    if (!isGMModeRunning()) {
      await gmEngine.start();
    }

    this.emitProgress();

    gmEngine.addToSessionLog({
      type: 'autoplay',
      message: `Auto-Play spuštěn — ${this.maxRounds} kol, rychlost: ${this.speed}`,
      timestamp: Date.now()
    });

    // Run the main loop
    try {
      await this.mainLoop();
    } catch (error) {
      console.error('[AutoPlay] Fatal error:', error);
      this.endReason = 'error';
    } finally {
      this.finalize();
    }
  }

  /**
   * Main game loop
   */
  async mainLoop() {
    const delay = SPEED_PRESETS[this.speed] || SPEED_PRESETS.normal;

    for (let round = 1; round <= this.maxRounds; round++) {
      if (this._stopRequested) break;

      // Wait while paused
      await this.waitWhilePaused();
      if (this._stopRequested) break;

      this.currentRound = round;
      this.emitProgress();

      console.log(`[AutoPlay] === Round ${round}/${this.maxRounds} ===`);

      // Get living hunters
      const { campaign } = getState();
      const hunters = (campaign.hunters || []).filter(h => (h.harm || 0) < 7);

      if (hunters.length === 0) {
        this.endReason = 'hunters_dead';
        break;
      }

      // Shuffle hunter order for variety
      const shuffled = shuffle(hunters);
      const roundActions = [];

      // Each hunter takes an action
      let consecutiveErrors = 0;
      for (const hunter of shuffled) {
        if (this._stopRequested) break;
        await this.waitWhilePaused();
        if (this._stopRequested) break;

        try {
          const action = await this.generateHunterAction(hunter, roundActions);
          roundActions.push({ hunter: hunter.name, action });

          // Submit action to GM engine
          processPlayerAction(hunter.id, action);

          // Wait for GM engine to process the action
          await this.waitForQueueDrain(15000);

          // Delay between hunters
          await this.sleep(delay);

          consecutiveErrors = 0;

        } catch (error) {
          if (await this.handleError(error)) {
            // Rate limit — retried successfully, continue
            continue;
          }
          // Transient error — log and continue
          consecutiveErrors++;
          gmEngine.addToSessionLog({
            type: 'autoplay',
            message: `Chyba při generování akce pro ${hunter.name}: ${error.message || 'neznámá chyba'}`,
            timestamp: Date.now()
          });
          if (consecutiveErrors >= 3) {
            console.error('[AutoPlay] 3 consecutive errors, stopping');
            this.endReason = 'error';
            break;
          }
          continue;
        }
      }

      if (this._stopRequested || this.endReason) break;

      // Every ~5 rounds, advance countdown
      if (round % 5 === 0) {
        await this.advanceCountdown();
      }

      // Check end conditions
      const endCheck = await this.checkEndConditions();
      if (endCheck) {
        this.endReason = endCheck;
        break;
      }

      // Pause between rounds
      await this.sleep(5000);
    }

    // Hit max rounds
    if (!this.endReason && !this._stopRequested) {
      this.endReason = 'max_rounds';
    }
  }

  /**
   * Generate a hunter's action with context
   */
  async generateHunterAction(hunter, previousActions) {
    const mysteryContext = gmEngine.buildMysteryContext();
    const recentHistory = gmEngine.buildRecentHistory(10);
    const scene = getCurrentScene();

    return await generateAction(hunter, {
      mysteryContext,
      recentHistory,
      otherHunterActions: previousActions,
      scene
    });
  }

  /**
   * Wait for GM engine queue to drain
   */
  async waitForQueueDrain(timeout = 15000) {
    const start = Date.now();
    while (isGMProcessing() && Date.now() - start < timeout) {
      await this.sleep(500);
    }
  }

  /**
   * Check end conditions
   * @returns {string|null} End reason or null to continue
   */
  async checkEndConditions() {
    // Check countdown phase
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    const currentPhase = mystery?.countdown?.currentPhase || 0;
    const maxPhase = (mystery?.countdown?.phases?.length || 6) - 1;
    if (currentPhase >= maxPhase) {
      return 'countdown_midnight';
    }

    // Check all hunters dead
    const aliveHunters = (campaign.hunters || []).filter(h => (h.harm || 0) < 7);
    if (aliveHunters.length === 0) {
      return 'hunters_dead';
    }

    // AI check: is monster defeated?
    // Skip in first 5 rounds (too early for a defeat)
    if (this.currentRound <= 5) return null;

    // Keyword pre-check — only call AI if recent narrative suggests defeat
    const recentHistory = gmEngine.buildRecentHistory(5);
    if (recentHistory.length > 100) {
      const defeatKeywords = ['poraz', 'zniči', 'padl', 'mrtvý', 'zabit', 'zabil', 'poráží', 'ničí', 'defeated', 'destroyed', 'killed'];
      const historyLower = recentHistory.toLowerCase();
      const hasDefeatHint = defeatKeywords.some(kw => historyLower.includes(kw));

      if (hasDefeatHint) {
        const defeated = await checkMonsterDefeated(recentHistory);
        if (defeated) {
          return 'monster_defeated';
        }
      }
    }

    return null;
  }

  /**
   * Advance the mystery countdown
   */
  async advanceCountdown() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
    if (!mystery?.countdown?.phases?.length) return;

    const currentPhase = mystery.countdown.currentPhase || 0;
    const maxPhase = mystery.countdown.phases.length - 1;
    if (currentPhase >= maxPhase) return;

    // Advance countdown via store (immutable update)
    storeAdvanceCountdown(currentMysteryId, 'Auto-Play postup');

    // Narrate countdown progression
    const { narrateCountdown } = await import('./narrative-engine.js');
    // Re-read state after store update
    const updated = getState().campaign.mysteries?.find(m => m.id === currentMysteryId);
    const narrative = await narrateCountdown(updated.countdown, currentPhase + 1);

    gmEngine.addToSessionLog({
      type: 'autoplay',
      message: `⏰ Countdown: ${narrative}`,
      timestamp: Date.now()
    });
  }

  /**
   * Handle API errors with rate limit retry
   * @returns {boolean} True if recovered
   */
  async handleError(error) {
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('Rate limit') || msg.includes('529') || msg.includes('přetížen')) {
      console.warn('[AutoPlay] Rate limited, pausing 45s...');
      this.emitEvent('autoplay-rate-limited', { message: 'API limit — pauza 45s' });

      gmEngine.addToSessionLog({
        type: 'autoplay',
        message: '⏳ Rate limit — čekám 45 sekund...',
        timestamp: Date.now()
      });

      await this.sleep(45000);
      return true;
    }
    console.error('[AutoPlay] Unrecoverable error:', error);
    return false;
  }

  /**
   * Finalize auto-play session
   */
  finalize() {
    const reasons = {
      monster_defeated: 'Monster byl poražen!',
      hunters_dead: 'Všichni lovci padli...',
      countdown_midnight: 'Odpočet dosáhl půlnoci!',
      max_rounds: `Dosažen limit ${this.maxRounds} kol.`,
      stopped: 'Auto-Play zastaven uživatelem.',
      error: 'Auto-Play ukončen kvůli chybě.'
    };

    const reason = reasons[this.endReason] || reasons.stopped;

    gmEngine.addToSessionLog({
      type: 'autoplay',
      message: `Auto-Play dokončen (kolo ${this.currentRound}/${this.maxRounds}): ${reason}`,
      timestamp: Date.now()
    });

    this.running = false;
    this.paused = false;
    setAutoPlayActive(false);

    this.emitEvent('autoplay-complete', {
      round: this.currentRound,
      maxRounds: this.maxRounds,
      endReason: this.endReason
    });

    this.emitProgress();
  }

  /**
   * Pause auto-play
   */
  pause() {
    if (this.running && !this.paused) {
      this.paused = true;
      gmEngine.addToSessionLog({
        type: 'autoplay',
        message: '⏸ Auto-Play pozastaven',
        timestamp: Date.now()
      });
      this.emitProgress();
    }
  }

  /**
   * Resume auto-play
   */
  resume() {
    if (this.running && this.paused) {
      this.paused = false;
      gmEngine.addToSessionLog({
        type: 'autoplay',
        message: '▶ Auto-Play pokračuje',
        timestamp: Date.now()
      });
      this.emitProgress();
    }
  }

  /**
   * Stop auto-play
   */
  stop() {
    this._stopRequested = true;
    this.paused = false; // unblock waitWhilePaused
    this.endReason = 'stopped';
  }

  /**
   * Wait while paused
   */
  async waitWhilePaused() {
    while (this.paused && !this._stopRequested) {
      await this.sleep(500);
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit progress event
   */
  emitProgress() {
    this.emitEvent('autoplay-progress', {
      round: this.currentRound,
      maxRounds: this.maxRounds,
      running: this.running,
      paused: this.paused,
      endReason: this.endReason
    });
  }

  /**
   * Emit custom event
   */
  emitEvent(name, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      running: this.running,
      paused: this.paused,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      speed: this.speed,
      endReason: this.endReason
    };
  }
}

// Singleton
export const autoPlayController = new AutoPlayController();
