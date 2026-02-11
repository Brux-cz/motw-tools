/**
 * Pool Editor — UI for editing generator data pools
 * Each pool has textarea + copy/save/reset buttons
 */

import { escapeHtml } from '../../utils/html.js';
import { poolStorage } from './pool-storage.js';
import {
  DEFAULT_TITULY_M, DEFAULT_TITULY_F, DEFAULT_JMENA_MUZI, DEFAULT_JMENA_ZENY,
  DEFAULT_ATMOSFERY, DEFAULT_RYSY, DEFAULT_ZVRATY, DEFAULT_ADJEKTIVA,
  DEFAULT_LOKACE, DEFAULT_NAVNADA_AKCE,
  getTitulyM, getTitulyF, getJmenaMuzi, getJmenaZeny,
  getAtmosfery, getRysy, getZvraty, getAdjektiva, getLokace, getNavnadaAkce
} from './generator-tab.js';

// ─── Pool definitions ─────────────────────────────────────────

const POOL_DEFS = [
  {
    key: 'titulyM', label: 'Tituly příšer (muži)', format: 'lines',
    getDefault: () => DEFAULT_TITULY_M, getCurrent: getTitulyM,
    hint: 'Jeden titul na řádek, např. "Pán much"'
  },
  {
    key: 'titulyF', label: 'Tituly příšer (ženy)', format: 'lines',
    getDefault: () => DEFAULT_TITULY_F, getCurrent: getTitulyF,
    hint: 'Jeden titul na řádek, např. "Bílá paní"'
  },
  {
    key: 'jmenaMuzi', label: 'Jména NPC (muži)', format: 'lines',
    getDefault: () => DEFAULT_JMENA_MUZI, getCurrent: getJmenaMuzi,
    hint: 'Jedno jméno na řádek, např. "Dr. Novák"'
  },
  {
    key: 'jmenaZeny', label: 'Jména NPC (ženy)', format: 'lines',
    getDefault: () => DEFAULT_JMENA_ZENY, getCurrent: getJmenaZeny,
    hint: 'Jedno jméno na řádek, např. "Dr. Sýkorová"'
  },
  {
    key: 'atmosfery', label: 'Atmosféry', format: 'lines',
    getDefault: () => DEFAULT_ATMOSFERY, getCurrent: getAtmosfery,
    hint: 'Jedna atmosféra na řádek, např. "kde neustále prší"'
  },
  {
    key: 'rysy', label: 'Podivné rysy příšer', format: 'lines',
    getDefault: () => DEFAULT_RYSY, getCurrent: getRysy,
    hint: 'Jeden rys na řádek, např. "neustále hoří"'
  },
  {
    key: 'zvraty', label: 'Dějové zvraty', format: 'lines',
    getDefault: () => DEFAULT_ZVRATY, getCurrent: getZvraty,
    hint: 'Jeden zvrat na řádek, např. "Příšera se jen brání..."'
  },
  {
    key: 'adjektiva', label: 'Adjektiva lokací', format: 'pipe',
    getDefault: () => DEFAULT_ADJEKTIVA, getCurrent: getAdjektiva,
    segments: 2, segmentNames: ['kořen', 'typ'],
    hint: 'Formát: kořen | typ (tvrde/mekke/nesklonne)\nPříklad: Opuštěn | tvrde',
    validate: validateAdjektiva,
    aiHelper: {
      placeholder: 'Např. zarostlý, luxusní, podmořský...',
      prompt: (word) => `České adjektivum "${word}" — rozlož na kořen (základ bez koncovky) a typ skloňování.
Typ: "tvrde" (vzor mladý, např. opuštěný→Opuštěn), "mekke" (vzor jarní, např. podzemní→Podzemn), "nesklonne" (nesklonné, např. high-tech).
Vrať POUZE JSON pole: ["kořen", "typ"]. Bez dalšího textu.`
    }
  },
  {
    key: 'lokace', label: 'Lokace', format: 'pipe-object',
    getDefault: () => DEFAULT_LOKACE, getCurrent: getLokace,
    segments: 4, segmentNames: ['nominativ', 'genitiv', 'lokál', 'rod'],
    hint: 'Formát: nominativ | genitiv | lokál s předložkou | rod\nRod: m/f/n/pl\nPříklad: Blázinec | Blázince | v Blázinci | m',
    validate: validateLokace,
    aiHelper: {
      placeholder: 'Např. blázinec, kostel, stadion...',
      prompt: (word) => `České podstatné jméno "${word}" — vyskloňuj a urči rod.
Vrať POUZE JSON objekt: {"nom":"nominativ","gen":"genitiv","lok":"lokál s předložkou (v/ve/na)","rod":"m/f/n/pl"}
Příklad: {"nom":"Blázinec","gen":"Blázince","lok":"v Blázinci","rod":"m"}
Bez dalšího textu.`
    }
  },
  {
    key: 'navnadaAkce', label: 'Akce návnady', format: 'pipe',
    getDefault: () => DEFAULT_NAVNADA_AKCE, getCurrent: getNavnadaAkce,
    segments: 2, segmentNames: ['mužský tvar', 'ženský tvar'],
    hint: 'Formát: mužský tvar | ženský tvar\nPříklad: našel zohavené tělo | našla zohavené tělo',
    validate: validateNavnadaAkce,
    aiHelper: {
      placeholder: 'Např. stopy krve, neznámý telefonát, přízrak...',
      prompt: (word) => `Potřebuji návnadu (hook) pro TTRPG záhadu. Vstup od uživatele: "${word}"
Vytvoř z toho krátkou akční frázi v minulém čase popisující co svědek zažil/udělal.
Fráze musí dávat smysl jako: "[Jméno] [fráze]", např. "Petr našel zohavené tělo".
Vrať DVĚ varianty — mužský a ženský rod (liší se tvarem slovesa).
Příklady: ["našel zohavené tělo","našla zohavené tělo"], ["dostal neznámý telefonát","dostala neznámý telefonát"]
Vrať POUZE JSON pole: ["mužský tvar","ženský tvar"]. Bez dalšího textu.`
    }
  }
];

