/**
 * Mystery Generator - Main UI Module
 * Four views: list, edit, detail, pools
 * Independent mystery builder with unified Threat (Hrozba) entity
 */

import { escapeHtml } from '../../utils/html.js';
import { ThreatType, ThreatTypeLabels, createThreat, createCountdown, createMystery } from './model.js';
import { loadAllMysteries, saveMystery, deleteMystery, getMysteryById } from './storage.js';
import { poolStorage } from './pool-storage.js';
import threatsData from '../../data/threats.json';

// ─── Module-level state ────────────────────────────────────────

let currentView = 'list';       // 'list' | 'edit' | 'detail' | 'pools'
let currentMystery = null;      // Mystery being edited/viewed
let isGenerating = false;       // AI generation in progress

// ─── Pool highlighting ────────────────────────────────────────

const POOL_COLORS = {
  lokaceNom:   '#60a5fa', // blue
  lokaceGen:   '#60a5fa',
  lokaceLok:   '#60a5fa',
  atmosfera:   '#34d399', // emerald
  rys:         '#fb923c', // orange
  zvrat:       '#fb7185', // rose
  npcJmeno:    '#fde047', // yellow
  navnadaAkce: '#2dd4bf'  // teal
};

/**
 * Replace known pool-sourced substrings with colored <span> tags.
 * Falls back to escapeHtml when no _pools metadata.
 */
function highlightPools(text, pools) {
  if (!pools || !text) return escapeHtml(text || '');
  let html = escapeHtml(text);
  // Sort by value length desc to avoid partial-match collisions
  const entries = Object.entries(pools)
    .filter(([, v]) => v && v.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, value] of entries) {
    const color = POOL_COLORS[key];
    if (!color) continue;
    const escaped = escapeHtml(value);
    if (!escaped) continue;
    // Replace all occurrences
    html = html.split(escaped).join(`<span style="color:${color}">${escaped}</span>`);
  }
  return html;
}

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
    case ThreatType.PRIHLIZEJICI: return threatsData.bystanderTypes.filter(t => !t.type.startsWith('**') && t.type !== 'Role');
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

// ─── Český jazykový engine ───────────────────────────────────────
// Skloňování adjektiv: tvrdé (vzor mladý), měkké (vzor jarní), nesklonné
// Formát: [kořen, typ] — kořen je základ bez koncovky

const DEFAULT_ADJEKTIVA = [
  ['Opuštěn', 'tvrde'], ['Zatopen', 'tvrde'], ['Vyhořel', 'tvrde'],
  ['Podzemn', 'mekke'], ['Mlžn', 'tvrde'], ['Zamořen', 'tvrde'],
  ['High-tech', 'nesklonne'], ['Středověk', 'tvrde'], ['Vojensk', 'tvrde'],
  ['Zchátral', 'tvrde'], ['Přelidněn', 'tvrde'], ['Nově postaven', 'tvrde'],
  ['Proklet', 'tvrde'], ['Izolovan', 'tvrde'], ['Viktoriánsk', 'tvrde'],
  ['Mraziv', 'tvrde'], ['Radioaktivn', 'mekke'], ['Hlučn', 'tvrde'],
  ['Tich', 'tvrde'], ['Steriln', 'mekke'], ['Krvav', 'tvrde'],
  ['Páchnouc', 'mekke'], ['Vznášející se', 'nesklonne'],
  ['Halucinogenn', 'mekke'], ['Betonov', 'tvrde'], ['Skleněn', 'tvrde'],
  ['Podmořsk', 'tvrde'], ['Luxusn', 'mekke'], ['Kyberpunkov', 'tvrde'],
  ['Vybombardovan', 'tvrde'],
  // --- TEMNÉ A DĚSIVÉ ---
  ['Temn', 'tvrde'], ['Hnijíc', 'mekke'], ['Mrtv', 'tvrde'],
  ['Zlověstn', 'tvrde'], ['Oslizl', 'tvrde'], ['Čern', 'tvrde'],
  ['Pohřebn', 'mekke'], ['Zohaven', 'tvrde'], ['Pekeln', 'tvrde'],
  // --- MODERNÍ A URBÁNNÍ ---
  ['Špinav', 'tvrde'], ['Toxick', 'tvrde'], ['Zabedněn', 'tvrde'],
  ['Neonov', 'tvrde'], ['Digitáln', 'mekke'],
  // --- PŘÍRODNÍ ---
  ['Bažinat', 'tvrde'], ['Hoříc', 'mekke'], ['Zarostl', 'tvrde'],
  ['Větrn', 'tvrde'], ['Kamenn', 'tvrde'], ['Písčit', 'tvrde'],
  // --- PODIVNÉ A MAGICKÉ ---
  ['Nehmotn', 'tvrde'], ['Zrcadlov', 'tvrde'], ['Nekonečn', 'tvrde'],
  ['Mechanick', 'tvrde'], ['Starodávn', 'mekke'], ['Zapomenut', 'tvrde']
];
function getAdjektiva() { return poolStorage.get('adjektiva') || DEFAULT_ADJEKTIVA; }

/**
 * Skloňování adjektiv — pády 1 (nominativ), 2 (genitiv), 6 (lokál)
 * rod: 'm'|'f'|'n' (singular), 'pl' (neuter plural — pro Jatka apod.)
 */
