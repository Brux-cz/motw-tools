/**
 * Agent Core - Main autonomous agent loop and orchestration
 */

import { getState } from '../../state/store.js';
import { sendMessage, calculateCost } from '../client.js';
import { buildGameContext } from '../context-builder.js';
import { decideNextGoal, getGoalType } from './decision-engine.js';
import { getAutonomousSystemPrompt, getGoalSpecificPrompt } from './autonomous-prompts.js';
import { logThinking } from '../keeper/thinking-logger.js';

let agentRunning = false;
let agentEnabled = false;

/**
 * Start autonomous agent
 */
export function startAutonomousAgent() {
  const { campaign } = getState();

  if (!campaign?.aiAutonomous?.enabled) {
    console.log('[Autonomous Agent] Not enabled in settings');
    return;
  }

  agentEnabled = true;
  console.log('[Autonomous Agent] Started');
}

/**
 * Stop autonomous agent
 */
export function stopAutonomousAgent() {
  agentEnabled = false;
  agentRunning = false;
  console.log('[Autonomous Agent] Stopped');
}

/**
 * Check if agent is running
 */
export function isAgentRunning() {
  return agentRunning;
}

/**
 * Get agent state
 */
export function getAgentState() {
  const { campaign } = getState();
  return {
    enabled: agentEnabled,
    running: agentRunning,
    state: campaign?.aiAutonomous?.agentState || 'idle'
  };
}

/**
 * Main agent cycle - called when idle trigger occurs
 */
export async function runAgentCycle() {
  if (!agentEnabled || agentRunning) {
    return;
  }

  const { campaign, currentMysteryId, settings } = getState();

  // Safety checks
  if (!campaign?.aiAutonomous?.enabled) {
    console.log('[Agent Cycle] Autonomous mode not enabled');
    return;
  }

  if (!currentMysteryId) {
    console.log('[Agent Cycle] No active mystery');
    return;
  }

  if (!settings?.ai?.apiKey) {
    console.log('[Agent Cycle] No API key configured');
    return;
  }

  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);
  if (!mystery) {
    console.log('[Agent Cycle] Mystery not found');
    return;
  }

  // Check online status
  if (!navigator.onLine) {
    console.log('[Agent Cycle] Offline, skipping');
    return;
  }

  try {
    agentRunning = true;
    console.log('[Agent Cycle] === STARTING AUTONOMOUS CYCLE ===');

    // Update state to 'assessing'
    updateAgentState('assessing');

    // LOG: Assessing phase
    logThinking({
      phase: 'assessing',
      observation: `Analyzing mystery: ${mystery.name}`,
      contextSnapshot: {
        mysteryId: mystery.id,
        mysteryName: mystery.name,
        countdownPhase: mystery.countdown?.currentPhase || 0,
        huntersCount: campaign.hunters?.length || 0,
        sessionLogLength: campaign.sessionLog?.length || 0,
        pendingWorkItems: campaign.aiAutonomous?.workQueue?.filter(w => w.status === 'pending').length || 0
      }
    });

    // STEP 1: Decide what to do
    console.log('[Agent Cycle] Step 1: Deciding goal...');
    const decision = await decideNextGoal(
      mystery,
      campaign.sessionLog || [],
      campaign.aiAutonomous || {}
    );

    console.log('[Agent Cycle] Decision:', decision);

    // LOG: Deciding phase
    logThinking({
      phase: 'deciding',
      observation: 'Evaluated possible actions',
      reasoning: [decision.reason],
      options: [{
        action: decision.goal,
        priority: decision.priority,
        reason: decision.reason
      }],
      decision: {
        selected: decision.goal,
        confidence: 0.8,
        reasoning: decision.reason
      }
    });

    // Update state to 'generating'
    updateAgentState('generating');

    // STEP 2: Build prompt
    console.log('[Agent Cycle] Step 2: Building prompt...');
    const systemPrompt = getAutonomousSystemPrompt(decision.goal, mystery);
    const gameContext = buildGameContext(currentMysteryId);
    const goalPrompt = getGoalSpecificPrompt(decision.goal, {
      mystery,
      sessionLog: campaign.sessionLog || []
    });

    const fullSystemPrompt = `${systemPrompt}\n\n## KONTEXT HRY\n\n${gameContext}`;

    console.log('[Agent Cycle] System prompt length:', fullSystemPrompt.length);
    console.log('[Agent Cycle] Goal prompt length:', goalPrompt.length);

    // LOG: Planning phase
    logThinking({
      phase: 'planning',
      observation: 'Preparing AI generation',
      plan: {
        goal: decision.goal,
        steps: [
          'Build game context',
          'Generate AI prompt',
          'Call Claude API',
          'Parse response',
          'Create work item'
        ],
        expectedOutcome: `Generated ${decision.goal} for review`
      }
    });

    // STEP 3: Call Claude API
    console.log('[Agent Cycle] Step 3: Calling Claude API...');
    const response = await sendMessage(
      [{ role: 'user', content: goalPrompt }],
      {
        apiKey: settings.ai.apiKey,
        model: settings.ai.model,
        temperature: 0.8, // Higher for creativity
        maxTokens: 2000,
        systemPrompt: fullSystemPrompt
      }
    );

    console.log('[Agent Cycle] API response received');
    console.log('[Agent Cycle] Tokens used:', response.usage);

    // STEP 4: Parse response and create work item
    console.log('[Agent Cycle] Step 4: Parsing response...');
    const workItem = parseResponseToWorkItem(
      response.content,
      decision,
      mystery.id,
      response
    );

    console.log('[Agent Cycle] Work item created:', workItem.id);

    // STEP 5: Save work item
    console.log('[Agent Cycle] Step 5: Saving work item...');
    await saveWorkItem(workItem);

    // STEP 6: Update statistics
    console.log('[Agent Cycle] Step 6: Updating statistics...');
    updateStatistics(response.usage, workItem.type);

    // STEP 7: Update state to 'idle'
    updateAgentState('idle', Date.now());

    // LOG: Executing phase
    logThinking({
      phase: 'executing',
      observation: 'Work item created and queued for review',
      result: {
        success: true,
        workItemId: workItem.id,
        executedActions: workItem.actions?.length || 0,
        requiresReview: true
      }
    });

    console.log('[Agent Cycle] === CYCLE COMPLETED SUCCESSFULLY ===');

    // Notify user (will be handled by UI)
    notifyNewWork(workItem);

  } catch (error) {
    console.error('[Agent Cycle] ERROR:', error);

    // LOG: Error in execution
    logThinking({
      phase: 'reflecting',
      observation: 'Cycle failed with error',
      result: {
        success: false,
        error: error.message
      }
    });

    // Update state back to idle
    updateAgentState('idle');

    // Show error notification
    notifyError(error);
  } finally {
    agentRunning = false;
  }
}

