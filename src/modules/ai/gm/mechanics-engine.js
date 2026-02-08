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
      success: 'Úplný úspěch: Způsobíš příšeře/nepříteli zranění a navíc vyber jedno extra: získáš zranění navíc, odhodíš nepřítele, ochráníš někoho, nebo zastrašíš nepřátele.',
      partial: 'Částečný úspěch: Způsobíš zranění, ALE nepřítel ti zranění vrátí. Obě strany si udělí harm podle pravidel.',
      failure: 'Strážce provede tvrdý tah. Nepřítel útočí naplno — utrpíš plný harm a nedealuješ žádné zranění.'
    },
    'act_under_pressure': {
      success: 'Úplný úspěch: Zvládneš to bez problémů.',
      partial: 'Strážce dá na výběr: horší výsledek, složitá volba nebo cena za úspěch. Lovec musí obětovat něco konkrétního.',
      failure: 'Strážce provede tvrdý tah. Akce selže a situace se výrazně zhorší.'
    },
    'investigate': {
      success: 'Úplný úspěch: Polož Strážci 2 otázky ze seznamu: Co se tu stalo? Co to znamená? Kam to vede? Co tu není vidět? Kdo za tím stojí?',
      partial: 'Částečný úspěch: Polož Strážci 1 otázku ze seznamu, ale vyšetřování tě stojí čas, pozornost, nebo prozradí tvou přítomnost.',
      failure: 'Strážce provede tvrdý tah. Vyšetřování prozradí informaci příšeře nebo nebezpečí — nepřítel ví o lovcích.'
    },
    'manipulate': {
      success: 'Úplný úspěch: NPC udělá co chceš (pokud jsi nabídl rozumný důvod).',
      partial: 'NPC to udělá jen pokud jim HNED splníš podmínku, nebo ti nabídne nevýhodný obchod. Musíš něco slíbit nebo obětovat.',
      failure: 'Strážce provede tvrdý tah. NPC se obrátí proti tobě — prozradí tě, zavolá pomoc, nebo ti aktivně škodí.'
    },
    'protect': {
      success: 'Úplný úspěch: Ochráníš je a vyber jedno: utrpíš jen malé zranění, udržíš si pozici a kontrolu, nebo na chráněnou osobu uděláš dojem.',
      partial: 'Ochráníš je, ale utrpíš plný harm NEBO tě to dostane do nevýhodné pozice.',
      failure: 'Strážce provede tvrdý tah. Nedokážeš je ochránit — oba utrpíte následky.'
    },
    'use_magic': {
      success: 'Úplný úspěch: Magie funguje přesně jak má.',
      partial: 'Magie funguje, ale Strážce vybere vedlejší efekt: kouzlo je slabší, vyžaduje oběť, přitáhne nežádoucí pozornost, nebo má nepředvídatelný účinek.',
      failure: 'Strážce provede tvrdý tah. Magie selže nebo se obrátí proti sesílateli — nežádoucí efekt, zranění, nebo přivolá něco horšího.'
    },
    'read_bad_situation': {
      success: 'Úplný úspěch: Polož Strážci 3 otázky: Kam vede úniková cesta? Co je tu nejnebezpečnější? Co je tu nejzranitelnější? Kdo tu skrývá pravdu? Co tu není vidět?',
      partial: 'Částečný úspěch: Polož 1 otázku ze seznamu, ale tvé soustředění tě stojí čas nebo pozornost — nepřítel získá výhodu.',
      failure: 'Strážce provede tvrdý tah. Špatně vyhodnotíš situaci — tvé jednání na základě chybné analýzy tě dostane do nebezpečí.'
    }
  };
  return outcomes[moveName] || {
    success: 'Úplný úspěch',
    partial: 'Částečný úspěch s cenou nebo komplikací',
    failure: 'Strážce provede tvrdý tah'
  };
}
