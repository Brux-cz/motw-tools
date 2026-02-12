/**
 * Countdown Pools — structured data for 3-slot countdown generator
 *
 * Placeholders:
 *   {v}           — verb ending for monster gender: '' (m), 'a' (f), 'o' (n)
 *   {l}           — verb ending for location gender: '' (m), 'a' (f)
 *   {j}           — possessive pronoun: 'jeho' (m/n), 'její' (f)
 *   {prisera}     — monster title (e.g. "Vlkodlak")
 *   {prisluhovac} — minion type name (e.g. "Surovec")
 *   {lokace_gen}  — location name in genitive (e.g. "Zatopené Školy")
 *   {lokace_nom}  — location name in nominative (e.g. "Zatopená Škola")
 *   {lokace_lok}  — location name in locative WITH preposition (e.g. "v Zatopené Škole")
 *   {LOKACE_LOK}  — same as {lokace_lok} but capitalized (for sentence start)
 *
 * IMPORTANT: {lokace_lok} already contains the preposition (v/ve/na).
 * Do NOT add "v" before {lokace_lok} — write "{lokace_lok}" not "v {lokace_lok}".
 */

// ─── Title → Category mapping ──────────────────────────────────
// Maps monster titles to atmospheric categories (5 total, 2 in prototype)

export const KATEGORIE_TITULU = {
  // Přízraky — eterické, nehmotné, duchové
  'Bílá paní': 'prizraky',
  'Duch': 'prizraky',
  'Stínový muž': 'prizraky',
  'Plačka': 'prizraky',
  'Bledá nevěsta': 'prizraky',
  'Paní z jezera': 'prizraky',
  'Polednice': 'prizraky',
  'Tulák mlhy': 'prizraky',
  'Bezejmenný': 'prizraky',
  'Sestra tmy': 'prizraky',

  // Bestie — fyzické, dravé, zvířecí
  'Vlkodlak': 'bestie',
  'Krvavá Marie': 'bestie',
  'Upír': 'bestie',
  'Vodník': 'bestie',
  'Noční lovec': 'bestie',
  'Řezník': 'bestie',
  'Hrobník': 'bestie',
  'Matka hniloby': 'bestie',
  'Královna hmyzu': 'bestie',
  'Mutant': 'bestie',
  'Zombie': 'bestie',
  'Ježibaba': 'bestie',

  // Démoni — (budoucí rozšíření)
  'Čert': 'demoni',
  'Pán much': 'demoni',
  'Král červů': 'demoni',

  // Kosmické — (budoucí rozšíření)
  'Shoggoth': 'kosmicke',
  'Prastarý': 'kosmicke',
  'Mimozemšťan': 'kosmicke',

  // Anomálie — (budoucí rozšíření)
  'Android': 'anomalie',
  'Slenderman': 'anomalie',
  'Kultista': 'anomalie',
  'Černý jezdec': 'anomalie',
  'Strážce prahu': 'anomalie',
  'Šeptavá': 'anomalie',
  'Tkadlena osudu': 'anomalie'
};

// ─── Monster type → gradation style mapping ────────────────────

export const STYL_TYPU = {
  'Bestie': 'agresivni',
  'Ničitel': 'agresivni',
  'Popravčí': 'agresivni',
  'Požírač': 'agresivni',
  'Pokušitel': 'korupcni',
  'Královna': 'korupcni',
  'Parazit': 'korupcni',
  'Zploditel': 'korupcni',
  'Černokněžník': 'obecny',
  'Mučitel': 'obecny',
  'Sběratel': 'obecny',
  'Šibal': 'obecny'
};

// ─── PROJEV pool — atmospheric layer per title category ────────

