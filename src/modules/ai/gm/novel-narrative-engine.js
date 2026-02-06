/**
 * Novel Narrative Engine
 * Literary storytelling with 2-3 paragraphs, rich details, and memory continuity
 */

import { callAI } from '../client.js';
import { buildNarrativeContext, getBlockedMotifs, addMotifsFromEvent } from './narrative-memory.js';
import { getCurrentActContext } from './story-arc-manager.js';
import { getNPCContext, getKnownNPCsSummary } from './npc-memory.js';
import {
  getNarrativeStyle,
  getNovelPromptTemplate,
  getNovelScenePrompt,
  getNovelNPCPrompt,
  getOutcomeGuidance,
  mapSettingsToStyle
} from './narrative-styles.js';
import { getMoveOutcomes } from './mechanics-engine.js';
import { getState } from '../../state/store.js';
import { getCurrentScene } from './scene-manager.js';

/**
 * Narrate action result in Novel Mode (literary, 2-3 paragraphs)
 * @param {Object} parsedAction - Parsed player action
 * @param {Object} result - Move resolution result
 * @param {Object} novelSettings - Novel mode settings
 * @returns {Promise<string>} Literary narrative
 */
export async function narrateActionNovel(parsedAction, result, novelSettings = {}) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    console.error('[Novel Narrative] Mystery not found');
    return narrateActionFallback(parsedAction, result);
  }

  // Determine style from settings
  const {
    narrativeLength = 'medium',
    literaryQuality = 'balanced'
  } = novelSettings;

  const styleName = mapSettingsToStyle(narrativeLength, literaryQuality);
  const style = getNarrativeStyle(styleName);

  // Build context
  const narrativeMemory = buildNarrativeContext(currentMysteryId, {
    includeActiveThreads: true,
    includeEstablishedFacts: true,
    maxEvents: 5 // Last 5 events for action narration
  });

  const actContext = getCurrentActContext(currentMysteryId);

  // Get scene for tension
  const scene = getCurrentScene();
  const tension = scene?.tension || 5;
  const countdownPhase = mystery.countdown?.currentPhase || 0;

  // Get move outcomes
  const moveOutcomes = getMoveOutcomes(result.move);
  const outcomeDesc = moveOutcomes[result.outcome];

  // Check for active planned beat
  const plannedBeat = checkActivePlannedBeat(mystery, parsedAction);

  // Get foreshadowing elements
  const foreshadowing = getActiveForeshadowing(mystery);

  // Build prompt using template
  const prompt = getNovelPromptTemplate(styleName, {
    narrativeMemory,
    actContext,
    npcContext: null, // Will add if NPC involved
    action: parsedAction.raw,
    roll: result.roll,
    outcome: `${result.outcome} (${outcomeDesc})`,
    tension,
    countdownPhase,
    plannedBeat,
    foreshadowing
  });

  try {
    const narrative = await callAI(prompt, {
      temperature: style.temperature,
      max_tokens: style.maxTokens
    });

    console.log('[Novel Narrative] Generated:', narrative.substring(0, 100) + '...');
    return narrative;
  } catch (error) {
    console.error('[Novel Narrative] Error:', error);
    return narrateActionFallback(parsedAction, result);
  }
}

/**
 * Generate scene description in Novel Mode (literary, 2-3 paragraphs)
 * @param {Object} location - Location object
 * @param {string} atmosphere - Atmosphere/mood
 * @param {number} tension - Tension level (0-10)
 * @param {Object} novelSettings - Novel mode settings
 * @returns {Promise<string>} Literary scene description
 */
export async function generateSceneDescriptionNovel(location, atmosphere, tension, novelSettings = {}) {
  const { currentMysteryId } = getState();

  if (!currentMysteryId) {
    console.error('[Novel Narrative] No active mystery');
    return `Nacházíš se v ${location.name || 'neznámé lokaci'}.`;
  }

  // Determine style
  const {
    narrativeLength = 'medium',
    literaryQuality = 'balanced'
  } = novelSettings;

  const styleName = mapSettingsToStyle(narrativeLength, literaryQuality);
  const style = getNarrativeStyle(styleName);

  // Build context
  const narrativeMemory = buildNarrativeContext(currentMysteryId, {
    maxEvents: 3 // Fewer events for scene description
  });

  const actContext = getCurrentActContext(currentMysteryId);

  // Get previous visits to this location from memory
  const previousVisits = getPreviousVisits(currentMysteryId, location.name);

  // Get foreshadowing
  const foreshadowing = getActiveForeshadowing({ id: currentMysteryId });

  // Build prompt
  const prompt = getNovelScenePrompt(styleName, {
    location,
    atmosphere,
    tension,
    narrativeMemory,
    actContext,
    previousVisits,
    foreshadowing
  });

  try {
    const description = await callAI(prompt, {
      temperature: style.temperature,
      max_tokens: style.maxTokens
    });

    console.log('[Novel Scene] Generated:', description.substring(0, 100) + '...');
    return description;
  } catch (error) {
    console.error('[Novel Scene] Error:', error);
    return `Nacházíš se v ${location.name || 'neznámé lokaci'}. Atmosféra je ${atmosphere}.`;
  }
}

