/**
 * Mystery Creation Wizard
 *
 * Multi-step wizard for creating MOTW mysteries following best practices
 */

import { addMystery, validateMystery, getState } from '../state/store.js';
import { generateId } from '../../utils/id.js';
import { generateNPC } from '../generators/npc.js';
import { generateLocation } from '../generators/location.js';
import { html } from '../../utils/html.js';
import { showModal, hideModal } from './modals.js';
import threatsData from '../../data/threats.json';

let currentStep = 1;
const totalSteps = 8;
let mysteryData = {};
let templates = null;

/**
 * Initialize and show mystery wizard
 */
export async function showMysteryWizard() {
  // Load templates
  if (!templates) {
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'data/mystery-templates.json');
      templates = await response.json();
    } catch (error) {
      console.error('Failed to load mystery templates:', error);
      templates = { templates: [] };
    }
  }

  // Reset wizard state
  currentStep = 1;
  mysteryData = createEmptyMystery();

  // Show wizard modal
  renderWizardStep();
}

/**
 * Create empty mystery structure
 */
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
      attack: {
        description: '',
        harm: 3,
        range: 'close'
      },
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

/**
 * Render current wizard step
 */
function renderWizardStep() {
  const content = getStepContent(currentStep);

  const wizardHTML = html`
    <div class="mystery-wizard bg-slate-900 text-slate-100 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="wizard-header bg-slate-800 px-6 py-4 border-b border-slate-700">
        <h2 class="text-2xl font-bold mb-2">Vytvoření záhady</h2>
        <div class="flex items-center gap-2">
          ${Array.from({ length: totalSteps }, (_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return html`
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isActive ? 'bg-red-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-slate-700 text-slate-400' : ''}
                ">
                  ${isCompleted ? '✓' : stepNum}
                </div>
                ${stepNum < totalSteps ? html`<div class="w-8 h-0.5 ${isCompleted ? 'bg-green-600' : 'bg-slate-700'}"></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="text-sm text-slate-400 mt-2">
          Krok ${currentStep} z ${totalSteps}: ${getStepTitle(currentStep)}
        </div>
      </div>

      <!-- Content -->
      <div class="wizard-content flex-1 overflow-y-auto p-6">
        ${content}
      </div>

      <!-- Footer -->
      <div class="wizard-footer bg-slate-800 px-6 py-4 border-t border-slate-700 flex justify-between">
        <button
          onclick="window.mysteryWizard.cancel()"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Zrušit
        </button>
        <div class="flex gap-2">
          <button
            onclick="window.mysteryWizard.previousStep()"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}"
            ${currentStep === 1 ? 'disabled' : ''}
          >
            ← Zpět
          </button>
          <button
            onclick="window.mysteryWizard.nextStep()"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors font-bold"
          >
            ${currentStep === totalSteps ? 'Vytvořit záhadu' : 'Pokračovat →'}
          </button>
        </div>
      </div>
    </div>
  `;

  showModal(wizardHTML, 'mystery-wizard-modal');
}

/**
 * Get step title
 */
function getStepTitle(step) {
  const titles = {
    1: 'Námět a návnada',
    2: 'Typ příšery',
    3: 'Statistiky příšery',
    4: 'Slabina příšery',
    5: 'Odpočet (Countdown)',
    6: 'Přihlížející (NPC)',
    7: 'Lokace',
    8: 'Kontrola a dokončení'
  };
  return titles[step] || '';
}

/**
 * Get content for specific step
 */
function getStepContent(step) {
  switch (step) {
    case 1: return renderStep1_ConceptAndHook();
    case 2: return renderStep2_MonsterType();
    case 3: return renderStep3_MonsterStats();
    case 4: return renderStep4_Weakness();
    case 5: return renderStep5_Countdown();
    case 6: return renderStep6_Bystanders();
    case 7: return renderStep7_Locations();
    case 8: return renderStep8_Review();
    default: return '<div>Neplatný krok</div>';
  }
}

/**
 * Step 1: Concept and Hook
 */