export const PROJEV = {
  prizraky: {
    den: [
      'V okolí {lokace_gen} začne bez příčiny náhle kolísat teplota a světla poblikávají.',
      'Stíny {lokace_lok} se zdají žít vlastním životem a koutkem oka lze zahlédnout postavy, které mizí.',
      'Vzduchem {lokace_lok} se nese slabý, nepřirozeně sladký zápach, který vyvolává podivnou malátnost.'
    ],
    priseri: [
      'Stíny {lokace_lok} se prodlužují a z temných koutů je slyšet ledový šepot.',
      'Odrazy v zrcadlech {lokace_lok} se začínají opožďovat a tváře v nich vypadají cize a zlověstně.',
      'Lovci {lokace_lok} cítí mrazivé mrazení v zádech, jako by jim někdo neviditelný dýchal na krk.'
    ],
    zapad_slunce: [
      'Náhlý mráz prostoupí každou místnost a rádio {lokace_lok} začne vysílat jen statický šum.',
      'Viditelnost {lokace_lok} prudce klesá a stěny se zdají být na dotek vlhké a lepkavé.',
      '{LOKACE_LOK} zavládne těžké ticho, které prořezává jen hysterický smích ozývající se z dálky.'
    ],
    soumrak: [
      'Viditelnost {lokace_lok} klesá na minimum a vzduch kolem lovců citelně ztěžkne.',
      'Každý stín {lokace_lok} se zdá mít lidské rysy a šeptá lovcům jejich nejtajnější obavy.',
      'Stěny {lokace_lok} začínají krvácet černou tekutinu a prostor se zdá být čím dál těsnější.'
    ],
    noc: [
      'Stěny {lokace_lok} se začínají pokrývat jinovatkou a zrcadla pukají mrazem.',
      'Celý prostor {lokace_gen} působí jako pokřivená snová vize, kde nic nedává smysl.',
      'V temnotě {lokace_lok} se ozývají hlasy mrtvých, které lákají poslední přeživší do záhuby.'
    ]
  },

  bestie: {
    den: [
      'Kolem {lokace_gen} se začíná šířit pach mokré srsti a v prachu se objevují neznámé stopy.',
      'Místní zvířata v okolí {lokace_gen} jsou nepopsatelně neklidná a pokoušejí se o útěk.',
      'Vzduchem v okolí {lokace_gen} se nese slabý, ale vtíravý pach čerstvé krve.'
    ],
    priseri: [
      'Z hloubi {lokace_gen} se ozývá hrdelní vrčení, ze kterého lovcům tuhne krev v žilách.',
      'Na stěnách {lokace_lok} jsou patrné čerstvé rýhy od drápů a rozervané kusy vybavení.',
      'Lovci {lokace_lok} cítí upřený pohled predátora, který je sleduje z absolutní tmy.'
    ],
    zapad_slunce: [
      'Vzduchem se nese těžký pach syrového masa a zvířecí instinkty lovců bijí na poplach.',
      'Viditelnost {lokace_lok} prudce klesá a v dálce je slyšet lámání kostí a drcení materiálu.',
      'Těžké, dusné ticho {lokace_lok} přerušuje jen těžký dech dravce, který je blíž, než se zdá.'
    ],
    soumrak: [
      'V okolí {lokace_gen} vše utichne, jako by se příroda bála vydat jediný zvuk před úderem.',
      'Každý stín {lokace_lok} se zdá mít vyceněné zuby a vzduch kolem lovců citelně ztěžkne.',
      'Zvuk trhaného masa se ozývá ze všech stran {lokace_gen} a potvrzuje přítomnost zkázy.'
    ],
    noc: [
      'V temnotě {lokace_lok} svítí jen dravčí oči a v dálce se ozývá vítězné vytí.',
      'Celý prostor {lokace_gen} je nasáklý pachem smrti a Bestie už se nesnaží skrývat.',
      'Zákoutí {lokace_gen} jsou nyní plná trosek a mrtvých těl; predátor je pánem noci.'
    ]
  }

  // TODO: demoni, kosmicke, anomalie
};

// ─── AKCE pool — what the monster does (per monster type) ──────

