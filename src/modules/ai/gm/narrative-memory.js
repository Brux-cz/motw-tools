/**
 * Narrative Memory System
 * Provides context-aware memory for literary storytelling
 * Compresses old events to stay within token budget
 */

import { getState } from '../../state/store.js';
import { callAI } from '../client.js';

// Token budget configuration
const TOKEN_BUDGET = {
  max: 2000,
  compressionThreshold: 1500,
  estimatedCharsPerToken: 4 // Rough estimate
};

/**
 * Build narrative context for AI prompts
 * @param {string} mysteryId - Mystery ID
 * @param {Object} options - Options (includeActiveThreads, includeEstablishedFacts)
 * @returns {string} Formatted context string
 */
export function buildNarrativeContext(mysteryId, options = {}) {
  const {
    includeActiveThreads = true,
    includeEstablishedFacts = true,
    maxEvents = 10
  } = options;

  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery || !mystery.narrativeMemory) {
    return '';
  }

  const memory = mystery.narrativeMemory;
  const parts = [];

  // 1. Current situation summary
  if (memory.summary?.currentSituation) {
    parts.push(`SOUČASNÁ SITUACE:\n${memory.summary.currentSituation}\n`);
  }

  // 2. Recent events (last 5-10 events)
  if (memory.summary?.recentEvents?.length > 0) {
    const recentEvents = memory.summary.recentEvents.slice(-maxEvents);
    parts.push(`NEDAVNÉ UDÁLOSTI:`);
    recentEvents.forEach((event, i) => {
      parts.push(`${i + 1}. ${event}`);
    });
    parts.push('');
  }

  // 3. Active plot threads
  if (includeActiveThreads && memory.summary?.activeThreads?.length > 0) {
    parts.push(`AKTIVNÍ DĚJOVÉ LINKY:`);
    memory.summary.activeThreads.forEach(thread => {
      parts.push(`- ${thread}`);
    });
    parts.push('');
  }

  // 4. Established facts (canon)
  if (includeEstablishedFacts && memory.summary?.establishedFacts?.length > 0) {
    parts.push(`POTVRZENÁ FAKTA:`);
    memory.summary.establishedFacts.forEach(fact => {
      parts.push(`- ${fact}`);
    });
    parts.push('');
  }

  const context = parts.join('\n');

  // Check token budget
  const estimatedTokens = Math.ceil(context.length / TOKEN_BUDGET.estimatedCharsPerToken);
  if (estimatedTokens > TOKEN_BUDGET.max) {
    console.warn(`[Narrative Memory] Context exceeds token budget: ${estimatedTokens} tokens`);
  }

  return context;
}

/**
 * Add event to narrative memory
 * @param {string} mysteryId - Mystery ID
 * @param {Object} event - Event object
 * @returns {Object} Updated memory
 */
export function addToNarrativeMemory(mysteryId, event) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    console.warn('[Narrative Memory] Mystery not found:', mysteryId);
    return null;
  }

  // Initialize memory if needed
  if (!mystery.narrativeMemory) {
    mystery.narrativeMemory = initializeNarrativeMemory();
  }

  const memory = mystery.narrativeMemory;

  // Categorize significance
  const significance = categorizeSignificance(event);

  // Create memory entry
  const memoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: event.type || 'action',
    summary: event.summary || event.message || '',
    significance,
    relatedNPCs: event.relatedNPCs || [],
    relatedLocations: event.relatedLocations || [],
    storyBeatId: event.storyBeatId || null
  };

  // Add to event timeline
  memory.eventTimeline.push(memoryEntry);

  // Update summary if high significance
  if (significance === 'high') {
    updateSummary(memory, memoryEntry);
  }

  // Update token budget tracking
  const estimatedTokens = estimateMemoryTokens(memory);
  memory.tokenBudget = {
    max: TOKEN_BUDGET.max,
    current: estimatedTokens,
    compressionThreshold: TOKEN_BUDGET.compressionThreshold
  };

  // Compress if needed
  if (estimatedTokens > TOKEN_BUDGET.compressionThreshold) {
    compressOldEvents(memory);
  }

  // Update mystery in store
  const { updateMystery } = require('../../state/store.js');
  updateMystery(mysteryId, { narrativeMemory: memory });

  return memory;
}

/**
 * Initialize narrative memory structure
 * @returns {Object} Empty memory structure
 */
function initializeNarrativeMemory() {
  return {
    summary: {
      recentEvents: [],
      currentSituation: '',
      activeThreads: [],
      establishedFacts: []
    },
    eventTimeline: [],
    tokenBudget: {
      max: TOKEN_BUDGET.max,
      current: 0,
      compressionThreshold: TOKEN_BUDGET.compressionThreshold
    },
    // Motif tracking for Novel Mode
    motifTracking: {
      recentMotifs: [],      // [{ motif: 'jukebox', lastUsed: timestamp, useCount: 1, lastEventIndex: N }]
      cooldownEvents: 5      // Počet eventů před možným opakováním
    }
  };
}

