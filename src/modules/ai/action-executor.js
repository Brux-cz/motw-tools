/**
 * AI Action Executor - Parses and executes AI actions
 */

import { generateId } from '../../utils/id.js';
import {
  updateMystery,
  advanceCountdown as advanceCountdownStore,
  updateHunter,
  addSessionLog,
  addCustomMove as addCustomMoveStore,
  getState
} from '../state/store.js';

/**
 * Parse action blocks from AI response
 * @param {string} content - AI response content
 * @returns {Array} Array of parsed actions
 */
export function parseActions(content) {
  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
  const actions = [];
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const action = JSON.parse(match[1]);
      if (action.action && action.params) {
        actions.push(action);
      }
    } catch (error) {
      console.error('Failed to parse action JSON:', error);
    }
  }

  return actions;
}

/**
 * Execute array of actions
 * @param {Array} actions - Actions to execute
 * @param {string} mysteryId - Current mystery ID
 * @returns {Promise<Array>} Array of action results
 */
export async function executeActions(actions, mysteryId) {
  const results = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action, mysteryId);
      results.push({
        ...action,
        result
      });
    } catch (error) {
      console.error(`Failed to execute action ${action.action}:`, error);
      results.push({
        ...action,
        result: {
          success: false,
          error: error.message
        }
      });
    }
  }

  return results;
}

/**
 * Execute single action
 * @param {Object} action - Action object
 * @param {string} mysteryId - Current mystery ID
 * @returns {Promise<Object>} Action result
 */
