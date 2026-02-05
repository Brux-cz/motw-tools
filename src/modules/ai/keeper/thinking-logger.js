/**
 * Thinking Logger - Transparentní log AI rozhodování
 *
 * Loguje všechny fáze AI reasoning:
 * - assessing: Analýza stavu hry
 * - deciding: Rozhodování co dělat
 * - planning: Plánování kroků
 * - executing: Provedení akcí
 * - reflecting: Reflexe výsledku
 */

import { getState } from '../../state/store.js';
import { onAIThinking } from '../ai-event-bus.js';

/**
 * Log thinking entry
 * @param {Object} entry - Thinking entry
 * @param {string} entry.phase - Phase: assessing, deciding, planning, executing, reflecting
 * @param {string} entry.observation - Co AI vidí
 * @param {Array<string>} entry.reasoning - Důvody rozhodování
 * @param {Array<Object>} entry.options - Možné akce [{action, priority, reason}]
 * @param {Object} entry.decision - Vybrané rozhodnutí {selected, confidence, reasoning}
 * @param {Object} entry.plan - Plán {goal, steps, expectedOutcome}
 * @param {Object} entry.result - Výsledek {success, workItemId, executedActions}
 * @param {Object} entry.contextSnapshot - Snapshot game state
 */
export function logThinking(entry) {
  const { campaign, currentMysteryId } = getState();

  if (!campaign) {
    console.warn('[Thinking Logger] No active campaign');
    return;
  }

  const thinkingEntry = {
    id: generateId('think'),
    timestamp: Date.now(),
    mysteryId: currentMysteryId,
    agentName: 'keeper',

    // Required fields
    phase: entry.phase,

    // Optional fields
    observation: entry.observation || null,
    reasoning: entry.reasoning || [],
    options: entry.options || [],
    decision: entry.decision || null,
    plan: entry.plan || null,
    result: entry.result || null,
    contextSnapshot: entry.contextSnapshot || null,

    // Metadata
    metadata: entry.metadata || {}
  };

  console.log(`[Thinking Logger] ${entry.phase.toUpperCase()}:`, thinkingEntry);

  // Save to state
  saveThinkingEntry(thinkingEntry);

  return thinkingEntry;
}

/**
 * Get thinking log with optional filters
 * @param {string} mysteryId - Mystery ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.phase - Filter by phase
 * @param {number} filters.startTime - Filter entries after this timestamp
 * @param {number} filters.endTime - Filter entries before this timestamp
 * @param {number} filters.limit - Limit number of entries
 */
export function getThinkingLog(mysteryId, filters = {}) {
  const { campaign } = getState();

  if (!campaign?.aiKeeperLog) {
    return [];
  }

  let entries = campaign.aiKeeperLog;

  // Filter by mystery
  if (mysteryId) {
    entries = entries.filter(e => e.mysteryId === mysteryId);
  }

  // Apply filters
  if (filters.phase) {
    entries = entries.filter(e => e.phase === filters.phase);
  }

  if (filters.startTime) {
    entries = entries.filter(e => e.timestamp >= filters.startTime);
  }

  if (filters.endTime) {
    entries = entries.filter(e => e.timestamp <= filters.endTime);
  }

  // Sort chronologically (newest first)
  entries = entries.sort((a, b) => b.timestamp - a.timestamp);

  // Apply limit
  if (filters.limit) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}

/**
 * Export thinking log as JSON
 * @param {string} mysteryId - Mystery ID
 * @returns {string} JSON string
 */
export function exportThinkingLog(mysteryId) {
  const entries = getThinkingLog(mysteryId);

  const exportData = {
    exportedAt: Date.now(),
    mysteryId,
    totalEntries: entries.length,
    entries: entries.map(e => ({
      ...e,
      // Make timestamp human-readable
      timestampISO: new Date(e.timestamp).toISOString()
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Get thinking statistics
 * @param {string} mysteryId - Mystery ID
 */
export function getThinkingStats(mysteryId) {
  const entries = getThinkingLog(mysteryId);

  const stats = {
    total: entries.length,
    byPhase: {},
    avgConfidence: 0,
    successRate: 0
  };

  // Count by phase
  entries.forEach(entry => {
    if (!stats.byPhase[entry.phase]) {
      stats.byPhase[entry.phase] = 0;
    }
    stats.byPhase[entry.phase]++;
  });

  // Calculate average confidence
  const decisionsWithConfidence = entries.filter(e => e.decision?.confidence);
  if (decisionsWithConfidence.length > 0) {
    const totalConfidence = decisionsWithConfidence.reduce(
      (sum, e) => sum + e.decision.confidence,
      0
    );
    stats.avgConfidence = totalConfidence / decisionsWithConfidence.length;
  }

  // Calculate success rate
  const executedEntries = entries.filter(e => e.phase === 'executing' && e.result);
  if (executedEntries.length > 0) {
    const successfulEntries = executedEntries.filter(e => e.result.success);
    stats.successRate = successfulEntries.length / executedEntries.length;
  }

  return stats;
}

/**
 * Clear thinking log for mystery
 * @param {string} mysteryId - Mystery ID
 */
export function clearThinkingLog(mysteryId) {
  const { campaign } = getState();

  if (!campaign?.aiKeeperLog) {
    return;
  }

  // Filter out entries for this mystery
  const filteredLog = campaign.aiKeeperLog.filter(e => e.mysteryId !== mysteryId);

  import('../../state/store.js').then(({ updateCampaign }) => {
    updateCampaign({
      aiKeeperLog: filteredLog
    });
  });

  console.log(`[Thinking Logger] Cleared log for mystery ${mysteryId}`);
}

/**
 * Save thinking entry to state
 * @private
 */
function saveThinkingEntry(entry) {
  const { campaign } = getState();

  if (!campaign) return;

  const aiKeeperLog = campaign.aiKeeperLog || [];
  aiKeeperLog.push(entry);

  // Keep only last 500 entries to prevent unbounded growth
  const trimmedLog = aiKeeperLog.slice(-500);

  import('../../state/store.js').then(({ updateCampaign }) => {
    updateCampaign({
      aiKeeperLog: trimmedLog
    });
  });
}

/**
 * Generate unique ID
 * @private
 */
function generateId(prefix = '') {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Initialize event listeners for AI thinking events
 * Called from agent-core when it emits thinking logs
 */
onAIThinking((thinkingData) => {
  logThinking(thinkingData);
});
