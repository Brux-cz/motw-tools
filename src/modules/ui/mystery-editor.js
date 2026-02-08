/**
 * Mystery Editor - Single-page mystery creator with AI generation
 *
 * Replaces the old multi-step wizard with a single scrollable editor.
 * All sections visible at once, collapsible via <details>.
 * AI generation when API key configured, table-based fallback otherwise.
 */

import { addMystery, validateMystery, getState } from '../state/store.js';
import { generateId } from '../../utils/id.js';
import { generateNPC } from '../generators/npc.js';
import { generateLocation } from '../generators/location.js';
import { generateMonster } from '../generators/monster.js';
import { html } from '../../utils/html.js';
import threatsData from '../../data/threats.json';

let mysteryData = {};
let templates = null;
let validationDebounceTimer = null;
let isGenerating = false;
let lockedFields = new Set();

// ─── Lab preset integration ─────────────────────────────────────
const PRESETS_KEY = 'motw-prompt-presets';
const ACTIVE_PRESET_KEY = 'motw-active-preset';
let activePresetId = null;

function loadLabPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY)) || [];
  } catch { return []; }
}

function getActivePreset() {
  if (!activePresetId) return null;
  return loadLabPresets().find(p => p.id === activePresetId) || null;
}

function getPresetOverride(fieldPath) {
  const preset = getActivePreset();
  return preset?.promptOverrides?.[fieldPath] || '';
}

// ─── Lock helpers ───────────────────────────────────────────────

function isLocked(fieldPath) {
  return lockedFields.has(fieldPath);
}

function toggleLock(fieldPath) {
  if (lockedFields.has(fieldPath)) {
    lockedFields.delete(fieldPath);
  } else {
    lockedFields.add(fieldPath);
  }
  renderEditor();
}