/**
 * Parse AI response into work item
 */
function parseResponseToWorkItem(content, decision, mysteryId, response) {
  const workItem = {
    id: generateId(),
    type: getGoalType(decision.goal),
    status: 'pending',
    createdAt: Date.now(),
    reviewedAt: null,
    completedAt: null,

    mysteryId,

    // Extracted from AI response
    title: extractTitle(content) || `Autonomous ${decision.goal}`,
    content,

    // Parsed actions (if any)
    actions: parseActions(content),

    // Decision context
    goalReason: decision.reason,
    priority: decision.priority,

    // API metadata
    tokens: {
      input: response.usage.input,
      output: response.usage.output
    },
    model: response.model,
    cost: calculateCost(response.usage.input, response.usage.output, response.model)
  };

  return workItem;
}

/**
 * Extract title from content
 */
function extractTitle(content) {
  // Try to extract from JSON
  const jsonMatch = content.match(/```json\s*\n({[\s\S]*?})\s*\n```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.params?.title) {
        return data.params.title;
      }
    } catch (e) {
      // Continue to other methods
    }
  }

  // Try to find first heading
  const headingMatch = content.match(/^#+ (.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Try to find in quotes
  const quoteMatch = content.match(/"([^"]{10,100})"/);
  if (quoteMatch) {
    return quoteMatch[1];
  }

  return null;
}

/**
 * Parse actions from AI response
 */
function parseActions(content) {
  const actions = [];

  // Extract JSON code block
  const jsonMatch = content.match(/```json\s*\n({[\s\S]*?})\s*\n```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      actions.push(data);
    } catch (error) {
      console.error('[Agent Core] Failed to parse action JSON:', error);
    }
  }

  return actions;
}

/**
 * Save work item to state
 */
async function saveWorkItem(workItem) {
  const { campaign } = getState();

  if (!campaign) return;

  const workQueue = campaign.aiAutonomous?.workQueue || [];
  workQueue.push(workItem);

  const { updateCampaign } = await import('../../state/store.js');
  updateCampaign({
    aiAutonomous: {
      ...campaign.aiAutonomous,
      workQueue
    }
  });
}

/**
 * Update agent state
 */
function updateAgentState(state, lastRunTime = null) {
  const { campaign } = getState();

  if (!campaign) return;

  import('../../state/store.js').then(({ updateCampaign }) => {
    const updates = {
      aiAutonomous: {
        ...campaign.aiAutonomous,
        agentState: state
      }
    };

    if (lastRunTime) {
      updates.aiAutonomous.lastAgentRun = lastRunTime;
    }

    updateCampaign(updates);
  });
}

/**
 * Update statistics
 */
function updateStatistics(usage, workType) {
  const { campaign } = getState();

  if (!campaign?.aiAutonomous) return;

  const stats = campaign.aiAutonomous.stats || {
    totalRuns: 0,
    totalWorkItems: 0,
    acceptedItems: 0,
    rejectedItems: 0,
    totalTokensUsed: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCost: 0,
    byType: {}
  };

  // Update totals
  stats.totalRuns += 1;
  stats.totalWorkItems += 1;
  stats.totalTokensUsed += usage.input + usage.output;
  stats.totalInputTokens += usage.input;
  stats.totalOutputTokens += usage.output;
  stats.estimatedCost += calculateCost(usage.input, usage.output);

  // Update by type
  if (!stats.byType[workType]) {
    stats.byType[workType] = { generated: 0, accepted: 0, rejected: 0 };
  }
  stats.byType[workType].generated += 1;

  import('../../state/store.js').then(({ updateCampaign }) => {
    updateCampaign({
      aiAutonomous: {
        ...campaign.aiAutonomous,
        stats
      }
    });
  });
}

/**
 * Notify user about new work
 */
function notifyNewWork(workItem) {
  console.log('[Agent Core] New work item ready for review:', workItem.title);

  // Dispatch custom event for UI
  window.dispatchEvent(
    new CustomEvent('autonomous-work-ready', {
      detail: { workItem }
    })
  );
}

/**
 * Notify user about error
 */
function notifyError(error) {
  console.error('[Agent Core] Autonomous agent error:', error);

  window.dispatchEvent(
    new CustomEvent('autonomous-error', {
      detail: { error }
    })
  );
}

/**
 * Generate unique ID
 */
function generateId() {
  return `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
