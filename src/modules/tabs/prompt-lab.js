/**
 * Prompt Lab — sandbox for experimenting with AI prompts
 *
 * Isolated from mystery editor: owns its own copy of mystery data,
 * locked fields, prompt overrides, and test results.
 */

import { getState } from '../state/store.js';
import { generateId } from '../../utils/id.js';
import { html } from '../../utils/html.js';
import threatsData from '../../data/threats.json';

// ─── Module-level state ────────────────────────────────────────

let labData = null;            // Mystery data copy (sandbox)
let lockedFields = new Set();  // Locked field paths
let promptOverrides = {};      // fieldPath → custom prompt text
let testResults = {};          // fieldPath → { prompt, response, timestamp }
let fullTestResult = null;     // Full mystery test result
let activeSection = 'all';     // Section filter
let presets = [];              // Saved presets (localStorage)
let openPromptEditor = null;   // Which prompt editor is expanded
let isTestingField = null;     // fieldPath currently being tested
let isTestingFull = false;     // Full mystery test in progress

const PRESETS_KEY = 'motw-prompt-presets';
const PHASE_NAMES = ['Day', 'Shadows', 'Sunset', 'Dusk', 'Nightfall', 'Midnight'];
const PHASE_NAMES_CZ = ['Den (Day)', 'Priseri (Shadows)', 'Zapad (Sunset)', 'Soumrak (Dusk)', 'Noc (Nightfall)', 'Pulnoc (Midnight)'];

// ─── Field definitions ─────────────────────────────────────────

const SECTION_DEFS = {
  concept: { label: 'Koncept', icon: 'lightbulb' },
  monster: { label: 'Prisera', icon: 'pet_supplies' },
  countdown: { label: 'Odpocet', icon: 'timer' },
  npc: { label: 'NPC', icon: 'group' },
  location: { label: 'Lokace', icon: 'location_on' }
};

function getStaticFieldDefs() {
  return [
    { path: 'name', label: 'Nazev zahady', section: 'concept', type: 'text' },
    { path: 'concept', label: 'Koncept', section: 'concept', type: 'textarea' },
    { path: 'hook', label: 'Navnada (Hook)', section: 'concept', type: 'textarea' },
    { path: 'monster.name', label: 'Jmeno prisery', section: 'monster', type: 'text' },
    { path: 'monster.type', label: 'Typ prisery', section: 'monster', type: 'text' },
    { path: 'monster.description', label: 'Popis prisery', section: 'monster', type: 'textarea' },
    { path: 'monster.weakness', label: 'Slabina prisery', section: 'monster', type: 'textarea' },
    { path: 'monster.powers', label: 'Schopnosti prisery', section: 'monster', type: 'text' },
    { path: 'monster.attack', label: 'Utok prisery', section: 'monster', type: 'text' },
    { path: 'monster.stats', label: 'Statistiky (vydrz + zbroj)', section: 'monster', type: 'text' },
    ...PHASE_NAMES.map((_, i) => ({
      path: `countdown.${i}`,
      label: `Odpocet: ${PHASE_NAMES_CZ[i]}`,
      section: 'countdown',
      type: 'textarea'
    }))
  ];
}

function getAllFieldDefs() {
  const defs = getStaticFieldDefs();
  if (labData) {
    for (const b of labData.bystanders || []) {
      defs.push({ path: `bystander.${b.id}`, label: `NPC: ${b.name || '(bez jmena)'}`, section: 'npc', type: 'textarea' });
    }
    for (const l of labData.locations || []) {
      defs.push({ path: `location.${l.id}`, label: `Lokace: ${l.name || '(bez nazvu)'}`, section: 'location', type: 'textarea' });
    }
  }
  return defs;
}

// ─── Data helpers (isolated from mystery editor) ───────────────

function createEmptyMystery() {
  return {
    name: '',
    concept: '',
    hook: '',
    monster: {
      name: '', type: '', type_cz: '', motivation: '', description: '',
      powers: [], attack: { description: '', harm: 3, range: 'close' },
      harm: 10, armor: 1, weakness: ''
    },
    bystanders: [],
    locations: [],
    countdown: {
      structure: 'escalation', currentPhase: 0, history: [],
      phases: PHASE_NAMES.map(day => ({ day, description: '' }))
    }
  };
}

function getFieldValue(fieldPath) {
  if (!labData) return '';
  if (fieldPath === 'name') return labData.name || '';
  if (fieldPath === 'concept') return labData.concept || '';
  if (fieldPath === 'hook') return labData.hook || '';
  if (fieldPath === 'monster.name') return labData.monster?.name || '';
  if (fieldPath === 'monster.type') return labData.monster?.type || '';
  if (fieldPath === 'monster.description') return labData.monster?.description || '';
  if (fieldPath === 'monster.weakness') return labData.monster?.weakness || '';
  if (fieldPath === 'monster.powers') return (labData.monster?.powers || []).join(', ');
  if (fieldPath === 'monster.attack') {
    const a = labData.monster?.attack;
    return a ? `${a.description} (harm ${a.harm}, ${a.range})` : '';
  }
  if (fieldPath === 'monster.stats') return `vydrz ${labData.monster?.harm || 10}, zbroj ${labData.monster?.armor ?? 1}`;
  if (fieldPath.startsWith('countdown.')) {
    const idx = parseInt(fieldPath.split('.')[1]);
    return labData.countdown?.phases?.[idx]?.description || '';
  }
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const b = labData.bystanders?.find(x => x.id === id);
    return b ? `${b.name} (${b.type}) - ${b.description}` : '';
  }
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const l = labData.locations?.find(x => x.id === id);
    return l ? `${l.name} (${l.type}) - ${l.description}` : '';
  }
  return '';
}

