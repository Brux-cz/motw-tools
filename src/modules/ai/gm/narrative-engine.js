/**
 * Narrative Engine - Dynamic storytelling
 */
import { callAI } from '../client.js';
import { getMoveOutcomes } from './mechanics-engine.js';

/**
 * Build Keeper system prompt with mystery context
 * @param {string} mysteryContext - Formatted mystery context
 * @returns {string} System prompt
 */
function buildKeeperSystemPrompt(mysteryContext, storyState) {
  const storyPhaseHint = storyState ? `\nFÁZE PŘÍBĚHU: ${storyState.phase} (kolo ${storyState.round || '?'})
${storyState.phase === 'investigation' ? '- Lovci sbírají stopy. Naznačuj přítomnost příšery nepřímo.' : ''}
${storyState.phase === 'confrontation' ? '- Příšera je odhalena nebo aktivní. Eskaluj nebezpečí.' : ''}
${storyState.phase === 'resolution' ? '- Závěrečný boj nebo řešení. Směřuj k rozuzlení.' : ''}
${storyState.discoveredClues?.length ? `OBJEVENÉ STOPY: ${storyState.discoveredClues.join(', ')}` : ''}
${storyState.monsterRevealed ? 'PŘÍŠERA ODHALENA — může se přímo objevit.' : 'PŘÍŠERA DOSUD NEODHALENA — jen náznaky.'}
` : '';

  return `Jsi Keeper (vypravěč) ve hře Monster of the Week. Vedeš herní session.

${mysteryContext ? `TVOJE ZÁHADA:\n${mysteryContext}\n\n` : ''}${storyPhaseHint}PRAVIDLA KEEPERA:
- Popisuj POUZE co existuje v záhadě — NIKDY nevymýšlej nové postavy, bytosti, artefakty nebo lokace
- Používej POUZE NPC jmenované v záhadě — žádné vymyšlené svědky, příbuzné, oběti
- PŘÍŠERA musí být přítomna v příběhu — i když jen nepřímo (stopy, důsledky, náznaky)
- Show, don't tell — popisuj co lovci vidí, slyší, cítí
- Buď stručný: 1-3 věty
- Piš česky, používej přítomný čas
- Pokud hráč dělá akci vyžadující hod, napiš co se stane ALE nehoď za něj
- Drž se stavu scény — co bylo popsáno dříve platí i nadále
- NPC reagují podle svých motivací, ne náhodně
- NEPIŠ dialogy NPC — na to je NPC engine. Piš pouze akce Keepera.
- Po 2-3 kolech vyšetřování na jednom místě POSUŇ PŘÍBĚH — naznač nové místo, hrozbu, nebo událost`;
}

/**
 * Build messages array with conversation history context
 * @param {string} recentHistory - Formatted history string
 * @param {string} userMessage - Current user message
 * @returns {Array} Messages array for API
 */
