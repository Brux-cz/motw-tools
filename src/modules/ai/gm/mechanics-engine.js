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

  // Check for doomed (luck exhausted)
  let doomed = false;
  if (hunter.luck <= 0) {
    doomed = true;
    hunter.conditions = hunter.conditions || [];
    if (!hunter.conditions.includes('doomed')) {
      hunter.conditions.push('doomed');
      console.log(`[Mechanics] ${hunter.name} is now DOOMED (luck exhausted)`);
    }
  }

  await updateCampaign({ hunters: campaign.hunters });

  return {
    success: true,
    hunter: hunter.name,
    spent: amount,
    remaining: hunter.luck,
    doomed
  };
}

/**
 * Apply harm to monster
 * Without weakness: harm applies but capped at maxHarm - 1 (monster is immortal)
 * With weakness: full harm, monster can die (currentHarm >= maxHarm)
 * @param {number} harmValue - Amount of harm to deal
 * @param {boolean} usingWeakness - Whether weakness is being exploited
 * @returns {Promise<Object>} Result of harm application
 */
export async function applyMonsterHarm(harmValue, usingWeakness) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries?.find(m => m.id === currentMysteryId);
  if (!mystery?.monster) {
    return { success: false, error: 'No monster in current mystery' };
  }

  const monster = mystery.monster;
  const maxHarm = monster.harm || 10;
  const armor = monster.armor || 0;
  const actualHarm = Math.max(0, harmValue - armor);
  const currentHarm = monster.currentHarm || 0;

  let newHarm;
  let immortal = false;

  if (usingWeakness) {
    newHarm = currentHarm + actualHarm;
  } else {
    // Cap at maxHarm - 1 (monster can't die without weakness)
    newHarm = Math.min(currentHarm + actualHarm, maxHarm - 1);
    if (currentHarm + actualHarm >= maxHarm) {
      immortal = true;
    }
  }

  monster.currentHarm = newHarm;
  await updateCampaign({ mysteries: campaign.mysteries });

  const defeated = newHarm >= maxHarm;
  console.log(`[Mechanics] Monster ${monster.name}: ${actualHarm} harm dealt (${newHarm}/${maxHarm})${immortal ? ' [IMMORTAL - capped]' : ''}${defeated ? ' [DEFEATED]' : ''}`);

  return {
    success: true,
    monster: monster.name,
    harmDealt: actualHarm,
    totalHarm: newHarm,
    maxHarm,
    armorReduced: harmValue - actualHarm,
    immortal,
    defeated
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
      success: 'Úplný úspěch: Způsobíš příšeře/nepříteli zranění a navíc vyber jedno extra: získáš zranění navíc, odhodíš nepřítele, ochráníš někoho, nebo zastrašíš nepřátele.',
      partial: 'Na 7-9: Obě strany si udělí harm. Lovec zasáhne, ale nepřítel vrátí úder. Toto je CELÁ komplikace — žádná další.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'act_under_pressure': {
      success: 'Úplný úspěch: Zvládneš to bez problémů.',
      partial: 'Na 7-9: Strážce nabídne horší výsledek, obtížnou volbu, nebo cenu za úspěch. Hráč si vybere — to je pravidlo tahu.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'investigate': {
      success: 'Úplný úspěch: Polož Strážci 2 otázky ze seznamu: Co se tu stalo? Co to znamená? Kam to vede? Co tu není vidět? Kdo za tím stojí?',
      partial: 'Na 7-9: Polož Strážci 1 otázku ze seznamu (místo 2). Méně informací, ale žádná extra penalizace.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'manipulate': {
      success: 'Úplný úspěch: NPC udělá co chceš (pokud jsi nabídl rozumný důvod).',
      partial: 'Na 7-9: NPC to udělá jen pokud jim HNED splníš podmínku — musíš dát konkrétní záruku nebo protislužbu. To je pravidlo tahu.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'protect': {
      success: 'Úplný úspěch: Ochráníš je a vyber jedno: utrpíš jen malé zranění, udržíš si pozici a kontrolu, nebo na chráněnou osobu uděláš dojem.',
      partial: 'Na 7-9: Ochráníš je, ale sám utrpíš plný harm MÍSTO nich. To je pravidlo tahu — žádná extra komplikace.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'use_magic': {
      success: 'Úplný úspěch: Magie funguje přesně jak má.',
      partial: 'Na 7-9: Magie funguje, ale Strážce vybere jeden vedlejší efekt: kouzlo je slabší/nestabilní, vyčerpá tě, přitáhne pozornost, nebo má dočasný nežádoucí účinek.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    },
    'read_bad_situation': {
      success: 'Úplný úspěch: Polož Strážci 3 otázky: Kam vede úniková cesta? Co je tu nejnebezpečnější? Co je tu nejzranitelnější? Kdo tu skrývá pravdu? Co tu není vidět?',
      partial: 'Na 7-9: Polož 1 otázku ze seznamu (místo 3). Méně informací, ale žádná extra penalizace.',
      failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
    }
  };
  return outcomes[moveName] || {
    success: 'Úplný úspěch',
    partial: 'Částečný úspěch s cenou z pravidel tahu',
    failure: 'Strážce udělá měkký tah — naznač nebezpečí, telegrafuj co se chystá, konči otázkou "Co uděláš?"'
  };
}
