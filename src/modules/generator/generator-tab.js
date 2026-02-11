/**
 * Mystery Generator - Main UI Module
 * Three views: list, edit, detail
 * Independent mystery builder with unified Threat (Hrozba) entity
 */

import { escapeHtml } from '../../utils/html.js';
import { ThreatType, ThreatTypeLabels, createThreat, createCountdown, createMystery } from './model.js';
import { loadAllMysteries, saveMystery, deleteMystery, getMysteryById } from './storage.js';
import threatsData from '../../data/threats.json';

// ─── Module-level state ────────────────────────────────────────

let currentView = 'list';       // 'list' | 'edit' | 'detail'
let currentMystery = null;      // Mystery being edited/viewed
let isGenerating = false;       // AI generation in progress

const COUNTDOWN_FIELDS = [
  { key: 'den', label: 'Den' },
  { key: 'priseri', label: 'Příšeří' },
  { key: 'zapad_slunce', label: 'Západ slunce' },
  { key: 'soumrak', label: 'Soumrak' },
  { key: 'noc', label: 'Noc' },
  { key: 'pulnoc', label: 'Půlnoc' }
];

// Threat subtype options from threats.json
function getSubtypes(typ) {
  switch (typ) {
    case ThreatType.PRISERA: return threatsData.monsterTypes;
    case ThreatType.PRISLUHOVAC: return threatsData.minionTypes;
    case ThreatType.PRIHLIZEJICI: return threatsData.bystanderTypes.filter(t => !t.type.startsWith('**'));
    case ThreatType.LOKALITA: return threatsData.locationTypes;
    default: return [];
  }
}

// Which fields are visible for each threat type
function threatHasField(typ, field) {
  if (typ === ThreatType.PRIHLIZEJICI) {
    return !['utoky', 'zivoty', 'zbroj'].includes(field);
  }
  if (typ === ThreatType.LOKALITA) {
    return !['utoky', 'zivoty', 'zbroj', 'schopnosti'].includes(field);
  }
  return true;
}

// ─── Atomický generátor (no AI) ────────────────────────────────
// Rozbitý na prvočinitele: adjektivum+místo, rys příšery, zvrat

// Technika 1: Adjektivum + Substantivum → unikátní lokace
const ADJEKTIVA_MISTA = [
  'Opuštěná', 'Zatopená', 'Vyhořelá', 'Luxusní', 'Podzemní',
  'Mlžná', 'Zamořená plísní', 'High-tech', 'Středověká', 'Vojenská',
  'Zchátralá', 'Přelidněná', 'Nově postavená', 'Prokletá', 'Izolovaná'
];
const PODSTATNA_MISTA = [
  'Škola', 'Nemocnice', 'Továrna', 'Knihovna', 'Zoo',
  'Stanice metra', 'Přehrada', 'Vila starosty', 'Katedrála',
  'Hřbitov', 'Tržnice', 'Sanatorium', 'Důl', 'Letiště'
];
const ATMOSFERY = [
  'kde neustále prší', 'kde vypadává elektřina', 'kde je hrobové ticho',
  'kde teplota klesá pod nulu', 'odkud se nedá dovolat pomoc',
  'kde se kompasy točí dokola', 'kde se zdi potí krví'
];

// Technika 2: Podivné rysy → unikátní příšera
const PODIVNE_RYSY = [
  'je neustále v plamenech',
  'je neviditelná na přímém světle',
  'mluví hlasem malého dítěte',
  'je složená z odpadků a kovu',
  'vydává zvuk jako porouchané rádio',
  'kape z ní černý olej',
  'má o pět končetin více, než by měla mít',
  'svítí neonově modře',
  'má místo očí hodiny',
  'je pokrytá zrcadlovými střepy',
  'zapáchá po spáleném cukru',
  'vrhá stín, i když nestojí ve světle'
];

// Technika 3: Dějové zvraty → mění pravidla hry
const ZVRATY = [
  'Příšera se jen brání, skutečným zlem je někdo z lidí.',
  'Celá lokace je v časové smyčce, den se opakuje.',
  'Příšera je ve skutečnosti halucinace způsobená plynem.',
  'Místní policie o příšeře ví a krmí ji.',
  'Příšera hledá své ztracené mládě, nechce zabíjet.',
  'Magie v této oblasti nefunguje (nebo funguje opačně).',
  'Oběti se dobrovolně nechávají sežrat — jsou součástí kultu.',
  'Přihlížející je ve skutečnosti šedá eminence za vším.',
  'Příšera tu byla dřív než lidé — tohle je její území.',
  'Lokace je živá a záměrně láká oběti dovnitř.'
];

// Pravidlové statistiky podle typu příšery (HP, zbroj)
const TYPY_STATS = {
  'Bestie':      { hp: [10, 12], zbroj: 1 },
  'Černokněžník': { hp: [8, 10],  zbroj: 1 },
  'Královna':    { hp: [10, 12], zbroj: 2 },
  'Mučitel':     { hp: [8, 10],  zbroj: 0 },
  'Ničitel':     { hp: [12, 15], zbroj: 2 },
  'Parazit':     { hp: [8, 10],  zbroj: 0 },
  'Pokušitel':   { hp: [8, 10],  zbroj: 0 },
  'Popravčí':    { hp: [10, 12], zbroj: 1 },
  'Požírač':     { hp: [11, 14], zbroj: 1 },
  'Sběratel':    { hp: [9, 11],  zbroj: 1 },
  'Šibal':       { hp: [7, 9],   zbroj: 0 },
  'Zploditel':   { hp: [10, 12], zbroj: 1 }
};

