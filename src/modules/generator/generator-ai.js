/**
 * Mystery Generator - AI Generation Module
 * Uses callAI() to generate mysteries, threats, and countdowns
 */

import { callAI } from '../ai/client.js';
import { createMystery, createThreat, createCountdown, ThreatType, normalizeCountdownPhase, getCountdownPhaseText } from './model.js';
import threatsData from '../../data/threats.json';

// ─── Helpers ───────────────────────────────────────────────────

function buildThreatTypesReference() {
  return `
Typy příšer (monsterTypes): ${threatsData.monsterTypes.map(t => `${t.type} — ${t.motivation}`).join('; ')}

Typy přisluhovačů (minionTypes): ${threatsData.minionTypes.map(t => `${t.type} — ${t.motivation}`).join('; ')}

Typy přihlížejících (bystanderTypes): ${threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => `${t.type} — ${t.motivation}`).join('; ')}

Typy lokalit (locationTypes): ${threatsData.locationTypes.map(t => `${t.type} — ${t.motivation}`).join('; ')}
`.trim();
}

const SYSTEM_PROMPT = `Jsi expert na tvorbu záhad (mysteries) pro TTRPG hru Monster of the Week (MotW).
Pravidla:
- Každá záhada má: název, námět, návnadu (hook), odpočet (countdown), a hrozby.
- Odpočet má 6 fází: den, příšeří, západ slunce, soumrak, noc, půlnoc. Popisují eskalaci hrozby.
- Hrozby mají typy: PRISERA, PRISLUHOVAC, PRIHLIZEJICI, LOKALITA.
- Příšera MUSÍ mít slabinu. Přisluhovač a příšera mají životy, zbroj, útoky, schopnosti.
- Přihlížející nemá útoky, životy, zbroj. Lokalita nemá útoky, životy, zbroj, schopnosti.
- Druh hrozby musí být z platných typů (viz reference níže).
- Motivace odpovídá druhu hrozby dle pravidel MotW.

${buildThreatTypesReference()}

Odpovídej VÝHRADNĚ validním JSON objektem bez markdown bloků a bez dalšího textu.
Všechny texty piš česky.`;

function parseJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

function normalizeUtok(raw) {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.nazev) return raw;
  return String(raw);
}

function normalizeThreat(raw) {
  return createThreat({
    jmeno: raw.jmeno || '',
    typ: raw.typ || ThreatType.PRISERA,
    druh: raw.druh || '',
    motivace: raw.motivace || '',
    schopnosti: Array.isArray(raw.schopnosti) ? raw.schopnosti : [],
    utoky: Array.isArray(raw.utoky) ? raw.utoky.map(normalizeUtok) : [],
    zivoty: parseInt(raw.zivoty) || 0,
    zbroj: parseInt(raw.zbroj) || 0,
    slabina: raw.slabina || '',
    tahy: Array.isArray(raw.tahy) ? raw.tahy : []
  });
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Generate a complete mystery from scratch (or with hints)
 * @param {Object} hints - Optional partial data: { nazev, namet, navnada }
 * @returns {Promise<Object>} Complete mystery object
 */
export async function generateFullMystery(hints = {}) {
  const hintLines = [];
  if (hints.nazev) hintLines.push(`Název: ${hints.nazev}`);
  if (hints.namet) hintLines.push(`Námět: ${hints.namet}`);
  if (hints.navnada) hintLines.push(`Návnada: ${hints.navnada}`);

  const prompt = `Vygeneruj kompletní záhadu pro Monster of the Week.
${hintLines.length ? `\nNápovědy od uživatele:\n${hintLines.join('\n')}\n` : ''}
Požadovaný JSON formát:
{
  "nazev": "string",
  "namet": "string (2-3 věty popis záhady)",
  "navnada": "string (co přiláká lovce)",
  "odpocet": {
    "den": "string", "priseri": "string", "zapad_slunce": "string",
    "soumrak": "string", "noc": "string", "pulnoc": "string"
  },
  "hrozby": [
    {
      "jmeno": "string", "typ": "PRISERA|PRISLUHOVAC|PRIHLIZEJICI|LOKALITA",
      "druh": "string (z platných typů)", "motivace": "string",
      "schopnosti": ["string"], "utoky": ["string (formát: název (X-zranění dosah))"],
      "zivoty": number, "zbroj": number, "slabina": "string"
    }
  ]
}

Vygeneruj minimálně 1 příšeru, 1 přisluhovače, 1 přihlížejícího a 1 lokalitu.`;

  const response = await callAI(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.8,
    maxTokens: 3000
  });

  const data = parseJSON(response);

  return createMystery({
    nazev: data.nazev || 'Vygenerovaná záhada',
    namet: data.namet || '',
    navnada: data.navnada || '',
    odpocet: createCountdown(data.odpocet || {}),
    hrozby: (data.hrozby || []).map(normalizeThreat)
  });
}

/**
 * Generate a single threat of the given type
 * @param {string} typ - ThreatType value
 * @param {Object} context - { mysteryName, mysteryTheme }
 * @returns {Promise<Object>} Threat data (without id)
 */