async function executeAction(action, mysteryId) {
  const { action: actionType, params } = action;

  switch (actionType) {
    case 'create_npc':
      return await createNPC(mysteryId, params);

    case 'update_npc':
      return await updateNPC(mysteryId, params);

    case 'create_location':
      return await createLocation(mysteryId, params);

    case 'advance_countdown':
      return await advanceCountdown(mysteryId, params);

    case 'inflict_harm':
      return await inflictHarm(mysteryId, params);

    case 'give_item':
      return await giveItem(mysteryId, params);

    case 'add_tag':
      return await addTag(mysteryId, params);

    case 'create_custom_move':
      return await createCustomMove(mysteryId, params);

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

/**
 * Create NPC
 */
async function createNPC(mysteryId, params) {
  const { name, type, description, motivation } = params;

  if (!name) {
    throw new Error('NPC name is required');
  }

  const { campaign } = getState();
  const mystery = campaign.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  const newNPC = {
    id: generateId(),
    name,
    type: type || 'Svědek',
    description: description || '',
    motivation: motivation || ''
  };

  const bystanders = [...(mystery.bystanders || []), newNPC];

  updateMystery(mysteryId, { bystanders });

  addSessionLog({
    text: `AI vytvořilo NPC: ${name} (${type || 'Svědek'})`,
    type: 'ai-action'
  });

  return {
    success: true,
    entityId: newNPC.id,
    message: `NPC "${name}" vytvořeno`
  };
}

/**
 * Update NPC
 */
async function updateNPC(mysteryId, params) {
  const { npcId, updates } = params;

  if (!npcId) {
    throw new Error('NPC ID is required');
  }

  const { campaign } = getState();
  const mystery = campaign.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  const bystanders = (mystery.bystanders || []).map(npc =>
    npc.id === npcId ? { ...npc, ...updates } : npc
  );

  const updatedNPC = bystanders.find(n => n.id === npcId);

  if (!updatedNPC) {
    throw new Error('NPC not found');
  }

  updateMystery(mysteryId, { bystanders });

  addSessionLog({
    text: `AI upravilo NPC: ${updatedNPC.name}`,
    type: 'ai-action'
  });

  return {
    success: true,
    entityId: npcId,
    message: `NPC "${updatedNPC.name}" upraveno`
  };
}

/**
 * Create Location
 */
async function createLocation(mysteryId, params) {
  const { name, type, description, threats } = params;

  if (!name) {
    throw new Error('Location name is required');
  }

  const { campaign } = getState();
  const mystery = campaign.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  const newLocation = {
    id: generateId(),
    name,
    type: type || 'Místo',
    description: description || '',
    threats: threats || ''
  };

  const locations = [...(mystery.locations || []), newLocation];

  updateMystery(mysteryId, { locations });

  addSessionLog({
    text: `AI vytvořilo lokaci: ${name}`,
    type: 'ai-action'
  });

  return {
    success: true,
    entityId: newLocation.id,
    message: `Lokace "${name}" vytvořena`
  };
}

/**
 * Advance Countdown
 */
async function advanceCountdown(mysteryId, params) {
  const { reason } = params;

  const { campaign } = getState();
  const mystery = campaign.mysteries.find(m => m.id === mysteryId);

  if (!mystery) {
    throw new Error('Mystery not found');
  }

  const currentPhase = mystery.countdown?.currentPhase || 0;
  const maxPhase = (mystery.countdown?.phases?.length || 6) - 1;

  if (currentPhase >= maxPhase) {
    return {
      success: false,
      message: 'Odpočet je již v Půlnoci (poslední fáze)'
    };
  }

  advanceCountdownStore(mysteryId, reason || 'AI posunulo odpočet');

  const newPhase = mystery.countdown.phases[currentPhase + 1];

  addSessionLog({
    text: `AI posunulo odpočet: ${newPhase.day} - ${reason || 'Postup událostí'}`,
    type: 'ai-action'
  });

  return {
    success: true,
    message: `Odpočet posunut na: ${newPhase.day}`
  };
}

/**
 * Inflict Harm
 */
async function inflictHarm(mysteryId, params) {
  const { targetType, targetId, harmValue, description } = params;

  if (!targetType || harmValue === undefined) {
    throw new Error('targetType and harmValue are required');
  }

  const { campaign } = getState();

  if (targetType === 'hunter') {
    if (!targetId) {
      throw new Error('targetId is required for hunter harm');
    }

    const hunter = campaign.hunters.find(h => h.id === targetId);
    if (!hunter) {
      throw new Error('Hunter not found');
    }

    const newHarm = Math.min((hunter.harm || 0) + harmValue, 7);

    updateHunter(targetId, { harm: newHarm });

    addSessionLog({
      text: `AI zranilo lovce ${hunter.name}: +${harmValue} harm (celkem ${newHarm}/7) - ${description || ''}`,
      type: 'ai-action'
    });

    return {
      success: true,
      message: `${hunter.name} utrpěl ${harmValue} harm`
    };

  } else if (targetType === 'monster') {
    const mystery = campaign.mysteries.find(m => m.id === mysteryId);
    if (!mystery || !mystery.monster) {
      throw new Error('Monster not found');
    }

    const currentHarm = mystery.monster.currentHarm || 0;
    const newHarm = Math.min(currentHarm + harmValue, mystery.monster.harmCapacity || 10);

    updateMystery(mysteryId, {
      monster: {
        ...mystery.monster,
        currentHarm: newHarm
      }
    });

    addSessionLog({
      text: `Příšera ${mystery.monster.name} utrpěla ${harmValue} harm (celkem ${newHarm}/${mystery.monster.harmCapacity || 10})`,
      type: 'ai-action'
    });

    return {
      success: true,
      message: `Příšera utrpěla ${harmValue} harm`
    };

  } else {
    throw new Error(`Unknown targetType: ${targetType}`);
  }
}

/**
 * Give Item to Hunter
 */
async function giveItem(mysteryId, params) {
  const { hunterId, item } = params;

  if (!hunterId || !item || !item.name) {
    throw new Error('hunterId and item.name are required');
  }

  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    throw new Error('Hunter not found');
  }

  const newItem = {
    id: generateId(),
    name: item.name,
    description: item.description || '',
    tags: item.tags || []
  };

  const gear = [...(hunter.gear || []), newItem];

  updateHunter(hunterId, { gear });

  addSessionLog({
    text: `AI dalo lovci ${hunter.name} předmět: ${item.name}`,
    type: 'ai-action'
  });

  return {
    success: true,
    message: `${hunter.name} získal předmět: ${item.name}`
  };
}

/**
 * Add Story Tag to Hunter
 */
async function addTag(mysteryId, params) {
  const { hunterId, tag } = params;

  if (!hunterId || !tag || !tag.name) {
    throw new Error('hunterId and tag.name are required');
  }

  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    throw new Error('Hunter not found');
  }

  const newTag = {
    id: generateId(),
    name: tag.name,
    description: tag.description || ''
  };

  const storyTags = [...(hunter.storyTags || []), newTag];

  updateHunter(hunterId, { storyTags });

  addSessionLog({
    text: `AI přidalo lovci ${hunter.name} story tag: ${tag.name}`,
    type: 'ai-action'
  });

  return {
    success: true,
    message: `${hunter.name} získal story tag: ${tag.name}`
  };
}

/**
 * Create Custom Move
 */
async function createCustomMove(mysteryId, params) {
  const { name, trigger, effect } = params;

  if (!name) {
    throw new Error('Move name is required');
  }

  const customMove = {
    name,
    trigger: trigger || '',
    effect: effect || ''
  };

  addCustomMoveStore(mysteryId, customMove);

  addSessionLog({
    text: `AI vytvořilo vlastní tah: ${name}`,
    type: 'ai-action'
  });

  return {
    success: true,
    message: `Vlastní tah "${name}" vytvořen`
  };
}

/**
 * Validate action before execution
 * @param {Object} action - Action to validate
 * @returns {Object} Validation result
 */
export function validateAction(action) {
  const errors = [];

  if (!action.action) {
    errors.push('Action type is missing');
  }

  if (!action.params) {
    errors.push('Action params are missing');
  }

  // Type-specific validation
  const validActionTypes = [
    'create_npc',
    'update_npc',
    'create_location',
    'advance_countdown',
    'inflict_harm',
    'give_item',
    'add_tag',
    'create_custom_move'
  ];

  if (action.action && !validActionTypes.includes(action.action)) {
    errors.push(`Unknown action type: ${action.action}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