/**
 * Categorize event significance
 * @param {Object} event - Event object
 * @returns {string} 'high' | 'medium' | 'low'
 */
function categorizeSignificance(event) {
  // High significance triggers
  if (event.type === 'countdown_advance') return 'high';
  if (event.type === 'monster_encounter') return 'high';
  if (event.type === 'major_revelation') return 'high';
  if (event.type === 'npc_death') return 'high';
  if (event.type === 'story_beat') return 'high';

  // Medium significance
  if (event.type === 'npc_interaction') return 'medium';
  if (event.type === 'location_change') return 'medium';
  if (event.type === 'clue_discovery') return 'medium';
  if (event.roll && event.roll.outcome === 'failure') return 'medium';

  // Low significance
  return 'low';
}

/**
 * Update memory summary with new high-significance event
 * @param {Object} memory - Memory object
 * @param {Object} entry - Memory entry
 */
function updateSummary(memory, entry) {
  // Add to recent events
  memory.summary.recentEvents.push(entry.summary);

  // Keep only last 10 events in summary
  if (memory.summary.recentEvents.length > 10) {
    memory.summary.recentEvents.shift();
  }

  // Update current situation (latest high-significance event)
  memory.summary.currentSituation = entry.summary;

  // Update active threads based on event type
  if (entry.type === 'clue_discovery' || entry.type === 'major_revelation') {
    const thread = extractPlotThread(entry.summary);
    if (thread && !memory.summary.activeThreads.includes(thread)) {
      memory.summary.activeThreads.push(thread);
    }
  }

  // Update established facts
  if (entry.type === 'npc_introduction' || entry.type === 'location_discovery') {
    const fact = extractEstablishedFact(entry);
    if (fact && !memory.summary.establishedFacts.includes(fact)) {
      memory.summary.establishedFacts.push(fact);
    }
  }
}

/**
 * Extract plot thread from event summary
 * @param {string} summary - Event summary
 * @returns {string|null} Plot thread or null
 */
function extractPlotThread(summary) {
  // Simple heuristic: look for questions or unresolved elements
  if (summary.includes('?')) {
    return summary;
  }

  // Look for keywords suggesting mystery
  const mysteryKeywords = ['tajemství', 'záhada', 'neznámé', 'podivné', 'divné', 'missing', 'zmizelo'];
  for (const keyword of mysteryKeywords) {
    if (summary.toLowerCase().includes(keyword)) {
      return summary;
    }
  }

  return null;
}

/**
 * Extract established fact from event
 * @param {Object} entry - Memory entry
 * @returns {string|null} Established fact or null
 */
function extractEstablishedFact(entry) {
  if (entry.type === 'npc_introduction' && entry.relatedNPCs.length > 0) {
    return `NPC: ${entry.relatedNPCs[0]}`;
  }

  if (entry.type === 'location_discovery' && entry.relatedLocations.length > 0) {
    return `Lokace: ${entry.relatedLocations[0]}`;
  }

  return null;
}

/**
 * Estimate token count for memory
 * @param {Object} memory - Memory object
 * @returns {number} Estimated token count
 */
function estimateMemoryTokens(memory) {
  const summaryText = JSON.stringify(memory.summary);
  const timelineText = memory.eventTimeline.map(e => e.summary).join(' ');
  const totalText = summaryText + timelineText;

  return Math.ceil(totalText.length / TOKEN_BUDGET.estimatedCharsPerToken);
}

/**
 * Compress old events using AI summarization
 * @param {Object} memory - Memory object
 */
async function compressOldEvents(memory) {
  console.log('[Narrative Memory] Compressing old events...');

  // Take oldest half of events for compression
  const totalEvents = memory.eventTimeline.length;
  const eventsToCompress = memory.eventTimeline.slice(0, Math.floor(totalEvents / 2));

  if (eventsToCompress.length === 0) {
    return;
  }

  try {
    // Ask AI to compress events
    const summaries = eventsToCompress.map(e => e.summary).join('\n- ');
    const prompt = `Shrň následující události do 2-3 vět, zachovej klíčová fakta:

Události:
- ${summaries}

Odpověz POUZE shrnutím:`;

    const compressed = await callAI(prompt, {
      temperature: 0.5,
      max_tokens: 200
    });

    // Remove compressed events from timeline
    memory.eventTimeline = memory.eventTimeline.slice(Math.floor(totalEvents / 2));

    // Add compressed summary to recent events
    memory.summary.recentEvents.unshift(`[Komprimováno] ${compressed}`);

    console.log(`[Narrative Memory] Compressed ${eventsToCompress.length} events`);
  } catch (error) {
    console.error('[Narrative Memory] Error compressing events:', error);
  }
}