export const AKCE = {
  'Bestie': {
    den: [
      '{prisera} si vyhlédl{v} první oběť a začal{v} ji nemilosrdně stopovat.',
      '{prisera} označil{v} své teritorium v okolí {lokace_gen} a připravuje se na lov.',
      '{prisera} narušil{v} klid oblasti a hledá slabé místo v obraně svých obětí.'
    ],
    priseri: [
      'Dojde k prvnímu brutálnímu útoku, který {lokace_lok} zanechá krvavé svědectví.',
      '{prisera} poprvé ochutnal{v} lidskou krev a {j} hlad se stal neovladatelným.',
      '{prisera} napadl{v} a odvlekl{v} náhodného kolemjdoucího hlouběji do útrob {lokace_gen}.'
    ],
    zapad_slunce: [
      '{prisera} útočí znovu, zatímco {prisluhovac} aktivně brání lovcům v přístupu k místu činu.',
      '{prisera} se prohání prostory {lokace_gen}, přičemž {prisluhovac} zahrazuje jedinou bezpečnou cestu k ústupu.',
      '{prisera} rozerval{v} další oběť, zatímco {prisluhovac} připravuje půdu pro finální úder.'
    ],
    soumrak: [
      '{prisera} začne řádit naprosto otevřeně a {prisluhovac} dostává rozkaz eliminovat každého, kdo by se chtěl bránit.',
      '{prisera} masakruje přítomné, zatímco {prisluhovac} izoluje skupinu od jakékoliv pomoci zvenčí.',
      '{prisera} si nárokuje celou oblast, přičemž {prisluhovac} brutálně napadá každého, kdo se pokusí uniknout.'
    ],
    noc: [
      '{prisera} se připravuje na finální masakr a veškerý odpor {lokace_lok} se zdá být marný.',
      '{prisera} ovládl{v} celou lokalitu a dokončuje systematické vyhlazování všech přeživších.',
      '{prisera} se chystá zasadit poslední úder, který navždy změní tvář {lokace_gen}.'
    ]
  },

  'Pokušitel': {
    den: [
      '{prisera} začne nenápadně našeptávat lidem v okolí a probouzet v nich temné touhy.',
      '{prisera} vyhledal{v} slabost první oběti a začal{v} nahlodávat {j} morální zábrany.',
      '{prisera} zasel{v} první semínka pochybností a žárlivosti mezi obyvatele {lokace_gen}.'
    ],
    priseri: [
      'První člověk zcela podlehne vlivu {prisera} a spáchá krutý čin, který by dříve neudělal.',
      '{prisera} zlomil{v} vůli důležité osoby {lokace_lok} a udělal{v} z ní nástroj své vůle.',
      'Pod vlivem {prisera} dochází k prvnímu veřejnému konfliktu, který končí nevratným ublížením.'
    ],
    zapad_slunce: [
      '{prisera} svádí další duše ke zlu, přičemž {prisluhovac} aktivně šíří dezinformace a lži.',
      '{prisera} rozvrací vztahy {lokace_lok}, zatímco {prisluhovac} zahrazuje cestu k těm, kteří ještě odolávají.',
      '{prisera} otevřeně manipuluje davem, přičemž {prisluhovac} připravuje půdu pro hromadnou zradu.'
    ],
    soumrak: [
      '{prisera} zcela ovládne mysl klíčové osoby, zatímco {prisluhovac} ji izoluje od jakékoliv pomoci.',
      '{prisera} přiměl{v} skupinu {lokace_lok} k hromadnému násilí, přičemž {prisluhovac} likviduje hlasy rozumu.',
      '{prisera} triumfuje nad zbytky lidskosti v oblasti a {prisluhovac} brání komukoliv v úniku z této pasti.'
    ],
    noc: [
      'Korupce v oblasti dosahuje vrcholu a lidé {lokace_lok} se začínají vražedně obracet proti sobě navzájem.',
      '{prisera} ovládl{v} duchovní podstatu {lokace_gen} a připravuje se na finální pohlcení všech zbývajících duší.',
      '{prisera} dokončuje přeměnu {lokace_gen} v místo absolutního zla, kde už není místo pro naději.'
    ]
  }

  // TODO: Černokněžník, Královna, Mučitel, Ničitel, Parazit, Popravčí, Požírač, Sběratel, Šibal, Zploditel
};