// Strukturované útoky: { nazev, dmg, stitky[] }
const UTOKY_POOL = [
  { nazev: 'Drápy',             dmg: 3, stitky: ['blízko', 'brutální'] },
  { nazev: 'Kousnutí',          dmg: 4, stitky: ['dotek', 'trhá maso'] },
  { nazev: 'Chapadla',          dmg: 3, stitky: ['blízko', 'svírající'] },
  { nazev: 'Jedovatý plivnutí', dmg: 2, stitky: ['daleko'] },
  { nazev: 'Stínový úder',      dmg: 3, stitky: ['magický'] },
  { nazev: 'Psychický nápor',   dmg: 2, stitky: ['ignoruje zbroj'] },
  { nazev: 'Drtivý náraz',      dmg: 4, stitky: ['blízko', 'brutální'] },
  { nazev: 'Poleptání',         dmg: 3, stitky: ['dotek', 'bolestivý'] },
  { nazev: 'Paralyza dotykem',  dmg: 1, stitky: ['dotek', 'ochromující'] },
  { nazev: 'Temná magie',       dmg: 3, stitky: ['daleko', 'magický'] }
];

// Nadpřirozené schopnosti per typ příšery (bod 2 pravidel)
const SCHOPNOSTI_POOL = {
  'Bestie':       ['Noční vidění', 'Regenerace', 'Nadlidská síla', 'Stopování kořisti po čichu', 'Tvaroměnnost'],
  'Černokněžník': ['Seslání kletby', 'Iluze', 'Telekineze', 'Čtení myšlenek', 'Magická bariéra'],
  'Královna':     ['Ovládání myslí', 'Posednutí hostitele', 'Telepatická síť', 'Přivolání přisluhovačů', 'Hypnóza'],
  'Mučitel':      ['Vyvolání bolesti na dálku', 'Noční můry', 'Paralýza strachem', 'Zesílení utrpení', 'Nehynoucí nenávist'],
  'Ničitel':      ['Zemětřesení', 'Destruktivní aura', 'Nezranitelnost konvenčními zbraněmi', 'Pohlcení matérie', 'Neúnavnost'],
  'Parazit':      ['Přisátí na hostitele', 'Vysávání životní síly', 'Ovládnutí těla', 'Maskování za hostitele', 'Rozmnožování'],
  'Pokušitel':    ['Tvarová proměna', 'Šarm a okouzlení', 'Šeptání do snů', 'Splnění přání (s háčkem)', 'Iluze krásy'],
  'Popravčí':     ['Neochvějné pronásledování', 'Cit pro vinu', 'Procházení zdmi', 'Teleportace k cíli', 'Nezastavitelnost'],
  'Požírač':      ['Rozpínající se tlama', 'Kyselé trávení', 'Pohlcení celé oběti', 'Lákavá vůně', 'Nekonečný hlad'],
  'Sběratel':     ['Lokalizace předmětů', 'Dimenzionální kapsa', 'Uvěznění ve sbírce', 'Magické pouto k předmětům', 'Neviditelnost'],
  'Šibal':        ['Změna tvaru', 'Klonování', 'Vkládání slov do úst', 'Zmizení v záblesku', 'Převrácení pravdy'],
  'Zploditel':    ['Kladení vajec/spor', 'Přeměna obětí', 'Kontrola potomků', 'Feromony podrobení', 'Rychlý růst']
};

// Slabiny (bod 5 pravidel)
const SLABINY_POOL = [
  'Stříbro (zbraně nebo munice)', 'Oheň (zapálit ji)',
  'Svěcená voda', 'Železo (čisté, nekované)',
  'Sluneční svit', 'Specifický rituál exorcismu',
  'Zničit její totem/předmět moci', 'Sůl (vytvořit kruh)',
  'Její vlastní jméno (vyslovit pozpátku)', 'Krev nevinného (dobrovolně darovaná)',
  'Rozbít zrcadlo, ve kterém se odráží', 'Píseň z dob jejího vzniku'
];

