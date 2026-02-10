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
 * Generate teaser scene — non-interactive cold open where monster attacks a bystander
 * Hunters are NOT present
 * @param {Object} monster - Monster object from mystery
 * @param {Array} bystanders - Bystanders from mystery
 * @param {string} mysteryContext - Formatted mystery context
 * @returns {Promise<string>} Teaser scene text
 */
export async function generateTeaserScene(monster, bystanders, mysteryContext) {
  const victim = bystanders?.length
    ? bystanders[Math.floor(Math.random() * bystanders.length)]
    : { name: 'neznámá oběť' };

  const userMessage = `Napiš TEASER — krátkou úvodní scénu kde příšera útočí na přihlížejícího.

PŘÍŠERA: ${monster?.name || 'Neznámá'} (${monster?.type || 'neznámý typ'})
${monster?.powers?.length ? `Schopnosti: ${monster.powers.join(', ')}` : ''}
OBĚŤ: ${victim.name} (${victim.description || victim.motivation || 'místní obyvatel'})

Pravidla:
- 3-5 vět, cinematický styl
- Lovci NEJSOU přítomni — toto se děje PŘED jejich příjezdem
- Ukaž schopnosti příšery v akci
- Piš česky, přítomný čas
- Show, don't tell — popisuj co se děje, ne co příšera "umí"
- Atmosféra hororu — tma, strach, bezmoc oběti
- Konči dramaticky — osud oběti zůstává otevřený

Odpověz POUZE narativem:`;

  try {
    return await callAI('', {
      systemPrompt: `Jsi vypravěč hororu. Píšeš úvodní teaser pro epizodu Monster of the Week.\n\n${mysteryContext || ''}`,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.85,
      max_tokens: 300
    });
  } catch (error) {
    console.error('[Narrative Engine] Error generating teaser:', error);
    return `Tma pohlcuje ${victim.name}. Něco se hýbe ve stínech — něco, co nemá jméno. Křik protíná noční ticho a pak... ticho.`;
  }
}

/**
 * Generate hook delivery — how hunters learn about the case
 * @param {string} hook - Mystery hook text
 * @param {Array} hunters - Hunter objects
 * @param {Array} locations - All available locations
 * @param {string} mysteryContext - Full mystery context for AI
 * @returns {Promise<string>} Hook delivery text
 */
export async function generateHookDelivery(hook, hunters, locations, mysteryContext) {
  const hunterNames = hunters?.map(h => h.name).join(', ') || 'Lovci';
  const locationList = Array.isArray(locations)
    ? locations.map(l => l.name).join(', ')
    : locations?.name || 'malé městečko';

  const userMessage = `Napiš krátkou scénu kde se lovci dozví o záhadném případu a přijedou na místo.

NÁVNADA: ${hook || 'Záhadné zmizení'}
LOVCI: ${hunterNames}
DOSTUPNÉ LOKACE: ${locationList}

Pravidla:
- 2-4 věty
- Jak se lovci dozvěděli o případu (zpráva, telefonát, novinový článek, kontakt)
- Krátký popis příjezdu na první lokaci
- Klidný tón — lovci zatím netuší co je čeká
- Piš česky, přítomný čas

Odpověz POUZE narativem:`;

  try {
    return await callAI('', {
      systemPrompt: `Jsi vypravěč Monster of the Week. Píšeš přechod mezi teaserem a hlavní hrou.\n\n${mysteryContext || ''}`,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.8,
      max_tokens: 200
    });
  } catch (error) {
    console.error('[Narrative Engine] Error generating hook:', error);
    return `Lovci se dozví o záhadném případu: ${hook || 'něco podivného se děje'}. Vydávají se na místo.`;
  }
}

/**
 * Generate combined opening scene for teaser types 2-4
 * Types 2-4 merge teaser+hook into a single scene where hunters are present from the start
 * @param {string} teaserType - 'hook_in_action' | 'hook_debate' | 'at_crime_scene'
 * @param {Object} params - { hook, hunters, location, monster, bystanders, mysteryContext }
 * @returns {Promise<string>} Opening scene text
 */
