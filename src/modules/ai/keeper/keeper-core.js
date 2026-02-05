/**
 * Keeper Core - Centrální AI koordinátor
 *
 * Orchestruje všechny AI subsystémy:
 * - Autonomous content generation
 * - Whisperer
 * - Direct actions
 * - Playwright UI operations
 */

import { getState } from '../../state/store.js';
import { logThinking } from './thinking-logger.js';
import {
  evaluatePriorities,
  chooseExecutionMethod,
  getActionDisplayName,
  requiresReview,
  EXECUTION_METHODS
} from './decision-matrix.js';
import { getIdleTime } from '../autonomous/idle-detector.js';
import {
  validateSafety,
  recordActionExecution,
  getAutonomyLevel,
  acquireActionLock,
  releaseActionLock
} from './safety-checker.js';

/**
 * Keeper AI class
 */
class KeeperAI {
  constructor() {
    this.running = false;
  }

  /**
   * Main keeper cycle - orchestrate all AI systems
   */
  async runCycle() {
    if (this.running) {
      console.log('[Keeper] Already running, skipping cycle');
      return;
    }

    const { campaign, currentMysteryId, settings } = getState();

    // Safety checks
    if (!campaign?.aiKeeper?.enabled) {
      console.log('[Keeper] Not enabled');
      return;
    }

    if (!currentMysteryId) {
      console.log('[Keeper] No active mystery');
      return;
    }

    if (!settings?.ai?.apiKey) {
      console.log('[Keeper] No API key configured');
      return;
    }

    // P2 #12: Defensive null checks
    const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);
    if (!mystery) {
      console.log('[Keeper] Mystery not found');
      return;
    }