/**
 * Generate NPC response in Novel Mode
 * @param {Object} npc - NPC object
 * @param {string} npcId - NPC ID
 * @param {Object} context - Context (playerAction, situation)
 * @param {Object} novelSettings - Novel mode settings
 * @returns {Promise<string>} Literary NPC response
 */
export async function generateNPCResponseNovel(npc, npcId, context, novelSettings = {}) {
  const { currentMysteryId } = getState();

  if (!currentMysteryId) {
    console.error('[Novel NPC] No active mystery');
    return `${npc.name} reaguje.`;
  }

  // Determine style
  const {
    narrativeLength = 'medium',
    literaryQuality = 'balanced'
  } = novelSettings;

  const styleName = mapSettingsToStyle(narrativeLength, literaryQuality);
  const style = getNarrativeStyle(styleName);

  // Get NPC memory context
  const npcContext = getNPCContext(npcId);

  // Get story memory (condensed)
  const narrativeMemory = buildNarrativeContext(currentMysteryId, {
    maxEvents: 3,
    includeActiveThreads: false
  });

  // Build prompt
  const prompt = getNovelNPCPrompt(styleName, {
    npc,
    npcContext,
    playerAction: context.playerAction || '',
    situation: context.situation || '',
    narrativeMemory
  });

  try {
    const response = await callAI(prompt, {
      temperature: style.temperature,
      max_tokens: Math.floor(style.maxTokens * 0.7) // NPCs get slightly shorter responses
    });

    console.log('[Novel NPC] Generated:', response.substring(0, 100) + '...');
    return response;
  } catch (error) {
    console.error('[Novel NPC] Error:', error);
    return `${npc.name}: "${context.playerAction ? 'Zajímavé...' : 'Co potřebuješ?'}"`;
  }
}

/**
 * Fallback narrative for errors
 * @param {Object} parsedAction - Parsed action
 * @param {Object} result - Result
 * @returns {string} Fallback narrative
 */
function narrateActionFallback(parsedAction, result) {
  const { hunter } = result;
  const outcomeMap = {
    success: 'uspěje',
    partial: 'částečně uspěje',
    failure: 'selže'
  };

  return `${hunter} ${outcomeMap[result.outcome] || 'jedná'} v akci: ${parsedAction.raw}`;
}

/**
 * Check if any planned beat should trigger with this action
 * @param {Object} mystery - Mystery object
 * @param {Object} parsedAction - Parsed action
 * @returns {Object|null} Planned beat or null
 */
function checkActivePlannedBeat(mystery, parsedAction) {
  if (!mystery.storyPlanning?.nextBeats) {
    return null;
  }

  // Simple trigger matching (can be enhanced)
  const { nextBeats } = mystery.storyPlanning;

  for (const beat of nextBeats) {
    if (beat.trigger && parsedAction.raw.toLowerCase().includes(beat.trigger.toLowerCase())) {
      return beat;
    }
  }

  return null;
}

/**
 * Get active foreshadowing elements
 * @param {Object} mystery - Mystery object
 * @returns {Array<string>} Foreshadowing elements
 */
function getActiveForeshadowing(mystery) {
  if (!mystery.storyPlanning?.foreshadowing) {
    return [];
  }

  return mystery.storyPlanning.foreshadowing
    .filter(f => f.planted && !f.payoffExecuted)
    .map(f => f.element)
    .slice(0, 2); // Max 2 foreshadowing elements at once
}

/**
 * Get previous visits to location from memory
 * @param {string} mysteryId - Mystery ID
 * @param {string} locationName - Location name
 * @returns {Array<string>} Previous visit summaries
 */
function getPreviousVisits(mysteryId, locationName) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.narrativeMemory?.eventTimeline) {
    return [];
  }

  // Find events related to this location
  const visits = mystery.narrativeMemory.eventTimeline
    .filter(event =>
      event.relatedLocations?.includes(locationName) ||
      event.summary.includes(locationName)
    )
    .map(event => event.summary)
    .slice(-2); // Last 2 visits

  return visits;
}

/**
 * Generate ambient event in Novel Mode
 * @param {Object} scene - Current scene
 * @param {Object} mystery - Current mystery
 * @param {Object} novelSettings - Novel mode settings
 * @returns {Promise<string>} Ambient event
 */