function buildMessagesWithHistory(recentHistory, userMessage) {
  const messages = [];
  if (recentHistory) {
    messages.push({ role: 'user', content: `Dosavadní průběh session:\n${recentHistory}` });
    messages.push({ role: 'assistant', content: 'Rozumím kontextu. Pokračuji jako Keeper.' });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/**
 * Narrate action result
 * @param {Object} parsedAction - Parsed player action
 * @param {Object} result - Move resolution result
 * @param {Object} context - Mystery/history context
 * @returns {Promise<string>} Narrative description
 */
export async function narrateAction(parsedAction, result, context = {}) {
  const moveOutcomes = getMoveOutcomes(result.move);
  const outcomeDesc = moveOutcomes[result.outcome];

  const systemPrompt = context.mysteryContext
    ? buildKeeperSystemPrompt(context.mysteryContext, context.storyState)
    : undefined;

  let outcomeInstruction;
  if (result.outcome === 'success') {
    outcomeInstruction = 'Zdůrazni úspěch a kontrolu hráče nad situací.';
  } else if (result.outcome === 'partial') {
    outcomeInstruction = `Hráč ČÁSTEČNĚ uspěje — ale s KONKRÉTNÍ cenou nebo komplikací.
Pravidla pro tento tah: ${outcomeDesc}
MUSÍŠ popsat jednu z těchto komplikací: ztráta času, prozrazení pozice, ztráta předmětu, zranění, horší výsledek, obtížná volba.
NEPIŠ jen "napětí roste" — popiš konkrétní důsledek, který hráče stojí něco hmatatelného.`;
  } else {
    outcomeInstruction = `SELHÁNÍ — Strážce provádí TVRDÝ TAH.
Vyber a proveď JEDEN tvrdý tah: způsob zranění (X harm), rozděl lovce od skupiny, odeber vybavení/zbraň, obrať jejich akci proti nim, prozraď informaci nepříteli, nebo použij schopnost příšery.
Popiš KONKRÉTNÍ důsledek — NE atmosféru. Hráč musí pocítit mechanický dopad selhání.
Dostupné tvrdé tahy Strážce:
- Způsob zranění podle pravidel
- Rozděl lovce
- Obrať tah proti nim
- Uzmi jim vybavení
- Způsob potíže (ztráta času, prozrazení)
- Použij tah hrozby (schopnost příšery)`;
  }

  const userMessage = `Vypravěj výsledek akce v Monster of the Week:

Akce hráče: ${parsedAction.raw}
Hod: ${result.roll.die1} + ${result.roll.die2} + ${result.statValue} (${result.stat}) = ${result.total}
Výsledek: ${result.outcome} (${outcomeDesc})

Pravidla:
- 2-3 věty
- Show, don't tell (ukaž akci, nesumařizuj)
- Dramatické, napínavé vyprávění
- ${outcomeInstruction}
- Použij přítomný čas

Odpověz POUZE narativem (bez dodatečných komentářů):`;

  const messages = buildMessagesWithHistory(context.recentHistory, userMessage);

  try {
    const narrative = await callAI('', {
      systemPrompt,
      messages,
      temperature: 0.8,
      max_tokens: 250
    });
    return narrative;
  } catch (error) {
    console.error('[Narrative Engine] Error narrating action:', error);
    return `${result.hunter} ${result.outcome === 'success' ? 'uspěje' : result.outcome === 'partial' ? 'částečně uspěje' : 'selže'} v akci.`;
  }
}

/**
 * Generate scene description
 * @param {Object} location - Location object
 * @param {string} atmosphere - Atmosphere/mood
 * @param {number} tension - Tension level (0-10)
 * @param {Object} context - Mystery/history context
 * @returns {Promise<string>} Scene description
 */
export async function generateSceneDescription(location, atmosphere = 'neutrální', tension = 5, context = {}) {
  const systemPrompt = context.mysteryContext
    ? buildKeeperSystemPrompt(context.mysteryContext, context.storyState)
    : undefined;

  const userMessage = `Popiš úvodní scénu v Monster of the Week:

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
- Popiš lokaci z mystery, zmíň přítomné NPC pokud je to vhodné

Odpověz POUZE popisem scény:`;

  try {
    const description = await callAI('', {
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
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
 * @param {Object} context - Mystery context
 * @returns {Promise<string>} Ambient event description
 */
export async function generateAmbientEvent(scene, mystery, context = {}) {
  const systemPrompt = context.mysteryContext
    ? buildKeeperSystemPrompt(context.mysteryContext, context.storyState)
    : undefined;

  const userMessage = `Vygeneruj ambient event pro Monster of the Week:

Scéna: ${scene.location?.name || 'neznámá lokace'}
Napětí: ${scene.tension}/10
Přítomní lovci: ${scene.huntersPresent.length}

Pravidla:
- 1-2 věty
- Subtilní detail nebo zvuk
- ${scene.tension > 7 ? 'Znepokojivé nebo děsivé' : scene.tension > 4 ? 'Lehce znepokojivé' : 'Atmosférické'}
- Nesmí to být přímá hrozba, jen atmosféra
- Používej smysly (zvuky, záblesky, pocity)
- Ambient event MUSÍ souviset s mystery — naznač přítomnost příšery, odkaž na countdown, nebo popiš reakci NPC. NEVYMÝŠLEJ nové elementy.
- NIKDY neopakuj předchozí ambient eventy — použij JINÝ smysl, JINÉ místo, JINOU postavu
- Střídej: zvuky, vizuální vjemy, pachy, pocity, pohyby NPC, změny počasí, reakce okolí

Odpověz POUZE popisem události:`;

  const messages = buildMessagesWithHistory(context.recentHistory, userMessage);

  try {
    const event = await callAI('', {
      systemPrompt,
      messages,
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
  const { scene, mysteryContext, recentHistory, hunterName } = context;

  const systemPrompt = buildKeeperSystemPrompt(mysteryContext || '', context.storyState);

  const userMessage = `Aktuální scéna: ${scene.location?.name || 'neznámá'}, napětí ${scene.tension}/10

${hunterName || 'Hráč'}: ${actionText}

Reaguj jako Keeper (1-3 věty):`;

  const messages = buildMessagesWithHistory(recentHistory, userMessage);

  try {
    const response = await callAI('', {
      systemPrompt,
      messages,
      temperature: 0.8,
      max_tokens: 250
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
export async function narrateCountdown(countdown, newPhase) {
  const phaseDesc = countdown.phases?.[newPhase]?.description || 'neznámý';

  const prompt = `Vypravěj postup countdown v Monster of the Week:

Countdown: ${countdown.name}
Nový krok (${newPhase}/6): ${phaseDesc}

Pravidla:
- 2-3 věty
- Dramatické, eskalující napětí
- Show, don't tell (ukaž co se děje)
- ${newPhase >= 5 ? 'Kritická situace!' : newPhase >= 3 ? 'Věci se zhoršují' : 'Situace se vyvíjí'}

Odpověz POUZE narativem:`;

  try {
    const narrative = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 200
    });
    return narrative;
  } catch (error) {
    console.error('[Narrative Engine] Error narrating countdown:', error);
    return `${countdown.name}: ${phaseDesc}`;
  }
}