function renderStep1_ConceptAndHook() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Základní koncept</h3>
        <p class="text-slate-400 text-sm mb-4">
          Začněte výběrem šablony nebo vytvořte vlastní záhadu od začátku.
        </p>
      </div>

      ${templates && templates.templates && templates.templates.length > 0 ? html`
        <div>
          <label class="block text-sm font-bold mb-2">Šablona záhady (volitelné)</label>
          <select
            id="template-select"
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
            onchange="window.mysteryWizard.applyTemplate(this.value)"
          >
            <option value="">-- Vlastní záhada --</option>
            ${templates.templates.map(t => html`
              <option value="${t.id}">${t.name} - ${t.description}</option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <div>
        <label class="block text-sm font-bold mb-2">Název záhady *</label>
        <input
          type="text"
          id="mystery-name"
          value="${mysteryData.name || ''}"
          placeholder="např. Útok mongolského červa"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.updateField('name', this.value)"
        />
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Námět (Concept) *</label>
        <textarea
          id="mystery-concept"
          rows="3"
          placeholder="Jádro nadpřirozeného problému - např. 'Čerstvě vylíhlí mongolští červi v muzeu'"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.updateField('concept', this.value)"
        >${mysteryData.concept || ''}</textarea>
        <p class="text-slate-500 text-xs mt-1">Co je podstata problému? Jak ho popsat jednou větou?</p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Návnada (Hook) *</label>
        <textarea
          id="mystery-hook"
          rows="4"
          placeholder="Co přitáhne lovce k případu? např. 'Zprávy o 3 mrtvých zaměstnancích muzea - spálení a částečně rozpuštění'"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.updateField('hook', this.value)"
        >${mysteryData.hook || ''}</textarea>
        <p class="text-slate-500 text-xs mt-1">Proč lovci začnou vyšetřovat? Co se stalo?</p>
      </div>

      <div class="bg-blue-900/30 border border-blue-700/50 rounded p-4">
        <div class="flex items-start gap-2">
          <span class="text-blue-400 font-bold">💡</span>
          <div class="text-sm">
            <p class="font-bold mb-1">Tip:</p>
            <p class="text-slate-300">Dobrá návnada je konkrétní a naléhavá. "Někdo zmizel" je slabé. "Tři teenageři zmizeli během jediné noci, na místě zůstaly pouze stopy krve" je silné.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 2: Monster Type
 */
function renderStep2_MonsterType() {
  const monsterTypes = threatsData.monsterTypes;

  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Typ a motivace příšery</h3>
        <p class="text-slate-400 text-sm mb-4">
          Typ příšery určuje její základní motivaci a chování.
        </p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Jméno příšery *</label>
        <input
          type="text"
          id="monster-name"
          value="${mysteryData.monster.name || ''}"
          placeholder="např. Rev. Silas Thorne"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.updateMonsterField('name', this.value)"
        />
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Typ příšery *</label>
        <select
          id="monster-type"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.selectMonsterType(this.value)"
        >
          <option value="">-- Vyberte typ --</option>
          ${monsterTypes.map(type => html`
            <option value="${type.type_en}" ${mysteryData.monster.type === type.type_en ? 'selected' : ''}>
              ${type.type} - ${type.motivation}
            </option>
          `).join('')}
        </select>
      </div>

      ${mysteryData.monster.type ? html`
        <div class="bg-slate-800/50 border border-slate-700 rounded p-4">
          <p class="text-sm"><span class="font-bold">Motivace:</span> ${mysteryData.monster.motivation}</p>
        </div>
      ` : ''}

      <div>
        <label class="block text-sm font-bold mb-2">Popis příšery *</label>
        <textarea
          id="monster-description"
          rows="4"
          placeholder="Jak vypadá? Jak se chová? Co je na ní unikátní?"
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
          onchange="window.mysteryWizard.updateMonsterField('description', this.value)"
        >${mysteryData.monster.description || ''}</textarea>
      </div>

      <div class="bg-amber-900/30 border border-amber-700/50 rounded p-4">
        <div class="flex items-start gap-2">
          <span class="text-amber-400 font-bold">⚠️</span>
          <div class="text-sm">
            <p class="font-bold mb-1">Důležité:</p>
            <p class="text-slate-300">Typ příšery určuje jak přemýšlí a jedná. Bestie (Beast) jedná instinktivně a brutálně. Černokněžník (Sorcerer) je vypočítavý a používá magii. Zvolte typ který nejlépe odpovídá vaší vizi.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 3: Monster Stats
 */
function renderStep3_MonsterStats() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Statistiky a schopnosti</h3>
        <p class="text-slate-400 text-sm mb-4">
          Definujte bojové statistiky a nadpřirozené schopnosti příšery.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-bold mb-2">Výdrž (Harm) *</label>
          <input
            type="number"
            id="monster-harm"
            value="${mysteryData.monster.harm || 10}"
            min="5" max="20"
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
            onchange="window.mysteryWizard.updateMonsterField('harm', parseInt(this.value))"
          />
          <p class="text-slate-500 text-xs mt-1">8-12 běžně, 14+ extrémní výzva</p>
        </div>

        <div>
          <label class="block text-sm font-bold mb-2">Zbroj (Armor) *</label>
          <input
            type="number"
            id="monster-armor"
            value="${mysteryData.monster.armor || 1}"
            min="0" max="4"
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
            onchange="window.mysteryWizard.updateMonsterField('armor', parseInt(this.value))"
          />
          <p class="text-slate-500 text-xs mt-1">1-2 typicky</p>
        </div>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Útok *</label>
        <div class="grid grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Popis útoku"
            value="${mysteryData.monster.attack.description || ''}"
            class="col-span-2 bg-slate-800 border border-slate-700 rounded px-3 py-2"
            onchange="window.mysteryWizard.updateMonsterAttack('description', this.value)"
          />
          <input
            type="number"
            placeholder="Harm"
            value="${mysteryData.monster.attack.harm || 3}"
            min="1" max="6"
            class="bg-slate-800 border border-slate-700 rounded px-3 py-2"
            onchange="window.mysteryWizard.updateMonsterAttack('harm', parseInt(this.value))"
          />
        </div>
        <select
          class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 mt-2"
          onchange="window.mysteryWizard.updateMonsterAttack('range', this.value)"
        >
          <option value="intimate" ${mysteryData.monster.attack.range === 'intimate' ? 'selected' : ''}>Intimate</option>
          <option value="hand" ${mysteryData.monster.attack.range === 'hand' ? 'selected' : ''}>Hand</option>
          <option value="close" ${mysteryData.monster.attack.range === 'close' ? 'selected' : ''}>Close</option>
          <option value="far" ${mysteryData.monster.attack.range === 'far' ? 'selected' : ''}>Far</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Nadpřirozené schopnosti</label>
        <div id="powers-list" class="space-y-2 mb-2">
          ${(mysteryData.monster.powers || []).map((power, index) => html`
            <div class="flex gap-2">
              <input
                type="text"
                value="${power}"
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2"
                onchange="window.mysteryWizard.updatePower(${index}, this.value)"
              />
              <button
                onclick="window.mysteryWizard.removePower(${index})"
                class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                ✕
              </button>
            </div>
          `).join('')}
        </div>
        <button
          onclick="window.mysteryWizard.addPower()"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
        >
          + Přidat schopnost
        </button>
        <p class="text-slate-500 text-xs mt-2">např. Telekineze, Neviditelnost, Regenerace</p>
      </div>

      <div class="bg-blue-900/30 border border-blue-700/50 rounded p-4">
        <div class="flex items-start gap-2">
          <span class="text-blue-400 font-bold">💡</span>
          <div class="text-sm">
            <p class="font-bold mb-1">Tip:</p>
            <p class="text-slate-300">Nedostatečně silná příšera znamená slabou finální konfrontaci. Příšera by měla být výzvou - dost silná aby hrozila, ale s objevitelnou slabinou.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 4: Weakness
 */
function renderStep4_Weakness() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Slabina příšery</h3>
        <p class="text-slate-400 text-sm mb-4">
          KRITICKY DŮLEŽITÉ: Bez slabiny nemohou lovci příšeru trvale porazit.
        </p>
      </div>

      <div class="bg-red-900/30 border-2 border-red-600 rounded p-6">
        <div class="flex items-start gap-3 mb-4">
          <span class="text-red-400 font-bold text-2xl">⚠️</span>
          <div>
            <p class="font-bold text-lg mb-2">Toto je nejdůležitější část záhady!</p>
            <p class="text-slate-300 text-sm">Slabina určuje JAK lze příšeru porazit. Musí být:</p>
            <ul class="list-disc list-inside text-slate-300 text-sm mt-2 space-y-1">
              <li>Objevitelná (existují stopy které k ní vedou)</li>
              <li>Logická (dává smysl v kontextu příšery)</li>
              <li>Náročná ale ne nemožná</li>
              <li>Zajímavá (ne jen "zastřelit ji")</li>
            </ul>
          </div>
        </div>

        <label class="block text-sm font-bold mb-2">Slabina *</label>
        <textarea
          id="monster-weakness"
          rows="4"
          placeholder="Jak lze příšeru trvale porazit?"
          class="w-full bg-slate-800 border-2 ${mysteryData.monster.weakness ? 'border-green-600' : 'border-red-600'} rounded px-3 py-2"
          onchange="window.mysteryWizard.updateMonsterField('weakness', this.value)"
        >${mysteryData.monster.weakness || ''}</textarea>

        ${mysteryData.monster.weakness ? html`
          <div class="mt-2 text-green-400 text-sm flex items-center gap-2">
            <span>✓</span> Slabina definována
          </div>
        ` : html`
          <div class="mt-2 text-red-400 text-sm flex items-center gap-2">
            <span>✕</span> Slabina je povinná!
          </div>
        `}
      </div>

      <div class="bg-slate-800/50 border border-slate-700 rounded p-4">
        <p class="font-bold mb-2">Příklady dobrých slabin:</p>
        <ul class="list-disc list-inside text-slate-300 text-sm space-y-1">
          <li>"Zničit jeho hůl moci" (artefakt)</li>
          <li>"Promluvit jeho pravé jméno" (znalosti)</li>
          <li>"Rozbít hrnec s jeho duší" (vodník)</li>
          <li>"Dokončit rituál který ho vyvolal pozpátku" (magie)</li>
          <li>"Voda - pokud je červ vypláchnout, jed přestane působit" (elementární)</li>
          <li>"Vyřešit minulou křivdu která ho drží v našem světě" (duchové)</li>
        </ul>
      </div>

      <div class="bg-amber-900/30 border border-amber-700/50 rounded p-4">
        <p class="font-bold mb-2">Špatné příklady:</p>
        <ul class="list-disc list-inside text-slate-300 text-sm space-y-1">
          <li>❌ "Zastřelit ji" (příliš jednoduché)</li>
          <li>❌ "Najít magický meč na druhé straně světa" (nemožné objevit)</li>
          <li>❌ "Počkat až sama zemře" (pasivní)</li>
          <li>❌ "Žádná slabina" (NIKDY!)</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Step 5: Countdown
 */
function renderStep5_Countdown() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Odpočet (Countdown)</h3>
        <p class="text-slate-400 text-sm mb-4">
          Co by se stalo kdyby lovci NIKDY nepřišli? Rozdělte cestu ke katastrofě do 6 fází.
        </p>
      </div>

      <div class="bg-blue-900/30 border border-blue-700/50 rounded p-4 mb-4">
        <div class="flex items-start gap-2">
          <span class="text-blue-400 font-bold">💡</span>
          <div class="text-sm">
            <p class="font-bold mb-1">Jak vytvořit odpočet:</p>
            <ol class="list-decimal list-inside text-slate-300 space-y-1">
              <li>Představte si úplnou katastrofu (Půlnoc)</li>
              <li>Rozložte cestu k ní do 6 logických kroků</li>
              <li>Každá fáze by měla eskalovat situaci</li>
              <li>Buďte konkrétní - "Druhá oběť" místo "situace se zhoršuje"</li>
            </ol>
          </div>
        </div>
      </div>

      ${mysteryData.countdown.phases.map((phase, index) => {
        const phaseNames = ['Den (Day)', 'Příšeří (Shadows)', 'Západ (Sunset)', 'Soumrak (Dusk)', 'Noc (Nightfall)', 'Půlnoc (Midnight)'];
        const examples = [
          'První incident - příšera dorazila do oblasti',
          'Druhý incident - vzor se opakuje',
          'Veřejná událost - více lidí si všimne',
          'Masivní akce příšery - krize je zřejmá',
          'Před katastrofou - téměř konec',
          'Totální katastrofa - bod zvratu'
        ];

        return html`
          <div class="bg-slate-800/50 border border-slate-700 rounded p-4">
            <label class="block text-sm font-bold mb-2">
              Fáze ${index + 1}: ${phaseNames[index]}
            </label>
            <textarea
              rows="2"
              placeholder="${examples[index]}"
              class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              onchange="window.mysteryWizard.updateCountdownPhase(${index}, this.value)"
            >${phase.description || ''}</textarea>
          </div>
        `;
      }).join('')}

      <div class="bg-amber-900/30 border border-amber-700/50 rounded p-4">
        <div class="flex items-start gap-2">
          <span class="text-amber-400 font-bold">⚠️</span>
          <div class="text-sm">
            <p class="font-bold mb-1">Pamatujte:</p>
            <p class="text-slate-300">Odpočet je vodítko, ne kolejnice. Během hry ho upravujte podle akcí lovců. Příšera stále sleduje svou motivaci, jen se musí přizpůsobit situaci.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 6: Bystanders
 */
function renderStep6_Bystanders() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Přihlížející (Bystanders)</h3>
        <p class="text-slate-400 text-sm mb-4">
          Obyčejní lidé kteří komplikují situaci neúmyslně. Doporučeno minimálně 2 NPC.
        </p>
      </div>

      <div class="flex gap-2 mb-4">
        <button
          onclick="window.mysteryWizard.generateBystander()"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          🎲 Generovat náhodného NPC
        </button>
        <button
          onclick="window.mysteryWizard.addEmptyBystander()"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          + Přidat ručně
        </button>
      </div>

      <div id="bystanders-list" class="space-y-4">
        ${mysteryData.bystanders.length === 0 ? html`
          <div class="text-center py-8 text-slate-500">
            <p>Zatím žádní přihlížející</p>
            <p class="text-sm mt-2">Klikněte na tlačítko výše pro přidání</p>
          </div>
        ` : ''}

        ${mysteryData.bystanders.map((npc, index) => html`
          <div class="bg-slate-800/50 border border-slate-700 rounded p-4">
            <div class="flex justify-between items-start mb-2">
              <input
                type="text"
                value="${npc.name || ''}"
                placeholder="Jméno NPC"
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 mr-2 font-bold"
                onchange="window.mysteryWizard.updateBystanderField(${index}, 'name', this.value)"
              />
              <button
                onclick="window.mysteryWizard.removeBystander(${index})"
                class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                ✕
              </button>
            </div>
            <select
              class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 mb-2"
              onchange="window.mysteryWizard.updateBystanderType(${index}, this.value)"
            >
              <option value="">-- Vyberte typ --</option>
              ${threatsData.bystanderTypes.map(type => html`
                <option value="${type.type_en}" ${npc.type === type.type ? 'selected' : ''}>
                  ${type.type} - ${type.motivation}
                </option>
              `).join('')}
            </select>
            <textarea
              rows="2"
              placeholder="Popis NPC"
              class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              onchange="window.mysteryWizard.updateBystanderField(${index}, 'description', this.value)"
            >${npc.description || ''}</textarea>
          </div>
        `).join('')}
      </div>

      ${mysteryData.bystanders.length < 2 ? html`
        <div class="bg-amber-900/30 border border-amber-700/50 rounded p-4">
          <div class="flex items-start gap-2">
            <span class="text-amber-400 font-bold">⚠️</span>
            <div class="text-sm">
              <p class="font-bold mb-1">Doporučení:</p>
              <p class="text-slate-300">Přidejte minimálně 2 přihlížející. Jsou to lidé k záchraně a zdroj komplikací. Bez nich záhada postrádá lidský element.</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Step 7: Locations
 */
function renderStep7_Locations() {
  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Lokace</h3>
        <p class="text-slate-400 text-sm mb-4">
          Důležitá místa která jsou aktivními hrozbami, ne jen pozadí.
        </p>
      </div>

      <div class="flex gap-2 mb-4">
        <button
          onclick="window.mysteryWizard.generateLocation()"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          🎲 Generovat náhodnou lokaci
        </button>
        <button
          onclick="window.mysteryWizard.addEmptyLocation()"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          + Přidat ručně
        </button>
      </div>

      <div id="locations-list" class="space-y-4">
        ${mysteryData.locations.length === 0 ? html`
          <div class="text-center py-8 text-slate-500">
            <p>Zatím žádné lokace</p>
            <p class="text-sm mt-2">Klikněte na tlačítko výše pro přidání</p>
          </div>
        ` : ''}

        ${mysteryData.locations.map((loc, index) => html`
          <div class="bg-slate-800/50 border border-slate-700 rounded p-4">
            <div class="flex justify-between items-start mb-2">
              <input
                type="text"
                value="${loc.name || ''}"
                placeholder="Název lokace"
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 mr-2 font-bold"
                onchange="window.mysteryWizard.updateLocationField(${index}, 'name', this.value)"
              />
              <button
                onclick="window.mysteryWizard.removeLocation(${index})"
                class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                ✕
              </button>
            </div>
            <select
              class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 mb-2"
              onchange="window.mysteryWizard.updateLocationType(${index}, this.value)"
            >
              <option value="">-- Vyberte typ --</option>
              ${threatsData.locationTypes.map(type => html`
                <option value="${type.type_en}" ${loc.type === type.type ? 'selected' : ''}>
                  ${type.type} - ${type.motivation}
                </option>
              `).join('')}
            </select>
            <textarea
              rows="2"
              placeholder="Popis lokace a její nebezpečí"
              class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
              onchange="window.mysteryWizard.updateLocationField(${index}, 'description', this.value)"
            >${loc.description || ''}</textarea>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Step 8: Review
 */
function renderStep8_Review() {
  const validation = validateMystery(mysteryData);

  return html`
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-bold mb-2">Kontrola a dokončení</h3>
        <p class="text-slate-400 text-sm mb-4">
          Zkontrolujte všechny části záhady před vytvořením.
        </p>
      </div>

      ${validation.errors.length > 0 ? html`
        <div class="bg-red-900/30 border-2 border-red-600 rounded p-4">
          <p class="font-bold text-red-400 mb-2">⚠️ Chyby (musí být opraveny):</p>
          <ul class="list-disc list-inside text-sm space-y-1">
            ${validation.errors.map(err => html`<li>${err}</li>`).join('')}
          </ul>
        </div>
      ` : html`
        <div class="bg-green-900/30 border-2 border-green-600 rounded p-4">
          <p class="font-bold text-green-400">✓ Všechny povinné části jsou kompletní!</p>
        </div>
      `}

      ${validation.warnings.length > 0 ? html`
        <div class="bg-amber-900/30 border border-amber-700/50 rounded p-4">
          <p class="font-bold text-amber-400 mb-2">⚠️ Varování (doporučení):</p>
          <ul class="list-disc list-inside text-sm space-y-1">
            ${validation.warnings.map(warn => html`<li>${warn}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="bg-slate-800/50 border border-slate-700 rounded p-6">
        <h4 class="font-bold mb-4 text-lg">Souhrn záhady:</h4>

        <div class="space-y-4 text-sm">
          <div>
            <p class="text-slate-400">Název:</p>
            <p class="font-bold">${mysteryData.name || '(bez názvu)'}</p>
          </div>

          <div>
            <p class="text-slate-400">Námět:</p>
            <p>${mysteryData.concept || '(neuvedeno)'}</p>
          </div>

          <div>
            <p class="text-slate-400">Návnada:</p>
            <p>${mysteryData.hook || '(neuvedeno)'}</p>
          </div>

          <div>
            <p class="text-slate-400">Příšera:</p>
            <p class="font-bold">${mysteryData.monster.name || '(bez jména)'}</p>
            <p class="text-slate-500">${mysteryData.monster.type_cz || mysteryData.monster.type || '(bez typu)'}</p>
            <p class="text-red-400 mt-1">Slabina: ${mysteryData.monster.weakness || '❌ CHYBÍ'}</p>
          </div>

          <div>
            <p class="text-slate-400">Přihlížející:</p>
            <p>${mysteryData.bystanders.length} NPC</p>
          </div>

          <div>
            <p class="text-slate-400">Lokace:</p>
            <p>${mysteryData.locations.length} míst</p>
          </div>

          <div>
            <p class="text-slate-400">Odpočet:</p>
            <p>${mysteryData.countdown.phases.filter(p => p.description).length} z 6 fází popsáno</p>
          </div>
        </div>
      </div>

      ${!validation.isValid ? html`
        <div class="bg-red-900/30 border border-red-600 rounded p-4">
          <p class="text-sm text-red-300">
            Před vytvořením záhady opravte všechny chyby. Použijte tlačítko "Zpět" pro návrat k předchozím krokům.
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Navigation and data management functions
 */
export function nextStep() {
  if (currentStep === totalSteps) {
    // Final step - save mystery
    saveMystery();
  } else {
    currentStep++;
    renderWizardStep();
  }
}

export function previousStep() {
  if (currentStep > 1) {
    currentStep--;
    renderWizardStep();
  }
}

export function cancel() {
  if (confirm('Opravdu chcete zrušit vytváření záhady? Všechna data budou ztracena.')) {
    hideModal('mystery-wizard-modal');
  }
}

/**
 * Save mystery
 */
function saveMystery() {
  const validation = validateMystery(mysteryData);

  if (!validation.isValid) {
    alert('Záhada obsahuje chyby a nemůže být uložena. Opravte prosím všechny chyby.');
    return;
  }

  // Add mystery to campaign
  addMystery(mysteryData);

  // Close modal
  hideModal('mystery-wizard-modal');

  // Show success message
  alert('Záhada byla úspěšně vytvořena!');

  // Refresh UI
  if (window.__MOTW__?.renderSessionTab) {
    window.__MOTW__.renderSessionTab();
  }
}

/**
 * Data update functions
 */
export function updateField(field, value) {
  mysteryData[field] = value;
}

export function updateMonsterField(field, value) {
  mysteryData.monster[field] = value;
}

export function updateMonsterAttack(field, value) {
  mysteryData.monster.attack[field] = value;
}

export function selectMonsterType(typeEn) {
  const type = threatsData.monsterTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.monster.type = type.type_en;
    mysteryData.monster.type_cz = type.type;
    mysteryData.monster.motivation = type.motivation;
  }
  renderWizardStep();
}

export function addPower() {
  mysteryData.monster.powers.push('');
  renderWizardStep();
}

export function updatePower(index, value) {
  mysteryData.monster.powers[index] = value;
}

export function removePower(index) {
  mysteryData.monster.powers.splice(index, 1);
  renderWizardStep();
}

export function updateCountdownPhase(index, value) {
  mysteryData.countdown.phases[index].description = value;
}

export async function generateBystander() {
  const npc = await generateNPC();
  mysteryData.bystanders.push(npc);
  renderWizardStep();
}

export function addEmptyBystander() {
  mysteryData.bystanders.push({
    id: generateId(),
    name: '',
    type: '',
    motivation: '',
    description: '',
    status: 'alive'
  });
  renderWizardStep();
}

export function updateBystanderField(index, field, value) {
  mysteryData.bystanders[index][field] = value;
}

export function updateBystanderType(index, typeEn) {
  const type = threatsData.bystanderTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.bystanders[index].type = type.type;
    mysteryData.bystanders[index].motivation = type.motivation;
  }
  renderWizardStep();
}

export function removeBystander(index) {
  mysteryData.bystanders.splice(index, 1);
  renderWizardStep();
}

export async function generateLocation() {
  const loc = await generateLocation();
  mysteryData.locations.push(loc);
  renderWizardStep();
}

export function addEmptyLocation() {
  mysteryData.locations.push({
    id: generateId(),
    name: '',
    type: '',
    motivation: '',
    description: ''
  });
  renderWizardStep();
}

export function updateLocationField(index, field, value) {
  mysteryData.locations[index][field] = value;
}

export function updateLocationType(index, typeEn) {
  const type = threatsData.locationTypes.find(t => t.type_en === typeEn);
  if (type) {
    mysteryData.locations[index].type = type.type;
    mysteryData.locations[index].motivation = type.motivation;
  }
  renderWizardStep();
}

export function removeLocation(index) {
  mysteryData.locations.splice(index, 1);
  renderWizardStep();
}

export function applyTemplate(templateId) {
  if (!templateId) return;

  const template = templates.templates.find(t => t.id === templateId);
  if (!template) return;

  const structure = template.structure;

  // Apply template data
  mysteryData.hook = structure.hook;
  mysteryData.concept = template.description;

  // Apply monster template
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

  // Apply countdown template
  if (structure.countdown) {
    structure.countdown.forEach((phase, index) => {
      if (mysteryData.countdown.phases[index]) {
        mysteryData.countdown.phases[index].description = phase.description;
      }
    });
  }

  renderWizardStep();
  alert(`Šablona "${template.name}" byla aplikována. Upravte detaily podle potřeby.`);
}

// Export functions to window for onclick handlers
if (typeof window !== 'undefined') {
  window.mysteryWizard = {
    showMysteryWizard,
    nextStep,
    previousStep,
    cancel,
    updateField,
    updateMonsterField,
    updateMonsterAttack,
    selectMonsterType,
    addPower,
    updatePower,
    removePower,
    updateCountdownPhase,
    generateBystander,
    addEmptyBystander,
    updateBystanderField,
    updateBystanderType,
    removeBystander,
    generateLocation,
    addEmptyLocation,
    updateLocationField,
    updateLocationType,
    removeLocation,
    applyTemplate
  };
}