export async function generateThreat(typ, context = {}) {
  const typeLabel = {
    [ThreatType.PRISERA]: 'příšeru (PRISERA)',
    [ThreatType.PRISLUHOVAC]: 'přisluhovače (PRISLUHOVAC)',
    [ThreatType.PRIHLIZEJICI]: 'přihlížejícího (PRIHLIZEJICI)',
    [ThreatType.LOKALITA]: 'lokalitu (LOKALITA)'
  }[typ] || 'hrozbu';

  const prompt = `Vygeneruj jednu ${typeLabel} pro záhadu Monster of the Week.
${context.mysteryName ? `Záhada: ${context.mysteryName}` : ''}
${context.mysteryTheme ? `Námět: ${context.mysteryTheme}` : ''}

Vrať JSON objekt:
{
  "jmeno": "string",
  "druh": "string (z platných typů pro danou kategorii)",
  "motivace": "string",
  "schopnosti": ["string"],
  "utoky": ["string (formát: název (X-zranění dosah))"],
  "zivoty": number,
  "zbroj": number,
  "slabina": "string"
}

${typ === ThreatType.PRIHLIZEJICI ? 'Přihlížející NEMÁ útoky, životy ani zbroj — tyto pole vynech nebo nastav na prázdné/0.' : ''}
${typ === ThreatType.LOKALITA ? 'Lokalita NEMÁ útoky, životy, zbroj ani schopnosti — tyto pole vynech nebo nastav na prázdné/0.' : ''}
${typ === ThreatType.PRISERA ? 'Příšera MUSÍ mít slabinu.' : ''}`;

  const response = await callAI(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.8,
    maxTokens: 1000
  });

  const data = parseJSON(response);

  return {
    jmeno: data.jmeno || '',
    druh: data.druh || '',
    motivace: data.motivace || '',
    schopnosti: Array.isArray(data.schopnosti) ? data.schopnosti : [],
    utoky: Array.isArray(data.utoky) ? data.utoky : [],
    zivoty: parseInt(data.zivoty) || 0,
    zbroj: parseInt(data.zbroj) || 0,
    slabina: data.slabina || ''
  };
}

/**
 * Generate a countdown based on existing mystery threats
 * @param {Object} mystery - Mystery with hrozby filled in
 * @returns {Promise<Object>} Countdown object
 */
export async function generateCountdown(mystery) {
  const threatSummary = (mystery.hrozby || []).map(h =>
    `${h.jmeno || 'Bez jména'} (${h.typ}, druh: ${h.druh || '?'}, motivace: ${h.motivace || '?'})`
  ).join('\n');

  const prompt = `Vygeneruj odpočet (countdown) pro záhadu Monster of the Week.
${mystery.nazev ? `Záhada: ${mystery.nazev}` : ''}
${mystery.namet ? `Námět: ${mystery.namet}` : ''}
${threatSummary ? `\nHrozby:\n${threatSummary}` : ''}

Odpočet popisuje eskalaci hrozby v 6 fázích — od prvních náznaků po katastrofu.

Vrať JSON objekt:
{
  "den": "string (první náznaky, drobné události)",
  "priseri": "string (hrozba se stává viditelnější)",
  "zapad_slunce": "string (situace se zhoršuje)",
  "soumrak": "string (vážné nebezpečí)",
  "noc": "string (téměř nezvratné)",
  "pulnoc": "string (katastrofální finále, pokud lovci nezasáhnou)"
}`;

  const response = await callAI(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 1000
  });

  const data = parseJSON(response);
  // Normalize: AI returns strings, convert to structured format
  const result = {};
  for (const key of ['den', 'priseri', 'zapad_slunce', 'soumrak', 'noc']) {
    result[key] = normalizeCountdownPhase(data[key]);
  }
  result.pulnoc = typeof data.pulnoc === 'string' ? data.pulnoc : getCountdownPhaseText(data.pulnoc);
  return result;
}

// ─── Narrative Enhancement ────────────────────────────────────

const ENHANCE_SYSTEM_PROMPT = `Jsi expert na tvorbu záhad pro TTRPG hru Příšera týdne (Monster of the Week).

Pravidla pro tvorbu záhady:
- Narativ: Popiš pozadí příběhu — kdo je záporák, co se stalo, proč, jak spolu hrozby souvisí.
  Příklad z pravidel: "Marie O'Connell je naštvaným duchem. Zabil ji její manžel Damian
  ve zběsilém záchvatu žárlivosti, kterého následně dohnala k sebevraždě."
- Návnada: "Detail, záhadná okolnost či stopa, která nasvědčuje, že se děje něco nadpřirozeného."
  Piš bohatý odstavec s konkrétními detaily, jmény, okolnostmi.
  Příklad: "V místních novinách se objevily bombastické zprávy o tom, že v domě straší..."
- Odpočet: 6 specifických UDÁLOSTÍ — "Kdo by se stal obětí? Kdo by umřel? Jaký je příšeřin plán?"
  Každý krok je KDO udělá CO KOMU. Používej konkrétní jména NPC, lokací, přisluhovače.
  Každý krok kauzálně navazuje na předchozí.
  Příklad: "Den: Marie uvězní Hadleyovy v domě. Příšeří: Marie je začne strašit..."
- Námět: Stručné shrnutí (2-3 věty) — hlavní myšlenka a příběhové pozadí.

Všechny texty piš česky. Používej VÝHRADNĚ jména a lokace z poskytnutých dat.
Odpovídej VÝHRADNĚ validním JSON objektem.`;