// Skládačka návnady: KDO + CO + KDE
const NAVNADA_KDO = [
  'Místní bezdomovec', 'Vyděšený školník', 'Policejní hlídka',
  'Skupina teenagerů', 'Osamělý rybář', 'Místní blázen',
  'Investigativní novinář', 'Noční hlídač', 'Poštovní doručovatel',
  'Důchodkyně se psem'
];
const NAVNADA_CO = [
  'našel roztrhané tělo', 'viděl zářit podivné světlo',
  'slyšel nelidský řev', 'objevil kaluže divného slizu',
  'natočil na mobil stínovou postavu', 'nahlásil zmizení svého psa',
  'našel podivné symboly vyryté do zdi', 'zavolal policii kvůli zápachu',
  'zveřejnil na sítích děsivou fotku'
];
const NAVNADA_KDE = [
  'v popelnici', 'na střeše budovy', 'v zamčeném sklepě',
  'uprostřed parkoviště', 'v kanálu', 'na dětském hřišti',
  'za opuštěným skladištěm', 'u hlavní silnice', 've staré studni',
  'na kraji lesa'
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Formátování strukturovaného útoku → string pro UI
function formatUtok(utok) {
  if (typeof utok === 'string') return utok; // backward compat
  const stitkyStr = utok.stitky.join(', ');
  return `${utok.nazev} (${utok.dmg}-zranění ${stitkyStr})`;
}

// Parsování stringu → strukturovaný útok
function parseUtok(str) {
  if (typeof str === 'object' && str.nazev) return str; // already structured
  const match = str.match(/^(.+?)\s*\((\d+)-zranění\s*(.*)\)$/);
  if (!match) return { nazev: str, dmg: 0, stitky: [] };
  return {
    nazev: match[1].trim(),
    dmg: parseInt(match[2]),
    stitky: match[3].split(',').map(s => s.trim()).filter(Boolean)
  };
}

// Složí unikátní lokaci: "Zatopená Knihovna, kde vypadává elektřina"
function generujUnikatniLokaci() {
  const adj = pickRandom(ADJEKTIVA_MISTA);
  const podst = pickRandom(PODSTATNA_MISTA);
  // 50% šance na detail atmosféry
  if (Math.random() > 0.5) {
    return `${adj} ${podst}, ${pickRandom(ATMOSFERY)}`;
  }
  return `${adj} ${podst}`;
}

// Složí unikátní příšeru: "Požírač, který svítí neonově modře"
function generujUnikatniPriseru(monsterType) {
  const rys = pickRandom(PODIVNE_RYSY);
  return { jmeno: `${monsterType.type}, který ${rys}`, rys };
}

function vytvorSlozenouNavnadu(lokace) {
  const kdo = pickRandom(NAVNADA_KDO);
  const co = pickRandom(NAVNADA_CO);
  const kde = pickRandom(NAVNADA_KDE);
  return `${kdo} ${co} ${kde} (poblíž: ${lokace}).`;
}

function vytvorZahaduNahodne() {
  // 1. Atomické stavební kameny
  const monster = pickRandom(threatsData.monsterTypes);
  const location = pickRandom(threatsData.locationTypes);
  const minion = pickRandom(threatsData.minionTypes);
  const bystander = pickRandom(
    threatsData.bystanderTypes.filter(t => !t.type.startsWith('**'))
  );

  // 2. Kreativní vrstva: unikátní lokace + příšera + zvrat
  const mistoNazev = generujUnikatniLokaci();
  const prisera = generujUnikatniPriseru(monster);
  const zvrat = pickRandom(ZVRATY);

  // 3. Bod 1: Typ a Motivace (z threats.json)
  const stats = TYPY_STATS[monster.type] || { hp: [8, 12], zbroj: 1 };

  // 4. Bod 2: Nadpřirozené schopnosti (per typ + podivný rys)
  const typSchopnosti = SCHOPNOSTI_POOL[monster.type] || [];
  const schopnosti = pickN(typSchopnosti, randRange(2, 3));
  schopnosti.push(prisera.rys); // přidáme kreativní rys z atomického generátoru

  // 5. Bod 3: Útoky a Zbroj (strukturované)
  const utoky = pickN(UTOKY_POOL, 2);
  const zbroj = stats.zbroj;

  // 6. Bod 4: Výdrž (HP dle typu)
  const hp = randRange(stats.hp[0], stats.hp[1]);

  // 7. Bod 5: Slabina
  const slabina = pickRandom(SLABINY_POOL);

  // 8. Bod 6: Tahy hrozby (z threats.json)
  const monsterTahy = pickN(threatsData.monsterMoves, 4).map(m => m.name_cz);
  const minionTahy = pickN(threatsData.minionMoves, 3).map(m => m.name_cz);
  const bystanderTahy = pickN(threatsData.bystanderMoves, 3).map(m => m.name_cz);
  const locationTahy = pickN(threatsData.locationMoves, 3).map(m => m.name_cz);

  // 9. Odpočet odvozený z motivace
  const mot = monster.motivation.toLowerCase();
  const odpocet = createCountdown({
    den: `Průzkum lokace '${mistoNazev}'. Drobné stopy, šeptanda mezi místními.`,
    priseri: `Příšera naznačuje svou přítomnost. Další oběť zmizí.`,
    zapad_slunce: `Příšera útočí otevřeněji, snaží se ${mot}.`,
    soumrak: `Situace eskaluje. Přisluhovač (${minion.type}) aktivně brání lovcům v postupu.`,
    noc: `Příšera je téměř nezastavitelná. Poslední šance použít slabinu.`,
    pulnoc: `Konec hry. Příšera dokončila svůj plán: ${mot}. Následky jsou nevratné.`
  });

  // 10. Složit námět
  const nazev = `${prisera.jmeno} — ${mistoNazev}`;
  const namet = `Lovci přicházejí do lokace '${mistoNazev}', kde řádí ${prisera.jmeno}. `
    + `Hlavní motivací je ${mot}. `
    + `ALE: ${zvrat}`;
  const navnada = vytvorSlozenouNavnadu(mistoNazev);

  // 11. Sestavit kompletní hratelnou záhadu — všech 6 bodů
  const mystery = createMystery({
    nazev,
    namet,
    navnada,
    odpocet,
    hrozby: [
      createThreat({
        jmeno: prisera.jmeno,
        typ: ThreatType.PRISERA,
        druh: monster.type,
        motivace: monster.motivation,
        schopnosti,
        utoky,
        zivoty: hp,
        zbroj,
        slabina,
        tahy: monsterTahy
      }),
      createThreat({
        jmeno: minion.type,
        typ: ThreatType.PRISLUHOVAC,
        druh: minion.type,
        motivace: minion.motivation,
        utoky: [pickRandom(UTOKY_POOL)],
        zivoty: randRange(5, 8),
        zbroj: Math.random() > 0.5 ? 1 : 0,
        tahy: minionTahy
      }),
      createThreat({
        jmeno: bystander.type,
        typ: ThreatType.PRIHLIZEJICI,
        druh: bystander.type,
        motivace: bystander.motivation,
        tahy: bystanderTahy
      }),
      createThreat({
        jmeno: `${mistoNazev} (Místo činu)`,
        typ: ThreatType.LOKALITA,
        druh: location.type,
        motivace: location.motivation,
        tahy: locationTahy
      })
    ]
  });

  return mystery;
}

// ─── Render dispatcher ─────────────────────────────────────────

export function renderGeneratorTab() {
  const container = document.getElementById('generator-tab-content');
  if (!container) return;

  switch (currentView) {
    case 'list':
      container.innerHTML = renderListView();
      break;
    case 'edit':
      container.innerHTML = renderEditView();
      break;
    case 'detail':
      container.innerHTML = renderDetailView();
      break;
  }
}

// ─── LIST VIEW ─────────────────────────────────────────────────

function renderListView() {
  const mysteries = loadAllMysteries();

  const cards = mysteries.length === 0
    ? `<div class="text-center text-gray-500 py-16">
        <span class="material-symbols-outlined text-5xl mb-3 block">auto_fix_high</span>
        <p class="text-lg mb-1">Zatím žádné záhady</p>
        <p class="text-sm">Vytvořte novou záhadu ručně nebo nechte AI vygenerovat</p>
      </div>`
    : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${mysteries.map(m => renderMysteryCard(m)).join('')}
      </div>`;

  return `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-red-500">auto_fix_high</span>
            Generátor záhad
          </h2>
          <p class="text-sm text-gray-400 mt-1">Nezávislá stavebnice záhad pro Monster of the Week</p>
        </div>
        <div class="flex gap-2">
          <button onclick="window.mysteryGenerator.newMystery()"
            class="flex items-center gap-2 bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded text-sm font-semibold border border-red-700/50 transition">
            <span class="material-symbols-outlined text-sm">add</span> Nová záhada
          </button>
          <button onclick="window.mysteryGenerator.losovat()"
            class="flex items-center gap-2 bg-amber-900/40 hover:bg-amber-800/60 px-4 py-2 rounded text-sm font-semibold border border-amber-700/50 transition">
            <span class="material-symbols-outlined text-sm">casino</span> Losovat
          </button>
          <button onclick="window.mysteryGenerator.generateAI()"
            class="flex items-center gap-2 bg-purple-900/40 hover:bg-purple-800/60 px-4 py-2 rounded text-sm font-semibold border border-purple-700/50 transition"
            ${isGenerating ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-sm">auto_awesome</span>
            ${isGenerating ? 'Generuji...' : 'Generovat AI'}
          </button>
        </div>
      </div>
      ${cards}
    </div>
  `;
}

function renderMysteryCard(mystery) {
  const threatCount = mystery.hrozby?.length || 0;
  const date = new Date(mystery.lastModified || mystery.createdAt).toLocaleDateString('cs-CZ');
  const hasCountdown = COUNTDOWN_FIELDS.some(f => mystery.odpocet?.[f.key]);

  return `
    <div class="bg-black/30 border border-white/10 rounded-lg p-4 hover:border-red-700/40 transition cursor-pointer relative group"
         onclick="window.mysteryGenerator.openDetail('${mystery.id}')">
      <button onclick="event.stopPropagation(); window.mysteryGenerator.quickDelete('${mystery.id}')"
        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition p-1"
        title="Smazat záhadu">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
      <h3 class="font-bold text-lg mb-1 truncate pr-6">${escapeHtml(mystery.nazev || 'Bez názvu')}</h3>
      <p class="text-sm text-gray-400 mb-3 line-clamp-2">${escapeHtml(mystery.namet || 'Bez námětu')}</p>
      <div class="flex items-center gap-3 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-xs">warning</span>
          ${threatCount} ${threatCount === 1 ? 'hrozba' : threatCount >= 2 && threatCount <= 4 ? 'hrozby' : 'hrozeb'}
        </span>
        ${hasCountdown ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">timer</span>odpočet</span>' : ''}
        <span class="ml-auto">${date}</span>
      </div>
    </div>
  `;
}

// ─── DETAIL VIEW ───────────────────────────────────────────────

function renderDetailView() {
  if (!currentMystery) return '<p class="text-gray-500">Záhada nenalezena</p>';
  const m = currentMystery;

  return `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <button onclick="window.mysteryGenerator.backToList()"
          class="text-gray-400 hover:text-white transition p-1">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-2xl font-bold flex-1">${escapeHtml(m.nazev || 'Bez názvu')}</h2>
        <button onclick="window.mysteryGenerator.losovat()"
          class="flex items-center gap-1 bg-amber-900/40 hover:bg-amber-800/60 px-3 py-1.5 rounded text-sm border border-amber-700/50 transition">
          <span class="material-symbols-outlined text-sm">casino</span> Losovat znova
        </button>
        <button onclick="window.mysteryGenerator.copyToClipboard()"
          class="flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-800/60 px-3 py-1.5 rounded text-sm border border-emerald-700/50 transition">
          <span class="material-symbols-outlined text-sm">content_copy</span> Kopírovat
        </button>
        <button onclick="window.mysteryGenerator.editMystery('${m.id}')"
          class="flex items-center gap-1 bg-blue-900/40 hover:bg-blue-800/60 px-3 py-1.5 rounded text-sm border border-blue-700/50 transition">
          <span class="material-symbols-outlined text-sm">edit</span> Upravit
        </button>
        <button onclick="window.mysteryGenerator.confirmDelete('${m.id}')"
          class="flex items-center gap-1 bg-red-900/40 hover:bg-red-800/60 px-3 py-1.5 rounded text-sm border border-red-700/50 transition">
          <span class="material-symbols-outlined text-sm">delete</span> Smazat
        </button>
      </div>

      ${m.namet ? `<div class="mb-4"><span class="text-xs uppercase tracking-wider text-gray-500">Námět</span><p class="text-gray-200 mt-1">${escapeHtml(m.namet)}</p></div>` : ''}
      ${m.navnada ? `<div class="mb-4"><span class="text-xs uppercase tracking-wider text-gray-500">Návnada</span><p class="text-gray-200 mt-1">${escapeHtml(m.navnada)}</p></div>` : ''}

      ${renderDetailCountdown(m.odpocet)}
      ${renderDetailThreats(m.hrozby)}
    </div>
  `;
}

function renderDetailCountdown(odpocet) {
  if (!odpocet || !COUNTDOWN_FIELDS.some(f => odpocet[f.key])) return '';

  return `
    <div class="mt-6">
      <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-orange-400">timer</span> Odpočet
      </h3>
      <div class="space-y-2">
        ${COUNTDOWN_FIELDS.map(f => odpocet[f.key] ? `
          <div class="flex gap-3 bg-black/20 rounded p-2">
            <span class="text-orange-400 font-semibold text-sm min-w-[100px]">${f.label}</span>
            <span class="text-gray-300 text-sm">${escapeHtml(odpocet[f.key])}</span>
          </div>
        ` : '').join('')}
      </div>
    </div>
  `;
}

function renderDetailThreats(hrozby) {
  if (!hrozby || hrozby.length === 0) return '';

  return `
    <div class="mt-6">
      <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-red-400">warning</span> Hrozby
      </h3>
      <div class="space-y-3">
        ${hrozby.map(h => `
          <div class="bg-black/20 border border-white/5 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs px-2 py-0.5 rounded ${threatBadgeClass(h.typ)}">${ThreatTypeLabels[h.typ] || h.typ}</span>
              <span class="font-bold">${escapeHtml(h.jmeno || 'Bez jména')}</span>
              ${h.druh ? `<span class="text-gray-500 text-sm">— ${escapeHtml(h.druh)}</span>` : ''}
            </div>
            ${h.motivace ? `<p class="text-sm text-gray-400 mb-2"><strong>Motivace:</strong> ${escapeHtml(h.motivace)}</p>` : ''}
            ${h.slabina ? `<p class="text-sm text-yellow-400/80 mb-2"><strong>Slabina:</strong> ${escapeHtml(h.slabina)}</p>` : ''}
            ${h.schopnosti?.length ? `<p class="text-sm text-gray-400 mb-1"><strong>Schopnosti:</strong> ${h.schopnosti.map(s => escapeHtml(s)).join(', ')}</p>` : ''}
            ${h.utoky?.length ? `
              <div class="text-sm text-gray-400 mb-1">
                <strong>Útoky:</strong>
                <ul class="ml-4 mt-1 space-y-0.5">
                  ${h.utoky.map(u => `<li class="text-gray-300">▸ ${escapeHtml(formatUtok(u))}</li>`).join('')}
                </ul>
              </div>` : ''}
            ${threatHasField(h.typ, 'zivoty') && h.zivoty ? `<span class="text-xs text-gray-500 mr-3">Životy: ${h.zivoty}</span>` : ''}
            ${threatHasField(h.typ, 'zbroj') && h.zbroj ? `<span class="text-xs text-gray-500">Zbroj: ${h.zbroj}</span>` : ''}
            ${h.tahy?.length ? `
              <div class="text-sm text-gray-400 mt-2">
                <strong>Tahy hrozby:</strong>
                <ul class="ml-4 mt-1 space-y-0.5">
                  ${h.tahy.map(t => `<li class="text-gray-300">! ${escapeHtml(t)}</li>`).join('')}
                </ul>
              </div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function threatBadgeClass(typ) {
  switch (typ) {
    case ThreatType.PRISERA: return 'bg-red-900/60 text-red-300';
    case ThreatType.PRISLUHOVAC: return 'bg-orange-900/60 text-orange-300';
    case ThreatType.PRIHLIZEJICI: return 'bg-blue-900/60 text-blue-300';
    case ThreatType.LOKALITA: return 'bg-green-900/60 text-green-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

// ─── EDIT VIEW ─────────────────────────────────────────────────

function renderEditView() {
  if (!currentMystery) return '<p class="text-gray-500">Chyba: žádná záhada k editaci</p>';
  const m = currentMystery;

  return `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <button onclick="window.mysteryGenerator.backToList()"
          class="text-gray-400 hover:text-white transition p-1">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-2xl font-bold flex-1">${m.id ? 'Upravit záhadu' : 'Nová záhada'}</h2>
      </div>

      <!-- Basic info -->
      <section class="mb-6">
        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-400">info</span> Základní info
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Název záhady</label>
            <input type="text" id="gen-nazev" value="${escapeHtml(m.nazev)}"
              class="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-red-700/50 focus:outline-none" placeholder="Např. Prokletí Stříbrného jezera">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Námět</label>
            <textarea id="gen-namet" rows="2"
              class="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-red-700/50 focus:outline-none resize-y" placeholder="Krátký popis záhady...">${escapeHtml(m.namet)}</textarea>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Návnada (Hook)</label>
            <textarea id="gen-navnada" rows="2"
              class="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-red-700/50 focus:outline-none resize-y" placeholder="Co lovce přiláká do záhady...">${escapeHtml(m.navnada)}</textarea>
          </div>
        </div>
      </section>

      <!-- Countdown -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-orange-400">timer</span> Odpočet
          </h3>
          <button onclick="window.mysteryGenerator.generateCountdownAI()"
            class="flex items-center gap-1 text-xs bg-purple-900/30 hover:bg-purple-900/50 px-2 py-1 rounded border border-purple-700/30 transition"
            ${isGenerating ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-xs">auto_awesome</span> AI
          </button>
        </div>
        <div class="space-y-2">
          ${COUNTDOWN_FIELDS.map(f => `
            <div class="flex items-center gap-3">
              <label class="text-sm text-gray-400 min-w-[100px]">${f.label}</label>
              <input type="text" id="gen-odpocet-${f.key}" value="${escapeHtml(m.odpocet?.[f.key] || '')}"
                class="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-orange-700/50 focus:outline-none" placeholder="Co se stane...">
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Threats -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-red-400">warning</span> Hrozby
          </h3>
          <div class="flex gap-2">
            <button onclick="window.mysteryGenerator.addThreat()"
              class="flex items-center gap-1 text-xs bg-red-900/30 hover:bg-red-900/50 px-2 py-1 rounded border border-red-700/30 transition">
              <span class="material-symbols-outlined text-xs">add</span> Přidat hrozbu
            </button>
          </div>
        </div>
        <div id="gen-threats-list" class="space-y-4">
          ${(m.hrozby || []).map((h, i) => renderThreatEditor(h, i)).join('')}
          ${(m.hrozby || []).length === 0 ? '<p class="text-sm text-gray-500 text-center py-4">Zatím žádné hrozby. Přidejte první.</p>' : ''}
        </div>
      </section>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-white/10">
        <button onclick="window.mysteryGenerator.saveCurrent()"
          class="flex items-center gap-2 bg-green-900/40 hover:bg-green-800/60 px-5 py-2 rounded text-sm font-semibold border border-green-700/50 transition">
          <span class="material-symbols-outlined text-sm">save</span> Uložit
        </button>
        <button onclick="window.mysteryGenerator.generateFullAI()"
          class="flex items-center gap-2 bg-purple-900/40 hover:bg-purple-800/60 px-5 py-2 rounded text-sm font-semibold border border-purple-700/50 transition"
          ${isGenerating ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">auto_awesome</span>
          ${isGenerating ? 'Generuji...' : 'Dogenerovat AI'}
        </button>
        <button onclick="window.mysteryGenerator.backToList()"
          class="flex items-center gap-2 bg-gray-800/40 hover:bg-gray-700/60 px-5 py-2 rounded text-sm border border-gray-600/50 transition ml-auto">
          Zrušit
        </button>
      </div>
    </div>
  `;
}

function renderThreatEditor(threat, index) {
  const subtypes = getSubtypes(threat.typ);
  const showCombat = threatHasField(threat.typ, 'zivoty');
  const showAbilities = threatHasField(threat.typ, 'schopnosti');
  const showAttacks = threatHasField(threat.typ, 'utoky');

  return `
    <div class="bg-black/20 border border-white/10 rounded-lg p-4" data-threat-index="${index}">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs font-bold text-gray-500">#${index + 1}</span>
        <select onchange="window.mysteryGenerator.changeThreatType(${index}, this.value)"
          class="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none">
          ${Object.entries(ThreatTypeLabels).map(([k, v]) =>
            `<option value="${k}" ${threat.typ === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
        <button onclick="window.mysteryGenerator.generateThreatAI(${index})"
          class="flex items-center gap-1 text-xs bg-purple-900/30 hover:bg-purple-900/50 px-2 py-1 rounded border border-purple-700/30 transition ml-auto"
          ${isGenerating ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-xs">auto_awesome</span> AI
        </button>
        <button onclick="window.mysteryGenerator.removeThreat(${index})"
          class="text-red-400/60 hover:text-red-400 transition p-1">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Jméno</label>
          <input type="text" value="${escapeHtml(threat.jmeno)}"
            oninput="window.mysteryGenerator.updateThreat(${index}, 'jmeno', this.value)"
            class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Jméno hrozby">
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Druh</label>
          <select onchange="window.mysteryGenerator.updateThreatSubtype(${index}, this.value)"
            class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none">
            <option value="">— vyberte —</option>
            ${subtypes.map(s => `<option value="${s.type}" ${threat.druh === s.type ? 'selected' : ''}>${s.type}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Motivace</label>
        <input type="text" value="${escapeHtml(threat.motivace)}"
          oninput="window.mysteryGenerator.updateThreat(${index}, 'motivace', this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Motivace hrozby">
      </div>

      ${threat.typ === ThreatType.PRISERA ? `
      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Slabina <span class="text-red-400">*</span></label>
        <input type="text" value="${escapeHtml(threat.slabina)}"
          oninput="window.mysteryGenerator.updateThreat(${index}, 'slabina', this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-700/50" placeholder="Slabina příšery (povinné)">
      </div>
      ` : threat.slabina || [ThreatType.PRISLUHOVAC].includes(threat.typ) ? `
      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Slabina</label>
        <input type="text" value="${escapeHtml(threat.slabina)}"
          oninput="window.mysteryGenerator.updateThreat(${index}, 'slabina', this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Slabina (volitelné)">
      </div>
      ` : ''}

      ${showAbilities ? `
      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Schopnosti <span class="text-gray-600">(oddělené čárkou)</span></label>
        <input type="text" value="${escapeHtml((threat.schopnosti || []).join(', '))}"
          oninput="window.mysteryGenerator.updateThreatArray(${index}, 'schopnosti', this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Telekineze, Neviditelnost, ...">
      </div>
      ` : ''}

      ${showAttacks ? `
      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Útoky <span class="text-gray-600">(formát: Název (X-zranění štítky), oddělené čárkou)</span></label>
        <input type="text" value="${escapeHtml((threat.utoky || []).map(u => formatUtok(u)).join(', '))}"
          oninput="window.mysteryGenerator.updateThreatUtoky(${index}, this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Drápy (3-zranění blízko, brutální), Kousnutí (4-zranění dotek)">
      </div>
      ` : ''}

      ${showCombat ? `
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Životy</label>
          <input type="number" value="${threat.zivoty || 0}" min="0"
            oninput="window.mysteryGenerator.updateThreat(${index}, 'zivoty', parseInt(this.value) || 0)"
            class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none">
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Zbroj</label>
          <input type="number" value="${threat.zbroj || 0}" min="0"
            oninput="window.mysteryGenerator.updateThreat(${index}, 'zbroj', parseInt(this.value) || 0)"
            class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none">
        </div>
      </div>
      ` : ''}

      <div class="mt-3">
        <label class="block text-xs text-gray-500 mb-1">Tahy hrozby <span class="text-gray-600">(oddělené čárkou)</span></label>
        <input type="text" value="${escapeHtml((threat.tahy || []).join(', '))}"
          oninput="window.mysteryGenerator.updateThreatArray(${index}, 'tahy', this.value)"
          class="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="Vztekle zaútočit, Pronásledovat, Uniknout...">
      </div>
    </div>
  `;
}

// ─── Form data collection ──────────────────────────────────────

function collectFormData() {
  if (!currentMystery) return null;

  currentMystery.nazev = document.getElementById('gen-nazev')?.value || '';
  currentMystery.namet = document.getElementById('gen-namet')?.value || '';
  currentMystery.navnada = document.getElementById('gen-navnada')?.value || '';

  COUNTDOWN_FIELDS.forEach(f => {
    const el = document.getElementById(`gen-odpocet-${f.key}`);
    if (el) currentMystery.odpocet[f.key] = el.value;
  });

  return currentMystery;
}

// ─── Text export ────────────────────────────────────────────────

function mysteryToText(m) {
  const lines = [];
  lines.push(`=== ${m.nazev || 'Bez názvu'} ===`);
  lines.push('');
  if (m.namet) { lines.push(`NÁMĚT: ${m.namet}`); lines.push(''); }
  if (m.navnada) { lines.push(`NÁVNADA: ${m.navnada}`); lines.push(''); }

  // Odpočet
  if (m.odpocet && COUNTDOWN_FIELDS.some(f => m.odpocet[f.key])) {
    lines.push('--- ODPOČET ---');
    COUNTDOWN_FIELDS.forEach(f => {
      if (m.odpocet[f.key]) lines.push(`${f.label}: ${m.odpocet[f.key]}`);
    });
    lines.push('');
  }

  // Hrozby
  if (m.hrozby?.length) {
    lines.push('--- HROZBY ---');
    m.hrozby.forEach(h => {
      lines.push('');
      lines.push(`[${ThreatTypeLabels[h.typ] || h.typ}] ${h.jmeno || 'Bez jména'}${h.druh ? ` (${h.druh})` : ''}`);
      if (h.motivace) lines.push(`  MOTIVACE: ${h.motivace}`);
      if (h.slabina) lines.push(`  SLABINA: ${h.slabina}`);
      if (h.schopnosti?.length) lines.push(`  SCHOPNOSTI: ${h.schopnosti.join(', ')}`);
      if (h.utoky?.length) {
        lines.push('  ÚTOKY:');
        h.utoky.forEach(u => lines.push(`    > ${formatUtok(u)}`));
      }
      if (h.zivoty) lines.push(`  ŽIVOTY: ${h.zivoty}`);
      if (h.zbroj) lines.push(`  ZBROJ: ${h.zbroj}`);
      if (h.tahy?.length) {
        lines.push('  TAHY HROZBY:');
        h.tahy.forEach(t => lines.push(`    ! ${t}`));
      }
    });
  }

  return lines.join('\n');
}

// ─── Global handlers ───────────────────────────────────────────

window.mysteryGenerator = {
  backToList() {
    currentView = 'list';
    currentMystery = null;
    renderGeneratorTab();
  },

  newMystery() {
    currentMystery = createMystery();
    currentView = 'edit';
    renderGeneratorTab();
  },

  losovat() {
    currentMystery = vytvorZahaduNahodne();
    saveMystery(currentMystery);
    currentView = 'detail';
    renderGeneratorTab();
    window.showToast({ message: 'Záhada vylosována!', type: 'success' });
  },

  async copyToClipboard() {
    if (!currentMystery) return;
    const text = mysteryToText(currentMystery);
    try {
      await navigator.clipboard.writeText(text);
      window.showToast({ message: 'Záhada zkopírována do schránky', type: 'success' });
    } catch {
      // Fallback pro starší prohlížeče
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.showToast({ message: 'Záhada zkopírována do schránky', type: 'success' });
    }
  },

  openDetail(id) {
    currentMystery = getMysteryById(id);
    if (!currentMystery) {
      window.showToast({ message: 'Záhada nenalezena', type: 'error' });
      return;
    }
    currentView = 'detail';
    renderGeneratorTab();
  },

  editMystery(id) {
    currentMystery = getMysteryById(id);
    if (!currentMystery) {
      window.showToast({ message: 'Záhada nenalezena', type: 'error' });
      return;
    }
    currentView = 'edit';
    renderGeneratorTab();
  },

  saveCurrent() {
    collectFormData();
    if (!currentMystery) return;

    if (!currentMystery.nazev.trim()) {
      window.showToast({ message: 'Zadejte název záhady', type: 'error' });
      return;
    }

    saveMystery(currentMystery);
    window.showToast({ message: 'Záhada uložena', type: 'success' });
    currentView = 'detail';
    renderGeneratorTab();
  },

  confirmDelete(id) {
    if (!confirm('Opravdu chcete smazat tuto záhadu?')) return;
    deleteMystery(id);
    window.showToast({ message: 'Záhada smazána', type: 'success' });
    currentView = 'list';
    currentMystery = null;
    renderGeneratorTab();
  },

  quickDelete(id) {
    deleteMystery(id);
    window.showToast({ message: 'Záhada smazána', type: 'success' });
    renderGeneratorTab();
  },

  addThreat() {
    collectFormData();
    if (!currentMystery) return;
    currentMystery.hrozby.push(createThreat());
    renderGeneratorTab();
  },

  removeThreat(index) {
    collectFormData();
    if (!currentMystery) return;
    currentMystery.hrozby.splice(index, 1);
    renderGeneratorTab();
  },

  changeThreatType(index, newType) {
    collectFormData();
    if (!currentMystery?.hrozby[index]) return;
    const threat = currentMystery.hrozby[index];
    threat.typ = newType;
    threat.druh = '';
    threat.motivace = '';
    // Reset fields not relevant for the new type
    if (!threatHasField(newType, 'utoky')) threat.utoky = [];
    if (!threatHasField(newType, 'zivoty')) { threat.zivoty = 0; threat.zbroj = 0; }
    if (!threatHasField(newType, 'schopnosti')) threat.schopnosti = [];
    renderGeneratorTab();
  },

  updateThreat(index, field, value) {
    if (!currentMystery?.hrozby[index]) return;
    currentMystery.hrozby[index][field] = value;
  },

  updateThreatSubtype(index, value) {
    if (!currentMystery?.hrozby[index]) return;
    const threat = currentMystery.hrozby[index];
    threat.druh = value;
    // Auto-fill motivation from threats.json
    const subtypes = getSubtypes(threat.typ);
    const match = subtypes.find(s => s.type === value);
    if (match?.motivation) {
      threat.motivace = match.motivation;
      // Re-render to show updated motivation
      collectFormData();
      renderGeneratorTab();
    }
  },

  updateThreatArray(index, field, value) {
    if (!currentMystery?.hrozby[index]) return;
    currentMystery.hrozby[index][field] = value.split(',').map(s => s.trim()).filter(Boolean);
  },

  updateThreatUtoky(index, value) {
    if (!currentMystery?.hrozby[index]) return;
    // Parse comma-separated attack strings into structured objects
    currentMystery.hrozby[index].utoky = value.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => parseUtok(s));
  },

  // AI generation handlers (delegated to generator-ai.js)
  async generateAI() {
    if (isGenerating) return;
    isGenerating = true;
    renderGeneratorTab();
    try {
      const { generateFullMystery } = await import('./generator-ai.js');
      const mystery = await generateFullMystery();
      saveMystery(mystery);
      currentMystery = mystery;
      currentView = 'detail';
      window.showToast({ message: 'Záhada vygenerována!', type: 'success' });
    } catch (err) {
      console.error('AI generation error:', err);
      window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
    } finally {
      isGenerating = false;
      renderGeneratorTab();
    }
  },

  async generateFullAI() {
    if (isGenerating) return;
    collectFormData();
    if (!currentMystery) return;
    isGenerating = true;
    renderGeneratorTab();
    try {
      const { generateFullMystery } = await import('./generator-ai.js');
      const hints = {
        nazev: currentMystery.nazev,
        namet: currentMystery.namet,
        navnada: currentMystery.navnada
      };
      const generated = await generateFullMystery(hints);
      // Merge: keep user-filled fields, fill empty ones from AI
      if (!currentMystery.nazev) currentMystery.nazev = generated.nazev;
      if (!currentMystery.namet) currentMystery.namet = generated.namet;
      if (!currentMystery.navnada) currentMystery.navnada = generated.navnada;
      if (COUNTDOWN_FIELDS.every(f => !currentMystery.odpocet[f.key])) {
        currentMystery.odpocet = generated.odpocet;
      }
      if (currentMystery.hrozby.length === 0) {
        currentMystery.hrozby = generated.hrozby;
      }
      window.showToast({ message: 'AI doplnilo záhadu', type: 'success' });
    } catch (err) {
      console.error('AI generation error:', err);
      window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
    } finally {
      isGenerating = false;
      renderGeneratorTab();
    }
  },

  async generateThreatAI(index) {
    if (isGenerating) return;
    collectFormData();
    if (!currentMystery?.hrozby[index]) return;
    isGenerating = true;
    renderGeneratorTab();
    try {
      const { generateThreat } = await import('./generator-ai.js');
      const threat = currentMystery.hrozby[index];
      const generated = await generateThreat(threat.typ, {
        mysteryName: currentMystery.nazev,
        mysteryTheme: currentMystery.namet
      });
      // Merge generated data into existing threat, keeping its ID
      Object.assign(threat, generated, { id: threat.id, typ: threat.typ });
      window.showToast({ message: 'Hrozba vygenerována', type: 'success' });
    } catch (err) {
      console.error('AI threat generation error:', err);
      window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
    } finally {
      isGenerating = false;
      renderGeneratorTab();
    }
  },

  async generateCountdownAI() {
    if (isGenerating) return;
    collectFormData();
    if (!currentMystery) return;
    isGenerating = true;
    renderGeneratorTab();
    try {
      const { generateCountdown } = await import('./generator-ai.js');
      const countdown = await generateCountdown(currentMystery);
      currentMystery.odpocet = countdown;
      window.showToast({ message: 'Odpočet vygenerován', type: 'success' });
    } catch (err) {
      console.error('AI countdown generation error:', err);
      window.showToast({ message: `Chyba AI: ${err.message}`, type: 'error', duration: 5000 });
    } finally {
      isGenerating = false;
      renderGeneratorTab();
    }
  }
};