export async function generateCombinedOpeningScene(teaserType, { hook, hunters, location, locations, monster, bystanders, mysteryContext }) {
  const hunterNames = hunters?.map(h => h.name).join(', ') || 'Lovci';
  const locationName = location?.name || 'neznámé místo';
  const allLocationNames = (locations || [location]).filter(Boolean).map(l => l.name).join(', ');

  const typeInstructions = {
    hook_in_action: `Lovci právě dostali informaci o případu a HNED jednají — žádné čekání, žádná debata.
Napiš jak se dozvěděli o případu (telefonát, zpráva, kontakt) a co okamžitě dělají.
Atmosféra: naléhavost, akce, rychlé rozhodování.
Konči otázkou: "Co uděláte?" nebo podobnou výzvou.`,

    hook_debate: `Lovci sedí spolu na klidném místě (bar, auto, motel, dílna) a diskutují o případu.
Mají stopy, zprávy nebo kontakty — rozebírají co vědí a plánují postup.
Atmosféra: klidná ale napjatá, předtucha, lovci se chystají.
Popiš kde sedí, co mají před sebou (noviny, telefon, poznámky), co říkají.`,

    at_crime_scene: `Lovci JSOU JIŽ NA MÍSTĚ ČINU. Vyšetřování začíná okamžitě.
Popiš místo činu — stopy, důkazy, nepořádek, svědci poblíž.
Naznač přítomnost příšery nepřímo (stopy, zápach, poškození, pocity).
Atmosféra: znepokojení, napětí, něco tu není v pořádku.`
  };

  const instruction = typeInstructions[teaserType] || typeInstructions.at_crime_scene;

  const userMessage = `Napiš ÚVODNÍ SCÉNU pro Monster of the Week session.

NÁVNADA: ${hook || 'Záhadné zmizení'}
LOVCI: ${hunterNames}
LOKACE: ${locationName}${location?.description ? ` — ${location.description}` : ''}
DOSTUPNÉ LOKACE: ${allLocationNames}
${monster ? `PŘÍŠERA: ${monster.name || 'Neznámá'} (${monster.type || 'neznámý typ'})` : ''}
${bystanders?.length ? `NPC: ${bystanders.map(b => `${b.name} (${b.description || b.type || 'místní'})`).join(', ')}` : ''}

STYL SCÉNY:
${instruction}

Pravidla:
- 4-6 vět, cinematický styl
- Piš česky, přítomný čas
- Show, don't tell — popisuj co lovci vidí, slyší, cítí
- Používej POUZE postavy a lokace ze záhady

Odpověz POUZE narativem:`;

  const fallbacks = {
    hook_in_action: `Telefon zazvoní uprostřed noci. ${hunterNames} se dozvídají o záhadném případu: ${hook || 'něco podivného se děje'}. Není čas otálet — berou výbavu a vyrážejí.`,
    hook_debate: `${hunterNames} sedí u stolu, mezi sebou rozložené poznámky a fotografie. ${hook || 'Záhadný případ'} — to je důvod proč jsou tady. Plánují další krok.`,
    at_crime_scene: `${hunterNames} stojí na místě činu. ${locationName} vypadá jinak než obvykle — něco tu není v pořádku. Stopy vedou do tmy.`
  };

  try {
    return await callAI('', {
      systemPrompt: `Jsi Keeper (vypravěč) ve hře Monster of the Week. Píšeš úvodní scénu session.\n\n${mysteryContext || ''}`,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.85,
      max_tokens: 400
    });
  } catch (error) {
    console.error('[Narrative Engine] Error generating combined opening scene:', error);
    return fallbacks[teaserType] || fallbacks.at_crime_scene;
  }
}

/**
 * Generate scene transition narrative when hunters move between locations
 * @param {Object|null} fromLocation - Previous location (or null)
 * @param {Object} toLocation - Target location
 * @param {Object} context - AI context (mysteryContext, recentHistory, storyState)
 * @returns {Promise<string>} Transition narrative
 */