function getLockedFieldsSummary() {
  if (lockedFields.size === 0) return '';
  const lines = [];
  for (const fp of lockedFields) {
    const val = getFieldValue(fp);
    if (val) lines.push(`- ${fp}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
  }
  if (lines.length === 0) return '';
  return `NASLEDUJICI HODNOTY JSOU DEFINITIVNI (nemenit, novy obsah musi byt koherentni s nimi):\n${lines.join('\n')}`;
}

function getFieldValue(fieldPath) {
  if (fieldPath === 'name') return mysteryData.name;
  if (fieldPath === 'concept') return mysteryData.concept;
  if (fieldPath === 'hook') return mysteryData.hook;
  if (fieldPath === 'monster.name') return mysteryData.monster.name;
  if (fieldPath === 'monster.type') return mysteryData.monster.type;
  if (fieldPath === 'monster.description') return mysteryData.monster.description;
  if (fieldPath === 'monster.weakness') return mysteryData.monster.weakness;
  if (fieldPath === 'monster.powers') return (mysteryData.monster.powers || []).join(', ');
  if (fieldPath === 'monster.attack') return `${mysteryData.monster.attack.description} (harm ${mysteryData.monster.attack.harm}, ${mysteryData.monster.attack.range})`;
  if (fieldPath === 'monster.stats') return `vydrz ${mysteryData.monster.harm}, zbroj ${mysteryData.monster.armor}`;
  if (fieldPath.startsWith('countdown.')) {
    const idx = parseInt(fieldPath.split('.')[1]);
    return mysteryData.countdown.phases[idx]?.description || '';
  }
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const b = mysteryData.bystanders.find(x => x.id === id);
    return b ? `${b.name} (${b.type}) - ${b.description}` : '';
  }
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const l = mysteryData.locations.find(x => x.id === id);
    return l ? `${l.name} (${l.type}) - ${l.description}` : '';
  }
  return '';
}

function allFieldsLocked() {
  // Check if all meaningful fields are locked
  const allPaths = ['name', 'concept', 'hook',
    'monster.name', 'monster.type', 'monster.description', 'monster.weakness',
    'monster.powers', 'monster.attack', 'monster.stats'];
  for (let i = 0; i < 6; i++) allPaths.push(`countdown.${i}`);
  for (const b of mysteryData.bystanders) allPaths.push(`bystander.${b.id}`);
  for (const l of mysteryData.locations) allPaths.push(`location.${l.id}`);
  return allPaths.every(p => lockedFields.has(p));
}

// ─── Helpers ────────────────────────────────────────────────────

function hasAICapability() {
  const { settings } = getState();
  return !!settings?.ai?.apiKey;
}

function createEmptyMystery() {
  return {
    name: '',
    status: 'active',
    hook: '',
    concept: '',
    monster: {
      name: '',
      type: '',
      type_cz: '',
      motivation: '',
      description: '',
      powers: [],
      attack: { description: '', harm: 3, range: 'close' },
      harm: 10,
      currentHarm: 0,
      armor: 1,
      weakness: ''
    },
    bystanders: [],
    locations: [],
    minions: [],
    countdown: {
      structure: 'escalation',
      currentPhase: 0,
      history: [],
      phases: [
        { day: 'Day', description: '' },
        { day: 'Shadows', description: '' },
        { day: 'Sunset', description: '' },
        { day: 'Dusk', description: '' },
        { day: 'Nightfall', description: '' },
        { day: 'Midnight', description: '' }
      ]
    },
    customMoves: []
  };
}

// ─── AI JSON parsing ────────────────────────────────────────────

function parseAIJSON(text) {
  // 1) Direct parse
  try { return JSON.parse(text); } catch {}

  // 2) Strip code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // 3) Find first { and last }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.substring(first, last + 1)); } catch {}
  }

  throw new Error('Nepodařilo se zparsovat AI odpověď jako JSON');
}

// ─── AI prompt builders ─────────────────────────────────────────

function buildFullMysteryPrompt() {
  const name = mysteryData.name || '';
  const concept = mysteryData.concept || '';
  const hook = mysteryData.hook || '';
  const lockedSummary = getLockedFieldsSummary();

  // Preset overrides
  let presetBlock = '';
  const preset = getActivePreset();
  if (preset?.promptOverrides) {
    const entries = Object.entries(preset.promptOverrides).filter(([,v]) => v);
    if (entries.length > 0) {
      presetBlock = '\n\nDOPLŇUJÍCÍ INSTRUKCE (preset "' + preset.name + '"):\n' +
        entries.map(([f, t]) => `- ${f}: ${t}`).join('\n') + '\n';
    }
  }

  return `Jsi expert na tvorbu záhad pro stolní RPG Monster of the Week (MOTW).

Na základě těchto vstupů vytvoř kompletní záhadu:
- Název: ${name || '(vymysli vlastní)'}
- Koncept: ${concept}
- Návnada: ${hook}
${lockedSummary ? `\n${lockedSummary}\n` : ''}${presetBlock}
Pravidla:
- Všechny popisy a jména NPC piš ČESKY
- Příšera MUSÍ mít slabinu (weakness) - konkrétní a zajímavou
- Odpočet (countdown) musí mít přesně 6 fází eskalace
- Přihlížející (bystanders) musí být minimálně 2, max 4
- Lokace minimálně 1, max 3
- Typ příšery musí být jeden z: ${threatsData.monsterTypes.map(t => t.type_en).join(', ')}
- Typ přihlížejícího musí být jeden z: ${threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => t.type_en).join(', ')}
- Typ lokace musí být jeden z: ${threatsData.locationTypes.map(t => t.type_en).join(', ')}

Odpověz POUZE validním JSON objektem (bez markdown, bez vysvětlení) v tomto formátu:
{
  "name": "Název záhady",
  "concept": "Stručný koncept",
  "hook": "Návnada pro lovce",
  "monster": {
    "name": "Jméno příšery",
    "type": "typ_en (např. Beast, Sorcerer...)",
    "description": "Popis příšery",
    "powers": ["schopnost1", "schopnost2"],
    "attack": { "description": "popis útoku", "harm": 3, "range": "close" },
    "harm": 10,
    "armor": 1,
    "weakness": "Jak ji porazit"
  },
  "bystanders": [
    { "name": "Jméno NPC", "type": "typ_en", "description": "Popis" }
  ],
  "locations": [
    { "name": "Název lokace", "type": "typ_en", "description": "Popis" }
  ],
  "countdown": [
    { "day": "Day", "description": "co se stane" },
    { "day": "Shadows", "description": "..." },
    { "day": "Sunset", "description": "..." },
    { "day": "Dusk", "description": "..." },
    { "day": "Nightfall", "description": "..." },
    { "day": "Midnight", "description": "..." }
  ]
}`;
}

function buildSectionPrompt(section) {
  // Only include locked fields as context — unlocked fields should not influence generation
  const lockedSummary = getLockedFieldsSummary();
  const context = lockedSummary
    ? `Kontext záhady (pouze zamčená pole, ostatní ignoruj):\n${lockedSummary}`
    : 'Generuj zcela nový, originální obsah bez vazby na ostatní pole.';

  const prompts = {
    monster: `${context}

Vygeneruj příšeru pro tuto záhadu. Typ musí být jeden z: ${threatsData.monsterTypes.map(t => t.type_en).join(', ')}

Odpověz POUZE validním JSON:
{ "name": "...", "type": "typ_en", "description": "...", "powers": ["..."], "attack": { "description": "...", "harm": 3, "range": "close" }, "harm": 10, "armor": 1, "weakness": "..." }`,

    bystanders: `${context}

Vygeneruj 2-3 přihlížející (NPC) pro tuto záhadu. Česká jména. Typ musí být jeden z: ${threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => t.type_en).join(', ')}

Odpověz POUZE validním JSON:
{ "bystanders": [{ "name": "...", "type": "typ_en", "description": "..." }] }`,

    locations: `${context}

Vygeneruj 1-2 lokace pro tuto záhadu. Typ musí být jeden z: ${threatsData.locationTypes.map(t => t.type_en).join(', ')}

Odpověz POUZE validním JSON:
{ "locations": [{ "name": "...", "type": "typ_en", "description": "..." }] }`,

    countdown: `${context}

Vygeneruj odpočet (countdown) - 6 fází eskalace. Popisy česky, konkrétní.

Odpověz POUZE validním JSON:
{ "countdown": [
  { "day": "Day", "description": "..." },
  { "day": "Shadows", "description": "..." },
  { "day": "Sunset", "description": "..." },
  { "day": "Dusk", "description": "..." },
  { "day": "Nightfall", "description": "..." },
  { "day": "Midnight", "description": "..." }
] }`
  };

  let prompt = prompts[section] || '';
  const preset = getActivePreset();
  if (preset?.promptOverrides && prompt) {
    const entries = Object.entries(preset.promptOverrides).filter(([,v]) => v);
    if (entries.length > 0) {
      const presetBlock = '\n\nDOPLŇUJÍCÍ INSTRUKCE (preset "' + preset.name + '"):\n' +
        entries.map(([f, t]) => `- ${f}: ${t}`).join('\n');
      prompt = prompt.replace(
        /Odpověz POUZE validním JSON/,
        presetBlock + '\n\nOdpověz POUZE validním JSON'
      );
    }
  }
  return prompt;
}

// ─── Per-field AI prompt & regeneration ─────────────────────────

function buildFieldPrompt(fieldPath) {
  // Only include locked fields as context — unlocked fields should not influence generation
  const lockedSummary = getLockedFieldsSummary();
  const context = lockedSummary
    ? `Kontext záhady (pouze zamčená pole, ostatní ignoruj):\n${lockedSummary}`
    : 'Generuj zcela nový, originální obsah bez vazby na ostatní pole.';

  const fieldPrompts = {
    'name': `${context}\n\nVymysli nový název záhady. Odpověz POUZE JSON: { "value": "..." }`,
    'concept': `${context}\n\nVymysli nový koncept záhady (stručně, 1-2 věty). Odpověz POUZE JSON: { "value": "..." }`,
    'hook': `${context}\n\nVymysli novou návnadu (hook) - co přitáhne lovce? Odpověz POUZE JSON: { "value": "..." }`,
    'monster.name': `${context}\n\nVymysli nové české jméno pro příšeru. Odpověz POUZE JSON: { "value": "..." }`,
    'monster.type': `${context}\n\nZvol nejvhodnější typ příšery z: ${threatsData.monsterTypes.map(t => t.type_en).join(', ')}\nOdpověz POUZE JSON: { "value": "typ_en" }`,
    'monster.description': `${context}\n\nNapiš nový popis příšery (2-3 věty česky). Odpověz POUZE JSON: { "value": "..." }`,
    'monster.weakness': `${context}\n\nVymysli novou konkrétní a zajímavou slabinu příšery. Odpověz POUZE JSON: { "value": "..." }`,
    'monster.powers': `${context}\n\nVymysli 2-3 schopnosti příšery (česky). Odpověz POUZE JSON: { "value": ["schopnost1", "schopnost2"] }`,
    'monster.attack': `${context}\n\nVymysli útok příšery. Odpověz POUZE JSON: { "value": { "description": "popis útoku", "harm": 3, "range": "close" } }`,
    'monster.stats': `${context}\n\nUrči vhodnou výdrž (5-20) a zbroj (0-4) příšery. Odpověz POUZE JSON: { "value": { "harm": 10, "armor": 1 } }`
  };

  // Countdown phases
  for (let i = 0; i < 6; i++) {
    const phaseNames = ['Day', 'Shadows', 'Sunset', 'Dusk', 'Nightfall', 'Midnight'];
    const existingPhases = mysteryData.countdown.phases
      .map((p, idx) => idx !== i ? `  ${idx + 1}. ${phaseNames[idx]}: ${p.description || '(prázdné)'}` : null)
      .filter(Boolean).join('\n');
    fieldPrompts[`countdown.${i}`] = `${context}\n\nOstatní fáze odpočtu:\n${existingPhases}\n\nVygeneruj popis pro fázi ${i + 1} (${phaseNames[i]}). Česky, konkrétně. Odpověz POUZE JSON: { "value": "..." }`;
  }

  // Bystander by ID
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const existing = mysteryData.bystanders.find(b => b.id === id);
    const validTypes = threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => t.type_en).join(', ');
    const instruction = `${existing ? `Nahraď přihlížejícího "${existing.name}".` : 'Vytvoř nového přihlížejícího.'} České jméno. Typ musí být jeden z: ${validTypes}`;
    const override = getPresetOverride(fieldPath);
    const overridePart = override ? `\n\nDOPLŇUJÍCÍ INSTRUKCE (z presetu):\n${override}` : '';
    return `${context}\n\n${instruction}${overridePart}\nOdpověz POUZE JSON: { "value": { "name": "...", "type": "typ_en", "description": "..." } }`;
  }

  // Location by ID
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const existing = mysteryData.locations.find(l => l.id === id);
    const validTypes = threatsData.locationTypes.map(t => t.type_en).join(', ');
    const instruction = `${existing ? `Nahraď lokaci "${existing.name}".` : 'Vytvoř novou lokaci.'} Typ musí být jeden z: ${validTypes}`;
    const override = getPresetOverride(fieldPath);
    const overridePart = override ? `\n\nDOPLŇUJÍCÍ INSTRUKCE (z presetu):\n${override}` : '';
    return `${context}\n\n${instruction}${overridePart}\nOdpověz POUZE JSON: { "value": { "name": "...", "type": "typ_en", "description": "..." } }`;
  }

  let prompt = fieldPrompts[fieldPath] || '';
  const override = getPresetOverride(fieldPath);
  if (override && prompt) {
    prompt = prompt.replace(
      /Odpověz POUZE JSON/,
      'DOPLŇUJÍCÍ INSTRUKCE (z presetu):\n' + override + '\n\nOdpověz POUZE JSON'
    );
  }
  return prompt;
}

function applyFieldData(fieldPath, data) {
  const val = data.value;
  if (val === undefined) return;

  if (fieldPath === 'name') { mysteryData.name = val; return; }
  if (fieldPath === 'concept') { mysteryData.concept = val; return; }
  if (fieldPath === 'hook') { mysteryData.hook = val; return; }
  if (fieldPath === 'monster.name') { mysteryData.monster.name = val; return; }
  if (fieldPath === 'monster.type') {
    const mt = mapMonsterType(val);
    mysteryData.monster.type = mt?.type_en || val;
    mysteryData.monster.type_cz = mt?.type || '';
    mysteryData.monster.motivation = mt?.motivation || '';
    return;
  }
  if (fieldPath === 'monster.description') { mysteryData.monster.description = val; return; }
  if (fieldPath === 'monster.weakness') { mysteryData.monster.weakness = val; return; }
  if (fieldPath === 'monster.powers') {
    mysteryData.monster.powers = Array.isArray(val) ? val : [val];
    return;
  }
  if (fieldPath === 'monster.attack') {
    mysteryData.monster.attack = { ...mysteryData.monster.attack, ...val };
    return;
  }
  if (fieldPath === 'monster.stats') {
    if (val.harm !== undefined) mysteryData.monster.harm = val.harm;
    if (val.armor !== undefined) mysteryData.monster.armor = val.armor;
    return;
  }
  if (fieldPath.startsWith('countdown.')) {
    const idx = parseInt(fieldPath.split('.')[1]);
    if (mysteryData.countdown.phases[idx]) {
      mysteryData.countdown.phases[idx].description = typeof val === 'string' ? val : val.description || '';
    }
    return;
  }
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const idx = mysteryData.bystanders.findIndex(b => b.id === id);
    if (idx !== -1 && typeof val === 'object') {
      const bt = mapBystanderType(val.type);
      mysteryData.bystanders[idx] = {
        ...mysteryData.bystanders[idx],
        name: val.name || mysteryData.bystanders[idx].name,
        type: bt?.type || val.type || mysteryData.bystanders[idx].type,
        motivation: bt?.motivation || mysteryData.bystanders[idx].motivation,
        description: val.description || mysteryData.bystanders[idx].description
      };
    }
    return;
  }
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const idx = mysteryData.locations.findIndex(l => l.id === id);
    if (idx !== -1 && typeof val === 'object') {
      const lt = mapLocationType(val.type);
      mysteryData.locations[idx] = {
        ...mysteryData.locations[idx],
        name: val.name || mysteryData.locations[idx].name,
        type: lt?.type || val.type || mysteryData.locations[idx].type,
        motivation: lt?.motivation || mysteryData.locations[idx].motivation,
        description: val.description || mysteryData.locations[idx].description
      };
    }
    return;
  }
}

async function regenerateField(fieldPath) {
  if (isLocked(fieldPath)) {
    window.showToast?.({ type: 'warning', message: 'Toto pole je zamcene. Odemknete jej pred regeneraci.' });
    return;
  }

  const prompt = buildFieldPrompt(fieldPath);
  if (!prompt) return;

  try {
    window.showToast?.({ type: 'info', message: 'Generuji...', duration: 2000 });
    const { callAI } = await import('../ai/client.js');
    const response = await callAI(prompt, { maxTokens: 500, temperature: 0.8 });
    const data = parseAIJSON(response);
    applyFieldData(fieldPath, data);
    renderEditor(false);
    window.showToast?.({ type: 'success', message: 'Pole pregenerovano.' });
  } catch (error) {
    console.error(`Field regeneration failed (${fieldPath}):`, error);
    window.showToast?.({ type: 'error', message: `Generovani selhalo: ${error.message}`, duration: 5000 });
  }
}

// ─── AI type mapping ────────────────────────────────────────────

function mapMonsterType(typeEn) {
  const found = threatsData.monsterTypes.find(t =>
    t.type_en.toLowerCase() === (typeEn || '').toLowerCase()
  );
  return found || null;
}

function mapBystanderType(typeEn) {
  const valid = threatsData.bystanderTypes.filter(t => !t.type.startsWith('**'));
  return valid.find(t =>
    t.type_en.toLowerCase() === (typeEn || '').toLowerCase()
  ) || null;
}

function mapLocationType(typeEn) {
  return threatsData.locationTypes.find(t =>
    t.type_en.toLowerCase() === (typeEn || '').toLowerCase()
  ) || null;
}

// ─── Apply AI data to mysteryData ───────────────────────────────

function applyFullAIData(data) {
  if (data.name && !isLocked('name')) mysteryData.name = data.name;
  if (data.concept && !isLocked('concept')) mysteryData.concept = data.concept;
  if (data.hook && !isLocked('hook')) mysteryData.hook = data.hook;

  if (data.monster) {
    const mt = mapMonsterType(data.monster.type);
    const m = mysteryData.monster;
    mysteryData.monster = {
      ...m,
      name: isLocked('monster.name') ? m.name : (data.monster.name || ''),
      type: isLocked('monster.type') ? m.type : (mt?.type_en || data.monster.type || ''),
      type_cz: isLocked('monster.type') ? m.type_cz : (mt?.type || ''),
      motivation: isLocked('monster.type') ? m.motivation : (mt?.motivation || ''),
      description: isLocked('monster.description') ? m.description : (data.monster.description || ''),
      powers: isLocked('monster.powers') ? m.powers : (data.monster.powers || []),
      attack: isLocked('monster.attack') ? m.attack : (data.monster.attack || { description: '', harm: 3, range: 'close' }),
      harm: isLocked('monster.stats') ? m.harm : (data.monster.harm || 10),
      armor: isLocked('monster.stats') ? m.armor : (data.monster.armor || 1),
      weakness: isLocked('monster.weakness') ? m.weakness : (data.monster.weakness || '')
    };
  }

  if (data.bystanders && Array.isArray(data.bystanders)) {
    const lockedBystanders = mysteryData.bystanders.filter(b => isLocked(`bystander.${b.id}`));
    const newBystanders = data.bystanders.map(b => {
      const bt = mapBystanderType(b.type);
      return {
        id: generateId(),
        name: b.name || '',
        type: bt?.type || b.type || '',
        motivation: bt?.motivation || '',
        description: b.description || '',
        status: 'alive'
      };
    });
    mysteryData.bystanders = [...lockedBystanders, ...newBystanders];
  }

  if (data.locations && Array.isArray(data.locations)) {
    const lockedLocations = mysteryData.locations.filter(l => isLocked(`location.${l.id}`));
    const newLocations = data.locations.map(l => {
      const lt = mapLocationType(l.type);
      return {
        id: generateId(),
        name: l.name || '',
        type: lt?.type || l.type || '',
        motivation: lt?.motivation || '',
        description: l.description || ''
      };
    });
    mysteryData.locations = [...lockedLocations, ...newLocations];
  }

  if (data.countdown && Array.isArray(data.countdown)) {
    const dayNames = ['Day', 'Shadows', 'Sunset', 'Dusk', 'Nightfall', 'Midnight'];
    mysteryData.countdown.phases = dayNames.map((day, i) => ({
      day,
      description: isLocked(`countdown.${i}`)
        ? mysteryData.countdown.phases[i]?.description || ''
        : (data.countdown[i]?.description || '')
    }));
  }
}

function applyMonsterAIData(data) {
  const mt = mapMonsterType(data.type);
  const m = mysteryData.monster;
  mysteryData.monster = {
    ...m,
    name: isLocked('monster.name') ? m.name : (data.name || m.name),
    type: isLocked('monster.type') ? m.type : (mt?.type_en || data.type || m.type),
    type_cz: isLocked('monster.type') ? m.type_cz : (mt?.type || m.type_cz),
    motivation: isLocked('monster.type') ? m.motivation : (mt?.motivation || m.motivation),
    description: isLocked('monster.description') ? m.description : (data.description || m.description),
    powers: isLocked('monster.powers') ? m.powers : (data.powers || m.powers),
    attack: isLocked('monster.attack') ? m.attack : (data.attack || m.attack),
    harm: isLocked('monster.stats') ? m.harm : (data.harm || m.harm),
    armor: isLocked('monster.stats') ? m.armor : (data.armor ?? m.armor),
    weakness: isLocked('monster.weakness') ? m.weakness : (data.weakness || m.weakness)
  };
}

function applyBystandersAIData(data) {
  const list = data.bystanders || data;
  if (!Array.isArray(list)) return;
  const lockedBystanders = mysteryData.bystanders.filter(b => isLocked(`bystander.${b.id}`));
  const newBystanders = list.map(b => {
    const bt = mapBystanderType(b.type);
    return {
      id: generateId(),
      name: b.name || '',
      type: bt?.type || b.type || '',
      motivation: bt?.motivation || '',
      description: b.description || '',
      status: 'alive'
    };
  });
  mysteryData.bystanders = [...lockedBystanders, ...newBystanders];
}

function applyLocationsAIData(data) {
  const list = data.locations || data;
  if (!Array.isArray(list)) return;
  const lockedLocations = mysteryData.locations.filter(l => isLocked(`location.${l.id}`));
  const newLocations = list.map(l => {
    const lt = mapLocationType(l.type);
    return {
      id: generateId(),
      name: l.name || '',
      type: lt?.type || l.type || '',
      motivation: lt?.motivation || '',
      description: l.description || ''
    };
  });
  mysteryData.locations = [...lockedLocations, ...newLocations];
}

function applyCountdownAIData(data) {
  const list = data.countdown || data;
  if (!Array.isArray(list)) return;
  const dayNames = ['Day', 'Shadows', 'Sunset', 'Dusk', 'Nightfall', 'Midnight'];
  mysteryData.countdown.phases = dayNames.map((day, i) => ({
    day,
    description: isLocked(`countdown.${i}`)
      ? mysteryData.countdown.phases[i]?.description || ''
      : (list[i]?.description || '')
  }));
}

// ─── Lock/Regen UI helpers ──────────────────────────────────────

function renderLockBtn(fieldPath) {
  const locked = isLocked(fieldPath);
  const icon = locked ? 'lock' : 'lock_open';
  const color = locked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300';
  return html`<button onclick="window.mysteryEditor.toggleLock('${fieldPath}')"
    class="inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${color}"
    title="${locked ? 'Odemknout' : 'Zamknout'}">
    <span class="material-symbols-outlined" style="font-size:16px">${icon}</span>
  </button>`;
}

function renderRegenBtn(fieldPath) {
  if (!hasAICapability()) return '';
  return html`<button onclick="window.mysteryEditor.regenerateField('${fieldPath}')"
    class="inline-flex items-center justify-center w-6 h-6 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 transition-colors"
    title="Pregenerovat toto pole">
    <span class="material-symbols-outlined" style="font-size:16px">refresh</span>
  </button>`;
}

function lockedInputClasses(fieldPath, base) {
  const locked = isLocked(fieldPath);
  return base + (locked ? ' border-l-2 border-l-amber-400 opacity-75' : '');
}

// ─── Flush unsaved DOM values before re-render ─────────────────

function setNestedValue(fieldPath, value) {
  const parts = fieldPath.split('.');
  let target = mysteryData;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    // Handle array indices like bystanders.0.name
    if (/^\d+$/.test(parts[i + 1])) {
      target = target[key];
      continue;
    }
    if (/^\d+$/.test(key)) {
      target = target[parseInt(key)];
      continue;
    }
    target = target[key];
    if (!target) return;
  }
  const lastKey = parts[parts.length - 1];
  target[lastKey] = value;
}

function flushInputValues() {
  const modal = document.getElementById('mystery-editor-modal');
  if (!modal) return;

  modal.querySelectorAll('[data-field]').forEach(el => {
    const fieldPath = el.dataset.field;
    const val = el.value;
    const type = el.dataset.type || 'string';
    if (type === 'int') {
      const num = parseInt(val);
      if (!isNaN(num)) setNestedValue(fieldPath, num);
    } else {
      setNestedValue(fieldPath, val);
    }
  });
}

// ─── Rendering ──────────────────────────────────────────────────

function renderEditor(flush = true) {
  if (flush) flushInputValues();
  const aiAvailable = hasAICapability();
  const validation = validateMystery(mysteryData);
  const validBystanders = threatsData.bystanderTypes.filter(t => !t.type.startsWith('**'));

  const editorHTML = html`
    <div id="mystery-editor-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-slate-900 text-slate-100 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col mx-4">

        <!-- STICKY HEADER -->
        <div class="bg-slate-800 px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-2xl font-bold">Nova zahada</h2>
            <button onclick="window.mysteryEditor.cancel()" class="p-2 hover:bg-slate-700 rounded transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            ${templates?.templates?.length ? html`
              <select
                id="template-select"
                class="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm"
                onchange="window.mysteryEditor.applyTemplate(this.value)"
              >
                <option value="">Sablona (volitelne)...</option>
                ${templates.templates.map(t => html`
                  <option value="${t.id}">${t.name}</option>
                `).join('')}
              </select>
            ` : ''}
            ${(() => {
              const labPresets = loadLabPresets();
              return labPresets.length > 0 ? html`
                <select
                  class="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm"
                  onchange="window.mysteryEditor.selectPreset(this.value)"
                >
                  <option value="">Bez presetu</option>
                  ${labPresets.map(p => html`
                    <option value="${p.id}" ${activePresetId === p.id ? 'selected' : ''}>${p.name}</option>
                  `).join('')}
                </select>
              ` : '';
            })()}
            ${aiAvailable ? html`
              <button
                onclick="window.mysteryEditor.generateFullMystery()"
                class="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-bold transition-colors flex items-center gap-1"
                ${isGenerating ? 'disabled' : ''}
              >
                ✨ Generuj celou zahadu
              </button>
            ` : ''}
          </div>
          ${activePresetId ? (() => {
            const preset = getActivePreset();
            return preset ? html`
              <div class="mt-2 text-xs text-purple-300 bg-purple-900/30 border border-purple-800/40 rounded px-3 py-1.5 flex items-center gap-1">
                <span class="material-symbols-outlined" style="font-size:14px">science</span>
                Aktivni preset: "${preset.name}" — instrukce se pridaji ke vsem AI promptum
              </div>
            ` : '';
          })() : ''}
        </div>

        <!-- SCROLLABLE CONTENT -->
        <div id="editor-scroll-content" class="flex-1 overflow-y-auto p-6 space-y-4">

          ${isGenerating ? html`
            <div class="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 rounded-lg">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <p class="text-purple-300 font-bold">AI generuje zahadu...</p>
                <p class="text-slate-400 text-sm mt-1">Muze to trvat az 30 sekund</p>
              </div>
            </div>
          ` : ''}

          <!-- Koncept & Navnada -->
          <details open>
            <summary class="cursor-pointer select-none bg-slate-800 px-4 py-3 rounded-t border border-slate-700 font-bold text-lg hover:bg-slate-750 transition-colors">
              Koncept & Navnada
            </summary>
            <div class="border border-t-0 border-slate-700 rounded-b p-4 space-y-4">
              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Nazev zahady * ${renderLockBtn('name')} ${renderRegenBtn('name')}
                </label>
                <input type="text" value="${mysteryData.name || ''}"
                  placeholder="napr. Utek mongolskeho cerva"
                  data-field="name"
                  class="${lockedInputClasses('name', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                  ${isLocked('name') ? 'readonly' : ''}
                  onchange="window.mysteryEditor.updateField('name', this.value)"
                />
              </div>
              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Namet (Concept) * ${renderLockBtn('concept')} ${renderRegenBtn('concept')}
                </label>
                <textarea rows="2" placeholder="Jadro nadprirozeneho problemu"
                  data-field="concept"
                  class="${lockedInputClasses('concept', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                  ${isLocked('concept') ? 'readonly' : ''}
                  onchange="window.mysteryEditor.updateField('concept', this.value)"
                >${mysteryData.concept || ''}</textarea>
              </div>
              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Navnada (Hook) * ${renderLockBtn('hook')} ${renderRegenBtn('hook')}
                </label>
                <textarea rows="2" placeholder="Co pritahne lovce k pripadu?"
                  data-field="hook"
                  class="${lockedInputClasses('hook', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                  ${isLocked('hook') ? 'readonly' : ''}
                  onchange="window.mysteryEditor.updateField('hook', this.value)"
                >${mysteryData.hook || ''}</textarea>
              </div>
            </div>
          </details>

          <!-- Prisera -->
          <details open>
            <summary class="cursor-pointer select-none bg-slate-800 px-4 py-3 rounded-t border border-slate-700 font-bold text-lg hover:bg-slate-750 transition-colors flex items-center justify-between">
              <span>Prisera</span>
              <span onclick="event.preventDefault(); event.stopPropagation();">
                ${aiAvailable
                  ? html`<button onclick="window.mysteryEditor.generateSection('monster')" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors">✨ Generuj AI</button>`
                  : html`<button onclick="window.mysteryEditor.randomMonster()" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-bold transition-colors">🎲 Nahodne</button>`
                }
              </span>
            </summary>
            <div class="border border-t-0 border-slate-700 rounded-b p-4 space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="flex items-center gap-1 text-sm font-bold mb-1">
                    Jmeno prisery * ${renderLockBtn('monster.name')} ${renderRegenBtn('monster.name')}
                  </label>
                  <input type="text" value="${mysteryData.monster.name || ''}"
                    placeholder="napr. Rev. Silas Thorne"
                    data-field="monster.name"
                    class="${lockedInputClasses('monster.name', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                    ${isLocked('monster.name') ? 'readonly' : ''}
                    onchange="window.mysteryEditor.updateMonsterField('name', this.value)"
                  />
                </div>
                <div>
                  <label class="flex items-center gap-1 text-sm font-bold mb-1">
                    Typ prisery * ${renderLockBtn('monster.type')} ${renderRegenBtn('monster.type')}
                  </label>
                  <select class="${lockedInputClasses('monster.type', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                    ${isLocked('monster.type') ? 'disabled' : ''}
                    onchange="window.mysteryEditor.selectMonsterType(this.value)">
                    <option value="">-- Vyberte typ --</option>
                    ${threatsData.monsterTypes.map(type => html`
                      <option value="${type.type_en}" ${mysteryData.monster.type === type.type_en ? 'selected' : ''}>
                        ${type.type} (${type.type_en})
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              ${mysteryData.monster.motivation ? html`
                <div class="text-sm text-slate-400">Motivace: ${mysteryData.monster.motivation}</div>
              ` : ''}

              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Popis * ${renderLockBtn('monster.description')} ${renderRegenBtn('monster.description')}
                </label>
                <textarea rows="2" placeholder="Jak vypada? Jak se chova?"
                  data-field="monster.description"
                  class="${lockedInputClasses('monster.description', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                  ${isLocked('monster.description') ? 'readonly' : ''}
                  onchange="window.mysteryEditor.updateMonsterField('description', this.value)"
                >${mysteryData.monster.description || ''}</textarea>
              </div>

              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Statistiky (Vydrz + Zbroj) ${renderLockBtn('monster.stats')} ${renderRegenBtn('monster.stats')}
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">Vydrz</label>
                    <input type="number" value="${mysteryData.monster.harm || 10}" min="5" max="20"
                      data-field="monster.harm" data-type="int"
                      class="${lockedInputClasses('monster.stats', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                      ${isLocked('monster.stats') ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateMonsterField('harm', parseInt(this.value))"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">Zbroj</label>
                    <input type="number" value="${mysteryData.monster.armor ?? 1}" min="0" max="4"
                      data-field="monster.armor" data-type="int"
                      class="${lockedInputClasses('monster.stats', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                      ${isLocked('monster.stats') ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateMonsterField('armor', parseInt(this.value))"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Utok ${renderLockBtn('monster.attack')} ${renderRegenBtn('monster.attack')}
                </label>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">Popis utoku</label>
                    <input type="text" value="${mysteryData.monster.attack.description || ''}"
                      placeholder="napr. Drapky, Temna energie"
                      data-field="monster.attack.description"
                      class="${lockedInputClasses('monster.attack', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                      ${isLocked('monster.attack') ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateMonsterAttack('description', this.value)"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">Harm</label>
                    <input type="number" value="${mysteryData.monster.attack.harm || 3}" min="1" max="8"
                      data-field="monster.attack.harm" data-type="int"
                      class="${lockedInputClasses('monster.attack', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                      ${isLocked('monster.attack') ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateMonsterAttack('harm', parseInt(this.value))"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">Dosah</label>
                    <select class="${lockedInputClasses('monster.attack', 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2')}"
                      ${isLocked('monster.attack') ? 'disabled' : ''}
                      onchange="window.mysteryEditor.updateMonsterAttack('range', this.value)">
                      <option value="intimate" ${mysteryData.monster.attack.range === 'intimate' ? 'selected' : ''}>Intimate</option>
                      <option value="hand" ${mysteryData.monster.attack.range === 'hand' ? 'selected' : ''}>Hand</option>
                      <option value="close" ${mysteryData.monster.attack.range === 'close' ? 'selected' : ''}>Close</option>
                      <option value="far" ${mysteryData.monster.attack.range === 'far' ? 'selected' : ''}>Far</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Schopnosti ${renderLockBtn('monster.powers')} ${renderRegenBtn('monster.powers')}
                </label>
                ${isLocked('monster.powers') ? html`
                  <div class="space-y-2 mb-2">
                    ${(mysteryData.monster.powers || []).map(power => html`
                      <div class="px-3 py-2 bg-slate-800 border border-slate-700 border-l-2 border-l-amber-400 rounded text-sm opacity-75">${power}</div>
                    `).join('')}
                  </div>
                ` : html`
                  <div class="space-y-2 mb-2">
                    ${(mysteryData.monster.powers || []).map((power, index) => html`
                      <div class="flex gap-2">
                        <input type="text" value="${power}"
                          data-field="monster.powers.${index}"
                          class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2"
                          onchange="window.mysteryEditor.updatePower(${index}, this.value)"
                        />
                        <button onclick="window.mysteryEditor.removePower(${index})"
                          class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">✕</button>
                      </div>
                    `).join('')}
                  </div>
                  <button onclick="window.mysteryEditor.addPower()"
                    class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">+ Pridat schopnost</button>
                `}
              </div>

              <div>
                <label class="flex items-center gap-1 text-sm font-bold mb-1">
                  Slabina * ${renderLockBtn('monster.weakness')} ${renderRegenBtn('monster.weakness')}
                </label>
                <textarea rows="2" placeholder="Jak lze priseru trvale porazit?"
                  data-field="monster.weakness"
                  class="${lockedInputClasses('monster.weakness', `w-full bg-slate-800 border ${mysteryData.monster.weakness ? 'border-green-600' : 'border-red-600'} rounded px-3 py-2`)}"
                  ${isLocked('monster.weakness') ? 'readonly' : ''}
                  onchange="window.mysteryEditor.updateMonsterField('weakness', this.value)"
                >${mysteryData.monster.weakness || ''}</textarea>
                ${!mysteryData.monster.weakness ? html`
                  <p class="text-red-400 text-xs mt-1">Slabina je povinna!</p>
                ` : html`
                  <p class="text-green-400 text-xs mt-1">Slabina definovana</p>
                `}
              </div>
            </div>
          </details>

          <!-- Odpocet -->
          <details open>
            <summary class="cursor-pointer select-none bg-slate-800 px-4 py-3 rounded-t border border-slate-700 font-bold text-lg hover:bg-slate-750 transition-colors flex items-center justify-between">
              <span>Odpocet (Countdown)</span>
              <span onclick="event.preventDefault(); event.stopPropagation();">
                ${aiAvailable
                  ? html`<button onclick="window.mysteryEditor.generateSection('countdown')" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors">✨ Generuj AI</button>`
                  : ''
                }
              </span>
            </summary>
            <div class="border border-t-0 border-slate-700 rounded-b p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${mysteryData.countdown.phases.map((phase, index) => {
                  const phaseNames = ['Den (Day)', 'Priseri (Shadows)', 'Zapad (Sunset)', 'Soumrak (Dusk)', 'Noc (Nightfall)', 'Pulnoc (Midnight)'];
                  const fp = `countdown.${index}`;
                  return html`
                    <div class="bg-slate-800/50 border border-slate-700 rounded p-3">
                      <label class="flex items-center gap-1 text-xs font-bold mb-1 text-slate-400">
                        ${index + 1}. ${phaseNames[index]} ${renderLockBtn(fp)} ${renderRegenBtn(fp)}
                      </label>
                      <textarea rows="2" placeholder="Co se stane..."
                        data-field="countdown.phases.${index}.description"
                        class="${lockedInputClasses(fp, 'w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm')}"
                        ${isLocked(fp) ? 'readonly' : ''}
                        onchange="window.mysteryEditor.updateCountdownPhase(${index}, this.value)"
                      >${phase.description || ''}</textarea>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </details>

          <!-- Prihližejici / NPC -->
          <details open>
            <summary class="cursor-pointer select-none bg-slate-800 px-4 py-3 rounded-t border border-slate-700 font-bold text-lg hover:bg-slate-750 transition-colors flex items-center justify-between">
              <span>Prihližejici / NPC (${mysteryData.bystanders.length})</span>
              <span onclick="event.preventDefault(); event.stopPropagation();" class="flex gap-2">
                ${aiAvailable
                  ? html`<button onclick="window.mysteryEditor.generateSection('bystanders')" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors">✨ Generuj AI</button>`
                  : html`<button onclick="window.mysteryEditor.randomBystander()" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-bold transition-colors">🎲 Nahodne</button>`
                }
                <button onclick="window.mysteryEditor.addEmptyBystander()" class="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold transition-colors">+ Pridat</button>
              </span>
            </summary>
            <div class="border border-t-0 border-slate-700 rounded-b p-4 space-y-3">
              ${mysteryData.bystanders.length === 0 ? html`
                <div class="text-center py-6 text-slate-500 text-sm">
                  Zatim zadni prihližejici. Pridejte je tlacitkem vyse.
                </div>
              ` : ''}
              ${mysteryData.bystanders.map((npc, index) => {
                const fp = `bystander.${npc.id}`;
                const locked = isLocked(fp);
                return html`
                <div class="bg-slate-800/50 border border-slate-700 rounded p-3 ${locked ? 'border-l-2 border-l-amber-400' : ''}">
                  <div class="flex gap-2 mb-2 items-center">
                    ${renderLockBtn(fp)} ${renderRegenBtn(fp)}
                    <input type="text" value="${npc.name || ''}" placeholder="Jmeno NPC"
                      data-field="bystanders.${index}.name"
                      class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 font-bold text-sm"
                      ${locked ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateBystanderField(${index}, 'name', this.value)"
                    />
                    <select class="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
                      ${locked ? 'disabled' : ''}
                      onchange="window.mysteryEditor.updateBystanderType(${index}, this.value)">
                      <option value="">-- Typ --</option>
                      ${validBystanders.map(type => html`
                        <option value="${type.type_en}" ${npc.type === type.type || npc.type === type.type_en ? 'selected' : ''}>
                          ${type.type}
                        </option>
                      `).join('')}
                    </select>
                    <button onclick="window.mysteryEditor.removeBystander(${index})"
                      class="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm ${locked ? 'opacity-30 pointer-events-none' : ''}"
                      ${locked ? 'disabled' : ''}>✕</button>
                  </div>
                  <textarea rows="1" placeholder="Popis NPC"
                    data-field="bystanders.${index}.description"
                    class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    ${locked ? 'readonly' : ''}
                    onchange="window.mysteryEditor.updateBystanderField(${index}, 'description', this.value)"
                  >${npc.description || ''}</textarea>
                </div>
              `;}).join('')}
            </div>
          </details>

          <!-- Lokace -->
          <details open>
            <summary class="cursor-pointer select-none bg-slate-800 px-4 py-3 rounded-t border border-slate-700 font-bold text-lg hover:bg-slate-750 transition-colors flex items-center justify-between">
              <span>Lokace (${mysteryData.locations.length})</span>
              <span onclick="event.preventDefault(); event.stopPropagation();" class="flex gap-2">
                ${aiAvailable
                  ? html`<button onclick="window.mysteryEditor.generateSection('locations')" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors">✨ Generuj AI</button>`
                  : html`<button onclick="window.mysteryEditor.randomLocation()" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-bold transition-colors">🎲 Nahodne</button>`
                }
                <button onclick="window.mysteryEditor.addEmptyLocation()" class="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold transition-colors">+ Pridat</button>
              </span>
            </summary>
            <div class="border border-t-0 border-slate-700 rounded-b p-4 space-y-3">
              ${mysteryData.locations.length === 0 ? html`
                <div class="text-center py-6 text-slate-500 text-sm">
                  Zatim zadne lokace. Pridejte je tlacitkem vyse.
                </div>
              ` : ''}
              ${mysteryData.locations.map((loc, index) => {
                const fp = `location.${loc.id}`;
                const locked = isLocked(fp);
                return html`
                <div class="bg-slate-800/50 border border-slate-700 rounded p-3 ${locked ? 'border-l-2 border-l-amber-400' : ''}">
                  <div class="flex gap-2 mb-2 items-center">
                    ${renderLockBtn(fp)} ${renderRegenBtn(fp)}
                    <input type="text" value="${loc.name || ''}" placeholder="Nazev lokace"
                      data-field="locations.${index}.name"
                      class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 font-bold text-sm"
                      ${locked ? 'readonly' : ''}
                      onchange="window.mysteryEditor.updateLocationField(${index}, 'name', this.value)"
                    />
                    <select class="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
                      ${locked ? 'disabled' : ''}
                      onchange="window.mysteryEditor.updateLocationType(${index}, this.value)">
                      <option value="">-- Typ --</option>
                      ${threatsData.locationTypes.map(type => html`
                        <option value="${type.type_en}" ${loc.type === type.type || loc.type === type.type_en ? 'selected' : ''}>
                          ${type.type}
                        </option>
                      `).join('')}
                    </select>
                    <button onclick="window.mysteryEditor.removeLocation(${index})"
                      class="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm ${locked ? 'opacity-30 pointer-events-none' : ''}"
                      ${locked ? 'disabled' : ''}>✕</button>
                  </div>
                  <textarea rows="1" placeholder="Popis lokace"
                    data-field="locations.${index}.description"
                    class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    ${locked ? 'readonly' : ''}
                    onchange="window.mysteryEditor.updateLocationField(${index}, 'description', this.value)"
                  >${loc.description || ''}</textarea>
                </div>
              `;}).join('')}
            </div>
          </details>

          <!-- Validace -->
          <div id="validation-section">
            ${renderValidation(validation)}
          </div>

        </div>

        <!-- STICKY FOOTER -->
        <div class="bg-slate-800 px-6 py-3 border-t border-slate-700 flex justify-between items-center flex-shrink-0">
          <button onclick="window.mysteryEditor.cancel()"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm">
            Zrusit
          </button>
          <button onclick="window.mysteryEditor.save()"
            class="px-6 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors font-bold text-sm ${!validation.isValid ? 'opacity-50 cursor-not-allowed' : ''}"
            ${!validation.isValid ? 'disabled' : ''}>
            Ulozit zahadu
          </button>
        </div>

      </div>
    </div>
  `;

  const existing = document.getElementById('mystery-editor-modal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', editorHTML);

  // Live-sync: on every keystroke, update mysteryData via data-field
  const modal = document.getElementById('mystery-editor-modal');
  if (modal) {
    modal.addEventListener('input', (e) => {
      const field = e.target.dataset?.field;
      if (!field) return;
      const type = e.target.dataset.type || 'string';
      if (type === 'int') {
        const num = parseInt(e.target.value);
        if (!isNaN(num)) setNestedValue(field, num);
      } else {
        setNestedValue(field, e.target.value);
      }
      scheduleValidation();
    });
  }
}

function renderValidation(validation) {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return html`
      <div class="bg-green-900/30 border border-green-700/50 rounded p-3">
        <p class="text-green-400 text-sm font-bold">✓ Vsechny povinne casti jsou kompletni</p>
      </div>
    `;
  }

  return html`
    ${validation.errors.length > 0 ? html`
      <div class="bg-red-900/30 border border-red-600 rounded p-3 mb-2">
        <p class="font-bold text-red-400 text-sm mb-1">Chyby:</p>
        <ul class="list-disc list-inside text-xs space-y-0.5">
          ${validation.errors.map(err => html`<li>${err}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    ${validation.warnings.length > 0 ? html`
      <div class="bg-amber-900/30 border border-amber-700/50 rounded p-3">
        <p class="font-bold text-amber-400 text-sm mb-1">Varovani:</p>
        <ul class="list-disc list-inside text-xs space-y-0.5">
          ${validation.warnings.map(warn => html`<li>${warn}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  `;
}

function refreshValidation() {
  const validation = validateMystery(mysteryData);
  const section = document.getElementById('validation-section');
  if (section) {
    section.innerHTML = renderValidation(validation);
  }

  // Update save button
  const saveBtn = document.querySelector('#mystery-editor-modal .bg-red-600');
  if (saveBtn) {
    if (validation.isValid) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      saveBtn.disabled = true;
      saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }
}

function scheduleValidation() {
  clearTimeout(validationDebounceTimer);
  validationDebounceTimer = setTimeout(refreshValidation, 300);
}

// ─── Public API ─────────────────────────────────────────────────

export async function showMysteryEditor() {
  if (!templates) {
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'data/mystery-templates.json');
      templates = await response.json();
    } catch (error) {
      console.error('Failed to load mystery templates:', error);
      templates = { templates: [] };
    }
  }

  mysteryData = createEmptyMystery();
  lockedFields = new Set();
  isGenerating = false;
  activePresetId = localStorage.getItem(ACTIVE_PRESET_KEY) || null;
  renderEditor();
}

function cancel() {
  if (mysteryData.name || mysteryData.concept || mysteryData.hook ||
      mysteryData.monster.name || mysteryData.bystanders.length > 0) {
    if (!confirm('Opravdu chcete zrusit? Vsechna data budou ztracena.')) return;
  }
  const modal = document.getElementById('mystery-editor-modal');
  if (modal) modal.remove();
}

function save() {
  const validation = validateMystery(mysteryData);
  if (!validation.isValid) {
    window.showToast?.({ type: 'error', message: 'Opravte chyby pred ulozenim.' });
    return;
  }

  addMystery(mysteryData);

  const modal = document.getElementById('mystery-editor-modal');
  if (modal) modal.remove();

  window.showToast?.({ type: 'success', message: 'Zahada byla uspesne vytvorena!' });

  if (window.__MOTW__?.renderSessionTab) {
    window.__MOTW__.renderSessionTab();
  }
}

// ─── Field updates (no re-render) ──────────────────────────────

function updateField(field, value) {
  mysteryData[field] = value;
  scheduleValidation();
}

function updateMonsterField(field, value) {
  mysteryData.monster[field] = value;
  scheduleValidation();
}

function updateMonsterAttack(field, value) {
  mysteryData.monster.attack[field] = value;
  scheduleValidation();
}

function selectMonsterType(typeEn) {
  const type = threatsData.monsterTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.monster.type = type.type_en;
    mysteryData.monster.type_cz = type.type;
    mysteryData.monster.motivation = type.motivation;
  } else {
    mysteryData.monster.type = '';
    mysteryData.monster.type_cz = '';
    mysteryData.monster.motivation = '';
  }
  renderEditor();
}

function updatePower(index, value) {
  mysteryData.monster.powers[index] = value;
}

function addPower() {
  mysteryData.monster.powers.push('');
  renderEditor();
}

function removePower(index) {
  mysteryData.monster.powers.splice(index, 1);
  renderEditor();
}

function updateCountdownPhase(index, value) {
  mysteryData.countdown.phases[index].description = value;
  scheduleValidation();
}

// ─── Bystander management ──────────────────────────────────────

function updateBystanderField(index, field, value) {
  mysteryData.bystanders[index][field] = value;
  scheduleValidation();
}

function updateBystanderType(index, typeEn) {
  const validTypes = threatsData.bystanderTypes.filter(t => !t.type.startsWith('**'));
  const type = validTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.bystanders[index].type = type.type;
    mysteryData.bystanders[index].motivation = type.motivation;
  }
}

function addEmptyBystander() {
  mysteryData.bystanders.push({
    id: generateId(),
    name: '',
    type: '',
    motivation: '',
    description: '',
    status: 'alive'
  });
  renderEditor();
}

function removeBystander(index) {
  mysteryData.bystanders.splice(index, 1);
  renderEditor();
}

async function randomBystander() {
  const npc = await generateNPC();
  mysteryData.bystanders.push(npc);
  renderEditor();
}

// ─── Location management ───────────────────────────────────────

function updateLocationField(index, field, value) {
  mysteryData.locations[index][field] = value;
  scheduleValidation();
}

function updateLocationType(index, typeEn) {
  const type = threatsData.locationTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.locations[index].type = type.type;
    mysteryData.locations[index].motivation = type.motivation;
  }
}

function addEmptyLocation() {
  mysteryData.locations.push({
    id: generateId(),
    name: '',
    type: '',
    motivation: '',
    description: ''
  });
  renderEditor();
}

function removeLocation(index) {
  mysteryData.locations.splice(index, 1);
  renderEditor();
}

function randomLocation() {
  const loc = generateLocation();
  mysteryData.locations.push(loc);
  renderEditor();
}

// ─── Random monster fallback ───────────────────────────────────

function randomMonster() {
  const monster = generateMonster();
  const m = mysteryData.monster;
  mysteryData.monster = {
    ...m,
    name: isLocked('monster.name') ? m.name : monster.name,
    type: isLocked('monster.type') ? m.type : monster.type,
    type_cz: isLocked('monster.type') ? m.type_cz : (monster.type_cz || monster.type),
    motivation: isLocked('monster.type') ? m.motivation : (monster.motivation || ''),
    description: isLocked('monster.description') ? m.description : (monster.description || ''),
    powers: isLocked('monster.powers') ? m.powers : (monster.powers || []),
    attack: isLocked('monster.attack') ? m.attack : (monster.attack || { description: '', harm: 3, range: 'close' }),
    harm: isLocked('monster.stats') ? m.harm : (monster.harm || 10),
    armor: isLocked('monster.stats') ? m.armor : (monster.armor ?? 1),
    weakness: isLocked('monster.weakness') ? m.weakness : (monster.weakness || '')
  };
  renderEditor();
}

// ─── Template ──────────────────────────────────────────────────

function applyTemplate(templateId) {
  if (!templateId) return;

  const template = templates?.templates?.find(t => t.id === templateId);
  if (!template) return;

  const structure = template.structure;

  mysteryData.hook = structure.hook || '';
  mysteryData.concept = template.description || '';

  if (structure.monster) {
    const monsterType = threatsData.monsterTypes.find(t => t.type === structure.monster.type);
    if (monsterType) {
      mysteryData.monster.type = monsterType.type_en;
      mysteryData.monster.type_cz = monsterType.type;
      mysteryData.monster.motivation = monsterType.motivation;
    }
    mysteryData.monster.harm = structure.monster.harm || 10;
    mysteryData.monster.armor = structure.monster.armor || 1;
    mysteryData.monster.powers = structure.monster.powers || [];
    mysteryData.monster.attack = structure.monster.attack || { description: '', harm: 3, range: 'close' };
    mysteryData.monster.weakness = structure.monster.weakness || '';
  }

  if (structure.countdown) {
    structure.countdown.forEach((phase, index) => {
      if (mysteryData.countdown.phases[index]) {
        mysteryData.countdown.phases[index].description = phase.description;
      }
    });
  }

  renderEditor();
  window.showToast?.({ type: 'success', message: `Sablona "${template.name}" aplikovana.` });
}

// ─── AI generation ─────────────────────────────────────────────

async function generateFullMystery() {
  if (allFieldsLocked()) {
    window.showToast?.({ type: 'info', message: 'Vsechna pole jsou zamcena. Odemknete pole, ktera chcete pregenerovat.' });
    return;
  }

  const conceptOrHook = (mysteryData.concept || '') + (mysteryData.hook || '');
  if (conceptOrHook.trim().length < 10) {
    window.showToast?.({ type: 'warning', message: 'Zadejte alespon koncept nebo navnadu (min. 10 znaku).' });
    return;
  }

  isGenerating = true;
  renderEditor();

  try {
    const { callAI } = await import('../ai/client.js');
    const prompt = buildFullMysteryPrompt();
    const response = await callAI(prompt, { maxTokens: 4000, temperature: 0.8 });
    const data = parseAIJSON(response);
    applyFullAIData(data);
    window.showToast?.({ type: 'success', message: 'Zahada byla vygenerovana! Zkontrolujte a upravte.' });
  } catch (error) {
    console.error('AI generation failed:', error);
    window.showToast?.({ type: 'error', message: `Generovani selhalo: ${error.message}`, duration: 5000 });
  } finally {
    isGenerating = false;
    renderEditor();
  }
}

async function generateSection(section) {
  const prompt = buildSectionPrompt(section);
  if (!prompt) return;

  try {
    const { callAI } = await import('../ai/client.js');
    const response = await callAI(prompt, { maxTokens: 1500, temperature: 0.8 });
    const data = parseAIJSON(response);

    switch (section) {
      case 'monster': applyMonsterAIData(data); break;
      case 'bystanders': applyBystandersAIData(data); break;
      case 'locations': applyLocationsAIData(data); break;
      case 'countdown': applyCountdownAIData(data); break;
    }

    renderEditor();
    window.showToast?.({ type: 'success', message: `Sekce vygenerovana.` });
  } catch (error) {
    console.error(`AI section generation failed (${section}):`, error);
    window.showToast?.({ type: 'error', message: `Generovani selhalo: ${error.message}`, duration: 5000 });
  }
}

// ─── Window exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.mysteryEditor = {
    cancel,
    save,
    updateField,
    updateMonsterField,
    updateMonsterAttack,
    selectMonsterType,
    addPower,
    updatePower,
    removePower,
    updateCountdownPhase,
    updateBystanderField,
    updateBystanderType,
    addEmptyBystander,
    removeBystander,
    randomBystander,
    updateLocationField,
    updateLocationType,
    addEmptyLocation,
    removeLocation,
    randomLocation,
    randomMonster,
    applyTemplate,
    generateFullMystery,
    generateSection,
    toggleLock,
    regenerateField,
    selectPreset(id) {
      activePresetId = id || null;
      if (activePresetId) {
        localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      } else {
        localStorage.removeItem(ACTIVE_PRESET_KEY);
      }
      renderEditor();
    }
  };
}