function buildMysteryContext(mystery) {
  const lines = [];

  // Monster
  const monster = (mystery.hrozby || []).find(h => h.typ === ThreatType.PRISERA);
  if (monster) {
    lines.push(`PŘÍŠERA: ${monster.jmeno || '?'} (${monster.typ}/${monster.druh || '?'}) — Motivace: ${monster.motivace || '?'} — Slabina: ${monster.slabina || '?'} — Schopnosti: ${(monster.schopnosti || []).join(', ') || 'žádné'}${monster.stopaKSlabine ? ` — Stopa k slabině: ${monster.stopaKSlabine}` : ''}`);
  }

  // Minion(s)
  for (const h of (mystery.hrozby || []).filter(h => h.typ === ThreatType.PRISLUHOVAC)) {
    lines.push(`PŘISLUHOVAČ: ${h.jmeno || '?'} (${h.druh || '?'}) — Motivace: ${h.motivace || '?'}`);
  }

  // NPCs (bystanders)
  for (const h of (mystery.hrozby || []).filter(h => h.typ === ThreatType.PRIHLIZEJICI)) {
    const vedi = h.vedi?.length ? ` — Ví: ${h.vedi.join('; ')}` : '';
    lines.push(`NPC: ${h.jmeno || '?'} (${h.druh || '?'}) — Motivace: ${h.motivace || '?'}${vedi}`);
  }

  // Locations
  for (const h of (mystery.hrozby || []).filter(h => h.typ === ThreatType.LOKALITA)) {
    const stopy = h.stopy?.length ? ` — Stopy: ${h.stopy.join('; ')}` : '';
    const tah = h.tahNaMiru ? ` — Tah: ${h.tahNaMiru}` : '';
    lines.push(`LOKACE: ${h.jmeno || '?'} (${h.druh || '?'})${stopy}${tah}`);
  }

  // Existing text fields
  if (mystery.namet) lines.push(`NÁMĚT (z generátoru): ${mystery.namet}`);
  if (mystery.navnada) lines.push(`NÁVNADA (z generátoru): ${mystery.navnada}`);

  return lines.join('\n');
}

/**
 * Enhance a mystery with AI-generated narrative and improved text fields
 * @param {Object} mystery - Complete mystery object
 * @returns {Promise<Object|null>} Enhanced mystery or null on error
 */
export async function enhanceMystery(mystery) {
  const context = buildMysteryContext(mystery);

  const prompt = `Zde je záhada vygenerovaná generátorem. Přežvýkej ji a napiš koherentní příběh.

${context}

Vrať JSON:
{
  "narativ": "2-4 odstavce pozadí příběhu — kdo je záporák, co se stalo, jak spolu hrozby souvisí, proč se to děje právě tady. Piš jako autor záhady v příručce.",
  "namet": "Vylepšený námět — 2-3 věty shrnutí příběhu.",
  "navnada": "Bohatý odstavec návnady — konkrétní detaily, jména, okolnosti.",
  "odpocet": {
    "den": "První událost — kdo co udělá (pojmenovaní aktéři).",
    "priseri": "Druhá událost — eskalace, navazuje na Den.",
    "zapad_slunce": "Třetí událost — situace se zhoršuje.",
    "soumrak": "Čtvrtá událost — vážné nebezpečí.",
    "noc": "Pátá událost — téměř nezvratné.",
    "pulnoc": "Katastrofické finále — co se stane, pokud lovci nezasáhnou."
  }
}`;

  try {
    const response = await callAI(prompt, {
      systemPrompt: ENHANCE_SYSTEM_PROMPT,
      temperature: 0.8,
      maxTokens: 4000
    });

    const data = parseJSON(response);

    // 1. Backup original
    mystery._original = {
      namet: mystery.namet,
      navnada: mystery.navnada,
      odpocet: JSON.parse(JSON.stringify(mystery.odpocet))
    };

    // 2. AI data
    mystery.narativ = data.narativ || '';
    mystery.namet = data.namet || mystery.namet;
    mystery.navnada = data.navnada || mystery.navnada;

    // 3. Countdown — AI returns strings → normalize into structured format
    for (const key of ['den', 'priseri', 'zapad_slunce', 'soumrak', 'noc']) {
      if (data.odpocet?.[key]) {
        mystery.odpocet[key] = normalizeCountdownPhase(data.odpocet[key]);
      }
    }
    if (data.odpocet?.pulnoc) {
      mystery.odpocet.pulnoc = data.odpocet.pulnoc;
    }

    // 4. Flag
    mystery._aiEnhanced = true;
    mystery.lastModified = new Date().toISOString();

    return mystery;
  } catch (err) {
    console.error('AI enhance error:', err);
    window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
    return null;
  }
}