export async function generateSceneTransition(fromLocation, toLocation, context = {}) {
  const systemPrompt = context.mysteryContext
    ? buildKeeperSystemPrompt(context.mysteryContext, context.storyState)
    : undefined;

  const fromName = fromLocation?.name || 'předchozí místo';
  const toName = toLocation?.name || 'nové místo';

  const userMessage = `Lovci se přesunují z lokace "${fromName}" do lokace "${toName}".
${toLocation?.description ? `Popis cíle: ${toLocation.description}` : ''}

Napiš krátký popis přesunu a příjezdu na nové místo.

Pravidla:
- 1-3 věty
- Popiš cestu a první dojem z nového místa
- Použij smysly (co vidí, slyší, cítí)
- Piš česky, přítomný čas
- Naznač atmosféru nového místa

Odpověz POUZE narativem:`;

  const messages = buildMessagesWithHistory(context.recentHistory, userMessage);

  try {
    return await callAI('', {
      systemPrompt,
      messages,
      temperature: 0.8,
      max_tokens: 200
    });
  } catch (error) {
    console.error('[Narrative Engine] Error generating scene transition:', error);
    return `Lovci opouštějí ${fromName} a míří do ${toName}.`;
  }
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
    outcomeInstruction = `Hráč ČÁSTEČNĚ uspěje — komplikace vychází PŘESNĚ z pravidel tohoto tahu.
Pravidla pro tento tah na 7-9: ${outcomeDesc}
POUŽIJ PŘESNĚ komplikaci z pravidel tahu — NE vlastní kreativní trest.
Příklady: u Kick Some Ass 7-9 = obě strany si udělí harm. U Investigate 7-9 = méně otázek. U Act Under Pressure 7-9 = horší výsledek nebo cena.
NEPIŠ komplikace které pravidla tahu neuvádějí.`;
  } else {
    outcomeInstruction = `SELHÁNÍ — Strážce dělá MĚKKÝ TAH (setup, varování).
Popiš náznaky nebezpečí — zvuky, pohyby, stíny, reakce prostředí.
NEZPŮSOBUJ okamžité důsledky (žádný harm, žádná ztráta vybavení, žádné zranění).
Telegrafuj co se CHYSTÁ stát, ale NEDĚLEJ to ještě.
Konči VŽDY otázkou: "Co uděláš?" nebo podobnou výzvou k reakci.
NIKDY nedávej finální důsledek — hráč MUSÍ dostat šanci reagovat.`;
  }

  // Special instructions for investigate move — AI must include answers to questions
  let investigateInstruction = '';
  if (result.move === 'investigate' && result.outcome !== 'failure') {
    const numQuestions = result.outcome === 'success' ? 2 : 1;
    investigateInstruction = `
VYŠETŘOVÁNÍ: Lovec položil otázky — MUSÍŠ zahrnout odpovědi na ${numQuestions} otázk${numQuestions > 1 ? 'y' : 'u'} ze seznamu:
(Co se tu stalo? Co to znamená? Kam to vede? Co tu není vidět? Kdo za tím stojí?)
Odpovědi MUSÍ vycházet z mystery kontextu — odhal relevantní stopy a vodítka.`;
  }

  const userMessage = `Vypravěj výsledek akce v Monster of the Week:

Akce hráče: ${parsedAction.raw}
Hod: ${result.roll.die1} + ${result.roll.die2} + ${result.statValue} (${result.stat}) = ${result.total}
Výsledek: ${result.outcome} (${outcomeDesc})${investigateInstruction}

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
 * Narrate a hard move (golden opportunity) after player ignored a soft move setup
 * @param {Object} pendingSetup - The pending soft move setup
 * @param {string} playerAction - What the player did instead of addressing the setup
 * @param {Object} context - Mystery/history context
 * @returns {Promise<string>} Hard move narrative
 */
export async function narrateHardMove(pendingSetup, playerAction, context = {}) {
  const systemPrompt = context.mysteryContext
    ? buildKeeperSystemPrompt(context.mysteryContext, context.storyState)
    : undefined;

  const userMessage = `Hráč IGNOROVAL varování. TEPRVE TEĎ proveď TVRDÝ TAH (zlatá příležitost).

Předchozí varování (měkký tah): ${pendingSetup.softMove}
Co hráč udělal místo reakce: ${playerAction}

Vyber a proveď JEDEN tvrdý tah Strážce:
- Způsob zranění (X harm) podle pravidel
- Rozděl lovce od skupiny
- Obrať tah/situaci proti nim
- Uzmi jim vybavení nebo zbraň
- Způsob potíže (ztráta času, prozrazení pozice)
- Použij tah hrozby (schopnost příšery)

Pravidla:
- Důsledek MUSÍ navazovat na předchozí varování — co bylo naznačeno, to se teď stane
- 2-3 věty, konkrétní mechanický dopad
- Show, don't tell
- Použij přítomný čas
- Konči krátce — žádné "Co uděláš?" (důsledek už nastal)

Odpověz POUZE narativem:`;

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
    console.error('[Narrative Engine] Error narrating hard move:', error);
    return 'Varování se naplnilo — situace se dramaticky zhoršuje.';
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
- ${tension <= 2 ? 'Klidná, pokojná atmosféra. Běžný den, žádné napětí ani náznaky nebezpečí.' : tension <= 4 ? 'Klidná atmosféra' : tension <= 7 ? 'Lehké napětí' : 'Naznač nebezpečí'}
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
 * Uses tool_use to allow AI to create locations/NPCs/move hunters
 * @param {string} actionText - Player's action
 * @param {Object} context - Context including scene and mystery
 * @returns {Promise<{text: string, toolCalls: Array}>} GM response with optional tool calls
 */
export async function generateGMResponse(actionText, context) {
  const { scene, mysteryContext, recentHistory, hunterName } = context;

  const baseSystemPrompt = buildKeeperSystemPrompt(mysteryContext || '', context.storyState);
  const toolSystemPrompt = `${baseSystemPrompt}