// ─── Serialization: pool data → textarea text ──────────────────

function poolToText(def) {
  const data = def.getCurrent();
  if (def.format === 'lines') {
    return data.join('\n');
  }
  if (def.format === 'pipe') {
    return data.map(item => item.join(' | ')).join('\n');
  }
  if (def.format === 'pipe-object') {
    // lokace: {nom, gen, lok, rod} → "nom | gen | lok | rod"
    return data.map(item => `${item.nom} | ${item.gen} | ${item.lok} | ${item.rod}`).join('\n');
  }
  return '';
}

// ─── Parsing: textarea text → pool data ─────────────────────────

function parseLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

function parsePipe(text, expectedSegments) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const errors = [];
  const result = [];
  lines.forEach((line, i) => {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length !== expectedSegments) {
      errors.push(`Řádek ${i + 1}: očekáváno ${expectedSegments} segmentů oddělených "|", nalezeno ${parts.length}`);
    } else {
      result.push(parts);
    }
  });
  return { result, errors };
}

function parsePipeObject(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const errors = [];
  const result = [];
  lines.forEach((line, i) => {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length !== 4) {
      errors.push(`Řádek ${i + 1}: očekáváno 4 segmenty (nom|gen|lok|rod), nalezeno ${parts.length}`);
    } else {
      result.push({ nom: parts[0], gen: parts[1], lok: parts[2], rod: parts[3] });
    }
  });
  return { result, errors };
}

// ─── Validation ────────────────────────────────────────────────

const VALID_ADJ_TYPES = ['tvrde', 'mekke', 'nesklonne'];
const VALID_RODY = ['m', 'f', 'n', 'pl'];

function validateAdjektiva(data) {
  const errors = [];
  data.forEach((item, i) => {
    if (!VALID_ADJ_TYPES.includes(item[1])) {
      errors.push(`Řádek ${i + 1}: neplatný typ "${item[1]}" — povolené: ${VALID_ADJ_TYPES.join(', ')}`);
    }
  });
  return errors;
}

function validateLokace(data) {
  const errors = [];
  data.forEach((item, i) => {
    if (!VALID_RODY.includes(item.rod)) {
      errors.push(`Řádek ${i + 1}: neplatný rod "${item.rod}" — povolené: ${VALID_RODY.join(', ')}`);
    }
  });
  return errors;
}

function validateNavnadaAkce(data) {
  const errors = [];
  data.forEach((item, i) => {
    if (!item[0] || !item[1]) {
      errors.push(`Řádek ${i + 1}: oba tvary (mužský i ženský) musí být vyplněné`);
    }
  });
  return errors;
}

// ─── Render ────────────────────────────────────────────────────