function setFieldValue(fieldPath, value) {
  if (!labData) return;
  if (fieldPath === 'name') { labData.name = value; return; }
  if (fieldPath === 'concept') { labData.concept = value; return; }
  if (fieldPath === 'hook') { labData.hook = value; return; }
  if (fieldPath === 'monster.name') { labData.monster.name = value; return; }
  if (fieldPath === 'monster.type') { labData.monster.type = value; return; }
  if (fieldPath === 'monster.description') { labData.monster.description = value; return; }
  if (fieldPath === 'monster.weakness') { labData.monster.weakness = value; return; }
  if (fieldPath === 'monster.powers') {
    labData.monster.powers = typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(value) ? value : []);
    return;
  }
  if (fieldPath === 'monster.attack') {
    if (typeof value === 'string') {
      labData.monster.attack.description = value;
    } else if (typeof value === 'object') {
      labData.monster.attack = { ...labData.monster.attack, ...value };
    }
    return;
  }
  if (fieldPath === 'monster.stats') {
    if (typeof value === 'string') {
      // parse "vydrz X, zbroj Y"
      const hm = value.match(/vydrz\s*(\d+)/);
      const am = value.match(/zbroj\s*(\d+)/);
      if (hm) labData.monster.harm = parseInt(hm[1]);
      if (am) labData.monster.armor = parseInt(am[1]);
    } else if (typeof value === 'object') {
      if (value.harm !== undefined) labData.monster.harm = value.harm;
      if (value.armor !== undefined) labData.monster.armor = value.armor;
    }
    return;
  }
  if (fieldPath.startsWith('countdown.')) {
    const idx = parseInt(fieldPath.split('.')[1]);
    if (labData.countdown.phases[idx]) {
      labData.countdown.phases[idx].description = typeof value === 'string' ? value : (value?.description || '');
    }
    return;
  }
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const b = labData.bystanders.find(x => x.id === id);
    if (b && typeof value === 'object') {
      if (value.name !== undefined) b.name = value.name;
      if (value.type !== undefined) b.type = value.type;
      if (value.description !== undefined) b.description = value.description;
    }
    return;
  }
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const l = labData.locations.find(x => x.id === id);
    if (l && typeof value === 'object') {
      if (value.name !== undefined) l.name = value.name;
      if (value.type !== undefined) l.type = value.type;
      if (value.description !== undefined) l.description = value.description;
    }
    return;
  }
}

function getLockedFieldsSummary() {
  if (lockedFields.size === 0) return '';
  const lines = [];
  for (const fp of lockedFields) {
    const val = getFieldValue(fp);
    if (val) lines.push(`- ${fp}: ${val}`);
  }
  if (lines.length === 0) return '';
  return `NASLEDUJICI HODNOTY JSOU DEFINITIVNI (nemenit, novy obsah musi byt koherentni s nimi):\n${lines.join('\n')}`;
}

function parseAIJSON(text) {
  try { return JSON.parse(text); } catch {}
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.substring(first, last + 1)); } catch {}
  }
  throw new Error('Nelze parsovat AI odpoved jako JSON');
}

// ─── Prompt building ───────────────────────────────────────────