// ─── KONTEXT pool — location events (per location type × style) ─

export const KONTEXT = {
  'Labyrint': {
    agresivni: {
      den: ['Lidé {lokace_lok} si všímají, že známé cesty vedou do temných zákoutí, která dříve neexistovala.'],
      priseri: ['V nebezpečných útrobách {lokace_gen} se začínají ztrácet první zvědavci.'],
      zapad_slunce: ['Skupina {lokace_lok} je rozptýlena a každý z lovců se ocitá v temnotě sám a bez spojení.'],
      soumrak: ['Prostory {lokace_lok} se nekonečně natahují a znemožňují rychlý přesun k ohroženým obětem.'],
      noc: ['{lokace_nom} lovce nadobro uvěznil{l} ve svých smrtících útrobách bez reálné naděje na únik.']
    },
    korupcni: {
      den: ['Prostory {lokace_gen} začínají působit cize a lidé náhle zapomínají, kudy vlastně přišli.'],
      priseri: ['Zpoza stěn {lokace_lok} se ozývají hlasy, které lidi lákají hlouběji do izolace.'],
      zapad_slunce: ['Důvěra {lokace_lok} mizí a lovci se začínají podezřívat, že je ten druhý záměrně svedl z cesty.'],
      soumrak: ['Stěny {lokace_lok} šeptají lovcům jejich nejhorší obavy, aby je dohnaly k panickému útěku do pasti.'],
      noc: ['{lokace_nom} lovce definitivně pohltil{l} a nabízí jim falešná východiska za strašlivou cenu.']
    },
    obecny: {
      den: ['{LOKACE_LOK} přestávají fungovat kompasy a mapy se zdají být náhle nepřesné.'],
      priseri: ['Průchody {lokace_lok} se začínají samovolně uzavírat a měnit strukturu prostoru.'],
      zapad_slunce: ['{LOKACE_LOK} dochází k narušení reality, které znemožňuje logickou orientaci v prostoru.'],
      soumrak: ['{lokace_nom} se mění v nestabilní strukturu, kde každé otevření dveří vede na úplně jiné místo.'],
      noc: ['{lokace_nom} se stal{l} pevnou součástí jiné dimenze a únik zpět do reality je nyní nemožný.']
    }
  },

  'Past': {
    agresivni: {
      den: ['{LOKACE_LOK} dojde k první podivné nehodě vybavení, která způsobí krvavé zranění.'],
      priseri: ['Nečekaná porucha {lokace_lok} zraní první lidi a vyvolá v prostoru nekontrolovaný chaos.'],
      zapad_slunce: ['Infrastruktura {lokace_lok} začíná kolabovat a aktivně ohrožovat kohokoliv uvnitř trosek.'],
      soumrak: ['{lokace_nom} se stal{l} smrtící zónou plnou nástrah, které nelze bezpečně obejít.'],
      noc: ['Každý pohyb {lokace_lok} nyní znamená přímé riziko vážného zranění či okamžité smrti.']
    },
    korupcni: {
      den: ['Zařízení {lokace_lok} začíná bezdůvodně selhávat a vyvolává u přítomných lidí nevysvětlitelnou agresi.'],
      priseri: ['Nečekané poruchy {lokace_lok} nutí lidi činit krutá rozhodnutí, aby si zachránili vlastní kůži.'],
      zapad_slunce: ['{lokace_nom} se mění v nástroj psychického i fyzického mučení pro kohokoliv, kdo v ní uvázne.'],
      soumrak: ['{LOKACE_LOK} propuká šílenství a lidé se v touze po záchraně pokoušejí v nastražených pastech ušlapat jeden druhého.'],
      noc: ['Každý kout {lokace_lok} nyní představuje smrtelné riziko pro tělo i příčetnost zbývajících přeživších.']
    },
    obecny: {
      den: ['Všechny telefony a komunikační systémy {lokace_lok} začínají vysílat nesrozumitelný šum.'],
      priseri: ['Osvětlení {lokace_lok} začíná náhodně vypadávat a uvězňuje lovce v nepředvídatelných intervalech tmy.'],
      zapad_slunce: ['Systémy {lokace_lok} začínají jednat chaoticky a náhodně spouštějí bezpečnostní uzávěry.'],
      soumrak: ['{lokace_nom} začíná aktivně bojovat proti lovcům a brání jim v dosažení cíle záhady.'],
      noc: ['{lokace_nom} se zcela uzavřel{l} a začíná systémově likvidovat vše živé, co zůstalo uvnitř.']
    }
  }

  // TODO: Brána pekel, Divočina, Doupě, Knihovna, Křižovatka, Laboratoř, Pevnost, Vězení
};