export function renderPoolEditor() {
  const poolCards = POOL_DEFS.map(def => {
    const data = def.getCurrent();
    const count = data.length;
    const text = poolToText(def);
    const isCustom = poolStorage.get(def.key) !== null;

    return `
      <div class="bg-black/20 border border-white/10 rounded-lg p-4" data-pool="${def.key}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold">${escapeHtml(def.label)}</h3>
            <span class="text-xs text-gray-500">${count} položek</span>
            ${isCustom ? '<span class="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">upraveno</span>' : ''}
          </div>
          <div class="flex gap-1.5">
            <button data-action="copy" data-pool-key="${def.key}"
              class="flex items-center gap-1 text-xs bg-gray-800/60 hover:bg-gray-700/80 px-2 py-1 rounded border border-white/10 transition"
              title="Kopírovat do schránky">
              <span class="material-symbols-outlined text-xs">content_copy</span> Kopírovat
            </button>
            <button data-action="save" data-pool-key="${def.key}"
              class="flex items-center gap-1 text-xs bg-green-900/40 hover:bg-green-800/60 px-2 py-1 rounded border border-green-700/30 transition"
              title="Uložit změny">
              <span class="material-symbols-outlined text-xs">save</span> Uložit
            </button>
            <button data-action="reset" data-pool-key="${def.key}"
              class="flex items-center gap-1 text-xs bg-red-900/30 hover:bg-red-800/50 px-2 py-1 rounded border border-red-700/30 transition"
              title="Reset na výchozí">
              <span class="material-symbols-outlined text-xs">restart_alt</span> Reset
            </button>
          </div>
        </div>
        ${def.hint ? `<p class="text-xs text-gray-500 mb-2 whitespace-pre-line">${escapeHtml(def.hint)}</p>` : ''}
        <textarea data-pool-textarea="${def.key}" rows="${Math.min(Math.max(count, 4), 12)}"
          class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:border-blue-700/50 focus:outline-none resize-y"
          spellcheck="false">${escapeHtml(text)}</textarea>
        ${def.aiHelper ? `
        <div class="flex gap-2 mt-2">
          <input type="text" data-ai-input="${def.key}"
            class="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-purple-700/50 focus:outline-none"
            placeholder="${escapeHtml(def.aiHelper.placeholder)}">
          <button data-action="ai-add" data-pool-key="${def.key}"
            class="flex items-center gap-1 text-xs bg-purple-900/40 hover:bg-purple-800/60 px-3 py-1.5 rounded border border-purple-700/30 transition whitespace-nowrap">
            <span class="material-symbols-outlined text-xs">auto_awesome</span> AI doplnit
          </button>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <button onclick="window.mysteryGenerator.backToList()"
          class="text-gray-400 hover:text-white transition p-1">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-2xl font-bold flex-1 flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-400">database</span>
          Datové pooly generátoru
        </h2>
        <button id="pool-reset-all"
          class="flex items-center gap-1 text-xs bg-red-900/30 hover:bg-red-800/50 px-3 py-1.5 rounded border border-red-700/30 transition">
          <span class="material-symbols-outlined text-xs">restart_alt</span> Resetovat vše
        </button>
      </div>
      <p class="text-sm text-gray-400 mb-6">
        Upravte obsah datových poolů generátoru. Zkopírujte pool, dejte AI rozšířit, a vložte zpět.
        Změny se ukládají do prohlížeče (localStorage) a přežijí reload stránky.
      </p>
      <div class="space-y-4">
        ${poolCards}
      </div>
    </div>
  `;
}

// ─── Event handlers ────────────────────────────────────────────

export function initPoolEditorHandlers() {
  // Copy buttons
  document.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.addEventListener('click', () => handleCopy(btn.dataset.poolKey));
  });

  // Save buttons
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', () => handleSave(btn.dataset.poolKey));
  });

  // Reset buttons
  document.querySelectorAll('[data-action="reset"]').forEach(btn => {
    btn.addEventListener('click', () => handleReset(btn.dataset.poolKey));
  });

  // AI add buttons
  document.querySelectorAll('[data-action="ai-add"]').forEach(btn => {
    btn.addEventListener('click', () => handleAiAdd(btn.dataset.poolKey, btn));
  });

  // Enter key in AI input triggers AI add
  document.querySelectorAll('[data-ai-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const key = input.dataset.aiInput;
        const btn = document.querySelector(`[data-action="ai-add"][data-pool-key="${key}"]`);
        handleAiAdd(key, btn);
      }
    });
  });

  // Reset all button
  document.getElementById('pool-reset-all')?.addEventListener('click', handleResetAll);
}

async function handleCopy(key) {
  const textarea = document.querySelector(`[data-pool-textarea="${key}"]`);
  if (!textarea) return;
  try {
    await navigator.clipboard.writeText(textarea.value);
    window.showToast({ message: 'Zkopírováno do schránky', type: 'success' });
  } catch {
    textarea.select();
    document.execCommand('copy');
    window.showToast({ message: 'Zkopírováno do schránky', type: 'success' });
  }
}

function handleSave(key) {
  const def = POOL_DEFS.find(d => d.key === key);
  if (!def) return;
  const textarea = document.querySelector(`[data-pool-textarea="${key}"]`);
  if (!textarea) return;
  const text = textarea.value;

  // Parse based on format
  let data, errors = [];

  if (def.format === 'lines') {
    data = parseLines(text);
    if (data.length === 0) {
      window.showToast({ message: 'Pool nemůže být prázdný', type: 'error' });
      return;
    }
  } else if (def.format === 'pipe') {
    const parsed = parsePipe(text, def.segments);
    data = parsed.result;
    errors = parsed.errors;
  } else if (def.format === 'pipe-object') {
    const parsed = parsePipeObject(text);
    data = parsed.result;
    errors = parsed.errors;
  }

  if (errors.length > 0) {
    window.showToast({ message: errors[0], type: 'error', duration: 5000 });
    return;
  }

  if (data.length === 0) {
    window.showToast({ message: 'Pool nemůže být prázdný', type: 'error' });
    return;
  }

  // Additional validation
  if (def.validate) {
    const validationErrors = def.validate(data);
    if (validationErrors.length > 0) {
      window.showToast({ message: validationErrors[0], type: 'error', duration: 5000 });
      return;
    }
  }

  poolStorage.set(key, data);
  window.showToast({ message: `${def.label}: uloženo (${data.length} položek)`, type: 'success' });

  // Re-render to update badge and count
  const container = document.getElementById('generator-tab-content');
  if (container) {
    container.innerHTML = renderPoolEditor();
    initPoolEditorHandlers();
  }
}

function handleReset(key) {
  const def = POOL_DEFS.find(d => d.key === key);
  if (!def) return;

  poolStorage.reset(key);
  window.showToast({ message: `${def.label}: obnoveno na výchozí`, type: 'success' });

  // Re-render
  const container = document.getElementById('generator-tab-content');
  if (container) {
    container.innerHTML = renderPoolEditor();
    initPoolEditorHandlers();
  }
}

function handleResetAll() {
  if (!confirm('Opravdu chcete resetovat všechny pooly na výchozí hodnoty?')) return;

  poolStorage.resetAll();
  window.showToast({ message: 'Všechny pooly obnoveny na výchozí', type: 'success' });

  // Re-render
  const container = document.getElementById('generator-tab-content');
  if (container) {
    container.innerHTML = renderPoolEditor();
    initPoolEditorHandlers();
  }
}

// ─── AI helper ─────────────────────────────────────────────────

function formatAiResult(def, data) {
  if (def.format === 'pipe-object') {
    // lokace: {nom, gen, lok, rod} → "nom | gen | lok | rod"
    return `${data.nom} | ${data.gen} | ${data.lok} | ${data.rod}`;
  }
  if (def.format === 'pipe') {
    // array → "a | b"
    return Array.isArray(data) ? data.join(' | ') : String(data);
  }
  return String(data);
}

function parseAiJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

async function handleAiAdd(key, btn) {
  const def = POOL_DEFS.find(d => d.key === key);
  if (!def?.aiHelper) return;

  const input = document.querySelector(`[data-ai-input="${key}"]`);
  if (!input) return;
  const word = input.value.trim();
  if (!word) {
    window.showToast({ message: 'Zadejte slovo pro AI doplnění', type: 'error' });
    input.focus();
    return;
  }

  // Disable button during AI call
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">progress_activity</span> Generuji...';

  try {
    const { callAI } = await import('../ai/client.js');
    const prompt = def.aiHelper.prompt(word);
    const response = await callAI(prompt, {
      systemPrompt: 'Jsi český jazykový expert. Odpovídej POUZE validním JSON bez markdown bloků.',
      temperature: 0.1,
      maxTokens: 200
    });

    const data = parseAiJson(response);
    const line = formatAiResult(def, data);

    // Append to textarea
    const textarea = document.querySelector(`[data-pool-textarea="${key}"]`);
    if (textarea) {
      const current = textarea.value.trim();
      textarea.value = current ? `${current}\n${line}` : line;
    }

    input.value = '';
    window.showToast({ message: `Přidáno: ${line}`, type: 'success' });
  } catch (err) {
    console.error('AI pool helper error:', err);
    window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}