function getDefaultFieldInstruction(fieldPath) {
  const lockedSummary = getLockedFieldsSummary();
  const context = lockedSummary
    ? `Kontext zahady (pouze zamcena pole):\n${lockedSummary}`
    : 'Generuj zcela novy, originalni obsah bez vazby na ostatni pole.';

  const prompts = {
    'name': `Vymysli novy nazev zahady pro Monster of the Week. Odpovez POUZE JSON: { "value": "..." }`,
    'concept': `Vymysli novy koncept zahady (strucne, 1-2 vety). Odpovez POUZE JSON: { "value": "..." }`,
    'hook': `Vymysli novou navnadu (hook) - co pritahne lovce? Odpovez POUZE JSON: { "value": "..." }`,
    'monster.name': `Vymysli nove ceske jmeno pro priseru. Odpovez POUZE JSON: { "value": "..." }`,
    'monster.type': `Zvol nejvhodnejsi typ prisery z: ${threatsData.monsterTypes.map(t => t.type_en).join(', ')}\nOdpovez POUZE JSON: { "value": "typ_en" }`,
    'monster.description': `Napis novy popis prisery (2-3 vety cesky). Odpovez POUZE JSON: { "value": "..." }`,
    'monster.weakness': `Vymysli novou konkretni a zajimavou slabinu prisery. Odpovez POUZE JSON: { "value": "..." }`,
    'monster.powers': `Vymysli 2-3 schopnosti prisery (cesky). Odpovez POUZE JSON: { "value": ["schopnost1", "schopnost2"] }`,
    'monster.attack': `Vymysli utok prisery. Odpovez POUZE JSON: { "value": { "description": "popis utoku", "harm": 3, "range": "close" } }`,
    'monster.stats': `Urci vhodnou vydrz (5-20) a zbroj (0-4) prisery. Odpovez POUZE JSON: { "value": { "harm": 10, "armor": 1 } }`
  };

  // Countdown phases
  for (let i = 0; i < 6; i++) {
    const existingPhases = labData?.countdown?.phases
      ?.map((p, idx) => idx !== i ? `  ${idx + 1}. ${PHASE_NAMES[idx]}: ${p.description || '(prazdne)'}` : null)
      .filter(Boolean).join('\n') || '';
    prompts[`countdown.${i}`] = `Ostatni faze odpoctu:\n${existingPhases}\n\nVygeneruj popis pro fazi ${i + 1} (${PHASE_NAMES[i]}). Cesky, konkretne. Odpovez POUZE JSON: { "value": "..." }`;
  }

  // Bystander by ID
  if (fieldPath.startsWith('bystander.')) {
    const id = fieldPath.split('.')[1];
    const existing = labData?.bystanders?.find(b => b.id === id);
    const validTypes = threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => t.type_en).join(', ');
    return `${existing ? `Nahrad prihližejiciho "${existing.name}".` : 'Vytvor noveho prihližejiciho.'} Ceske jmeno. Typ musi byt jeden z: ${validTypes}\nOdpovez POUZE JSON: { "value": { "name": "...", "type": "typ_en", "description": "..." } }`;
  }

  // Location by ID
  if (fieldPath.startsWith('location.')) {
    const id = fieldPath.split('.')[1];
    const existing = labData?.locations?.find(l => l.id === id);
    const validTypes = threatsData.locationTypes.map(t => t.type_en).join(', ');
    return `${existing ? `Nahrad lokaci "${existing.name}".` : 'Vytvor novou lokaci.'} Typ musi byt jeden z: ${validTypes}\nOdpovez POUZE JSON: { "value": { "name": "...", "type": "typ_en", "description": "..." } }`;
  }

  return prompts[fieldPath] || `Vygeneruj hodnotu pro pole "${fieldPath}". Odpovez POUZE JSON: { "value": "..." }`;
}

function getFieldInstruction(fieldPath) {
  return promptOverrides[fieldPath] || getDefaultFieldInstruction(fieldPath);
}

function getPromptForField(fieldPath) {
  const lockedSummary = getLockedFieldsSummary();
  const context = lockedSummary
    ? `Kontext zahady (pouze zamcena pole):\n${lockedSummary}\n\n`
    : '';
  const instruction = getFieldInstruction(fieldPath);
  return {
    template: instruction,
    assembled: context + instruction
  };
}