/**
 * Get active plot threads
 * @param {string} mysteryId - Mystery ID
 * @returns {Array} Active threads
 */
export function getActiveThreads(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.narrativeMemory) {
    return [];
  }

  return mystery.narrativeMemory.summary.activeThreads || [];
}

/**
 * Mark plot thread as resolved
 * @param {string} mysteryId - Mystery ID
 * @param {string} thread - Thread to resolve
 */
export function resolveThread(mysteryId, thread) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.narrativeMemory) {
    return;
  }

  const memory = mystery.narrativeMemory;
  memory.summary.activeThreads = memory.summary.activeThreads.filter(t => t !== thread);

  // Update mystery
  const { updateMystery } = require('../../state/store.js');
  updateMystery(mysteryId, { narrativeMemory: memory });
}

/**
 * Add established fact to memory
 * @param {string} mysteryId - Mystery ID
 * @param {string} fact - Fact to add
 */
export function addEstablishedFact(mysteryId, fact) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    return;
  }

  if (!mystery.narrativeMemory) {
    mystery.narrativeMemory = initializeNarrativeMemory();
  }

  const memory = mystery.narrativeMemory;

  if (!memory.summary.establishedFacts.includes(fact)) {
    memory.summary.establishedFacts.push(fact);

    // Update mystery
    const { updateMystery } = require('../../state/store.js');
    updateMystery(mysteryId, { narrativeMemory: memory });
  }
}

/**
 * Get full event timeline
 * @param {string} mysteryId - Mystery ID
 * @param {Object} filters - Optional filters (significance, type)
 * @returns {Array} Timeline events
 */
export function getEventTimeline(mysteryId, filters = {}) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.narrativeMemory) {
    return [];
  }

  let events = mystery.narrativeMemory.eventTimeline;

  // Apply filters
  if (filters.significance) {
    events = events.filter(e => e.significance === filters.significance);
  }

  if (filters.type) {
    events = events.filter(e => e.type === filters.type);
  }

  return events;
}

/**
 * Extract key motifs from ambient event text
 * @param {string} eventText - Event text to analyze
 * @returns {Array<string>} List of detected motifs
 */
function extractMotifs(eventText) {
  const motifPatterns = [
    { pattern: /jukebox|píseň|hudba|melodie/i, motif: 'jukebox' },
    { pattern: /zrcadlo|odraz|sklo/i, motif: 'mirror' },
    { pattern: /škrábání|škrábe|drápy/i, motif: 'scratching' },
    { pattern: /studený|chlad|mráz|jinovatka/i, motif: 'cold' },
    { pattern: /pach|vůně|zápach/i, motif: 'smell' },
    { pattern: /silueta|stín|postava/i, motif: 'shadow_figure' },
    { pattern: /ticho|ztichli|zmlkli/i, motif: 'sudden_silence' }
  ];

  return motifPatterns
    .filter(p => p.pattern.test(eventText))
    .map(p => p.motif);
}

/**
 * Add motifs from generated event
 * @param {string} mysteryId - Mystery ID
 * @param {string} eventText - Generated event text
 */
export function addMotifsFromEvent(mysteryId, eventText) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);
  if (!mystery?.narrativeMemory?.motifTracking) return;

  const motifs = extractMotifs(eventText);
  const tracking = mystery.narrativeMemory.motifTracking;
  const eventCount = mystery.narrativeMemory.eventTimeline.length;

  motifs.forEach(motif => {
    const existing = tracking.recentMotifs.find(m => m.motif === motif);
    if (existing) {
      existing.useCount++;
      existing.lastUsed = Date.now();
      existing.lastEventIndex = eventCount;
    } else {
      tracking.recentMotifs.push({
        motif,
        lastUsed: Date.now(),
        useCount: 1,
        lastEventIndex: eventCount
      });
    }
  });

  // Cleanup old motifs (starší než 10 eventů)
  tracking.recentMotifs = tracking.recentMotifs.filter(m => {
    const eventsAgo = eventCount - (m.lastEventIndex || 0);
    return eventsAgo < 10;
  });

  // Update mystery
  const { updateMystery } = require('../../state/store.js');
  updateMystery(mysteryId, { narrativeMemory: mystery.narrativeMemory });
}

/**
 * Get motifs that should be blocked from use
 * @param {string} mysteryId - Mystery ID
 * @returns {Array<string>} List of blocked motifs
 */
export function getBlockedMotifs(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);
  if (!mystery?.narrativeMemory?.motifTracking) return [];

  const tracking = mystery.narrativeMemory.motifTracking;
  const eventCount = mystery.narrativeMemory.eventTimeline.length;

  return tracking.recentMotifs
    .filter(m => {
      const eventsAgo = eventCount - (m.lastEventIndex || eventCount);
      return eventsAgo < tracking.cooldownEvents;
    })
    .map(m => m.motif);
}
