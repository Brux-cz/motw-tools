/**
 * NPC Engine - NPC behavior and dialogue
 */
import { getState } from '../../state/store.js';
import { callAI } from '../client.js';

/**
 * Generate NPC dialogue response
 * @param {string} npcId - NPC ID
 * @param {Object} context - Context including player action
 * @returns {Promise<string>} NPC dialogue
 */
export async function generateNPCResponse(npcId, context) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return null;
  }

  const npc = mystery.bystanders?.find(b => b.id === npcId);

  if (!npc) {
    return null;
  }

  // Build system prompt for NPC character
  const systemPrompt = `Jsi ${npc.name}, ${npc.type} v Monster of the Week.
Tvoje motivace: ${npc.motivation}
Tvůj popis: ${npc.description || 'Žádný popis'}

Odpovídáš stručně (1-3 věty), v charakteru. Česky.
Použij uvozovky pro přímou řeč. Pokud je to vhodné, ukaž emoce nebo gesta.`;

  const prompt = `${context.recentHistory ? `Kontext:\n${context.recentHistory}\n\n` : ''}Hráč říká/dělá: ${context.playerAction}

Jak reaguješ?`;

  try {
    const response = await callAI(prompt, {
      systemPrompt,
      temperature: 0.8,
      max_tokens: 200
    });
    return response;
  } catch (error) {
    console.error('[NPC Engine] Error generating NPC response:', error);
    return `${npc.name} vypadá zmateně a neodpovídá.`;
  }
}

/**
 * Determine NPC behavior in situation
 * @param {string} npcId - NPC ID
 * @param {Object} situation - Current situation
 * @returns {Promise<Object>} NPC action
 */
export async function determineNPCBehavior(npcId, situation) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return null;
  }

  const npc = mystery.bystanders?.find(b => b.id === npcId);

  if (!npc) {
    return null;
  }

  // Build prompt for behavior decision
  const historyBlock = situation.recentHistory
    ? `Dosavadní průběh session:\n${situation.recentHistory}\n\n`
    : '';

  const prompt = `Jako Keeper, urči co udělá ${npc.name} (${npc.type}, motivace: ${npc.motivation}) v této situaci:

${historyBlock}${situation.description}

Popis NPC: ${npc.description || 'Žádný popis'}
Napětí scény: ${situation.tension || 5}/10

Pravidla:
- NPC jedná podle své motivace: ${npc.motivation}
- NEOPAKUJ co NPC už udělal — viz dosavadní průběh session
- Buď konkrétní a unikátní — každá akce musí být jiná než předchozí
- Jedna věta nebo krátký popis

Odpověz POUZE akcí NPC:`;

  try {
    const action = await callAI(prompt, {
      temperature: 0.7,
      max_tokens: 150
    });

    return {
      npcId,
      npcName: npc.name,
      action,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[NPC Engine] Error determining NPC behavior:', error);
    return {
      npcId,
      npcName: npc.name,
      action: `${npc.name} vyčkává.`,
      timestamp: Date.now()
    };
  }
}

/**
 * Get NPC reaction to event
 * @param {string} npcId - NPC ID
 * @param {string} event - Event description
 * @returns {Promise<string>} NPC reaction
 */
export async function getNPCReaction(npcId, event) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return null;
  }

  const npc = mystery.bystanders?.find(b => b.id === npcId);

  if (!npc) {
    return null;
  }

  const prompt = `Jak reaguje ${npc.name} (${npc.type}) na tuto událost: ${event}

Motivace: ${npc.motivation}
Popis: ${npc.description || 'Žádný popis'}

Odpověz stručně (1 věta) - reakce nebo dialog:`;

  try {
    const reaction = await callAI(prompt, {
      temperature: 0.7,
      max_tokens: 100
    });
    return reaction;
  } catch (error) {
    console.error('[NPC Engine] Error getting NPC reaction:', error);
    return null;
  }
}

/**
 * Check if NPC should intervene in situation
 * @param {string} npcId - NPC ID
 * @param {Object} situation - Current situation
 * @returns {boolean} Whether NPC should act
 */
export function shouldNPCIntervene(npcId, situation) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return false;
  }

  const npc = mystery.bystanders?.find(b => b.id === npcId);

  if (!npc) {
    return false;
  }

  // Simple heuristic - NPCs intervene based on:
  // - High tension (> 7)
  // - Direct mention in player action
  // - Type-specific triggers

  if (situation.playerAction?.toLowerCase().includes(npc.name.toLowerCase())) {
    return true; // Always react if directly mentioned
  }

  if (situation.tension > 7) {
    return Math.random() < 0.35; // 35% chance on high tension (was 60%)
  }

  // Type-specific behavior (case-insensitive, CZ/EN) — reduced chances
  const npcType = (npc.type || '').toLowerCase();
  const interventionChance = {
    'witness': 0.15, 'svědek': 0.15,
    'victim': 0.35, 'oběť': 0.35,
    'busybody': 0.4, 'všetečka': 0.4,
    'helper': 0.3, 'pomocník': 0.3,
    'official': 0.25, 'úředník': 0.25,
    'gossip': 0.35, 'drbna': 0.35, 'klevetník': 0.35,
    'innocent': 0.2, 'nevinný': 0.2,
    'suspect': 0.25, 'podezřelý': 0.25
  };

  const chance = interventionChance[npcType] || 0.15;
  return Math.random() < chance;
}