    try {
      this.running = true;
      console.log('[Keeper] === STARTING KEEPER CYCLE ===');

      // STEP 1: Assess game state
      const assessment = await this.assess();

      // STEP 2: Decide what to do
      const decision = await this.decide(assessment);

      if (!decision) {
        console.log('[Keeper] No suitable action found');
        return;
      }

      // STEP 3: Plan execution
      const plan = await this.plan(decision);

      // STEP 4: Execute (or create work item for review)
      await this.execute(decision, plan);

      console.log('[Keeper] === CYCLE COMPLETED ===');

    } catch (error) {
      console.error('[Keeper] ERROR:', error);

      logThinking({
        phase: 'reflecting',
        observation: 'Keeper cycle failed',
        result: {
          success: false,
          error: error.message
        }
      });
    } finally {
      this.running = false;
    }
  }

  /**
   * STEP 1: Assess current game state
   * @returns {Object} Assessment with priorities and context
   */
  async assess() {
    const { campaign, currentMysteryId } = getState();
    const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

    const idleTime = getIdleTime();

    const gameState = {
      mystery,
      hunters: campaign.hunters || [],
      sessionLog: campaign.sessionLog || [],
      idleTime,
      autonomous: campaign.aiAutonomous || {}
    };

    // Evaluate priorities
    const priorities = evaluatePriorities(gameState);

    // Log assessment
    logThinking({
      phase: 'assessing',
      observation: `Analyzing mystery: ${mystery.name}`,
      reasoning: [
        `Idle time: ${Math.floor(idleTime / 1000)}s`,
        `Countdown phase: ${mystery.countdown?.currentPhase || 0}`,
        `Hunters: ${gameState.hunters.length}`,
        `Found ${priorities.length} possible actions`
      ],
      contextSnapshot: {
        mysteryId: mystery.id,
        mysteryName: mystery.name,
        countdownPhase: mystery.countdown?.currentPhase || 0,
        huntersCount: gameState.hunters.length,
        idleTime,
        sessionLogLength: gameState.sessionLog.length
      }
    });

    return {
      gameState,
      priorities
    };
  }

  /**
   * STEP 2: Decide what action to take
   * @param {Object} assessment - Assessment from assess()
   * @returns {Object|null} Decision or null if no action
   */
  async decide(assessment) {
    const { priorities } = assessment;

    if (priorities.length === 0) {
      logThinking({
        phase: 'deciding',
        observation: 'No actions needed at this time',
        reasoning: ['Game state is stable', 'No urgent priorities'],
        decision: null
      });
      return null;
    }

    // Choose highest priority action
    const selected = priorities[0];

    // Check if we can auto-execute
    const { campaign } = getState();
    const autonomyLevel = campaign.aiKeeper?.autonomyLevel || 'medium';
    const needsReview = requiresReview(selected.action, autonomyLevel);

    logThinking({
      phase: 'deciding',
      observation: `Evaluated ${priorities.length} possible actions`,
      reasoning: [
        `Highest priority: ${getActionDisplayName(selected.action)} (priority ${selected.priority})`,
        `Reason: ${selected.reason}`,
        `Autonomy level: ${autonomyLevel}`,
        `Needs review: ${needsReview}`
      ],
      options: priorities.slice(0, 5).map(p => ({
        action: getActionDisplayName(p.action),
        priority: p.priority,
        reason: p.reason
      })),
      decision: {
        selected: selected.action,
        confidence: 0.85,
        reasoning: selected.reason,
        needsReview,
        method: selected.method
      }
    });

    return selected;
  }

  /**
   * STEP 3: Plan execution steps
   * @param {Object} decision - Decision from decide()
   * @returns {Object} Execution plan
   */
  async plan(decision) {
    const steps = [];

    // Determine execution method
    const method = decision.method || chooseExecutionMethod(decision.action);

    if (method === EXECUTION_METHODS.DIRECT_API) {
      steps.push('Prepare direct API call');
      steps.push('Execute action via API');
      steps.push('Log result to session');
    } else if (method === EXECUTION_METHODS.AUTONOMOUS) {
      steps.push('Delegate to autonomous agent');
      steps.push('Generate AI content');
      steps.push('Create work item');
    } else if (method === EXECUTION_METHODS.WHISPER) {
      steps.push('Activate whisperer');
      steps.push('Generate ambient content');
      steps.push('Display to user');
    } else if (method === EXECUTION_METHODS.PLAYWRIGHT) {
      steps.push('Initialize Playwright');
      steps.push('Perform UI operation');
      steps.push('Capture result');
    }

    const plan = {
      goal: getActionDisplayName(decision.action),
      method,
      steps,
      expectedOutcome: decision.reason
    };

    logThinking({
      phase: 'planning',
      observation: `Planning execution via ${method}`,
      plan
    });

    return plan;
  }

  /**
   * STEP 4: Execute plan (or create work item for review)
   * @param {Object} decision - Decision from decide()
   * @param {Object} plan - Plan from plan()
   */
  async execute(decision, plan) {
    // P0 #4: Acquire lock before executing
    if (!acquireActionLock()) {
      console.log('[Keeper] Cannot execute - action lock held by another process');
      logThinking({
        phase: 'executing',
        observation: 'Execution blocked by lock',
        result: {
          success: false,
          error: 'Action lock held by another process (race condition prevention)'
        }
      });
      return;
    }

    try {
      // Check if can auto-execute with safety validation
      const safetyCheck = this.canAutoExecute(decision);

      if (safetyCheck.canExecute) {
        // Auto-execute
        console.log('[Keeper] Auto-executing (passed safety checks)');

        if (safetyCheck.warnings.length > 0) {
          console.warn('[Keeper] Safety warnings:', safetyCheck.warnings);
        }

        await this.autoExecute(decision, plan);

        // Record action execution for frequency tracking
        recordActionExecution(decision.action);
      } else {
        // Requires review
        console.log('[Keeper] Creating work item for review:', safetyCheck.reason);
        await this.createWorkItemForReview(decision, plan, safetyCheck.reason);
      }
    } finally {
      // P0 #4: Always release lock
      releaseActionLock();
    }
  }

  /**
   * Check if action can be auto-executed
   * @param {Object} decision - Decision
   * @returns {Object} {canExecute, reason, warnings}
   */
  canAutoExecute(decision) {
    const { campaign } = getState();
    const autonomyLevel = getAutonomyLevel();
    const whitelist = campaign.aiKeeper?.whitelist || [];
    const blacklist = campaign.aiKeeper?.blacklist || [];

    // Validate safety
    const safetyCheck = validateSafety(
      {
        type: decision.action,
        params: decision.metadata || {}
      },
      autonomyLevel,
      whitelist,
      blacklist
    );

    return {
      canExecute: safetyCheck.safe,
      reason: safetyCheck.reason,
      warnings: safetyCheck.warnings
    };
  }

  /**
   * Auto-execute action
   * @private
   */
  async autoExecute(decision, plan) {
    console.log('[Keeper] Auto-executing:', decision.action);

    // Delegate based on method
    if (plan.method === EXECUTION_METHODS.AUTONOMOUS) {
      // Use autonomous agent
      const { runAgentCycle } = await import('../autonomous/agent-core.js');
      await runAgentCycle();

      logThinking({
        phase: 'executing',
        observation: 'Delegated to autonomous agent',
        result: {
          success: true,
          autoExecuted: true,
          method: EXECUTION_METHODS.AUTONOMOUS
        }
      });
    } else if (plan.method === EXECUTION_METHODS.WHISPER) {
      // Use whisperer
      // P0 #8: Report not implemented properly
      console.log('[Keeper] Whisperer not yet implemented');

      logThinking({
        phase: 'executing',
        observation: 'Whisperer not yet implemented',
        result: {
          success: false, // P0 #8: Changed to false (was incorrectly true)
          autoExecuted: false,
          error: 'Whisperer not yet implemented',
          method: EXECUTION_METHODS.WHISPER
        }
      });
    } else if (plan.method === EXECUTION_METHODS.DIRECT_API) {
      // Direct API call
      await this.executeDirectAction(decision);
    }
  }

  /**
   * Create work item for review
   * @private
   */
  async createWorkItemForReview(decision, plan, reason) {
    console.log('[Keeper] Creating work item for review:', decision.action);
    console.log('[Keeper] Reason:', reason);

    // Delegate to autonomous agent to create work item
    const { runAgentCycle } = await import('../autonomous/agent-core.js');
    await runAgentCycle();

    logThinking({
      phase: 'executing',
      observation: 'Created work item for review',
      result: {
        success: true,
        requiresReview: true,
        action: decision.action,
        reason
      }
    });
  }

  /**
   * Execute direct API action
   * @private
   */
  async executeDirectAction(decision) {
    // TODO: Implement direct API actions
    // For now, just log
    console.log('[Keeper] Direct action not yet implemented:', decision.action);

    logThinking({
      phase: 'executing',
      observation: `Direct action: ${decision.action}`,
      result: {
        success: false,
        error: 'Direct actions not yet implemented'
      }
    });
  }
}

// Export singleton instance
export const keeperAI = new KeeperAI();
