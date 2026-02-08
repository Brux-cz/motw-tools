/**
 * Player Agent - AI-controlled hunter actions
 * Generates in-character actions for hunters using Haiku model
 */
import { callAI } from '../client.js';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Playbook personality definitions
 */
const PLAYBOOK_PERSONALITIES = {
  'chosen': {
    trait: 'odvážný vůdce, sebejistý, cítí tíhu osudu',
    style: 'Jdeš do toho jako první. Máš pocit, že jsi k tomu předurčen. Jsi odvážný ale ne bezohledný.'
  },
  'crooked': {
    trait: 'mazaný podvodník, pragmatik, vždy hledá únik',
    style: 'Hledáš výhodu, zkratku, způsob jak to obejít. Důvěřuješ jen sobě. Máš kontakty na temných místech.'
  },
  'divine': {
    trait: 'posel vyšší moci, oddaný své misi, vnitřní konflikt',
    style: 'Jednáš ve jménu své vyšší moci. Jsi rozpolcený mezi povinností a lidskostí.'
  },
  'expert': {
    trait: 'analytik, encyklopedie, preferuje plán před akcí',
    style: 'Zkoumáš, analyzuješ, hledáš slabiny. Než zaútočíš, chceš vědět na co. Citíš se lépe v knihovně než v boji.'
  },
  'flake': {
    trait: 'konspirační teoretik, nekonvenční, intuitivní',
    style: 'Vidíš souvislosti, které ostatní nevidí. Tvoje metody jsou podivné ale fungují. Důvěřuješ svým pocitům.'
  },
  'initiate': {
    trait: 'člen tajné organizace, disciplinovaný, znalý rituálů',
    style: 'Máš trénink a znalosti své organizace. Dodržuješ protokoly. Používáš rituály a zaklínadla.'
  },
  'monstrous': {
    trait: 'napůl monstrum, bojuje se svou temnou stránkou',
    style: 'Jsi nebezpečný i pro své přátele. Bojuješ se svou temnou stránkou. Tvá monstrozní síla je dar i prokletí.'
  },
  'mundane': {
    trait: 'srdce týmu, normální člověk mezi lovci, morální kompas',
    style: 'Jsi obyčejný člověk v neobyčejném světě. Držíš tým pohromadě. Staráš se o ostatní. Jsi odvážný navzdory strachu.'
  },
  'professional': {
    trait: 'taktik, profesionální lovec, efektivní a přesný',
    style: 'Jednáš profesionálně a efektivně. Máš vybavení a plán. Žádné emoce, jen výsledky.'
  },
  'spell-slinger': {
    trait: 'čaroděj, mocný ale riskantní, magie má svou cenu',
    style: 'Magie je tvůj nástroj. Víš, že každé kouzlo má cenu. Balancuješ mezi mocí a kontrolou.'
  },
  'spooky': {
    trait: 'temné síly, nespolehlivá moc, děsivý i pro přátele',
    style: 'Tvá moc je temná a nespolehlivá. Děsíš i své přátele. Snažíš se kontrolovat to, co v tobě je.'
  },
  'wronged': {
    trait: 'poháněný pomstou, odhodlaný, nic ho nezastaví',
    style: 'Ztratil jsi něco důležitého. Teď hledáš pomstu. Jsi odhodlaný a tvrdý, ale bolest tě žene vpřed.'
  }
};

/**
 * Default personality for unknown playbooks
 */
const DEFAULT_PERSONALITY = {
  trait: 'odvážný lovec nadpřirozena',
  style: 'Jsi lovec monster. Jednáš odvážně a rozhodně.'
};

/**
 * Generate an action for a hunter
 * @param {Object} hunter - Hunter object from campaign
 * @param {Object} context - Game context
 * @param {string} context.mysteryContext - Formatted mystery context
 * @param {string} context.recentHistory - Recent session events
 * @param {Array} context.otherHunterActions - Actions of other hunters this round
 * @param {Object} context.scene - Current scene state
 * @returns {Promise<string>} Action text in Czech, 1st person
 */
