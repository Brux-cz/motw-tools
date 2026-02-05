/**
 * Narrative Engine - Dynamic storytelling
 */
import { callAI } from '../client.js';
import { getMoveOutcomes } from './mechanics-engine.js';

/**
 * Narrate action result
 * @param {Object} parsedAction - Parsed player action
 * @param {Object} result - Move resolution result
 * @returns {Promise<string>} Narrative description
 */
export async function narrateAction(parsedAction, result) {
  const moveOutcomes = getMoveOutcomes(result.move);
  const outcomeDesc = moveOutcomes[result.outcome];

  const prompt = `Vypravěj výsledek akce v Monster of the Week:

Akce hráče: ${parsedAction.raw}
Hod: ${result.roll.die1} + ${result.roll.die2} + ${result.statValue} (${result.stat}) = ${result.total}
Výsledek: ${result.outcome} (${outcomeDesc})

Pravidla:
- 2-3 věty
- Show, don't tell (ukaž akci, nesumařizuj)
- Dramatické, napínavé vyprávění
- ${result.outcome === 'success' ? 'Zdůrazni úspěch a kontrolu' : result.outcome === 'partial' ? 'Úspěch s komplikací nebo cenou' : 'Věci se pokazily - důsledky'}
- Použij přítomný čas

Odpověz POUZE narativem (bez dodatečných komentářů):`;

  try {
    const narrative = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 250
    });
    return narrative;
  } catch (error) {
    console.error('[Narrative Engine] Error narrating action:', error);
    // Fallback
    return `${result.hunter} ${result.outcome === 'success' ? 'uspěje' : result.outcome === 'partial' ? 'částečně uspěje' : 'selže'} v akci.`;
  }
}

/**
 * Generate scene description
 * @param {Object} location - Location object
 * @param {string} atmosphere - Atmosphere/mood
 * @param {number} tension - Tension level (0-10)
 * @returns {Promise<string>} Scene description
 */
export async function generateSceneDescription(location, atmosphere = 'neutrální', tension = 5) {
  const prompt = `Popiš scénu v Monster of the Week:

Lokace: ${location.name || 'neznámé místo'}
${location.description ? `Popis: ${location.description}` : ''}
Atmosféra: ${atmosphere}
Napětí: ${tension}/10

Pravidla:
- 2-3 věty
- Zaměř se na smysly (co vidíš, slyšíš, cítíš)
- Vytvářej náladu a atmosféru
- ${tension > 7 ? 'Naznač nebezpečí' : tension > 4 ? 'Lehké napětí' : 'Klidná atmosféra'}
- Použij přítomný čas

Odpověz POUZE popisem scény:`;

  try {
    const description = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 250
    });
    return description;
  } catch (error) {
    console.error('[Narrative Engine] Error generating scene:', error);
    return `Nacházíš se v ${location.name || 'neznámé lokaci'}.`;
  }
}

/**
 * Generate ambient event
 * @param {Object} scene - Current scene
 * @param {Object} mystery - Current mystery
 * @returns {Promise<string>} Ambient event description
 */
export async function generateAmbientEvent(scene, mystery) {
  const prompt = `Vygeneruj ambient event pro Monster of the Week:

Scéna: ${scene.location?.name || 'neznámá lokace'}
Napětí: ${scene.tension}/10
Přítomní lovci: ${scene.huntersPresent.length}
Mystery: ${mystery.name}

Pravidla:
- 1-2 věty
- Subtilní detail nebo zvuk
- ${scene.tension > 7 ? 'Znepokojivé nebo děsivé' : scene.tension > 4 ? 'Lehce znepokojivé' : 'Atmosférické'}
- Nesmí to být přímá hrozba, jen atmosféra
- Používej smysly (zvuky, záblesky, pocity)

Odpověz POUZE popisem události:`;

  try {
    const event = await callAI(prompt, {
      temperature: 0.9,
      max_tokens: 150
    });
    return event;
  } catch (error) {
    console.error('[Narrative Engine] Error generating ambient event:', error);
    return null;
  }
}

/**
 * Generate GM response to player action (non-move)
 * @param {string} actionText - Player's action
 * @param {Object} context - Context including scene and mystery
 * @returns {Promise<string>} GM response
 */
export async function generateGMResponse(actionText, context) {
  const { scene, mystery } = context;

  const prompt = `Jako Keeper v Monster of the Week, reaguj na akci hráče: "${actionText}"

Kontext scény:
- Lokace: ${scene.location?.name || 'neznámá'}
- Napětí: ${scene.tension}/10
- Mystery: ${mystery?.name || 'neznámé'}

Pravidla:
- Buď stručný (1-3 věty)
- Show, don't tell
- Vytvářej napětí a zájem
- Pokud je akce nejasná, zeptej se "Co přesně děláš?" nebo "Jak to děláš?"
- Popisuj co se děje, ne co si hráč myslí
- Použij přítomný čas

Odpověz POUZE jako Keeper (bez dodatečných komentářů):`;

  try {
    const response = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 200
    });
    return response;
  } catch (error) {
    console.error('[Narrative Engine] Error generating GM response:', error);
    return 'Co děláš dál?';
  }
}

/**
 * Generate consequence narration
 * @param {Object} consequence - Consequence object
 * @param {Object} context - Context
 * @returns {Promise<string>} Consequence narrative
 */
export async function narrateConsequence(consequence, context) {
  let prompt = '';

  if (consequence.type === 'harm') {
    prompt = `Vypravěj důsledek v Monster of the Week:

${context.hunter} utrpěl ${consequence.amount} harm od ${consequence.source}.

Pravidla:
- 1-2 věty
- Popisuj bolest/zranění dramaticky
- Show, don't tell

Odpověz POUZE narativem:`;
  } else if (consequence.type === 'condition') {
    prompt = `Vypravěj důsledek v Monster of the Week:

${context.hunter} získává condition: ${consequence.condition}.

Pravidla:
- 1 věta
- Popisuj jak to ovlivňuje lovce

Odpověz POUZE narativem:`;
  }

  try {
    const narrative = await callAI(prompt, {
      temperature: 0.7,
      max_tokens: 150
    });
    return narrative;
  } catch (error) {
    console.error('[Narrative Engine] Error narrating consequence:', error);
    return consequence.type === 'harm'
      ? `${context.hunter} utrpěl ${consequence.amount} harm.`
      : `${context.hunter} je ${consequence.condition}.`;
  }
}

/**
 * Generate countdown progression narration
 * @param {Object} countdown - Countdown object
 * @param {number} newStep - New step reached
 * @returns {Promise<string>} Countdown narrative
 */
export async function narrateCountdown(countdown, newStep) {
  const prompt = `Vypravěj postup countdown v Monster of the Week:

Countdown: ${countdown.name}
Nový krok (${newStep}/6): ${countdown.steps[newStep] || 'neznámý'}

Pravidla:
- 2-3 věty
- Dramatické, eskalující napětí
- Show, don't tell (ukaž co se děje)
- ${newStep >= 5 ? 'Kritická situace!' : newStep >= 3 ? 'Věci se zhoršují' : 'Situace se vyvíjí'}

Odpověz POUZE narativem:`;

  try {
    const narrative = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 200
    });
    return narrative;
  } catch (error) {
    console.error('[Narrative Engine] Error narrating countdown:', error);
    return `${countdown.name}: ${countdown.steps[newStep]}`;
  }
}
