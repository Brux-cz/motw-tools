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
