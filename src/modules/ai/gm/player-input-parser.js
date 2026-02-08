/**
 * Player Input Parser
 * Parses player actions and detects MOTW moves
 */

const MOVE_PATTERNS = {
  'kick_some_ass': [
    /útočím/i, /zaútočím/i, /úder/i, /boj/i, /bojuj/i, /fight/i, /attack/i, /hit/i, /strike/i,
    /střel/i, /kopn/i, /prašt/i, /sekn/i, /bodn/i, /mlát/i, /udeř/i,
    /skočím na/i, /vrhnu se/i, /napadnu/i, /praštím/i
  ],
  'act_under_pressure': [
    /rychle/i, /pod tlakem/i, /snažím se/i, /zkouším/i, /under pressure/i, /try to/i,
    /utíkám/i, /uhýbám/i, /schovám/i, /vyhnout/i, /uniknout/i, /schovat/i,
    /tasím/i, /připravím se/i, /dávám pozor/i
  ],
  'investigate': [
    /zkoumám/i, /hledám/i, /investigate/i, /examine/i, /search/i, /look for/i, /inspect/i,
    /prohled/i, /kouknu/i, /podívám/i, /prozkoum/i, /pátrat/i, /stopa/i,
    /mrknu/i, /ověřím/i, /zjistím/i,
    /informac/i, /víš něco/i, /co víš/i, /ptám se/i, /zeptám se/i, /řekni mi/i,
    /pověz/i, /výslech/i, /vyzvíd/i
  ],
  'manipulate': [
    /přesvědčuji/i, /manipuluj/i, /lžu/i, /convince/i, /lie/i, /persuade/i, /deceive/i,
    /přesvědčím/i, /přemluv/i, /vyhrožuj/i, /zastrašuj/i, /obelh/i,
    /potřebuju.*aby/i, /přesvědč/i, /řeknu.*že/i
  ],
  'help_out': [
    /pomáhám/i, /help/i, /assist/i, /support/i,
    /pomůžu/i, /pomož/i, /podpořím/i
  ],
  'protect': [
    /chráním/i, /protect/i, /shield/i, /defend/i, /guard/i,
    /bráním/i, /zakryju/i, /ochrán/i, /stoupnu si před/i
  ],
  'use_magic': [
    /kouzlo/i, /magie/i, /magic/i, /spell/i, /ritual/i, /enchant/i,
    /čaruj/i, /zaklínadlo/i, /sesílám/i
  ],
  'read_bad_situation': [
    /co se děje/i, /situace/i, /read situation/i, /what's happening/i, /assess/i,
    /rozhlédnu/i, /rozhlížím/i, /co je tady/i, /co vidím/i, /orientuju/i,
    /zaměřím/i, /soustředím/i, /vnímám/i, /analyzuj/i, /odhaduj/i
  ]
};

/**
 * Parse player action text
 * @param {string} text - Player's action text
 * @returns {Object} Parsed action object
 */
export function parsePlayerAction(text) {
  const action = {
    raw: text,
    intent: null,
    move: null,
    target: null,
    method: null,
    parameters: {}
  };

  // Detect move
  for (const [moveName, patterns] of Object.entries(MOVE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(text))) {
      action.move = moveName;
      action.intent = moveName;
      break;
    }
  }

  // Extract target (after prepositions)
  const targetMatch = text.match(/(?:na|proti|do|at|on|against)\s+([a-záčďéěíňóřšťúůýž\s]+)/i);
  if (targetMatch) {
    action.target = targetMatch[1].trim();
  }

  // Extract method/weapon
  const methodMatch = text.match(/(?:pomocí|s|with|using)\s+([a-záčďéěíňóřšťúůýž\s]+)/i);
  if (methodMatch) {
    action.method = methodMatch[1].trim();
  }

  return action;
}

/**
 * Determine stat to use for move
 * @param {string} move - Move name
 * @returns {string|null} Stat name or null
 */
export function getStatForMove(move) {
  const statMap = {
    'kick_some_ass': 'tough',
    'act_under_pressure': 'cool',
    'investigate': 'sharp',
    'manipulate': 'charm',
    'help_out': null, // depends on how
    'protect': 'tough',
    'use_magic': 'weird',
    'read_bad_situation': 'sharp'
  };
  return statMap[move] || null;
}

/**
 * Get move description
 * @param {string} move - Move name
 * @returns {string} Move description
 */
export function getMoveDescription(move) {
  const descriptions = {
    'kick_some_ass': 'Attack a monster or person',
    'act_under_pressure': 'Act quickly or under stress',
    'investigate': 'Look for clues and information',
    'manipulate': 'Convince or deceive someone',
    'help_out': 'Help another hunter',
    'protect': 'Defend someone from danger',
    'use_magic': 'Cast a spell or ritual',
    'read_bad_situation': 'Assess a dangerous situation'
  };
  return descriptions[move] || 'Unknown move';
}

/**
 * Get Czech display name for a move
 * @param {string} move - Internal move name
 * @returns {string} Czech move name
 */
export function getMoveNameCz(move) {
  const names = {
    'kick_some_ass': 'Dej přes hubu',
    'act_under_pressure': 'Jednej pod tlakem',
    'investigate': 'Vyšetřuj záhadu',
    'manipulate': 'Zmanipuluj někoho',
    'help_out': 'Někomu pomoz',
    'protect': 'Ochraň někoho',
    'use_magic': 'Užij magii',
    'read_bad_situation': 'Zhodnoť situaci'
  };
  return names[move] || move;
}