export async function generateAmbientEventNovel(scene, mystery, novelSettings = {}) {
  const {
    narrativeLength = 'medium',
    literaryQuality = 'balanced'
  } = novelSettings;

  const styleName = mapSettingsToStyle(narrativeLength, literaryQuality);
  const style = getNarrativeStyle(styleName);

  // Get narrative memory for continuity
  const narrativeMemory = buildNarrativeContext(mystery.id, {
    maxEvents: 2,
    includeActiveThreads: false,
    includeEstablishedFacts: false
  });

  // Get foreshadowing
  const foreshadowing = getActiveForeshadowing(mystery);

  // Get blocked motifs
  const blockedMotifs = getBlockedMotifs(mystery.id);

  // Get known NPCs
  const knownNPCs = getKnownNPCsSummary(mystery.id);
  const npcList = knownNPCs.length > 0
    ? knownNPCs.map(npc => `- ${npc.name} (${npc.type}): ${npc.description}`).join('\n')
    : 'Žádné známé NPC';

  const prompt = `Vygeneruj atmosférický ambient event pro Monster of the Week:

${narrativeMemory ? 'KONTEXT:\n' + narrativeMemory + '\n' : ''}

Scéna: ${scene.location?.name || 'neznámá lokace'}
Napětí: ${scene.tension}/10
Mystery: ${mystery.name}

EXISTUJÍCÍ NPC (používej POUZE tyto):
${npcList}

${foreshadowing.length > 0 ? `Foreshadowing: ${foreshadowing.join(', ')}\n` : ''}

${blockedMotifs.length > 0 ? `NEPOUŽÍVEJ tyto nedávno použité motivy: ${blockedMotifs.join(', ')}\n` : ''}

Pravidla:
- 1-2 odstavce
- Pokud zmiňuješ NPC, MUSÍŠ použít jednoho ze seznamu výše
- NIKDY nevymýšlej nové NPC jméno
- Subtilní detail nebo atmosféra
- ${scene.tension > 7 ? 'Znepokojivé nebo děsivé' : scene.tension > 4 ? 'Lehce znepokojivé' : 'Atmosférické'}
- Nesmí to být přímá hrozba, jen atmosféra
- Používej smysly (zvuky, záblesky, pocity)
- Kontinuita s předchozími událostmi
- DŮLEŽITÉ: Vymysli NOVÝ a ORIGINÁLNÍ detail, ne opakování výše blokovaných motivů
${foreshadowing.length > 0 ? '- Zahrň foreshadowing element jemným způsobem' : ''}

Odpověz POUZE popisem události:`;

  try {
    const event = await callAI(prompt, {
      temperature: 0.9,
      max_tokens: Math.floor(style.maxTokens * 0.5) // Ambient events are shorter
    });

    // Track motifs from generated event
    if (event) {
      addMotifsFromEvent(mystery.id, event);
    }

    return event;
  } catch (error) {
    console.error('[Novel Ambient] Error:', error);
    return null;
  }
}

/**
 * Generate consequence narration in Novel Mode
 * @param {Object} consequence - Consequence object
 * @param {Object} context - Context
 * @param {Object} novelSettings - Novel mode settings
 * @returns {Promise<string>} Consequence narrative
 */
export async function narrateConsequenceNovel(consequence, context, novelSettings = {}) {
  const {
    narrativeLength = 'medium',
    literaryQuality = 'balanced'
  } = novelSettings;

  const styleName = mapSettingsToStyle(narrativeLength, literaryQuality);
  const style = getNarrativeStyle(styleName);

  let prompt = '';

  if (consequence.type === 'harm') {
    prompt = `Vypravěj důsledek v Monster of the Week (literární styl):

${context.hunter} utrpěl ${consequence.amount} harm od ${consequence.source}.

Pravidla:
- 1-2 odstavce
- Popisuj bolest/zranění dramaticky a smyslově
- Show, don't tell (ukaž bolest skrze detaily)
- Vnitřní pocity postavy
- Pokus emocionální dopad

Odpověz POUZE narativem:`;
  } else if (consequence.type === 'condition') {
    prompt = `Vypravěj důsledek v Monster of the Week (literární styl):

${context.hunter} získává condition: ${consequence.condition}.

Pravidla:
- 1 odstavec
- Popisuj jak to ovlivňuje lovce (smyslově, emočně)
- Show, don't tell

Odpověz POUZE narativem:`;
  }

  try {
    const narrative = await callAI(prompt, {
      temperature: style.temperature * 0.9, // Slightly lower for consequences
      max_tokens: Math.floor(style.maxTokens * 0.6)
    });

    return narrative;
  } catch (error) {
    console.error('[Novel Consequence] Error:', error);
    return consequence.type === 'harm'
      ? `${context.hunter} utrpěl ${consequence.amount} harm.`
      : `${context.hunter} je ${consequence.condition}.`;
  }
}
