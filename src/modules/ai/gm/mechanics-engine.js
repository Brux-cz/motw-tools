/**
 * Mechanics Engine - MOTW game mechanics
 * Handles dice rolling, move resolution, harm, and conditions
 */
import { getState, updateCampaign } from '../../state/store.js';
import { getStatForMove } from './player-input-parser.js';

/**
 * Roll 2d6
 * @returns {Object} Roll result with individual dice and total
 */
export function rollDice() {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

/**
 * Resolve move with dice roll
 * @param {string} hunterId - Hunter ID
 * @param {string} moveName - Move name
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Resolution result
 */
export async function resolveMove(hunterId, moveName, context = {}) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  // Get stat
  const statName = getStatForMove(moveName);
  if (!statName) {
    return { success: false, error: 'No stat for this move' };
  }

  const statValue = hunter.stats[statName] || 0;

  // Roll dice
  const roll = rollDice();
  const total = roll.total + statValue;

  // Determine outcome
  let outcome;
  if (total >= 10) {
    outcome = 'success';
  } else if (total >= 7) {
    outcome = 'partial';
  } else {
    outcome = 'failure';
  }

  return {
    success: true,
    hunterId,
    hunter: hunter.name,
    move: moveName,
    stat: statName,
    statValue,
    roll: roll,
    total,
    outcome,
    context
  };
}

/**
 * Apply harm to hunter
 * @param {string} hunterId - Hunter ID
 * @param {number} harmValue - Amount of harm
 * @param {string} source - Source of harm
 * @returns {Promise<Object>} Result of harm application
 */
export async function applyHarm(hunterId, harmValue, source = 'unknown') {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  // Calculate actual harm (armor reduces it)
  const armor = hunter.armor || 0;
  const actualHarm = Math.max(0, harmValue - armor);

  // Update harm
  const currentHarm = hunter.harm || 0;
  hunter.harm = currentHarm + actualHarm;

  // Check for unstable condition (7+ harm)
  if (hunter.harm >= 7 && hunter.harm < 12) {
    await applyCondition(hunterId, 'unstable');
  }

  // Update campaign
  await updateCampaign({ hunters: campaign.hunters });

  // Log
  console.log(`[Mechanics] Applied ${actualHarm} harm to ${hunter.name} from ${source}`);

  return {
    success: true,
    hunter: hunter.name,
    harmDealt: actualHarm,
    totalHarm: hunter.harm,
    armorReduced: harmValue - actualHarm,
    source,
    unstable: hunter.harm >= 7
  };
}

/**
 * Heal harm
 * @param {string} hunterId - Hunter ID
 * @param {number} healValue - Amount to heal
 * @returns {Promise<Object>} Result of healing
 */
export async function healHarm(hunterId, healValue) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  const previousHarm = hunter.harm || 0;
  hunter.harm = Math.max(0, previousHarm - healValue);

  await updateCampaign({ hunters: campaign.hunters });

  return {
    success: true,
    hunter: hunter.name,
    healed: healValue,
    totalHarm: hunter.harm
  };
}

/**
 * Apply condition to hunter
 * @param {string} hunterId - Hunter ID
 * @param {string} condition - Condition name
 * @returns {Promise<Object>} Result of condition application
 */
export async function applyCondition(hunterId, condition) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  hunter.conditions = hunter.conditions || [];
  if (!hunter.conditions.includes(condition)) {
    hunter.conditions.push(condition);
  }

  await updateCampaign({ hunters: campaign.hunters });

  console.log(`[Mechanics] Applied condition "${condition}" to ${hunter.name}`);

  return {
    success: true,
    hunter: hunter.name,
    condition,
    allConditions: hunter.conditions
  };
}

/**
 * Remove condition from hunter
 * @param {string} hunterId - Hunter ID
 * @param {string} condition - Condition name
 * @returns {Promise<Object>} Result of condition removal
 */
export async function removeCondition(hunterId, condition) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  hunter.conditions = hunter.conditions || [];
  hunter.conditions = hunter.conditions.filter(c => c !== condition);

  await updateCampaign({ hunters: campaign.hunters });

  return {
    success: true,
    hunter: hunter.name,
    removedCondition: condition,
    allConditions: hunter.conditions
  };
}

/**
 * Spend luck
 * @param {string} hunterId - Hunter ID
 * @param {number} amount - Amount of luck to spend (default 1)
 * @returns {Promise<Object>} Result of luck spending
 */
export async function spendLuck(hunterId, amount = 1) {
  const { campaign } = getState();
  const hunter = campaign.hunters.find(h => h.id === hunterId);

  if (!hunter) {
    return { success: false, error: 'Hunter not found' };
  }

  const currentLuck = hunter.luck || 0;
  if (currentLuck < amount) {
    return { success: false, error: 'Not enough luck' };
  }

  hunter.luck = currentLuck - amount;

  await updateCampaign({ hunters: campaign.hunters });

  return {
    success: true,
    hunter: hunter.name,
    spent: amount,
    remaining: hunter.luck
  };
}

/**
 * Get move outcomes description
 * @param {string} moveName - Move name
 * @returns {Object} Outcomes for 10+, 7-9, 6-
 */
export function getMoveOutcomes(moveName) {
  const outcomes = {
    'kick_some_ass': {
      success: 'You inflict harm and suffer little to no harm',
      partial: 'You inflict harm but suffer harm in return',
      failure: 'You suffer harm without dealing damage'
    },
    'act_under_pressure': {
      success: 'You do it successfully',
      partial: 'You do it but with a cost or complication',
      failure: 'Things go badly wrong'
    },
    'investigate': {
      success: 'Ask the Keeper 3 questions',
      partial: 'Ask the Keeper 1 question',
      failure: 'You reveal something to the monster or danger'
    },
    'manipulate': {
      success: 'They do what you want',
      partial: 'They do it if you promise something or make a bargain',
      failure: 'They turn the tables on you'
    },
    'protect': {
      success: 'You protect them and choose one: suffer little harm, retain control, impress them',
      partial: 'You protect them but suffer harm or lose control',
      failure: 'You fail to protect them'
    },
    'use_magic': {
      success: 'The magic works without issues',
      partial: 'The magic works but with a cost or glitch',
      failure: 'The magic fails or backfires'
    },
    'read_bad_situation': {
      success: 'Hold 3 to ask questions',
      partial: 'Hold 1 to ask a question',
      failure: 'You misread the situation'
    }
  };
  return outcomes[moveName] || {
    success: 'Success',
    partial: 'Partial success',
    failure: 'Failure'
  };
}