function sklonujAdjektivum(koren, typ, rod, pad) {
  if (typ === 'nesklonne') return koren;
  // Plurál (pro pluralia tantum jako Jatka)
  if (rod === 'pl') {
    if (typ === 'tvrde') return pad === 1 ? `${koren}á` : `${koren}ých`;
    return pad === 1 ? `${koren}í` : `${koren}ích`;
  }
  if (typ === 'tvrde') {
    if (pad === 1) return `${koren}${rod === 'm' ? 'ý' : rod === 'f' ? 'á' : 'é'}`;
    if (pad === 2) return `${koren}${rod === 'f' ? 'é' : 'ého'}`;
    if (pad === 6) return `${koren}${rod === 'f' ? 'é' : 'ém'}`;
  }
  // měkké (vzor jarní)
  if (pad === 1) return `${koren}í`;
  if (pad === 2) return `${koren}${rod === 'f' ? 'í' : 'ího'}`;
  if (pad === 6) return `${koren}${rod === 'f' ? 'í' : 'ím'}`;
  return koren;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ziskajZajmeno(rod) {
  return rod === 'm' ? 'který' : rod === 'f' ? 'která' : 'které';
}

// Lokace s deklinací: nominativ, genitiv, lokál+předložka, rod
// Typ lokace (Křižovatka, Past, ...) se losuje náhodně v generátoru
const DEFAULT_LOKACE = [
  { nom: 'Škola', gen: 'Školy', lok: 've Škole', rod: 'f' },
  { nom: 'Nemocnice', gen: 'Nemocnice', lok: 'v Nemocnici', rod: 'f' },
  { nom: 'Továrna', gen: 'Továrny', lok: 'v Továrně', rod: 'f' },
  { nom: 'Knihovna', gen: 'Knihovny', lok: 'v Knihovně', rod: 'f' },
  { nom: 'Zoo', gen: 'Zoo', lok: 'v Zoo', rod: 'n' },
  { nom: 'Metro', gen: 'Metra', lok: 'v Metru', rod: 'n' },
  { nom: 'Katedrála', gen: 'Katedrály', lok: 'v Katedrále', rod: 'f' },
  { nom: 'Jatka', gen: 'Jatek', lok: 'na Jatkách', rod: 'pl' },
  { nom: 'Lunapark', gen: 'Lunaparku', lok: 'v Lunaparku', rod: 'm' },
  { nom: 'Maják', gen: 'Majáku', lok: 'na Majáku', rod: 'm' },
  { nom: 'Motel', gen: 'Motelu', lok: 'v Motelu', rod: 'm' },
  { nom: 'Tábor', gen: 'Tábora', lok: 'v Táboře', rod: 'm' },
  { nom: 'Věznice', gen: 'Věznice', lok: 've Věznici', rod: 'f' },
  { nom: 'Muzeum', gen: 'Muzea', lok: 'v Muzeu', rod: 'n' },
  { nom: 'Zahrada', gen: 'Zahrady', lok: 'v Zahradě', rod: 'f' },
  { nom: 'Vrakoviště', gen: 'Vrakoviště', lok: 'na Vrakovišti', rod: 'n' },
  { nom: 'Stoka', gen: 'Stoky', lok: 've Stoce', rod: 'f' },
  { nom: 'Márnice', gen: 'Márnice', lok: 'v Márnici', rod: 'f' },
  { nom: 'Studio', gen: 'Studia', lok: 've Studiu', rod: 'n' },
  { nom: 'Obchodní dům', gen: 'Obchodního domu', lok: 'v Obchodním domě', rod: 'm' },
  { nom: 'Kasino', gen: 'Kasina', lok: 'v Kasinu', rod: 'n' },
  { nom: 'Přístav', gen: 'Přístavu', lok: 'v Přístavu', rod: 'm' },
  { nom: 'Kryt', gen: 'Krytu', lok: 'v Krytu', rod: 'm' },
  { nom: 'Důl', gen: 'Dolu', lok: 'v Dole', rod: 'm' },
  { nom: 'Léčebna', gen: 'Léčebny', lok: 'v Léčebně', rod: 'f' },
  { nom: 'Opera', gen: 'Opery', lok: 'v Opeře', rod: 'f' },
  { nom: 'Sanatorium', gen: 'Sanatoria', lok: 'v Sanatoriu', rod: 'n' },
  { nom: 'Hřbitov', gen: 'Hřbitova', lok: 'na Hřbitově', rod: 'm' },
  { nom: 'Tržnice', gen: 'Tržnice', lok: 'na Tržnici', rod: 'f' },
  { nom: 'Letiště', gen: 'Letiště', lok: 'na Letišti', rod: 'n' },
  { nom: 'Divadlo', gen: 'Divadla', lok: 'v Divadle', rod: 'n' },
  { nom: 'Banka', gen: 'Banky', lok: 'v Bance', rod: 'f' },
  { nom: 'Stanice metra', gen: 'Stanice metra', lok: 've Stanici metra', rod: 'f' },
  { nom: 'Galerie', gen: 'Galerie', lok: 'v Galerii', rod: 'f' },
  { nom: 'Radnice', gen: 'Radnice', lok: 'na Radnici', rod: 'f' },
  { nom: 'Elektrárna', gen: 'Elektrárny', lok: 'v Elektrárně', rod: 'f' },
  { nom: 'Skladiště', gen: 'Skladiště', lok: 've Skladišti', rod: 'n' },
  { nom: 'Blázinec', gen: 'Blázince', lok: 'v Blázinci', rod: 'm' },
  { nom: 'Sirotčinec', gen: 'Sirotčince', lok: 'v Sirotčinci', rod: 'm' },
  { nom: 'Les', gen: 'Lesa', lok: 'v Lese', rod: 'm' },
  { nom: 'Bažina', gen: 'Bažiny', lok: 'v Bažině', rod: 'f' },
  { nom: 'Jezero', gen: 'Jezera', lok: 'u Jezera', rod: 'n' },
  { nom: 'Farma', gen: 'Farmy', lok: 'na Farmě', rod: 'f' },
  { nom: 'Klášter', gen: 'Kláštera', lok: 'v Klášteře', rod: 'm' },
  { nom: 'Kemp', gen: 'Kempu', lok: 'v Kempu', rod: 'm' }
];
function getLokace() { return poolStorage.get('lokace') || DEFAULT_LOKACE; }

const DEFAULT_ATMOSFERY = [
  'kde neustále prší', 'kde vypadává elektřina', 'kde je hrobové ticho',
  'kde teplota klesá pod nulu', 'odkud se nedá dovolat pomoc',
  'kde se kompasy točí dokola', 'kde se zdi potí krví',
  'kde je cítit síra', 'kde hraje děsivá hudba', 'kde se hýbou stíny',
  'kde je nepřirozené horko', 'kde je všechno černobílé',
  'kde gravitace funguje divně', 'kde jsou nápisy v neznámém jazyce',
  'kde nefunguje čas', 'kde je cítit spálenina', 'kde se ozývá dětský pláč',
  'kde mrzne, i když je léto', 'kde ze zdí vytéká sliz', 'kde nefunguje elektřina',
  'kde se zjevují mrtví příbuzní', 'kde je nepřirozené ticho', 'kde zní neustálý šepot'
];
function getAtmosfery() { return poolStorage.get('atmosfery') || DEFAULT_ATMOSFERY; }

const ATMOSFERA_AFINITA = {
  'Bestie':       ['kde je cítit krev a shnilé maso', 'kde vše ztichne, když se setmí'],
  'Černokněžník': ['kde se hýbou stíny samy od sebe', 'kde vzduch voní po kadidlu a spálené kůži'],
  'Královna':     ['kde se lidé chovají, jako by nebyli svoji', 'kde každý šeptá, ale nikdo nemluví nahlas'],
  'Mučitel':      ['kde zdi slyší a podlaha skřípe', 'kde se ozývá tlumený pláč'],
  'Ničitel':      ['kde se chvěje zem a praskají zdi', 'kde vzduch praská elektřinou'],
  'Parazit':      ['kde rostou podivné plísně', 'kde je vzduch hustý a těžký'],
  'Pokušitel':    ['kde je všechno příliš dokonalé', 'kde se zdá, že čas plyne jinak'],
  'Popravčí':     ['kde cítíte, že vás někdo sleduje', 'kde je ticho tak hluboké, že slyšíte vlastní srdce'],
  'Požírač':      ['kde je cítit krev a shnilé maso', 'kde se občas ozve prasknutí kostí'],
  'Sběratel':     ['kde věci mizí a objevují se jinde', 'kde na zdech visí podivné trofeje'],
  'Šibal':        ['kde se kompas točí dokola', 'kde nic není tak, jak se zdá'],
  'Zploditel':    ['kde rostou podivné plísně', 'kde je vzduch plný bzučení']
};

// Podivné rysy příšery (genderově neutrální — fungují s který/která/které)
const DEFAULT_RYSY = [
  'neustále hoří', 'mizí ve stínu', 'mluví hlasem dítěte',
  'drží pohromadě z odpadků', 'vydává bzučivý zvuk', 'kape z toho kyselina',
  'má místo očí hodiny', 'má příliš mnoho končetin', 'levituje nad zemí',
  'vypadá jako porcelánová panenka', 'páchne po zkaženém mase',
  'mění tvar podle pozorovatele', 'cinká sklem při pohybu',
  'má na těle tváře svých obětí', 'vrhá stín i bez světla',
  'existuje jen jako kouř', 'svítí neonově modře',
  'krvácí z očí', 'je z černého kouře', 'cinká řetězy',
  'má místo obličeje zrcadlo', 'vydává zvuk sirény', 'zarůstá plísní',
  'páchne sírou', 've světle mizí', 'mluví pozpátku', 'má příliš mnoho očí'
];
function getRysy() { return poolStorage.get('rysy') || DEFAULT_RYSY; }

// Dějové zvraty → mění pravidla hry (kategorizované dle závažnosti)
const ZVRAT_KATEGORIE = {
  mirny: [
    'Příšera se jen brání — neútočí, dokud není napadena.',
    'Příšera je vázána na určité místo a nemůže ho opustit.',
    'Přisluhovač tajně pomáhá lovcům.'
  ],
  stredni: [
    'Příšera má dvojí podobu — lidskou a netvornou.',
    'Slabina se mění každou hodinu.',
    'V okolí operuje ještě druhá, menší příšera.'
  ],
  tezky: [
    'Zabitím příšery se zřítí celá budova.',
    'Smrt příšery uvolní ještě horší hrozbu.',
    'Příšera drží naživu člověka, který zemře, pokud příšera zemře.'
  ]
};

const DEFAULT_ZVRATY = [
  ...ZVRAT_KATEGORIE.mirny,
  ...ZVRAT_KATEGORIE.stredni,
  ...ZVRAT_KATEGORIE.tezky
];
function getZvraty() { return poolStorage.get('zvraty') || DEFAULT_ZVRATY; }

// ─── Pravidlové tabulky per typ hrozby ──────────────────────────
// Každý typ má: rod, motivace, HP, zbroj, tahy, tag (pro útoky), weakType (pro slabiny)

const TYPY_MONSTER = {
  'Bestie':       { rod: 'f', mot: 'Svobodně se pohybovat, ničit a zabíjet', hp: [10, 12], zbroj: 1, tag: 'physical', weakType: 'physical',
                    tahy: ['Naznačit její přítomnost', 'Vrátit se do svého teritoria', 'Vztekle zaútočit vší silou', 'Uniknout bez ohledu na to, jak je spoutána'] },
  'Černokněžník': { rod: 'm', mot: 'Uchvátit nadpřirozenou moc', hp: [8, 10], zbroj: 1, tag: 'magic', weakType: 'ritual',
                    tahy: ['Použít nadpřirozenou schopnost', 'Škodolibě se chvástat a prozradit tajemství', 'Někoho nebo něčeho se zmocnit', 'Tiše a prohnaně zaútočit'] },
  'Královna':     { rod: 'f', mot: 'Posednout a ovládnout', hp: [10, 12], zbroj: 2, tag: 'minion_master', weakType: 'ritual',
                    tahy: ['Rozkázat přisluhovačům provést strašné věci', 'Někoho nebo něčeho se zmocnit', 'Odhalit její skutečnou moc', 'Navrátit se po zdánlivém skonu'] },
  'Mučitel':      { rod: 'm', mot: 'Způsobit bolest a vyvolat hrůzu', hp: [8, 10], zbroj: 0, tag: 'stealth', weakType: 'holy',
                    tahy: ['Tiše a prohnaně zaútočit', 'Škodolibě se chvástat a prozradit tajemství', 'Z čista jasna se objevit', 'Někoho nebo něčeho se zmocnit'] },
  'Ničitel':      { rod: 'm', mot: 'Přivodit konec světa', hp: [12, 15], zbroj: 2, tag: 'physical', weakType: 'ritual',
                    tahy: ['Něco zničit', 'Odhalit její skutečnou moc', 'Vztekle zaútočit vší silou', 'Uniknout bez ohledu na to, jak je spoutána'] },
  'Parazit':      { rod: 'm', mot: 'Napadnout, ovládnout a sežrat', hp: [8, 10], zbroj: 0, tag: 'stealth', weakType: 'fire',
                    tahy: ['Tiše a prohnaně zaútočit', 'Naznačit její přítomnost', 'Někoho nebo něčeho se zmocnit', 'Navrátit se po zdánlivém skonu'] },
  'Pokušitel':    { rod: 'm', mot: 'Svést lidi ke konání zla', hp: [8, 10], zbroj: 0, tag: 'magic', weakType: 'logic',
                    tahy: ['Škodolibě se chvástat a prozradit tajemství', 'Použít nadpřirozenou schopnost', 'Tiše a prohnaně zaútočit', 'Z čista jasna se objevit'] },
  'Popravčí':     { rod: 'm', mot: 'Trestat viníky', hp: [10, 12], zbroj: 1, tag: 'physical', weakType: 'holy',
                    tahy: ['Pronásledovat', 'Z čista jasna se objevit', 'Použít nadpřirozenou schopnost', 'Vztekle zaútočit vší silou'] },
  'Požírač':      { rod: 'm', mot: 'Hodovat na lidech', hp: [11, 14], zbroj: 1, tag: 'physical', weakType: 'poison',
                    tahy: ['Někoho nebo něčeho se zmocnit', 'Něco zničit', 'Vztekle zaútočit vší silou', 'Naznačit její přítomnost'] },
  'Sběratel':     { rod: 'm', mot: 'Krást specifický druh věcí', hp: [9, 11], zbroj: 1, tag: 'stealth', weakType: 'logic',
                    tahy: ['Někoho nebo něčeho se zmocnit', 'Tiše a prohnaně zaútočit', 'Škodolibě se chvástat a prozradit tajemství', 'Uniknout bez ohledu na to, jak je spoutána'] },
  'Šibal':        { rod: 'm', mot: 'Vnést do všeho chaos', hp: [7, 9], zbroj: 0, tag: 'magic', weakType: 'logic',
                    tahy: ['Použít nadpřirozenou schopnost', 'Škodolibě se chvástat a prozradit tajemství', 'Z čista jasna se objevit', 'Uniknout bez ohledu na to, jak je spoutána'] },
  'Zploditel':    { rod: 'm', mot: 'Přivést zlo na svět nebo ho stvořit', hp: [10, 12], zbroj: 1, tag: 'minion_master', weakType: 'fire',
                    tahy: ['Naznačit její přítomnost', 'Někoho nebo něčeho se zmocnit', 'Odhalit její skutečnou moc', 'Vrátit se do svého teritoria'] }
};

// ─── Narativní můstky: proč je bytost zrovna tento typ ────────
const NARATIVNI_MUSTKY = {
  'Bestie':       (titul) => `${titul} se volně pohybuje krajinou, ničí a zabíjí z čistého instinktu. Nelze s ní vyjednávat — zná jen hlad a zuřivost.`,
  'Černokněžník': (titul) => `${titul} touží po nadpřirozené moci a je ochoten/ochotna za ni zaplatit jakoukoli cenu. Každá oběť je rituálem.`,
  'Královna':     (titul) => `${titul} si buduje síť ovládnutých služebníků. Neútočí přímo — nechává za sebe jednat ostatní.`,
  'Mučitel':      (titul) => `${titul} se živí strachem a bolestí svých obětí. Nezabíjí hned — chce, aby trpěly.`,
  'Ničitel':      (titul) => `${titul} má jediný cíl: totální destrukci. Každý krok přibližuje konec všeho.`,
  'Parazit':      (titul) => `${titul} se přisává ke svým obětem a pomalu je vysává. Než si hostitel uvědomí, co se děje, je pozdě.`,
  'Pokušitel':    (titul) => `${titul} svádí lidi, aby dobrovolně přijali jeho kletbu — výměnou za moc, lásku nebo vědění.`,
  'Popravčí':     (titul) => `${titul} pronásleduje ty, které považuje za viníky. Jeho spravedlnost je krutá a neúprosná.`,
  'Požírač':      (titul) => `${titul} loví lidi jako kořist. Hoduje na jejich tělech — nebo duších.`,
  'Sběratel':     (titul) => `${titul} je posedlý sbíráním trofejí ze svých obětí. Každá sbírka potřebuje další kousek.`,
  'Šibal':        (titul) => `${titul} si hraje s lidmi jako s loutkami. Nezáleží mu na výsledku — důležitý je chaos sám.`,
  'Zploditel':    (titul) => `${titul} připravuje příchod něčeho horšího. Jeho oběti nejsou cílem — jsou surovinou.`
};

const TYPY_PRISLUHOVACU = {
  'Hlídač':     { mot: 'Zahradit cestu nebo něco chránit', hp: [5, 8],
                  tahy: ['Koordinovaně zaútočit', 'Vyhrožovat ve jménu svého pána', 'Použít nadpřirozenou schopnost'] },
  'Kultista':   { mot: 'Zachránit si kůži za každou cenu', hp: [4, 6],
                  tahy: ['Utéct', 'Prozradit tajemství', 'Ukázat záblesk svědomí'] },
  'Mor':        { mot: 'Zaplavit a zničit', hp: [5, 7],
                  tahy: ['Náhlý záchvat nekontrolovaného násilí', 'Odevzdat někoho svému pánu', 'Ukázat záblesk lidství'] },
  'Pravá ruka': { mot: 'Stát za příšerou', hp: [6, 9],
                  tahy: ['Koordinovaně zaútočit', 'Vyhrožovat ve jménu svého pána', 'Malicherným způsobem se vzepřít svému pánu'] },
  'Průzkumník': { mot: 'Stopovat, sledovat a podat zprávu', hp: [5, 7],
                  tahy: ['Pronásledovat', 'Prozradit tajemství', 'Odevzdat někoho svému pánu'] },
  'Renfield':   { mot: 'Zajistit příšeře přísun obětí', hp: [4, 6],
                  tahy: ['Někoho zajmout nebo něco ukrást', 'Vyhrožovat ve jménu svého pána', 'Malicherným způsobem se vzepřít'] },
  'Surovec':    { mot: 'Zastrašit a zaútočit', hp: [6, 9],
                  tahy: ['Náhlý záchvat nekontrolovaného násilí', 'Koordinovaně zaútočit', 'Pronásledovat'] },
  'Vrah':       { mot: 'Zabít lovce', hp: [6, 8],
                  tahy: ['Náhlý záchvat nekontrolovaného násilí', 'Pronásledovat', 'Utéct'] },
  'Zloděj':     { mot: 'Něco pro příšeru ukrást', hp: [4, 6],
                  tahy: ['Někoho zajmout nebo něco ukrást', 'Utéct', 'Prozradit tajemství'] },
  'Zrádce':     { mot: 'Zradit lidi', hp: [4, 6],
                  tahy: ['Prozradit tajemství', 'Odevzdat někoho svému pánu', 'Ukázat záblesk svědomí'] }
};

const AFINITA_PRISLUHOVACU = {
  'Bestie':       { 'Surovec': 3, 'Hlídač': 3, 'Mor': 2 },
  'Černokněžník': { 'Kultista': 3, 'Zrádce': 3, 'Pravá ruka': 2 },
  'Královna':     { 'Hlídač': 3, 'Renfield': 3, 'Pravá ruka': 2 },
  'Mučitel':      { 'Vrah': 3, 'Surovec': 3, 'Průzkumník': 2 },
  'Ničitel':      { 'Mor': 3, 'Surovec': 3, 'Kultista': 2 },
  'Parazit':      { 'Renfield': 3, 'Zrádce': 3, 'Průzkumník': 2 },
  'Pokušitel':    { 'Zrádce': 3, 'Kultista': 3, 'Renfield': 2 },
  'Popravčí':     { 'Průzkumník': 3, 'Vrah': 3, 'Hlídač': 2 },
  'Požírač':      { 'Renfield': 3, 'Surovec': 3, 'Hlídač': 2 },
  'Sběratel':     { 'Zloděj': 3, 'Průzkumník': 3, 'Hlídač': 2 },
  'Šibal':        { 'Zloděj': 3, 'Zrádce': 3, 'Mor': 2 },
  'Zploditel':    { 'Mor': 3, 'Renfield': 3, 'Kultista': 2 }
};

const TYPY_NPC = {
  'Byrokrat':  { mot: 'Podezírat', tahy: ['Překážet', 'Dohadovat se s lovci', 'Projevit neschopnost'] },
  'Detektiv':  { mot: 'Zavrhnout rozumné vysvětlení', tahy: ['Dohadovat se s lovci', 'Něco prozradit', 'Vydat se někam sám'] },
  'Drbna':     { mot: 'Šířit klevety', tahy: ['Ze strachu ztratit hlavu', 'Přiznat se ke svým obavám', 'Něco prozradit'] },
  'Nevinný':   { mot: 'Zachovat se správně', tahy: ['Vydat se někam sám', 'Pokusit se ochránit lidi', 'Ze strachu ztratit hlavu'] },
  'Oběť':      { mot: 'Vystavit se nebezpečí', tahy: ['Překážet', 'Pokusit se ochránit lidi', 'Vydat se někam sám'] },
  'Pomocník':  { mot: 'Přidat se k lovu', tahy: ['Pokusit se pomoct lovcům', 'Vydat se někam sám', 'Přiznat se ke svým obavám'] },
  'Skeptik':   { mot: 'Odmítat nadpřirozené vysvětlení', tahy: ['Dohadovat se s lovci', 'Překážet', 'Ze strachu ztratit hlavu'] },
  'Svědek':    { mot: 'Poskytnout informace', tahy: ['Něco prozradit', 'Přiznat se ke svým obavám', 'Vydat se někam sám'] },
  'Šťoural':   { mot: 'Plést se do záležitostí jiných lidí', tahy: ['Překážet', 'Něco prozradit', 'Hledat pomoc nebo útěchu'] }
};

const LOKACE_ROLE = [
  { role: 'Místo činu', preferovaneTypy: ['Křižovatka', 'Knihovna', 'Laboratoř', 'Divočina'] },
  { role: 'Útočiště', preferovaneTypy: ['Pevnost', 'Knihovna', 'Vězení'] },
  { role: 'Doupě příšery', preferovaneTypy: ['Doupě', 'Past', 'Brána pekel', 'Labyrint'] }
];

const TYPY_LOKALIT = {
  'Brána pekel': { mot: 'Stvořit zlo', tahy: ['Představit hrozbu', 'Něco odhalit', 'Přetvořit se'] },
  'Divočina':    { mot: 'Obsahovat skryté věci', tahy: ['Někoho polapit do pasti', 'Navodit jedinečný dojem', 'Navést na stopu'] },
  'Doupě':       { mot: 'Ukrývat příšery', tahy: ['Něco skrývat', 'Představit hrozbu', 'Zabránit v cestě'] },
  'Knihovna':    { mot: 'Poskytnout informace', tahy: ['Navést na stopu', 'Něco skrývat', 'Něco odhalit'] },
  'Křižovatka':  { mot: 'Svést lidi a věci dohromady', tahy: ['Něco odhalit', 'Uvolnit cestu', 'Navodit jedinečný dojem'] },
  'Laboratoř':   { mot: 'Vytvářet prapodivnosti', tahy: ['Něco tu nefunguje', 'Představit hrozbu', 'Něco odhalit'] },
  'Labyrint':    { mot: 'Zmást a rozdělit', tahy: ['Přetvořit se', 'Zabránit v cestě', 'Navodit jedinečný dojem'] },
  'Past':        { mot: 'Zranit vetřelce', tahy: ['Představit hlídače', 'Někoho polapit do pasti', 'Uvolnit cestu'] },
  'Pevnost':     { mot: 'Bránit ve vstupu', tahy: ['Zabránit v cestě', 'Představit hlídače', 'Něco skrývat'] },
  'Vězení':      { mot: 'Zadržet a zabránit v úniku', tahy: ['Někoho polapit do pasti', 'Zabránit v cestě', 'Představit hrozbu'] }
};

// Útoky dle tagu příšery — tematicky propojené (Pokušitel nemá Drtivý úder)
const UTOKY_POOL = {
  physical: [
    { nazev: 'Drápy', dmg: 3, stitky: ['blízko', 'brutální'] },
    { nazev: 'Tesáky', dmg: 3, stitky: ['dotek', 'trhá maso'] },
    { nazev: 'Drtivý úder', dmg: 4, stitky: ['blízko', 'pomalé'] },
    { nazev: 'Kousnutí', dmg: 4, stitky: ['dotek', 'trhá maso'] },
    { nazev: 'Chapadla', dmg: 3, stitky: ['blízko', 'svírající'] },
    { nazev: 'Ocas', dmg: 2, stitky: ['blízko', 'sráží'] }
  ],
  magic: [
    { nazev: 'Psychický útlak', dmg: 1, stitky: ['ignoruje zbroj'] },
    { nazev: 'Blesk', dmg: 3, stitky: ['daleko'] },
    { nazev: 'Vysátí vůle', dmg: 0, stitky: ['ignoruje zbroj', 'bere štěstí'] },
    { nazev: 'Magický plamen', dmg: 2, stitky: ['plošné'] },
    { nazev: 'Temná magie', dmg: 3, stitky: ['daleko', 'magický'] },
    { nazev: 'Stínový úder', dmg: 3, stitky: ['magický'] }
  ],
  stealth: [
    { nazev: 'Bodnutí ze stínů', dmg: 3, stitky: ['ignoruje zbroj'] },
    { nazev: 'Škrcení', dmg: 2, stitky: ['dotek'] },
    { nazev: 'Jedová jehla', dmg: 1, stitky: ['dotek', 'jedovatý'] },
    { nazev: 'Paralyza dotykem', dmg: 1, stitky: ['dotek', 'ochromující'] },
    { nazev: 'Poleptání', dmg: 3, stitky: ['dotek', 'bolestivý'] }
  ],
  minion_master: [
    { nazev: 'Rozkaz k útoku', dmg: 0, stitky: ['přisluhovači +1'] },
    { nazev: 'Obětování pěšáka', dmg: 2, stitky: ['blízko'] },
    { nazev: 'Zahltit těly', dmg: 3, stitky: ['blízko', 'svírající'] }
  ]
};

// Flat pool pro přisluhovače a manuální editaci
const UTOKY_ALL = [...UTOKY_POOL.physical, ...UTOKY_POOL.magic, ...UTOKY_POOL.stealth];

const UTOKY_MINION = {
  lidsky: [
    { nazev: 'Nůž', dmg: 1, stitky: ['blízko'] },
    { nazev: 'Pistole', dmg: 2, stitky: ['daleko', 'hlučný'] },
    { nazev: 'Brokovnice', dmg: 3, stitky: ['blízko', 'hlučný'] },
    { nazev: 'Baseballová pálka', dmg: 1, stitky: ['blízko', 'pomalé'] }
  ],
  nadprirozeny: [
    { nazev: 'Jedovatý dotyk', dmg: 2, stitky: ['dotek', 'jedovatý'] },
    { nazev: 'Drápy', dmg: 3, stitky: ['blízko'] },
    { nazev: 'Nákaza', dmg: 1, stitky: ['dotek', 'ochromující'] },
    { nazev: 'Chapadlo', dmg: 2, stitky: ['blízko', 'svírající'] }
  ]
};

const LIDSTI_PRISLUHOVACI = ['Kultista', 'Zrádce', 'Renfield', 'Průzkumník', 'Zloděj'];

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

// Slabiny dle typu příšery (bod 5 pravidel) — tematicky svázané s weakType
const SLABINY_POOL = {
  physical: ['Stříbro', 'Chladné železo', 'Zásah do srdce', 'Useknutí hlavy'],
  elemental: ['Oheň', 'Mráz', 'Elektřina', 'Vysušení'],
  ritual: ['Exorcismus', 'Zničení zdroje moci', 'Pohřbení ostatků', 'Rituál svázání'],
  holy: ['Svěcená voda', 'Svatá půda', 'Symboly víry', 'Modlitba'],
  poison: ['Sůl', 'Specifická protilátka', 'Jed z byliny', 'Čistý ocet'],
  logic: ['Hádanka', 'Zrcadlo', 'Vyslovení pravého jména', 'Splnění slibu'],
  fire: ['Oheň', 'Extrémní teplo', 'Sluneční svit', 'UV záření']
};

const STOPY_SLABIN = {
  'Stříbro': 'Na těle oběti je popálenina ve tvaru stříbrného přívěsku.',
  'Chladné železo': 'Stará kovářova výheň v dílně je stále teplá — ale nikdo tam nepracuje.',
  'Zásah do srdce': 'Na stěně je historická mapa s vyznačeným místem — a šipka míří na srdce.',
  'Useknutí hlavy': 'V muzeu je vystavena stará gilotina s čerstvě nabroušeným ostřím.',
  'Oheň': 'Příšera se vyhýbá místům, kde hořely svíčky. Na podlaze jsou stopy úhybů.',
  'Mráz': 'V blízkosti mrazáků a lednic se bytost zdržuje daleko — svědek si všiml, že couvla.',
  'Elektřina': 'Při bouřce se bytost schovala. Na místě činu jsou rozbité pojistky.',
  'Vysušení': 'Všude kolem místa činu je vlhko — jako by se bytost vyhýbala suchu.',
  'Exorcismus': 'V knihovně leží otevřená kniha rituálů s podtrženou pasáží.',
  'Zničení zdroje moci': 'V doupěti je oltář s pulzujícím artefaktem — bytost ho chrání víc než sebe.',
  'Pohřbení ostatků': 'Na hřbitově je prázdný hrob — někdo vykopal kosti a odnesl je pryč.',
  'Rituál svázání': 'Na zdi je nákres pentagramu — nedokončený, jako by ho někdo přerušil.',
  'Svěcená voda': 'U kostela je louže — voda v ní bublá, když se bytost přiblíží.',
  'Svatá půda': 'Bytost nikdy neútočila na hřbitově ani v kostele — jen v okolí.',
  'Symboly víry': 'Oběť, která přežila, měla na krku křížek — jediná věc, co ji chránila.',
  'Modlitba': 'Svědek tvrdí, že bytost zaváhala, když začal recitovat otčenáš.',
  'Sůl': 'Na prahu domu, kde nikdo nebyl napaden, je linka soli.',
  'Specifická protilátka': 'Místní bylinkářka zmínila, že ví o receptu — ale bála se o něm mluvit.',
  'Jed z byliny': 'Na zahradě roste zvláštní bylina — bytost ji obchází obloukem.',
  'Čistý ocet': 'V kuchyni oběti je rozbitá láhev octa — a kolem ní žádné stopy bytosti.',
  'Hádanka': 'Bytost se zastavila, když jí oběť položila otázku — na chvíli jako by znejistěla.',
  'Zrcadlo': 'V místnosti, kde bytost řádila, jsou všechna zrcadla zakrytá nebo rozbita.',
  'Vyslovení pravého jména': 'V deníku oběti je zašifrovaný zápis — „Když řekneš jméno, ztratí moc."',
  'Splnění slibu': 'Bytost se vždy vrací na místo, kde byl dán slib — jako by čekala na splnění.',
  'Extrémní teplo': 'V blízkosti kotle se bytost neobjevila ani jednou.',
  'Sluneční svit': 'Všechny útoky se staly po setmění nebo v uzavřených prostorech.',
  'UV záření': 'Bytost se vyhýbá UV lampám v soláriu — svědek říká, že zasyčela.'
};

// Jména pro NPC a příšery
const DEFAULT_JMENA_MUZI = [
  'Petr', 'Jan', 'Karel', 'Tomáš', 'Šerif Bárta', 'Dr. Novák',
  'Farář Blažek', 'Starosta Hrdlička', 'Hajný Vrána', 'Martin',
  'Školník Novák', 'Barman Eda', 'Inspektor Dlouhý', 'Farář Otec Jan',
  'Bezdomovec Král', 'MUDr. Řezáč', 'Youtuber Mikeš', 'Starosta Bílý'
];
function getJmenaMuzi() { return poolStorage.get('jmenaMuzi') || DEFAULT_JMENA_MUZI; }

const DEFAULT_JMENA_ZENY = [
  'Jana', 'Eva', 'Marie', 'Lucie', 'Dr. Sýkorová', 'Sestra Alžběta',
  'Starostka Králová', 'Knihovnice Dvořáková', 'Učitelka Čermáková', 'Tereza',
  'Studentka Tereza', 'Učitelka Přísná', 'Sestra Agáta'
];
function getJmenaZeny() { return poolStorage.get('jmenaZeny') || DEFAULT_JMENA_ZENY; }

const DEFAULT_TITULY_M = [
  'Pán much', 'Černý jezdec', 'Noční lovec', 'Hrobník', 'Strážce prahu',
  'Stínový muž', 'Bezejmenný', 'Král červů', 'Tulák mlhy', 'Řezník',
  'Vlkodlak', 'Upír', 'Duch', 'Vodník', 'Čert', 'Mutant',
  'Android', 'Slenderman', 'Mimozemšťan', 'Kultista', 'Shoggoth', 'Prastarý'
];
function getTitulyM() { return poolStorage.get('titulyM') || DEFAULT_TITULY_M; }

const DEFAULT_TITULY_F = [
  'Bílá paní', 'Krvavá Marie', 'Matka hniloby', 'Sestra tmy', 'Královna hmyzu',
  'Šeptavá', 'Bledá nevěsta', 'Paní z jezera', 'Tkadlena osudu', 'Plačka',
  'Zombie', 'Polednice', 'Ježibaba'
];
function getTitulyF() { return poolStorage.get('titulyF') || DEFAULT_TITULY_F; }

// Šablony pro námět — (lok6=lokál s předložkou, lok2=genitiv, monstrum, motivace, zvrat, rod)
const SABLONY_NAMET = [
  (lok6, lok2, mon, mot, zvr, rod) =>
    `${capitalize(lok6)} se začali ztrácet lidé. Nikdo neví proč, ale stopy ukazují na něco nepřirozeného. ${zvr}`,
  (lok6, lok2, mon, mot, zvr) =>
    `Záhadné události ${lok6} děsí místní. Svědci popisují nesouvisející, ale znepokojivé incidenty. ${zvr}`,
  (lok6, lok2, mon, mot, zvr) =>
    `Něco se probudilo ${lok6}. Zatím jen drobné náznaky — ale eskalují. ${zvr}`,
  (lok6, lok2, mon, mot, zvr) =>
    `Místní z okolí ${lok2} hlásí podivné úkazy. Policie nenašla žádné vysvětlení. ${zvr}`,
  (lok6, lok2, mon, mot, zvr, rod) =>
    `V okolí ${lok2} panuje strach. Někdo nebo něco tu řádí a situace se zhoršuje. ${zvr}`
];

// Šablony pro návnadu — (kdo, akce, lok2=genitiv, lok1=nominativ)
const SABLONY_NAVNADA = [
  (kdo, akce, lok2, lok1) => `Policejní hlášení: ${kdo} ${akce} poblíž ${lok2}.`,
  (kdo, akce, lok2, lok1) => `Lovci obdrží zprávu: ${kdo} údajně ${akce} v okolí ${lok2}.`,
  (kdo, akce, lok2, lok1) => `Na sociálních sítích se virálně šíří video, kde ${kdo} ${akce} u ${lok2}.`,
  (kdo, akce, lok2, lok1) => `Místní noviny píší: „${kdo} ${akce}" — místo: ${lok1}.`,
  (kdo, akce, lok2, lok1) => `Anonymní tip: ${kdo} ${akce}. Poslední známá pozice: ${lok1}.`
];

// Páry [mužský, ženský] tvar — nepřímé stopy (následky, ne příčiny)
const DEFAULT_NAVNADA_AKCE = [
  // Psychické stopy
  ['byl nalezen v šoku a nemluví', 'byla nalezena v šoku a nemluví'],
  ['se zamkl doma a odmítá vycházet', 'se zamkla doma a odmítá vycházet'],
  ['kreslí stále dokola ten samý symbol', 'kreslí stále dokola ten samý symbol'],
  ['tvrdí, že \'oni\' už jsou tady', 'tvrdí, že \'oni\' už jsou tady'],
  ['si nepamatuje poslední dva dny', 'si nepamatuje poslední dva dny'],
  ['se v noci probudil s křikem', 'se v noci probudila s křikem'],
  // Fyzické stopy
  ['má na těle vyrážku, která vypadá jako plíseň', 'má na těle vyrážku, která vypadá jako plíseň'],
  ['našel na zahradě hromadu mrtvých ptáků', 'našla na zahradě hromadu mrtvých ptáků'],
  ['cítil v ložnici pach síry a ozonu', 'cítila v ložnici pach síry a ozonu'],
  ['objevil, že voda v kohoutku zčernala', 'objevila, že voda v kohoutku zčernala'],
  ['tvrdí, že se jeho odraz v zrcadle hýbe sám', 'tvrdí, že se její odraz v zrcadle hýbe sám'],
  ['našel své oblečení roztrhané na kusy', 'našla své oblečení roztrhané na kusy'],
  // Zmizení a zvuky
  ['slyšel ze sklepa dětský smích', 'slyšela ze sklepa dětský smích'],
  ['nahlásil, že jeho dobytek zmizel beze stopy', 'nahlásila, že její dobytek zmizel beze stopy'],
  ['viděl na poli světla, která tam nemají být', 'viděla na poli světla, která tam nemají být'],
  ['tvrdí, že ho v lese něco sledovalo', 'tvrdí, že ji v lese něco sledovalo']
];
function getNavnadaAkce() { return poolStorage.get('navnadaAkce') || DEFAULT_NAVNADA_AKCE; }

const NAVNADA_AFINITA = {
  physical: [6, 7, 11, 12, 13],      // fyzické stopy + zmizení
  magic:    [0, 2, 3, 4, 10, 14],     // psychické + zrcadlo + světla
  stealth:  [0, 1, 4, 5, 15],         // psychické — tiché projevy
  minion_master: [1, 3, 8, 9, 13]     // izolace + podivné jevy
};

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

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
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

// Oprava předložky v/ve — záleží na prvním slově za předložkou, ne na podstatném jméně
function zvolPredlozku(predlozka, nasledujiciSlovo) {
  if (predlozka !== 'v' && predlozka !== 've') return predlozka; // "na" apod.
  const s = nasledujiciSlovo.toLowerCase();
  // "ve" před: v/f + souhláska, nebo s/z/š/ž + souhláska
  if (/^[vfszšž][^aeiouyáéíóúůý]/i.test(s)) return 've';
  return 'v';
}

// Složí unikátní lokaci se správnými pády (nominativ, genitiv, lokál)
function generujUnikatniLokaci() {
  const lok = pickRandom(getLokace());
  const [adjKoren, adjTyp] = pickRandom(getAdjektiva());

  // 1. pád (nominativ): "Zatopená Škola"
  const nom = `${sklonujAdjektivum(adjKoren, adjTyp, lok.rod, 1)} ${lok.nom}`;
  // 2. pád (genitiv): "Zatopené Školy"
  const gen = `${sklonujAdjektivum(adjKoren, adjTyp, lok.rod, 2)} ${lok.gen}`;
  // 6. pád (lokál): "v Zatopené Škole" — vložit adjektivum za předložku
  const [predlozka, ...zbytekParts] = lok.lok.split(' ');
  const adjLok = sklonujAdjektivum(adjKoren, adjTyp, lok.rod, 6);
  const lokativ = `${zvolPredlozku(predlozka, adjLok)} ${adjLok} ${zbytekParts.join(' ')}`;

  // Atmosféra se vypisuje zvlášť (nerepetuje se v každé větě)
  const atmosfera = Math.random() > 0.5 ? pickRandom(getAtmosfery()) : '';

  // Typ lokace se losuje náhodně z TYPY_LOKALIT
  const typ = pickRandom(Object.keys(TYPY_LOKALIT));

  return { nom, gen, lok: lokativ, atmosfera, rod: lok.rod, typ };
}

// Generuje jméno příšery dle rodu typu
function generujJmenoMonstrum(rod) {
  if (rod === 'f') return pickRandom(getTitulyF());
  return pickRandom(getTitulyM());
}

// Generuje odpočet ve 3 stylech dle motivace
// lokGen = genitiv lokace ("Zatopené Školy"), lokNom = nominativ ("Zatopená Škola")
function generujOdpocet(lokGen, lokNom, monJmeno, mot, minionJmeno, rod, zvratKategorie) {
  const motLower = mot.toLowerCase();
  const dokoncil = rod === 'f' ? 'dokončila' : rod === 'n' ? 'dokončilo' : 'dokončil';
  const nezastavitelny = rod === 'f' ? 'téměř nezastavitelná' : rod === 'n' ? 'téměř nezastavitelné' : 'téměř nezastavitelný';

  let odpocet;

  // Agresivní styl — pro ničitele, bestie, popravčí
  if (motLower.includes('ničit') || motLower.includes('konec') || motLower.includes('trestat') || motLower.includes('zabíjet')) {
    odpocet = createCountdown({
      den: `V okolí ${lokGen} se najde první oběť. Zvířata utíkají z oblasti.`,
      priseri: `${monJmeno} zaútočí podruhé. Policie uzavírá oblast.`,
      zapad_slunce: `Těla přibývají. ${minionJmeno} aktivně brání lovcům v přístupu.`,
      soumrak: `${monJmeno} řádí otevřeně. Civilisté panicky prchají.`,
      noc: `Masivní destrukce. Poslední šance zasáhnout, než bude pozdě.`,
      pulnoc: `${monJmeno} ${dokoncil} svůj cíl: ${mot}. Oblast je zničená.`
    });
  }
  // Skrytý/korupční styl — pro pokušitele, parazity, královny
  else if (motLower.includes('svést') || motLower.includes('ovládnout') || motLower.includes('napadnout') || motLower.includes('posednout')) {
    odpocet = createCountdown({
      den: `Lidé v okolí ${lokGen} se začínají chovat podivně. Drobné náznaky.`,
      priseri: `Další lidé padají pod vliv ${monJmeno}. Šíří se podivné zvyky.`,
      zapad_slunce: `${minionJmeno} otevřeně slouží příšeře. Polovina místních je ovládnuta.`,
      soumrak: `${monJmeno} ovládá klíčové osoby. Lovci nevědí, komu věřit.`,
      noc: `Téměř celé město je pod kontrolou. Zbývá jen hrstka nezasažených.`,
      pulnoc: `${monJmeno} ${dokoncil} přeměnu. Celá komunita je navždy ztracena.`
    });
  }
  // Obecný styl — pro ostatní
  else {
    odpocet = createCountdown({
      den: `Průzkum ${lokGen}. Drobné stopy, šeptanda mezi místními.`,
      priseri: `${monJmeno} naznačuje svou přítomnost. Další oběť zmizí.`,
      zapad_slunce: `Situace se zhoršuje. ${monJmeno} útočí otevřeněji.`,
      soumrak: `${minionJmeno} aktivně brání lovcům v postupu. Vážné nebezpečí.`,
      noc: `${monJmeno} je ${nezastavitelny}. Poslední šance použít slabinu.`,
      pulnoc: `Konec hry. ${monJmeno} ${dokoncil} svůj plán: ${mot}. Následky jsou nevratné.`
    });
  }

  // Zvrat ovlivňuje odpočet
  if (zvratKategorie === 'mirny') {
    odpocet.noc = `${monJmeno} se spíše skrývá a brání. Hrozba je reálná, ale kontrolovatelná.`;
  } else if (zvratKategorie === 'tezky') {
    odpocet.pulnoc += ' Navíc se odhalí další, nečekaná komplikace.';
  }

  return odpocet;
}

function vytvorZahaduNahodne() {
  // 1. Vybrat typy z per-type slovníků
  const monsterTypeName = pickRandom(Object.keys(TYPY_MONSTER));
  const monsterData = TYPY_MONSTER[monsterTypeName];
  const afinita = AFINITA_PRISLUHOVACU[monsterTypeName] || {};
  const minionWeights = {};
  for (const key of Object.keys(TYPY_PRISLUHOVACU)) {
    minionWeights[key] = afinita[key] || 1;
  }
  const minionTypeName = pickWeighted(minionWeights);
  const minionData = TYPY_PRISLUHOVACU[minionTypeName];

  // 2. Generovat 2-3 lokace s rolemi
  const lokCount = randRange(2, 3);
  const lokace = generujUnikatniLokaci(); // hlavní (pro námět/návnadu)

  // Atmosféra s afinitou k příšeře (50% afinitní, 50% generická nebo žádná)
  const afinitniAtmo = ATMOSFERA_AFINITA[monsterTypeName];
  if (afinitniAtmo && Math.random() < 0.5) {
    lokace.atmosfera = pickRandom(afinitniAtmo);
  }

  const dalsiLokace = [];
  for (let i = 1; i < lokCount; i++) {
    dalsiLokace.push(generujUnikatniLokaci());
  }

  // 3. Jméno příšery dle rodu typu + podivný rys
  const rys = pickRandom(getRysy());
  const zajmeno = ziskajZajmeno(monsterData.rod);
  const titul = generujJmenoMonstrum(monsterData.rod);
  const priseraJmeno = `${titul}, ${zajmeno} ${rys}`;

  // 4. Generovat 2-3 NPC s různými rolemi
  const npcCount = randRange(2, 3);
  const npcTypes = pickN(Object.keys(TYPY_NPC), npcCount);
  const npcThreats = npcTypes.map(npcTypeName => {
    const npcData = TYPY_NPC[npcTypeName];
    const rodMuz = Math.random() > 0.5;
    const jmeno = pickRandom(rodMuz ? getJmenaMuzi() : getJmenaZeny());
    return { npcTypeName, npcData, rodMuz, jmeno };
  });
  // První NPC se použije pro návnadu
  const npcRodMuz = npcThreats[0].rodMuz;
  const npcJmeno = npcThreats[0].jmeno;

  // 5. Zvrat (s kategorií pro vliv na odpočet)
  const zvratKategorie = pickRandom(['mirny', 'stredni', 'tezky']);
  const zvratPool = ZVRAT_KATEGORIE[zvratKategorie] || ZVRAT_KATEGORIE.stredni;
  const zvrat = pickRandom(zvratPool);

  // 6. Bod 1: Typ a Motivace
  const hp = randRange(monsterData.hp[0], monsterData.hp[1]);
  const zbroj = monsterData.zbroj;

  // 7. Bod 2: Nadpřirozené schopnosti (per typ + podivný rys)
  const typSchopnosti = SCHOPNOSTI_POOL[monsterTypeName] || [];
  const schopnosti = pickN(typSchopnosti, randRange(2, 3));
  schopnosti.push(rys);

  // 8. Bod 3: Útoky dle tagu příšery (tematicky propojené)
  const tagUtoky = UTOKY_POOL[monsterData.tag] || UTOKY_POOL.physical;
  const utoky = pickN(tagUtoky, 2);

  // 9. Bod 5: Slabina dle weakType příšery
  const typSlabiny = SLABINY_POOL[monsterData.weakType] || SLABINY_POOL.physical;
  const slabina = pickRandom(typSlabiny);
  const stopaKSlabine = STOPY_SLABIN[slabina] || '';

  // 10. Lokace typ z LOKACE_DB → namapovat na TYPY_LOKALIT
  const locationTypeName = lokace.typ;
  const locationData = TYPY_LOKALIT[locationTypeName] || TYPY_LOKALIT[pickRandom(Object.keys(TYPY_LOKALIT))];

  // 11. Odpočet ve 3 stylech dle motivace (genitiv + nominativ lokace pro správné pády)
  const odpocet = generujOdpocet(lokace.gen, lokace.nom, titul, monsterData.mot, minionTypeName, monsterData.rod, zvratKategorie);

  // 12. Námět a návnada z šablon (lokál a genitiv pro správné pády)
  const namet = pickRandom(SABLONY_NAMET)(lokace.lok, lokace.gen, priseraJmeno, monsterData.mot.toLowerCase(), `ALE: ${zvrat}`, monsterData.rod);
  // Návnada s afinitou k příšeře (70% afinitní, 30% náhodná)
  const akcePool = getNavnadaAkce();
  let navnadaAkcePar;
  const afinitniIndexy = NAVNADA_AFINITA[monsterData.tag];
  if (afinitniIndexy && Math.random() < 0.7) {
    const validIndexy = afinitniIndexy.filter(i => i < akcePool.length);
    const idx = pickRandom(validIndexy.length ? validIndexy : [0]);
    navnadaAkcePar = akcePool[idx];
  } else {
    navnadaAkcePar = pickRandom(akcePool);
  }
  const navnadaAkce = npcRodMuz ? navnadaAkcePar[0] : navnadaAkcePar[1];
  const navnada = pickRandom(SABLONY_NAVNADA)(npcJmeno, navnadaAkce, lokace.gen, lokace.nom);

  // 13. Název (nominativ + atmosféra zvlášť)
  const nazevLokace = lokace.atmosfera ? `${lokace.nom}, ${lokace.atmosfera}` : lokace.nom;
  const nazev = nazevLokace;

  // 14. Pool metadata pro barevné zvýraznění
  const _pools = {
    titul,
    lokaceNom: lokace.nom,
    lokaceGen: lokace.gen,
    lokaceLok: lokace.lok,
    atmosfera: lokace.atmosfera || '',
    rys,
    zvrat,
    npcJmeno,
    navnadaAkce
  };

  // 15. Sestavit kompletní hratelnou záhadu
  const mystery = createMystery({
    nazev,
    namet,
    navnada,
    odpocet,
    _pools,
    hrozby: [
      createThreat({
        jmeno: priseraJmeno,
        typ: ThreatType.PRISERA,
        druh: monsterTypeName,
        motivace: monsterData.mot,
        mustek: NARATIVNI_MUSTKY[monsterTypeName] ? NARATIVNI_MUSTKY[monsterTypeName](titul) : '',
        schopnosti,
        utoky,
        zivoty: hp,
        zbroj,
        slabina,
        stopaKSlabine,
        tahy: monsterData.tahy
      }),
      createThreat({
        jmeno: minionTypeName,
        typ: ThreatType.PRISLUHOVAC,
        druh: minionTypeName,
        motivace: minionData.mot,
        utoky: [pickRandom(
          LIDSTI_PRISLUHOVACI.includes(minionTypeName)
            ? UTOKY_MINION.lidsky
            : UTOKY_MINION.nadprirozeny
        )],
        zivoty: randRange(minionData.hp[0], minionData.hp[1]),
        zbroj: Math.random() > 0.5 ? 1 : 0,
        tahy: minionData.tahy
      }),
      ...npcThreats.map(npc => createThreat({
        jmeno: npc.jmeno,
        typ: ThreatType.PRIHLIZEJICI,
        druh: npc.npcTypeName,
        motivace: npc.npcData.mot,
        tahy: npc.npcData.tahy
      })),
      createThreat({
        jmeno: `${lokace.nom} (${LOKACE_ROLE[0].role})`,
        typ: ThreatType.LOKALITA,
        druh: locationTypeName,
        motivace: locationData.mot,
        tahy: locationData.tahy
      }),
      ...dalsiLokace.map((lok, i) => {
        const role = LOKACE_ROLE[i + 1] || LOKACE_ROLE[LOKACE_ROLE.length - 1];
        const typeName = lok.typ;
        const typeData = TYPY_LOKALIT[typeName];
        return createThreat({
          jmeno: `${lok.nom} (${role.role})`,
          typ: ThreatType.LOKALITA,
          druh: typeName,
          motivace: typeData.mot,
          tahy: typeData.tahy
        });
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
    case 'pools':
      import('./pool-editor.js').then(({ renderPoolEditor, initPoolEditorHandlers }) => {
        container.innerHTML = renderPoolEditor();
        initPoolEditorHandlers();
      });
      return;
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
          <button onclick="window.mysteryGenerator.openPools()"
            class="flex items-center gap-2 bg-gray-800/40 hover:bg-gray-700/60 px-4 py-2 rounded text-sm font-semibold border border-gray-600/50 transition">
            <span class="material-symbols-outlined text-sm">database</span> Upravit pooly
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
      <h3 class="font-bold text-lg mb-1 truncate pr-6">${highlightPools(mystery.nazev || 'Bez názvu', mystery._pools)}</h3>
      <p class="text-sm text-gray-400 mb-3 line-clamp-2">${highlightPools(mystery.namet || 'Bez námětu', mystery._pools)}</p>
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
        <h2 class="text-2xl font-bold flex-1">${highlightPools(m.nazev || 'Bez názvu', m._pools)}</h2>
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

      ${m.namet ? `<div class="mb-4"><span class="text-xs uppercase tracking-wider text-gray-500">Námět</span><p class="text-gray-200 mt-1">${highlightPools(m.namet, m._pools)}</p></div>` : ''}
      ${m.navnada ? `<div class="mb-4"><span class="text-xs uppercase tracking-wider text-gray-500">Návnada</span><p class="text-gray-200 mt-1">${highlightPools(m.navnada, m._pools)}</p></div>` : ''}

      ${renderDetailCountdown(m.odpocet)}
      ${renderDetailThreats(m.hrozby, m._pools)}
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

function renderDetailThreats(hrozby, pools) {
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
              <span class="font-bold">${highlightPools(h.jmeno || 'Bez jména', pools)}</span>
              ${h.druh ? `<span class="text-gray-500 text-sm">— ${escapeHtml(h.druh)}</span>` : ''}
            </div>
            ${h.motivace ? `<p class="text-sm text-gray-400 mb-2"><strong>Motivace:</strong> ${escapeHtml(h.motivace)}</p>` : ''}
            ${h.mustek ? `<p class="text-sm italic text-gray-400 mt-1 mb-2">${escapeHtml(h.mustek)}</p>` : ''}
            ${h.slabina ? `<p class="text-sm text-yellow-400/80 mb-2"><strong>Slabina:</strong> ${escapeHtml(h.slabina)}</p>` : ''}
            ${h.stopaKSlabine ? `<p class="text-sm text-yellow-400/60 mb-2 italic">\u{1F50E} ${escapeHtml(h.stopaKSlabine)}</p>` : ''}
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
      if (h.stopaKSlabine) lines.push(`  STOPA: ${h.stopaKSlabine}`);
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

// ─── Audit generátoru ──────────────────────────────────────────

function spocitejKombinace() {
  const pools = {
    monster: Object.keys(TYPY_MONSTER).length,
    titulyM: getTitulyM().length,
    titulyF: getTitulyF().length,
    rysy: getRysy().length,
    adjektiva: getAdjektiva().length,
    lokace: getLokace().length,
    atmosfery: getAtmosfery().length + 1,
    minion: Object.keys(TYPY_PRISLUHOVACU).length,
    npc: Object.keys(TYPY_NPC).length,
    npcJmena: getJmenaMuzi().length + getJmenaZeny().length,
    zvraty: getZvraty().length,
    sablonyNamet: SABLONY_NAMET.length,
    sablonyNavnada: SABLONY_NAVNADA.length,
    navnadaAkce: getNavnadaAkce().length
  };
  const femMonsters = Object.values(TYPY_MONSTER).filter(t => t.rod === 'f').length;
  const mascMonsters = pools.monster - femMonsters;
  const titulyEfektivni = mascMonsters * pools.titulyM + femMonsters * pools.titulyF;
  const celkem = titulyEfektivni * pools.rysy * pools.adjektiva * pools.lokace
    * pools.atmosfery * pools.minion * pools.npc * pools.npcJmena
    * pools.zvraty * pools.sablonyNamet * pools.sablonyNavnada * pools.navnadaAkce;
  return { pools, celkem };
}

function runAudit(n = 10000) {
  const start = performance.now();
  const podpisyCelk = [];
  const distribuce = { monster: {}, minion: {}, npc: {}, lokTyp: {} };

  // Per-komponentní sety pro měření reálné diverzity
  const komponenty = {
    nazev: new Set(),           // celý název (titul + adj+lokace + atmosféra)
    lokBaze: new Set(),         // jen base lokace (bez adjektiva) — extrahujeme z lok.jmeno
    adjLok: new Set(),          // adj+lokace combo (z názvu před " — ")
    titul: new Set(),           // titul příšery (před čárkou v jméně)
    priseraJmeno: new Set(),    // titul + rys
    npcJmeno: new Set(),        // jméno NPC
    npcKombo: new Set(),        // jméno + typ NPC
    zvrat: new Set(),           // zvrat (z námetu — "ALE: ...")
    namet60: new Set()          // námět (prvních 60 znaků)
  };

  for (let i = 0; i < n; i++) {
    const m = vytvorZahaduNahodne();
    const prisera = m.hrozby.find(h => h.typ === ThreatType.PRISERA);
    const minion = m.hrozby.find(h => h.typ === ThreatType.PRISLUHOVAC);
    const npcs = m.hrozby.filter(h => h.typ === ThreatType.PRIHLIZEJICI);
    const loks = m.hrozby.filter(h => h.typ === ThreatType.LOKALITA);
    const npc = npcs[0];
    const lok = loks[0];

    // Celkový podpis
    const sig = `${m.nazev}|${prisera.jmeno}|${minion.druh}|${npc.jmeno}|${npc.druh}|${m.namet.substring(0, 60)}`;
    podpisyCelk.push(sig);

    // Distribuce typů
    distribuce.monster[prisera.druh] = (distribuce.monster[prisera.druh] || 0) + 1;
    distribuce.minion[minion.druh] = (distribuce.minion[minion.druh] || 0) + 1;
    for (const n of npcs) distribuce.npc[n.druh] = (distribuce.npc[n.druh] || 0) + 1;
    for (const l of loks) distribuce.lokTyp[l.druh] = (distribuce.lokTyp[l.druh] || 0) + 1;

    // Per-komponentní data
    komponenty.nazev.add(m.nazev);
    // Lokace base = jméno lok hrozby bez role v závorce
    const lokBase = lok.jmeno.replace(/\s*\([^)]*\)$/, '');
    komponenty.lokBaze.add(lokBase);
    // Adj+lokace = část názvu za " — " (bez atmosféry — titul je před)
    const nazevCasti = m.nazev.split(' — ');
    if (nazevCasti[1]) komponenty.adjLok.add(nazevCasti[1]);
    // Titul příšery = část před čárkou
    const titul = prisera.jmeno.split(',')[0];
    komponenty.titul.add(titul);
    komponenty.priseraJmeno.add(prisera.jmeno);
    komponenty.npcJmeno.add(npc.jmeno);
    komponenty.npcKombo.add(`${npc.jmeno}|${npc.druh}`);
    // Zvrat z námetu
    const zvratMatch = m.namet.match(/ALE: (.+)$/);
    if (zvratMatch) komponenty.zvrat.add(zvratMatch[1]);
    komponenty.namet60.add(m.namet.substring(0, 60));
  }

  const unikatni = new Set(podpisyCelk).size;
  const cas = ((performance.now() - start) / 1000).toFixed(2);
  const kombinace = spocitejKombinace();

  console.log(`\n=== AUDIT GENERÁTORU (${n} generací, ${cas}s) ===`);

  // Per-komponentní diverzita
  console.log('\n--- DIVERZITA KOMPONENT ---');
  const maxSloupce = [
    ['Celý podpis', unikatni, `~${(kombinace.celkem / 1e12).toFixed(1)}T`],
    ['Název záhady', komponenty.nazev.size, `${kombinace.pools.titulyM}t × ${kombinace.pools.adjektiva}a × ${kombinace.pools.lokace}l × ${kombinace.pools.atmosfery}atm`],
    ['Adj+lokace', komponenty.adjLok.size, `${kombinace.pools.adjektiva} × ${kombinace.pools.lokace} = ${kombinace.pools.adjektiva * kombinace.pools.lokace}`],
    ['Lokace base (nom)', komponenty.lokBaze.size, `${kombinace.pools.adjektiva} × ${kombinace.pools.lokace} = ${kombinace.pools.adjektiva * kombinace.pools.lokace}`],
    ['Titul příšery', komponenty.titul.size, `${kombinace.pools.titulyM}M + ${kombinace.pools.titulyF}F = ${kombinace.pools.titulyM + kombinace.pools.titulyF}`],
    ['Příšera (titul+rys)', komponenty.priseraJmeno.size, `${kombinace.pools.titulyM + kombinace.pools.titulyF} × ${kombinace.pools.rysy} = ${(kombinace.pools.titulyM + kombinace.pools.titulyF) * kombinace.pools.rysy}`],
    ['NPC jméno', komponenty.npcJmeno.size, `${kombinace.pools.npcJmena}`],
    ['NPC jméno+typ', komponenty.npcKombo.size, `${kombinace.pools.npcJmena} × ${kombinace.pools.npc} = ${kombinace.pools.npcJmena * kombinace.pools.npc}`],
    ['Zvrat', komponenty.zvrat.size, `${kombinace.pools.zvraty}`],
    ['Námět (60 zn.)', komponenty.namet60.size, 'komplexní']
  ];
  for (const [label, actual, max] of maxSloupce) {
    const saturace = typeof max === 'number' ? ` (${((actual / max) * 100).toFixed(0)}% z ${max})` : ` / max ~${max}`;
    console.log(`  ${label.padEnd(22)} ${String(actual).padStart(6)} unikátních${saturace}`);
  }

  // Distribuce typů
  const kategorie = [
    ['MONSTER', distribuce.monster],
    ['PŘISLUHOVAČI', distribuce.minion],
    ['NPC', distribuce.npc],
    ['LOKACE TYP', distribuce.lokTyp]
  ];

  for (const [nazev, data] of kategorie) {
    console.log(`\n--- ROZLOŽENÍ: ${nazev} ---`);
    const expected = n / Object.keys(data).length;
    for (const [typ, pocet] of Object.entries(data).sort((a, b) => b[1] - a[1])) {
      const pct = ((pocet / n) * 100).toFixed(1);
      const bar = '\u2588'.repeat(Math.round(pocet / expected * 10));
      console.log(`${typ.padEnd(20)} ${String(pocet).padStart(6)}x (${pct.padStart(5)}%) ${bar}`);
    }
  }

  const pctUniq = (unikatni / n) * 100;
  const verdikt = pctUniq > 99.9 ? 'EXCELENTNÍ' : pctUniq > 99 ? 'DOBRÉ' : 'POTŘEBA ROZŠÍŘIT';
  console.log(`\nCELKOVÁ ORIGINALITA: ${unikatni} / ${n} (${pctUniq.toFixed(2)}%) — ${verdikt}`);

  return { unikatni, duplikaty: n - unikatni, originalita: pctUniq, cas, kombinace, distribuce, komponenty: Object.fromEntries(Object.entries(komponenty).map(([k, v]) => [k, v.size])) };
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
  },

  openPools() {
    currentView = 'pools';
    renderGeneratorTab();
  },

  // Audit & statistiky (volat z konzole: window.mysteryGenerator.audit(10000))
  audit(n) { return runAudit(n); },
  kombinace() { return spocitejKombinace(); }
};

// ─── Exports for pool editor ──────────────────────────────────

export {
  DEFAULT_TITULY_M, DEFAULT_TITULY_F, DEFAULT_JMENA_MUZI, DEFAULT_JMENA_ZENY,
  DEFAULT_ATMOSFERY, DEFAULT_RYSY, DEFAULT_ZVRATY, DEFAULT_ADJEKTIVA,
  DEFAULT_LOKACE, DEFAULT_NAVNADA_AKCE,
  getTitulyM, getTitulyF, getJmenaMuzi, getJmenaZeny,
  getAtmosfery, getRysy, getZvraty, getAdjektiva, getLokace, getNavnadaAkce,
  TYPY_LOKALIT
};