// ─── PULNOC defaults — per monster type ────────────────────────

export const PULNOC_DEFAULT = {
  'Bestie': 'Masakr {lokace_lok} je dokonán. {prisera} se volně potuluje troskami a v oblasti nezůstal nikdo naživu.',
  'Černokněžník': '{prisera} získává absolutní nadpřirozenou kontrolu. {lokace_nom} je pohlcen{l} magickou anomálií a rituál byl úspěšně završen.',
  'Královna': 'Všichni {lokace_lok} jsou nyní pod nadvládou {prisera}. Svobodná vůle zanikla a komunita slouží pouze {j} temným záměrům.',
  'Mučitel': '{lokace_nom} se proměnil{l} v místo nekonečného utrpení. Strach ovládl mysli přeživších a oblast se stala trvalou noční můrou.',
  'Ničitel': '{lokace_nom} přestal{l} existovat. {prisera} naplnil{v} svůj cíl totální zkázy, která se nyní začíná šířit dál do světa.',
  'Parazit': '{lokace_nom} je zcela zamořen{l}. Původní obyvatelé byli pohlceni nebo přeměněni a {prisera} se připravuje na expanzi do okolí.',
  'Pokušitel': 'Morální úpadek {lokace_lok} je nezvratný. Lidé se dobrovolně odevzdali zlu a {prisera} slaví triumf nad lidskou duší.',
  'Popravčí': 'Rozsudek byl vykonán a všichni označení zemřeli. {lokace_nom} zůstává prázdným místem poznamenaným nelítostnou pomstou {prisera}.',
  'Požírač': '{LOKACE_LOK} už nezbyl nikdo, na kom by se dalo hodovat. {prisera} opouští tuto mrtvou zónu a vydává se hledat nové pastviny.',
  'Sběratel': 'Sbírka je kompletní. {prisera} mizí i se vším cenným z {lokace_gen}, čímž oblast navždy zbavuje jejího významu a historie.',
  'Šibal': 'Chaos {lokace_lok} dosáhl absolutního bodu. Společenské i fyzické struktury se zhroutily a {prisera} se směje uprostřed trosek.',
  'Zploditel': 'Armáda zla je stvořena. {lokace_nom} nyní slouží jako hnízdo pro nové zrůdy, které pod vedením {prisera} vyrážejí ničit svět.'
};

// ─── PULNOC zvrat modifiers ────────────────────────────────────

export const PULNOC_ZVRAT = {
  zmirnujici: [
    '{prisera} se stahuje do hlubin {lokace_gen}. Naděje na záchranu obětí je navždy ztracena a město zůstává poznamenáno nevyřešeným traumatem.'
  ],
  eskalujici: [
    'Zkáza {lokace_gen} je kompletní a masivní destrukce navíc probouzí prastaré zlo, které se dosud skrývalo v pozadí.'
  ],
  prevracejici: [
    // TODO: budoucí rozšíření
  ]
};