NÁSTROJE:
Pokud příběh vyžaduje novou lokaci, novou postavu, nebo přesun lovců — POUŽIJ k tomu nástroje.
NEVYMÝŠLEJ nové entity do textu — místo toho zavolej příslušný nástroj.
Nástroje používej jen když je to pro příběh nezbytné, ne při každé odpovědi.`;

  const userMessage = `Aktuální scéna: ${scene.location?.name || 'neznámá'}, napětí ${scene.tension}/10

${hunterName || 'Hráč'}: ${actionText}

Reaguj jako Keeper (1-3 věty):`;

  const messages = buildMessagesWithHistory(recentHistory, userMessage);

  try {
    const { callAIWithTools } = await import('../client.js');
    const { GM_TOOLS } = await import('./gm-tools.js');

    const result = await callAIWithTools('', GM_TOOLS, {
      systemPrompt: toolSystemPrompt,
      messages,
      temperature: 0.8,
      max_tokens: 350
    });

    return result;
  } catch (error) {
    console.error('[Narrative Engine] Error generating GM response:', error);
    return { text: 'Co děláš dál?', toolCalls: [] };
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
  } else if (consequence.type === 'monster_immortal') {
    prompt = `Vypravěj důsledek v Monster of the Week:

${context.hunter} zasáhl příšeru${consequence.monster ? ` (${consequence.monster})` : ''} a ta dosáhla maxima zranění BEZ slabiny.
Příšera NEMŮŽE zemřít. Najde způsob JAK UNIKNOUT — promění se v mlhu, propadne podlahou, zmizí ve stínech, teleportuje se, zhroutí se a pak zmizí, nebo se stáhne do tmy.
NEZEMŘE. NEREGENERUJE SE na místě. Uteče a vrátí se silnější.

Pravidla:
- 2-3 věty
- Ukaž dramatický ÚTĚK příšery (ne regeneraci)
- Naznač že se vrátí — a bude to horší
- Naznač že lovci potřebují najít slabinu
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
 * Narrate monster's reaction to taking harm (harm move)
 * @param {number} harmDealt - Harm dealt this hit
 * @param {number} totalHarm - Monster's total accumulated harm
 * @param {number} maxHarm - Monster's max harm capacity
 * @param {string} monsterName - Monster name
 * @param {Object} context - AI context (mysteryContext, recentHistory, storyState)
 * @returns {Promise<string>} Monster harm reaction narrative
 */
export async function narrateMonsterHarmMove(harmDealt, totalHarm, maxHarm, monsterName, context = {}) {
  const harmRatio = totalHarm / maxHarm;

  let reactionHint;
  if (harmRatio < 0.3) {
    reactionHint = 'Příšera ucukne, ale pokračuje — lehká bolest, spíš naštvaná než zraněná.';
  } else if (harmRatio < 0.6) {
    reactionHint = 'Příšera klopýtne, zavrčí bolestí — viditelné poškození, ale stále nebezpečná.';
  } else if (harmRatio < 0.9) {
    reactionHint = 'Příšera se zapotácí, krev/ichor teče — vážné zranění, zpomalení, ale zuřivost roste.';
  } else {
    reactionHint = 'Příšera padá, ale ještě žije — téměř poražena, poslední záchvěvy odporu.';
  }

  const prompt = `Popiš reakci příšery na zranění v Monster of the Week:

PŘÍŠERA: ${monsterName}
ZRANĚNÍ: ${harmDealt} harm (celkem ${totalHarm}/${maxHarm})
STAV: ${reactionHint}

Pravidla:
- 1-2 věty
- Show, don't tell — ukaž fyzickou reakci příšery
- Popisuj bolest, pohyb, zvuky příšery
- Piš česky, přítomný čas

Odpověz POUZE narativem:`;

  try {
    return await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 150
    });
  } catch (error) {
    console.error('[Narrative Engine] Error narrating monster harm move:', error);
    // Fallback based on harmRatio
    if (harmRatio < 0.3) return `${monsterName} ucukne, ale vzápětí se narovná — rána ji spíš rozzuřila.`;
    if (harmRatio < 0.6) return `${monsterName} zavrčí bolestí a klopýtne. Z rány teče tmavá tekutina.`;
    if (harmRatio < 0.9) return `${monsterName} se zapotácí pod tíhou ran. Je vážně zraněná, ale stále nebezpečná.`;
    return `${monsterName} padá na kolena. Ještě žije, ale sotva se drží.`;
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
