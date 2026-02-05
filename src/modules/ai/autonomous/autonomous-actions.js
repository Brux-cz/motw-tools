/**
 * Autonomous Actions - Execute draft actions from autonomous agent
 *
 * IMPORTANT: These actions are executed ONLY when user accepts work item
 */

import { updateMystery, addSessionLog } from '../../state/store.js';

/**
 * Execute actions from work item (after user approval)
 * @param {Array} actions - Array of action objects from AI
 * @param {string} mysteryId - Target mystery ID
 * @returns {Promise<Array>} Results of executed actions
 */
export async function executeActions(actions, mysteryId) {
  const results = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action, mysteryId);
      results.push({
        action: action.action,
        success: true,
        result
      });
    } catch (error) {
      console.error('[Autonomous Actions] Failed to execute action:', action, error);
      results.push({
        action: action.action,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Execute single action
 */
async function executeAction(action, mysteryId) {
  const { action: actionType, params } = action;

  switch (actionType) {
    case 'write_lore':
      return await writeLore(mysteryId, params);

    case 'write_story':
      return await writeStory(mysteryId, params);

    case 'compile_notes':
      return await compileNotes(mysteryId, params);

    case 'create_event':
      return await createEvent(mysteryId, params);

    case 'generate_twist':
      return await generateTwist(mysteryId, params);

    case 'expand_world':
      return await expandWorld(mysteryId, params);

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

/**
 * WRITE LORE - Add lore fragment to mystery
 */
async function writeLore(mysteryId, params) {
  const { title, content, category } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Add to custom lore array
  const customLore = mystery.customLore || [];
  const loreEntry = {
    id: generateId(),
    title,
    content,
    category: category || 'general',
    source: 'autonomous',
    createdAt: Date.now()
  };

  customLore.push(loreEntry);

  // Update mystery
  updateMystery(mysteryId, { customLore });

  // Add to session log
  addSessionLog({
    text: `AI přidalo lore: "${title}"`,
    type: 'autonomous-lore',
    category: 'ai'
  });

  return { loreId: loreEntry.id, title };
}

/**
 * WRITE STORY - Add story fragment (doesn't modify game state directly)
 */
async function writeStory(mysteryId, params) {
  const { title, content, timeframe, impacts_game } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Stories are stored separately
  const stories = mystery.autonomousStories || [];
  const storyEntry = {
    id: generateId(),
    title,
    content,
    timeframe: timeframe || 'parallel_action',
    impacts_game: impacts_game || false,
    source: 'autonomous',
    createdAt: Date.now()
  };

  stories.push(storyEntry);

  // Update mystery
  updateMystery(mysteryId, { autonomousStories: stories });

  // Add to session log
  addSessionLog({
    text: `AI napsalo příběh: "${title}"`,
    type: 'autonomous-story',
    category: 'ai'
  });

  return { storyId: storyEntry.id, title };
}

/**
 * COMPILE NOTES - Create compiled notes from session
 */
async function compileNotes(mysteryId, params) {
  const { title, content, categories } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Compiled notes
  const compiledNotes = mystery.compiledNotes || [];
  const noteEntry = {
    id: generateId(),
    title,
    content,
    categories: categories || [],
    source: 'autonomous',
    createdAt: Date.now(),
    sessionLength: campaign.sessionLog?.length || 0
  };

  compiledNotes.push(noteEntry);

  // Update mystery
  updateMystery(mysteryId, { compiledNotes });

  // Add to session log
  addSessionLog({
    text: `AI zkompilova poznámky: "${title}"`,
    type: 'autonomous-notes',
    category: 'ai'
  });

  return { noteId: noteEntry.id, title };
}

/**
 * CREATE EVENT - Add event to timeline/countdown
 */
async function createEvent(mysteryId, params) {
  const { title, description, trigger, urgency } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Add to autonomous events
  const autonomousEvents = mystery.autonomousEvents || [];
  const eventEntry = {
    id: generateId(),
    title,
    description,
    trigger: trigger || 'manual',
    urgency: urgency || 'medium',
    status: 'pending',
    source: 'autonomous',
    createdAt: Date.now()
  };

  autonomousEvents.push(eventEntry);

  // Update mystery
  updateMystery(mysteryId, { autonomousEvents });

  // Add to session log
  addSessionLog({
    text: `AI vytvořilo událost: "${title}" (${urgency})`,
    type: 'autonomous-event',
    category: 'ai'
  });

  return { eventId: eventEntry.id, title, urgency };
}

/**
 * GENERATE TWIST - Add twist to mystery
 */
async function generateTwist(mysteryId, params) {
  const { title, reveal, impact, hidden_clues } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Add to twists
  const twists = mystery.autonomousTwists || [];
  const twistEntry = {
    id: generateId(),
    title,
    reveal,
    impact: impact || 'medium',
    hidden_clues: hidden_clues || [],
    revealed: false,
    source: 'autonomous',
    createdAt: Date.now()
  };

  twists.push(twistEntry);

  // Update mystery
  updateMystery(mysteryId, { autonomousTwists: twists });

  // Add to session log
  addSessionLog({
    text: `AI vytvořilo twist: "${title}" (impact: ${impact})`,
    type: 'autonomous-twist',
    category: 'ai'
  });

  return { twistId: twistEntry.id, title, impact };
}

/**
 * EXPAND WORLD - Add NPC, location, or connection
 */
async function expandWorld(mysteryId, params) {
  const { type, title, description, relevance } = params;

  // Get current mystery state
  const { getState } = await import('../../state/store.js');
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Add to world expansion
  const worldExpansions = mystery.worldExpansions || [];
  const expansionEntry = {
    id: generateId(),
    type: type || 'connection',
    title,
    description,
    relevance: relevance || 'medium',
    discovered: false,
    source: 'autonomous',
    createdAt: Date.now()
  };

  worldExpansions.push(expansionEntry);

  // Update mystery
  updateMystery(mysteryId, { worldExpansions });

  // Add to session log
  addSessionLog({
    text: `AI rozšířilo svět: ${type} "${title}"`,
    type: 'autonomous-world',
    category: 'ai'
  });

  return { expansionId: expansionEntry.id, type, title };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