function getPromptForFullMystery() {
  const lockedSummary = getLockedFieldsSummary();

  const instruction = `Jsi expert na tvorbu zahad pro stolni RPG Monster of the Week (MOTW).

Vytvor kompletni zahadu.

Pravidla:
- Vsechny popisy a jmena NPC pis CESKY
- Prisera MUSI mit slabinu (weakness) - konkretni a zajimavou
- Odpocet (countdown) musi mit presne 6 fazi eskalace
- Prihližejici (bystanders) musi byt minimalne 2, max 4
- Lokace minimalne 1, max 3
- Typ prisery musi byt jeden z: ${threatsData.monsterTypes.map(t => t.type_en).join(', ')}
- Typ prihližejiciho musi byt jeden z: ${threatsData.bystanderTypes.filter(t => !t.type.startsWith('**')).map(t => t.type_en).join(', ')}
- Typ lokace musi byt jeden z: ${threatsData.locationTypes.map(t => t.type_en).join(', ')}

Odpovez POUZE validnim JSON objektem (bez markdown, bez vysvetleni) v tomto formatu:
{
  "name": "Nazev zahady",
  "concept": "Strucny koncept",
  "hook": "Navnada pro lovce",
  "monster": {
    "name": "Jmeno prisery",
    "type": "typ_en",
    "description": "Popis prisery",
    "powers": ["schopnost1", "schopnost2"],
    "attack": { "description": "popis utoku", "harm": 3, "range": "close" },
    "harm": 10,
    "armor": 1,
    "weakness": "Jak ji porazit"
  },
  "bystanders": [
    { "name": "Jmeno NPC", "type": "typ_en", "description": "Popis" }
  ],
  "locations": [
    { "name": "Nazev lokace", "type": "typ_en", "description": "Popis" }
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

  const contextBlock = lockedSummary
    ? `${lockedSummary}\n\nVyse uvedena pole jsou DEFINITIVNI — nesmi je menit.\nVsechna nove generovana pole MUSI byt koherentni s temito zamcenymi hodnotami.\n\n`
    : '';

  return {
    template: instruction,
    assembled: contextBlock + instruction
  };
}

// ─── Testing ───────────────────────────────────────────────────

async function testField(fieldPath) {
  const { callAI } = await import('../ai/client.js');
  const { assembled } = getPromptForField(fieldPath);

  isTestingField = fieldPath;
  refreshFieldCard(fieldPath);

  try {
    const response = await callAI(assembled, { maxTokens: 500, temperature: 0.8 });
    testResults[fieldPath] = {
      prompt: assembled,
      response,
      timestamp: Date.now()
    };
  } catch (error) {
    testResults[fieldPath] = {
      prompt: assembled,
      response: null,
      error: error.message,
      timestamp: Date.now()
    };
  } finally {
    isTestingField = null;
    refreshFieldCard(fieldPath);
  }
}

async function testFullMystery() {
  const { callAI } = await import('../ai/client.js');
  const { assembled } = getPromptForFullMystery();

  isTestingFull = true;
  renderFullTestSection();

  try {
    const response = await callAI(assembled, { maxTokens: 4000, temperature: 0.8 });
    const parsed = parseAIJSON(response);
    const coherence = runCoherenceChecks(parsed);
    fullTestResult = {
      prompt: assembled,
      response,
      parsed,
      coherence,
      timestamp: Date.now()
    };
  } catch (error) {
    fullTestResult = {
      prompt: assembled,
      response: null,
      error: error.message,
      timestamp: Date.now()
    };
  } finally {
    isTestingFull = false;
    renderFullTestSection();
  }
}

function applyResult(fieldPath) {
  const result = testResults[fieldPath];
  if (!result?.response) return;
  try {
    const data = parseAIJSON(result.response);
    const val = data.value;
    if (val !== undefined) {
      setFieldValue(fieldPath, val);
      refreshFieldCard(fieldPath);
      window.showToast?.({ type: 'success', message: 'Hodnota aplikovana.' });
    }
  } catch {
    window.showToast?.({ type: 'error', message: 'Nelze parsovat vysledek.' });
  }
}

function applyFullResult() {
  if (!fullTestResult?.parsed) return;
  const data = fullTestResult.parsed;

  // Apply only to unlocked fields
  if (data.name && !lockedFields.has('name')) labData.name = data.name;
  if (data.concept && !lockedFields.has('concept')) labData.concept = data.concept;
  if (data.hook && !lockedFields.has('hook')) labData.hook = data.hook;

  if (data.monster) {
    const m = labData.monster;
    if (!lockedFields.has('monster.name')) m.name = data.monster.name || m.name;
    if (!lockedFields.has('monster.type')) m.type = data.monster.type || m.type;
    if (!lockedFields.has('monster.description')) m.description = data.monster.description || m.description;
    if (!lockedFields.has('monster.weakness')) m.weakness = data.monster.weakness || m.weakness;
    if (!lockedFields.has('monster.powers')) m.powers = data.monster.powers || m.powers;
    if (!lockedFields.has('monster.attack')) m.attack = data.monster.attack || m.attack;
    if (!lockedFields.has('monster.stats')) {
      m.harm = data.monster.harm || m.harm;
      m.armor = data.monster.armor ?? m.armor;
    }
  }

  if (data.bystanders && Array.isArray(data.bystanders)) {
    const locked = labData.bystanders.filter(b => lockedFields.has(`bystander.${b.id}`));
    const newOnes = data.bystanders.map(b => ({
      id: generateId(), name: b.name || '', type: b.type || '',
      motivation: '', description: b.description || '', status: 'alive'
    }));
    labData.bystanders = [...locked, ...newOnes];
  }

  if (data.locations && Array.isArray(data.locations)) {
    const locked = labData.locations.filter(l => lockedFields.has(`location.${l.id}`));
    const newOnes = data.locations.map(l => ({
      id: generateId(), name: l.name || '', type: l.type || '',
      motivation: '', description: l.description || ''
    }));
    labData.locations = [...locked, ...newOnes];
  }

  if (data.countdown && Array.isArray(data.countdown)) {
    labData.countdown.phases = PHASE_NAMES.map((day, i) => ({
      day,
      description: lockedFields.has(`countdown.${i}`)
        ? labData.countdown.phases[i]?.description || ''
        : (data.countdown[i]?.description || '')
    }));
  }

  renderContent();
  window.showToast?.({ type: 'success', message: 'Cela zahada aplikovana do labu.' });
}

function clearResult(fieldPath) {
  delete testResults[fieldPath];
  refreshFieldCard(fieldPath);
}

// ─── Coherence checks ──────────────────────────────────────────

function runCoherenceChecks(parsed) {
  const checks = [];

  // 1. Monster has weakness?
  const hasWeakness = !!parsed.monster?.weakness;
  checks.push({
    label: 'Prisera ma slabinu',
    passed: hasWeakness,
    detail: hasWeakness ? parsed.monster.weakness : 'CHYBI slabina!'
  });

  // 2. Countdown mentions monster?
  const countdownText = (parsed.countdown || []).map(p => p.description || '').join(' ').toLowerCase();
  const monsterName = (parsed.monster?.name || '').toLowerCase();
  const mentionsMonster = monsterName.length > 2 && countdownText.includes(monsterName);
  checks.push({
    label: 'Odpocet zminuje priseru',
    passed: mentionsMonster,
    detail: mentionsMonster ? 'Odpocet odkazuje na priseru' : 'Odpocet nemusi primo jmenovat priseru, ale mel by se k ni vztahovat'
  });

  // 3. Enough NPCs?
  const npcCount = (parsed.bystanders || []).length;
  checks.push({
    label: `Dostatek NPC (min 2)`,
    passed: npcCount >= 2,
    detail: `${npcCount} NPC`
  });

  // 4. 6 countdown phases?
  const phaseCount = (parsed.countdown || []).length;
  checks.push({
    label: '6 fazi odpoctu',
    passed: phaseCount === 6,
    detail: `${phaseCount} fazi`
  });

  // 5. Locked fields respected?
  if (lockedFields.size > 0) {
    let respected = true;
    const issues = [];
    for (const fp of lockedFields) {
      const original = getFieldValue(fp);
      if (!original) continue;

      let generated = '';
      if (fp === 'name') generated = parsed.name || '';
      else if (fp === 'concept') generated = parsed.concept || '';
      else if (fp === 'hook') generated = parsed.hook || '';
      else if (fp === 'monster.name') generated = parsed.monster?.name || '';
      else if (fp === 'monster.type') generated = parsed.monster?.type || '';
      else if (fp === 'monster.weakness') generated = parsed.monster?.weakness || '';

      if (generated && generated !== original) {
        respected = false;
        issues.push(`${fp}: ocekavano "${original}", dostali jsme "${generated}"`);
      }
    }
    checks.push({
      label: 'Zamcena pole respektovana',
      passed: respected,
      detail: respected ? 'Vsechna zamcena pole odpovidaji' : issues.join('; ')
    });
  }

  return checks;
}

// ─── Presets ───────────────────────────────────────────────────

function loadPresetsFromStorage() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    presets = raw ? JSON.parse(raw) : [];
  } catch {
    presets = [];
  }
}

function savePresetsToStorage() {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function savePreset() {
  const name = prompt('Nazev presetu:');
  if (!name) return;

  const preset = {
    id: generateId(),
    name,
    timestamp: Date.now(),
    promptOverrides: { ...promptOverrides },
    lockedFields: [...lockedFields],
    lockedValues: {}
  };

  // Save locked field values
  for (const fp of lockedFields) {
    preset.lockedValues[fp] = getFieldValue(fp);
  }

  presets.push(preset);
  savePresetsToStorage();
  renderContent();
  window.showToast?.({ type: 'success', message: `Preset "${name}" ulozen.` });
}

function loadPreset(presetId) {
  const preset = presets.find(p => p.id === presetId);
  if (!preset) return;

  promptOverrides = { ...preset.promptOverrides };
  lockedFields = new Set(preset.lockedFields || []);

  // Restore locked values into labData
  if (preset.lockedValues) {
    for (const [fp, val] of Object.entries(preset.lockedValues)) {
      setFieldValue(fp, val);
    }
  }

  renderContent();
  window.showToast?.({ type: 'info', message: `Preset "${preset.name}" nacten.` });
}

function deletePreset() {
  const select = document.getElementById('lab-preset-select');
  if (!select) return;
  const id = select.value;
  if (!id) return;

  const preset = presets.find(p => p.id === id);
  if (!preset) return;
  if (!confirm(`Smazat preset "${preset.name}"?`)) return;

  presets = presets.filter(p => p.id !== id);
  savePresetsToStorage();
  renderContent();
  window.showToast?.({ type: 'info', message: 'Preset smazan.' });
}

// ─── Reset / Import ────────────────────────────────────────────

function resetLab() {
  labData = createEmptyMystery();
  lockedFields = new Set();
  promptOverrides = {};
  testResults = {};
  fullTestResult = null;
  openPromptEditor = null;
  renderContent();
  window.showToast?.({ type: 'info', message: 'Lab vymazan. Prazdna zahada.' });
}

function importMystery() {
  const { campaign } = getState();
  if (!campaign?.mysteries?.length) {
    window.showToast?.({ type: 'warning', message: 'Zadna zahada v kampani.' });
    return;
  }

  // Use first active or most recent mystery
  const active = campaign.mysteries.find(m => m.status === 'active') || campaign.mysteries[0];
  labData = JSON.parse(JSON.stringify(active));
  // Ensure IDs on bystanders/locations
  for (const b of labData.bystanders || []) {
    if (!b.id) b.id = generateId();
  }
  for (const l of labData.locations || []) {
    if (!l.id) l.id = generateId();
  }

  testResults = {};
  fullTestResult = null;
  renderContent();
  window.showToast?.({ type: 'success', message: `Zahada "${active.name || 'bez nazvu'}" naimportovana.` });
}

// ─── Rendering ─────────────────────────────────────────────────

function tip(text) {
  return html`<span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600 cursor-help transition-colors ml-1" title="${text}">
    <span class="material-symbols-outlined" style="font-size:12px">help</span>
  </span>`;
}

function esc(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function renderContextPreview() {
  const summary = getLockedFieldsSummary();
  if (!summary) {
    return html`
      <div class="bg-slate-800/50 border border-slate-700 rounded p-3 text-sm text-slate-500 italic">
        Zadna pole nejsou zamcena. Zamknete pole pro vytvoreni kontextu.
        ${tip('Zamcena pole se pridaji jako kontext na zacatek KAZDEHO promptu. AI pak musi generovat obsah koherentni s temito hodnotami.')}
      </div>`;
  }
  return html`
    <div class="bg-emerald-950/40 border border-emerald-800/50 rounded p-3">
      <div class="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-size:14px">lock</span>
        Kontext (zamcena pole)
      </div>
      <pre class="text-xs text-emerald-300/80 whitespace-pre-wrap font-mono">${esc(summary)}</pre>
    </div>`;
}

function renderFieldCard(fieldDef) {
  const { path, label, type } = fieldDef;
  const locked = lockedFields.has(path);
  const value = getFieldValue(path);
  const hasOverride = !!promptOverrides[path];
  const result = testResults[path];
  const isTesting = isTestingField === path;
  const isPromptOpen = openPromptEditor === path;
  const promptInfo = getPromptForField(path);

  return html`
    <div id="lab-field-${path.replace(/\./g, '-')}" class="bg-slate-800/60 border ${locked ? 'border-amber-700/50' : 'border-slate-700'} rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <button onclick="window.promptLab.toggleLock('${path}')"
          class="inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${locked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}"
          title="${locked ? 'Odemknout — pole se prestane pouzivat jako kontext pro AI' : 'Zamknout — hodnota bude soucasti kontextu pro vsechny AI prompty'}">
          <span class="material-symbols-outlined" style="font-size:16px">${locked ? 'lock' : 'lock_open'}</span>
        </button>
        <span class="text-sm font-semibold flex-1">${esc(label)}</span>
        ${hasOverride ? html`<span class="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded" title="Tento prompt byl rucne upraven. Klikni na 'Sablona promptu' pro zobrazeni.">upraveny</span>` : ''}
        <button onclick="window.promptLab.testField('${path}')"
          class="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors disabled:opacity-50"
          ${isTesting ? 'disabled' : ''}
          title="Posle finalni prompt (kontext + instrukce) do AI a zobrazi odpoved. Vysledek si pak muzes aplikovat do pole.">
          ${isTesting ? html`<span class="animate-spin inline-block">⟳</span>` : '✨'} Test
        </button>
      </div>

      <!-- Current value -->
      <div class="px-3 py-2 border-b border-slate-700/30">
        ${type === 'textarea' ? html`
          <textarea rows="2"
            class="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-sm resize-y ${locked ? 'opacity-60' : ''}"
            ${locked ? 'readonly' : ''}
            onchange="window.promptLab.updateValue('${path}', this.value)"
          >${esc(value)}</textarea>
        ` : html`
          <input type="text" value="${esc(value)}"
            class="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-sm ${locked ? 'opacity-60' : ''}"
            ${locked ? 'readonly' : ''}
            onchange="window.promptLab.updateValue('${path}', this.value)"
          />
        `}
      </div>

      <!-- Prompt template (collapsible) -->
      <details class="border-b border-slate-700/30" ${isPromptOpen ? 'open' : ''}>
        <summary class="px-3 py-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-300 select-none"
          onclick="window.promptLab._trackPromptToggle('${path}', this.parentElement)">
          Sablona promptu ${tip('Instrukce pro AI — co ma vygenerovat. Muzes prepsat vlastnim textem. Prazdne = pouzije se defaultni prompt.')}
        </summary>
        <div class="px-3 pb-2">
          <textarea rows="4"
            class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono resize-y text-slate-300"
            placeholder="(default prompt)"
            onchange="window.promptLab.updatePrompt('${path}', this.value)"
          >${esc(promptOverrides[path] || '')}</textarea>
          <div class="flex gap-2 mt-1">
            <button onclick="window.promptLab.resetPrompt('${path}')"
              class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
              Resetovat na default
            </button>
          </div>
        </div>
      </details>

      <!-- Assembled prompt preview (collapsible) -->
      <details class="border-b border-slate-700/30">
        <summary class="px-3 py-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-400 select-none">
          Finalni prompt pro AI ${tip('Presne to, co se posle do AI: kontext ze zamcenych poli + instrukce. Toto nelze editovat primo — uprav sablonu nebo zamkni/odemkni pole.')}
        </summary>
        <div class="px-3 pb-2">
          <pre class="text-[11px] bg-slate-950 rounded p-2 whitespace-pre-wrap font-mono text-slate-400 max-h-48 overflow-y-auto">${esc(promptInfo.assembled)}</pre>
        </div>
      </details>

      <!-- Test result -->
      ${result ? html`
        <div class="px-3 py-2 ${result.error ? 'bg-red-950/30' : 'bg-purple-950/20'}">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] text-slate-500">${new Date(result.timestamp).toLocaleTimeString()}</span>
            <div class="flex gap-1">
              ${!result.error ? html`
                <button onclick="window.promptLab.applyResult('${path}')"
                  class="text-[10px] px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-emerald-200 transition-colors"
                  title="Prepise aktualni hodnotu pole vysledkem z AI testu.">
                  Pouzit hodnotu
                </button>
              ` : ''}
              <button onclick="window.promptLab.clearResult('${path}')"
                class="text-[10px] px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors">
                Smazat
              </button>
            </div>
          </div>
          ${result.error
            ? html`<div class="text-xs text-red-400">${esc(result.error)}</div>`
            : html`<pre class="text-xs bg-slate-950 rounded p-2 whitespace-pre-wrap font-mono text-slate-300 max-h-32 overflow-y-auto">${esc(result.response)}</pre>`
          }
        </div>
      ` : ''}
    </div>`;
}

function renderCoherenceCheck(checks) {
  if (!checks || checks.length === 0) return '';
  return html`
    <div class="mt-3 space-y-1">
      <div class="text-xs font-bold text-slate-400 mb-1">Kontrola koherence:</div>
      ${checks.map(c => html`
        <div class="flex items-start gap-2 text-xs">
          <span class="${c.passed ? 'text-emerald-400' : 'text-amber-400'}">${c.passed ? '✓' : '⚠'}</span>
          <div>
            <span class="font-semibold">${esc(c.label)}</span>
            <span class="text-slate-500 ml-1">— ${esc(c.detail)}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderFullTestResult() {
  if (!fullTestResult) return '';
  if (fullTestResult.error) {
    return html`
      <div class="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mt-4">
        <div class="text-sm font-bold text-red-400 mb-1">Chyba</div>
        <div class="text-xs text-red-300">${esc(fullTestResult.error)}</div>
      </div>`;
  }

  const p = fullTestResult.parsed;
  if (!p) return '';

  return html`
    <div class="bg-purple-950/20 border border-purple-800/40 rounded-lg p-4 mt-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-bold text-purple-300 flex items-center gap-1">
          <span class="material-symbols-outlined" style="font-size:16px">auto_awesome</span>
          Vysledek testu cele zahady
        </div>
        <div class="flex gap-2">
          <button onclick="window.promptLab.applyFullResult()"
            class="text-xs px-2 py-1 bg-emerald-800 hover:bg-emerald-700 rounded text-emerald-200 transition-colors">
            Aplikovat vse
          </button>
          <span class="text-[10px] text-slate-500">${new Date(fullTestResult.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <div class="font-bold text-slate-400 mb-1">Nazev</div>
          <div class="text-slate-200">${esc(p.name || '—')}</div>
        </div>
        <div>
          <div class="font-bold text-slate-400 mb-1">Koncept</div>
          <div class="text-slate-200">${esc(p.concept || '—')}</div>
        </div>
        <div>
          <div class="font-bold text-slate-400 mb-1">Navnada</div>
          <div class="text-slate-200">${esc(p.hook || '—')}</div>
        </div>
        <div>
          <div class="font-bold text-slate-400 mb-1">Prisera</div>
          <div class="text-slate-200">${esc(p.monster?.name || '—')} (${esc(p.monster?.type || '?')})</div>
          <div class="text-slate-400 mt-0.5">${esc(p.monster?.description || '')}</div>
          <div class="text-slate-400 mt-0.5">Slabina: ${esc(p.monster?.weakness || 'CHYBI!')}</div>
        </div>
      </div>

      ${(p.bystanders || []).length > 0 ? html`
        <div class="mt-3">
          <div class="text-xs font-bold text-slate-400 mb-1">NPC (${p.bystanders.length})</div>
          <div class="space-y-1">
            ${p.bystanders.map(b => html`
              <div class="text-xs text-slate-300">${esc(b.name)} (${esc(b.type)}) — ${esc(b.description)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${(p.locations || []).length > 0 ? html`
        <div class="mt-3">
          <div class="text-xs font-bold text-slate-400 mb-1">Lokace (${p.locations.length})</div>
          <div class="space-y-1">
            ${p.locations.map(l => html`
              <div class="text-xs text-slate-300">${esc(l.name)} (${esc(l.type)}) — ${esc(l.description)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${(p.countdown || []).length > 0 ? html`
        <div class="mt-3">
          <div class="text-xs font-bold text-slate-400 mb-1">Odpocet</div>
          <div class="space-y-0.5">
            ${p.countdown.map((phase, i) => html`
              <div class="text-xs"><span class="text-slate-500">${i + 1}. ${esc(phase.day)}:</span> <span class="text-slate-300">${esc(phase.description)}</span></div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${renderCoherenceCheck(fullTestResult.coherence)}
    </div>`;
}

function renderFullTestSection() {
  const container = document.getElementById('lab-full-test-section');
  if (!container) return;
  if (isTestingFull) {
    container.innerHTML = html`
      <div class="bg-purple-950/20 border border-purple-800/40 rounded-lg p-6 mt-4 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-3"></div>
        <div class="text-sm text-purple-300 font-bold">Generuji celou zahadu...</div>
        <div class="text-xs text-slate-500 mt-1">Muze trvat az 30s</div>
      </div>`;
  } else {
    container.innerHTML = renderFullTestResult();
  }
}

function refreshFieldCard(fieldPath) {
  const id = `lab-field-${fieldPath.replace(/\./g, '-')}`;
  const el = document.getElementById(id);
  if (!el) return;

  const fieldDef = getAllFieldDefs().find(f => f.path === fieldPath);
  if (!fieldDef) return;

  const temp = document.createElement('div');
  temp.innerHTML = renderFieldCard(fieldDef);
  el.replaceWith(temp.firstElementChild);
}

function renderContent() {
  const container = document.getElementById('prompt-lab-content');
  if (!container) return;

  const allFields = getAllFieldDefs();
  const filteredFields = activeSection === 'all'
    ? allFields
    : allFields.filter(f => f.section === activeSection);

  const hasAI = !!getState()?.settings?.ai?.apiKey;

  container.innerHTML = html`
    <div class="max-w-4xl mx-auto space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-400 text-2xl">science</span>
          <h2 class="text-xl font-bold">Prompt Lab</h2>
          <span class="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded font-bold">experimentalni</span>
          ${tip('Sandbox pro testovani AI promptu. Zmeny zde NEOVLIVNI mystery editor — je to izolована kopie dat.')}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <select id="lab-preset-select" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
            onchange="if(this.value) window.promptLab.loadPreset(this.value)"
            title="Ulozene kombinace zamcenych poli + upravenych promptu. Nacte se jednim kliknutim.">
            <option value="">Presety...</option>
            ${presets.map(p => html`<option value="${p.id}">${esc(p.name)}</option>`).join('')}
          </select>
          <button onclick="window.promptLab.savePreset()"
            class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
            title="Ulozi aktualni zamcena pole, jejich hodnoty a upravene prompty jako preset.">
            Ulozit preset
          </button>
          ${presets.length > 0 ? html`
            <button onclick="window.promptLab.deletePreset()"
              class="px-2 py-1 bg-slate-700 hover:bg-red-900 rounded text-xs transition-colors">
              Smazat
            </button>
          ` : ''}
          <button onclick="window.promptLab.resetLab()"
            class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors flex items-center gap-1"
            title="Vymaze vse a zacne s prazdnou zahadou. Zamky, prompty i vysledky se smazou.">
            <span class="material-symbols-outlined" style="font-size:14px">add</span>
            Nova
          </button>
          <button onclick="window.promptLab.importMystery()"
            class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors flex items-center gap-1"
            title="Nacte aktivni zahadu z kampane jako pracovni kopii. Puvodni zahada se nezmeni.">
            <span class="material-symbols-outlined" style="font-size:14px">download</span>
            Import zahady
          </button>
          ${hasAI ? html`
            <button onclick="window.promptLab.testFullMystery()"
              class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
              ${isTestingFull ? 'disabled' : ''}
              title="Posle jeden velky prompt do AI a vygeneruje celou zahadu najednou. Spusti kontroly koherence (slabina, odpocet, NPC, zamcena pole).">
              ✨ Test cele zahady
            </button>
          ` : html`
            <span class="text-xs text-slate-500">Nastavte API klic v Settings</span>
          `}
        </div>
      </div>

      <!-- Context preview -->
      ${renderContextPreview()}

      <!-- Section filter -->
      <div class="flex gap-1 flex-wrap">
        ${[{ key: 'all', label: 'Vsechny' }, ...Object.entries(SECTION_DEFS).map(([key, def]) => ({ key, label: def.label }))].map(s => html`
          <button onclick="window.promptLab.setSection('${s.key}')"
            class="px-2 py-1 rounded text-xs font-semibold transition-colors ${activeSection === s.key
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}">
            ${s.label}
          </button>
        `).join('')}
      </div>

      <!-- Field cards -->
      <div class="space-y-3">
        ${filteredFields.map(f => renderFieldCard(f)).join('')}
      </div>

      <!-- Full test result -->
      <div id="lab-full-test-section">
        ${renderFullTestResult()}
      </div>
    </div>`;
}

// ─── Public entry point ────────────────────────────────────────

export function renderPromptLabTab(container) {
  if (!labData) {
    labData = createEmptyMystery();
    // Try auto-import from campaign
    const { campaign } = getState();
    if (campaign?.mysteries?.length) {
      const active = campaign.mysteries.find(m => m.status === 'active') || campaign.mysteries[0];
      labData = JSON.parse(JSON.stringify(active));
      for (const b of labData.bystanders || []) { if (!b.id) b.id = generateId(); }
      for (const l of labData.locations || []) { if (!l.id) l.id = generateId(); }
    }
  }
  loadPresetsFromStorage();
  renderContent();
}

// ─── Window API ────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.promptLab = {
    toggleLock(fieldPath) {
      if (lockedFields.has(fieldPath)) lockedFields.delete(fieldPath);
      else lockedFields.add(fieldPath);
      renderContent();
    },
    updateValue(fieldPath, value) {
      setFieldValue(fieldPath, value);
    },
    updatePrompt(fieldPath, text) {
      if (text.trim()) {
        promptOverrides[fieldPath] = text;
      } else {
        delete promptOverrides[fieldPath];
      }
      // Refresh the assembled prompt preview
      refreshFieldCard(fieldPath);
    },
    resetPrompt(fieldPath) {
      delete promptOverrides[fieldPath];
      refreshFieldCard(fieldPath);
    },
    testField,
    testFullMystery,
    applyResult,
    applyFullResult,
    clearResult,
    savePreset,
    loadPreset,
    deletePreset,
    resetLab,
    importMystery,
    setSection(section) {
      activeSection = section;
      renderContent();
    },
    _trackPromptToggle(fieldPath, detailsEl) {
      // Track which prompt editor is open (fires before toggle)
      setTimeout(() => {
        openPromptEditor = detailsEl?.open ? null : fieldPath;
      }, 0);
    }
  };
}