export async function generateAction(hunter, context) {
  const playbook = (hunter.playbook || '').toLowerCase();
  const personality = PLAYBOOK_PERSONALITIES[playbook] || DEFAULT_PERSONALITY;

  const harmInfo = hunter.harm ? `Máš ${hunter.harm}/7 zranění.` : '';
  const conditionsInfo = hunter.conditions?.length
    ? `Tvé stavy: ${hunter.conditions.join(', ')}.`
    : '';

  const otherActions = context.otherHunterActions?.length
    ? `Akce ostatních lovců tento round:\n${context.otherHunterActions.map(a => `- ${a.hunter}: ${a.action}`).join('\n')}`
    : '';

  const contextLines = [harmInfo, conditionsInfo].filter(Boolean).join('\n');

  const systemPrompt = `Jsi ${hunter.name}, lovec v Monster of the Week (playbook: ${hunter.playbook || 'neznámý'}).
Osobnost: ${personality.trait}
Styl hraní: ${personality.style}
${contextLines ? `\n${contextLines}\n` : ''}
PRAVIDLA:
- Piš ČESKY, v 1. osobě ("Tasím zbraň a...", "Rozhlížím se po...")
- PŘESNĚ 1-2 krátké věty (max 30 slov celkem!)
- Popiš POUZE svou akci — NE výsledek, NE co se stane
- Buď konkrétní: co děláš, jak, s čím
- Reaguj na poslední události a akce ostatních lovců
- Jednej v charakteru svého playbooku
- NIKDY nepopisuj výsledek ("podaří se mi", "zjistím že", "monster padne")
- Pokud máš zranění 5+, jednej opatrněji
- NESUMAŘIZUJ situaci — rovnou jednej
${context.storyPhase === 'teaser' ? '- Jsi v ÚVODNÍ FÁZI — rozhlížej se, mluv s místními, objednávej si pivo. NEÚTOK, NEVYŠETŘUJ agresivně.' : ''}${context.storyPhase === 'investigation' ? '- VYŠETŘUJEŠ — ptej se lidí, hledej stopy, prozkoumávej místa. Bojuj jen v sebeobraně.' : ''}${context.storyPhase === 'confrontation' ? '- KONFRONTACE — příšera je aktivní. Bojuj, braň se, chraň ostatní.' : ''}`;

  const userMessage = `${context.mysteryContext ? `ZÁHADA:\n${context.mysteryContext}\n\n` : ''}${context.recentHistory ? `POSLEDNÍ UDÁLOSTI:\n${context.recentHistory}\n\n` : ''}${otherActions ? `${otherActions}\n\n` : ''}Co děláš?`;

  try {
    const action = await callAI('', {
      model: HAIKU_MODEL,
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.8,
      max_tokens: 200
    });
    return action.trim();
  } catch (error) {
    console.error(`[Player Agent] Error generating action for ${hunter.name}:`, error);
    throw error;
  }
}

/**
 * Check if monster is defeated using AI analysis
 * @param {string} recentHistory - Recent session log entries
 * @returns {Promise<boolean>} True if monster appears defeated
 */
export async function checkMonsterDefeated(recentHistory) {
  try {
    const response = await callAI('', {
      model: HAIKU_MODEL,
      systemPrompt: 'Jsi analytik herní session Monster of the Week. Odpovídej POUZE "ANO" nebo "NE".',
      messages: [{
        role: 'user',
        content: `Na základě následujícího průběhu hry — byl monster poražen nebo zničen?\n\n${recentHistory}\n\nOdpověz POUZE: ANO nebo NE`
      }],
      temperature: 0.1,
      max_tokens: 10
    });
    return response.trim().toUpperCase().startsWith('ANO');
  } catch (error) {
    console.error('[Player Agent] Error checking monster status:', error);
    return false;
  }
}
