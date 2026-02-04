# Wireframe zadání pro grafika — Strážcovský panel

> Design brief a wireframe dokumentace pro webovou aplikaci **Strážcovský panel**
> Pro hru: Monster of the Week (Příšera týdne)
> Datum: 2026-02-01
> Verze: 1.0

---

## Executive Summary

**Strážcovský panel** je webová aplikace pro Game Mastera (Strážce) hry Monster of the Week — amerického supernatural RPG ve stylu seriálů Buffy, Supernatural a X-Files.

**Cílová skupina:** Jeden uživatel (GM), běží vedle Discord voice callu na sekundární obrazovce během online session.

**Use case:** Příprava záhad (5-10 minut), vedení živé hry (2-4 hodiny), long-term tracking kampaně.

**Klíčové požadavky:**
- **Kokpit, ne kniha** — všechno důležité pořád viditelné
- **Dark mode aesthetic** — horror atmosféra, dlouhé session
- **Progresivní detail** — kompakt → detail → plný text
- **Rychlost** — žádné wizardy, jeden klik → výsledek

---

## Vizuální směr a atmosféra

### Tematika

**Dark, atmospheric horror aesthetic**
Americký urban horror — temné city bars, silnice v noci, malá městečka s tajemstvím.

**Inspirace:**
- TV shows: Supernatural, Buffy, X-Files (title cards, UI, atmosféra)
- Dark mode dashboards: GitHub, Spotify
- Horror game UIs: Resident Evil, Silent Hill (menu systems)

**AVOID:**
- Generic RPG fantasy aesthetic (ne středověk, ne dračí dungeony)
- Comic Sans nebo playful fonts
- Příliš mnoho barev (držet dark + 1-2 accent barvy)

### Color Palette

**Primary:**
- **Background:** Charcoal / near-black (#1a1a1a, #0d0d0d)
- **Surface:** Dark gray (#2a2a2a, #333333)
- **Text primary:** Off-white / cream (#e8e6e3, #d4d4d4)
- **Text secondary:** Light gray (#999999, #888888)

**Accent:**
- **Danger/Blood:** Deep red (#8b0000, #c41e3a) — harm, tvrdý tah
- **Supernatural:** Purple/violet (#6b46c1, #8b5cf6) — magie, podivínství
- **Info/Mystery:** Deep blue (#1e3a8a, #2563eb) — štěstí, poznámky

**Semantic:**
- **Warning:** Amber/orange (#d97706, #f59e0b) — měkký tah
- **Success:** Muted green (#16a34a, #22c55e) — úspěch hodu
- **Disabled:** Dark gray (#4a4a4a)

**Contrast:** WCAG AA minimum (4.5:1) pro čitelnost během dlouhých session.

### Typography

**Primary font:** Sans-serif, clean, readable
*Návrh:* Inter, IBM Plex Sans, Open Sans
Body text: 14-16px, line-height 1.5-1.6

**Headers:** Bold, impactful
*Návrh:* Možná slab serif pro atmosféru (Roboto Slab, Zilla Slab)
H1: 32-36px, H2: 24-28px, H3: 18-20px

**Monospace:** Pro game stats a čísla
*Návrh:* Roboto Mono, JetBrains Mono
Stats: 12-14px, harm/štěstí tracking

**Font hierarchy:**
```
H1 — Sekce hlavní nadpis (Kampaň, Záhada, Sezení)
H2 — Subsekce (Odpočet, Karty, Panel)
H3 — Card headers (Příšera, NPC jméno)
Body — Popis, poznámky
Small — Tagy, meta info
```

### UI Feeling

**Dashboard/cockpit aesthetic**
Představ si kokpit nákladního auta Wincesterů — praktický, vždy po ruce, trochu opotřebovaný.

- Always-visible critical info (harm, odpočet)
- Progressive disclosure (compact → expanded)
- Card-based system (vše je karta)
- Dark mode primary (light mode optional budoucnost)
- Subtle textures OK (grain, noise) — ne flat design

---

## Layout a navigace

### Hlavní layout (desktop 1920x1080)

```
┌──────────────────────────────────────────────────────────┐
│ ☰  PŘÍŠERA TÝDNE — Strážcovský panel                     │ ← Header 60px
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Kampaň   │                                               │
│          │   Hlavní oblast obsahu                        │
│ Záhada   │   (podle aktivní sekce)                       │
│          │                                               │
│ Sezení   │                                               │
│          │                                               │
│ Pravidla │                                               │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│ Lovci: Jan ♥♥♥♥♥♥♥ ●●●●●○○ XP:3  [▸tahy]               │ ← Footer 48px
│        Petra ♥♥♥♥♥○○ ●●●●●●○ XP:1  [▸tahy]              │    (expandable)
└──────────────────────────────────────────────────────────┘
```

**Rozměry:**
- **Sidebar:** 200px široký, fixed position
- **Header:** 60px vysoký
- **Footer (lišta lovců):** 48px (collapsed), až 300px (expanded)
- **Main content:** zbytek (1720px × cca 900px)

### 4 hlavní sekce (tabs v sidebaru)

1. **Kampaň** — Campaign management (mezi sezeními)
2. **Záhada** — Mystery preparation (před session)
3. **Sezení** — Live session (hlavní obrazovka během hry)
4. **Pravidla** — Rules quick reference (kdykoli)

**Tab states:**
- Default (neaktivní)
- Active (aktuální sekce)
- Hover

---

## Wireframy jednotlivých sekcí

### 4.1 Sekce: KAMPAŇ

**Kdy:** Mezi sezeními — long-term tracking

**Layout:**

```
┌─ KAMPAŇ ──────────────────────────────────────────────────┐
│                                                            │
│ [Tab: Lovci] [NPC Archiv] [Oblouky] [Historie]            │ ← Tab navigation
│                                                            │
│ ┌─ Lovec Card ─────────────┐ ┌─ Lovec Card ─────────────┐│
│ │ Jan Novák — Mstitel      │ │ Petra Malá — Expertka    ││
│ │ ♥♥♥♥♥♥♥ Harm: 0/7       │ │ ♥♥♥♥♥○○ Harm: 2/7       ││
│ │ ●●●●●●○ Štěstí: 6/7     │ │ ●●●●●●● Štěstí: 7/7     ││
│ │ XP: 3/5                  │ │ XP: 1/5                  ││
│ │                          │ │                          ││
│ │ Atributy:                │ │ Atributy:                ││
│ │ Šarm: 0, Rozvaha: +1     │ │ Šarm: +1, Rozvaha: +2    ││
│ │ Bystrost: +2, Ostrost: +2│ │ Bystrost: +2, Ostrost: 0 ││
│ │ Podivínství: -1          │ │ Podivínství: +1          ││
│ │                          │ │                          ││
│ │ [Poznámky Strážce ▾]     │ │ [Poznámky Strážce ▾]     ││
│ └──────────────────────────┘ └──────────────────────────┘│
│                                                            │
│ ┌─ Lovec Card ─────────────┐                              │
│ │ Tomáš Černý — Normál     │                              │
│ │ ♥♥♥♥♥♥♥ Harm: 0/7       │                              │
│ │ ●●●●○○○ Štěstí: 4/7     │                              │
│ │ XP: 4/5                  │                              │
│ │ [...]                    │                              │
│ └──────────────────────────┘                              │
│                                                            │
│ [+ Přidat lovce]                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Komponenty:**

**Lovec card (compact):**
- Width: 360px, Height: cca 280px
- Border: 1px subtle (#333)
- Padding: 16px
- Border radius: 8px
- Background: surface color (#2a2a2a)

**Visual indicators:**
- **Harm boxes:** ♥♥♥♥♥♥♥ (filled heart = harm taken, empty = OK)
  - Filled: danger red (#c41e3a)
  - Empty: dark gray (#4a4a4a)
- **Štěstí boxes:** ●●●●●●● (filled dot = štěstí available)
  - Filled: info blue (#2563eb)
  - Empty: dark gray
- **XP:** Simple text "XP: 3/5"

**Collapsible section:**
- "Poznámky Strážce ▾" — klik rozbalí textarea
- Private notes pro GM (háčky, tajemství, plány)

**Grid layout:** 3 karty na řádek (1920px width)

---

### 4.2 Sekce: ZÁHADA

**Kdy:** Příprava před session

**Layout:**

```
┌─ ZÁHADA ──────────────────────────────────────────────────┐
│                                                            │
│ [Prázdná šablona] [Vygenerovat základ 🎲]                 │ ← Action buttons
│                                                            │
│ ▸ Námět a návnada                                          │ ← Collapsible accordion
│                                                            │
│ ▸ Příšera                                [Generovat 🎲]   │
│   ┌─ Příšera Card ──────────────────────────────────┐    │
│   │ Jméno: [Reverend Silas Thorne           ] [✎]  │    │
│   │ Typ: [Černokněžník ▾]                           │    │
│   │ Motivace: Zmocnit se nadpřirozené síly          │    │
│   │                                                  │    │
│   │ Popis:                                           │    │
│   │ [Kazatel z Pine Woods, zmizel před 50 lety,   ] │    │
│   │ [našel Černou knihu v kostele...              ] │    │
│   │                                                  │    │
│   │ Schopnosti: [✓ Magie] [✓ Ovládání] [ Létání]   │    │
│   │                                                  │    │
│   │ Útok: 3 harm | blízko | magie                   │    │
│   │ Zdraví: ██████████ 10/10                        │    │
│   │ Zbroj: 1                                         │    │
│   │ Slabina: Zlomit černou berlu                     │    │
│   │                                                  │    │
│   │ Tahy příšery:                                    │    │
│   │ [✓ Odděluj lovce] [✓ Ničení] [ Pokušení]        │    │
│   └──────────────────────────────────────────────────┘    │
│                                                            │
│ ▸ Odpočet (6 fází)                                         │
│                                                            │
│ ▸ Přisluhovači                       [+ Přidat] [🎲]      │
│                                                            │
│ ▸ Přihlížející (NPC)                 [+ Přidat] [🎲]      │
│                                                            │
│ ▸ Lokace                             [+ Přidat] [🎲]      │
│                                                            │
│ ▸ Tahy na míru                       [+ Přidat]           │
│                                                            │
│ [Uložit záhadu] [Spustit session →]                       │ ← Bottom actions
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Komponenty:**

**Accordion sections:**
- Closed: "▸ Příšera" (chevron vpravo)
- Open: "▾ Příšera" (expanded content)
- Smooth transition (200ms ease)

**Příšera Card (expanded form):**
- Width: 100% main content
- Form fields:
  - Text input (jméno)
  - Dropdown (typ příšery — 12 opcí)
  - Textarea (popis)
  - Checkboxes (schopnosti, tahy)
  - Numeric inputs (harm, zdraví, zbroj)
- Edit icon [✎] — inline editing

**Generator buttons:**
- Icon: 🎲 (dice)
- Text: "Generovat"
- Position: pravá strana header sekce
- Action: One click → form prefilled

**Health bar:**
```
Zdraví: ██████████ 10/10
        ← Progress bar, clickable to decrease
```

**Odpočet section (když rozbaleno):**
```
▾ Odpočet (6 fází)

  Struktura: [Přímá eskalace ▾]

  ┌─────────────────────────────────────────┐
  │ Day (Den)                                │
  │ [Thorne shání oběti pro rituál]         │
  ├─────────────────────────────────────────┤
  │ Shadows (Stíny)                          │
  │ [První oběť zmizí]                       │
  ├─────────────────────────────────────────┤
  │ Sunset (Západ)                           │
  │ [Druhá oběť, lovci jsou podezřelí]       │
  ├─────────────────────────────────────────┤
  │ Dusk (Soumrak)                           │
  │ [Thorne dokončuje pentagram]             │
  ├─────────────────────────────────────────┤
  │ Nightfall (Setmění)                      │
  │ [Rituál začíná, brána se otevírá]        │
  ├─────────────────────────────────────────┤
  │ Midnight (Půlnoc)                        │
  │ [Démon vstoupí do světa, Pine Woods...]  │
  └─────────────────────────────────────────┘
```

**Přisluhovači / NPC / Lokace:**
- Miniature card preview (collapsed)
- Click → expand → edit
- Multiple cards, vertically stacked

---

### 4.3 Sekce: SEZENÍ (nejdůležitější!)

**Kdy:** Během živé hry — hlavní obrazovka

**Layout (3-column):**

```
┌─ SEZENÍ ──────────────────────────────────────────────────────────┐
│                                                                    │
│ ┌────────────┬─────────────────┬────────────────────────────────┐│
│ │ ODPOČET    │  PŘIPNUTÉ KARTY │  STRÁŽCŮV PANEL                ││
│ │ + POZNÁMKY │                 │                                ││
│ │            │                 │  [Tahy SM][Tahy lovců][Zbraně] ││
│ │ Day        │  ┌─ NPC ──────┐│                                ││
│ │ ▸ Shadows  │  │ Dave       ││  MĚKKÝ TAH (varování)          ││
│ │ Sunset     │  │ Holloway   ││  • Naznač hrozbu               ││
│ │ Dusk       │  │            ││  • Odhal nepříjemnou pravdu    ││
│ │ Nightfall  │  │ Barman     ││  • Dej jim příležitost         ││
│ │ Midnight   │  │ Žije       ││  • Ukaž blížící se zlo         ││
│ │            │  └────────────┘│  • Něco sebere/chce            ││
│ │ [Posun ▸]  │                 │  • Odděl je                    ││
│ │            │  ┌─ Monster ──┐│                                ││
│ │────────────│  │ Rev.Thorne ││  ────────────────────          ││
│ │            │  │            ││                                ││
│ │ POZNÁMKY   │  │ HP: ██████ ││  TVRDÝ TAH (následek)          ││
│ │            │  │ 6/10       ││  • Způsob zranění              ││
│ │ 19:43      │  └────────────┘│  • Znič výbavu/zdroj           ││
│ │ Našli berlu│                 │  • Posuň odpočet               ││
│ │ ve sklepě  │  ┌─ Lokace ───┐│  • Zajmi někoho                ││
│ │            │  │ Rusty Nail ││  • Přivolej další hrozbu       ││
│ │ 19:51      │  │ Bar        ││  • Obrať tah proti nim         ││
│ │ Jan dostal │  └────────────┘│  • Aktivuj slabinu lovce       ││
│ │ 3 harm     │                 │                                ││
│ │            │  [+ Karta]      │                                ││
│ │ [+ pozn]   │  [🎲 NPC]       │                                ││
│ │            │                 │                                ││
│ └────────────┴─────────────────┴────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Column widths (1720px total):**
- Levý (Odpočet): 280px
- Střední (Karty): 320px
- Pravý (Panel): 1120px

**Komponenty:**

**Odpočet tracker (vertical timeline):**
```
┌─ ODPOČET ────────┐
│ Day       [●]    │ ← Current phase (filled dot)
│ ▸ Shadows [ ]    │ ← Next phases (empty, chevron indicates expandable)
│ Sunset    [ ]    │
│ Dusk      [ ]    │
│ Nightfall [ ]    │
│ Midnight  [ ]    │
│                  │
│ [Posun ▸]        │ ← Advance button
└──────────────────┘
```

Visual indicator:
- Current phase: Highlighted background, filled dot, bold text
- Past phases: Dimmed, strikethrough
- Future phases: Default text, empty dot

**Poznámky log (chronological):**
```
┌─ POZNÁMKY ───────┐
│ 19:43            │ ← Timestamp
│ Našli berlu      │ ← Short note text
│ ve sklepě        │
│                  │
│ 19:51            │
│ Jan dostal       │
│ 3 harm           │
│                  │
│ 20:15            │
│ Petra užila      │
│ magii — úspěch   │
│                  │
│ [+ poznámka]     │ ← Add button at bottom
└──────────────────┘
```

Auto-scrolls to bottom, newest at bottom, max-height scrollable.

**Připnuté karty (miniature view):**
```
┌─ NPC ──────────┐
│ Dave Holloway  │ ← Name (bold)
│ Barman         │ ← Type/role
│ Žije           │ ← Status
└────────────────┘

┌─ PŘÍŠERA ──────┐
│ Rev. Thorne    │
│ Černokněžník   │
│ HP: ██████     │ ← Health bar clickable
│ 6/10           │
└────────────────┘

┌─ LOKACE ───────┐
│ Rusty Nail Bar │
│ Křižovatka     │
└────────────────┘
```

Card size: 280px wide, height auto
Click card → expand to modal/overlay → edit → close

**Strážcův panel (tab interface):**

Tab 1: **Tahy Strážce (Měkký/Tvrdý)**

```
[Tahy SM] [Tahy lovců] [Zbraně]
 ↑ active

┌────────────────────────────────────┐
│ MĚKKÝ TAH (varování)               │
│                                    │
│ • Naznač hrozbu                    │ ← Bullet list, concise
│ • Odhal nepříjemnou pravdu         │
│ • Dej jim příležitost              │
│ • Ukaž příznak blížícího se zla    │
│ • Něco sebere, něco chce           │
│ • Odděl je                         │
│                                    │
│ ────────────────────               │ ← Separator
│                                    │
│ TVRDÝ TAH (následek)               │
│                                    │
│ • Způsob zranění                   │
│ • Znič výbavu nebo zdroj           │
│ • Posuň odpočet                    │
│ • Zajmi někoho                     │
│ • Přivolej další hrozbu            │
│ • Obrať jejich tah proti nim       │
│ • Aktivuj slabinu nebo temnou str. │
│                                    │
└────────────────────────────────────┘
```

**Tooltip při hover:**
Hover na "Naznač hrozbu" →

```
┌─ Tooltip ─────────────────────────────────────┐
│ NAZNAČ HROZBU                                 │
│                                               │
│ Řekni lovci co vidí/slyší/cítí, ale nenech   │
│ to ještě dopadnout. Hráč musí reagovat.       │
│                                               │
│ Příklad: "Slyšíš kroky v patře. Někdo nebo   │
│ něco je tam nahoře. Co děláš?"               │
└───────────────────────────────────────────────┘
```

Tab 2: **Tahy lovců (compact + expandable)**

```
[Tahy SM] [Tahy lovců] [Zbraně]
           ↑ active

┌──────────────────────────────────────────────┐
│ Dej přes hubu                    +Ostrost    │ ← Click to expand
│ 10+ harm+volba  7-9 harm oboustranný         │
│                                              │
│ Jednej pod tlakem                +Rozvaha    │
│ 10+ zvládneš to  7-9 cena/horší výsledek     │
│                                              │
│ Vyšetřuj záhadu                 +Bystrost    │
│ 10+ 2 otázky  7-9 1 otázka                   │
│                                              │
│ Zhodnoť situaci                 +Bystrost    │
│ 10+ 3 držení  7-9 1 držení                   │
│                                              │
│ Někoho ochraňuj                  +Ostrost    │
│ 10+ ochráníš ho  7-9 Strážce volí            │
│                                              │
│ Někomu pomoz                     +Rozvaha    │
│ 10+ dáš +1  7-9 oba v ohrožení               │
│                                              │
│ Někoho zmanipuluj                  +Šarm     │
│ 10+ udělá to  7-9 s podmínkou nebo cenou     │
│                                              │
│ Užij magii                   +Podivínství    │
│ 10+ efekt  7-9 efekt+problém                 │
│                                              │
└──────────────────────────────────────────────┘
```

All 8 moves visible at once, no scrolling (fits in ~600px height).

**Expanded move detail (click na "Vyšetřuj záhadu"):**

```
┌──────────────────────────────────────────────┐
│ VYŠETŘUJ ZÁHADU — 2d6 + Bystrost             │
│                                              │
│ 10+ ÚSPĚCH                                   │
│ Polož Strážci 2 otázky z tohoto seznamu:    │
│  • Co se tu přesně stalo?                    │
│  • Co to ohrožuje?                           │
│  • Co je tu divného nebo nadpřirozeného?     │
│  • Co tu nevidím?                            │
│  • Co tu zanechalo stopy?                    │
│                                              │
│ 7-9 ČÁSTEČNÝ ÚSPĚCH                          │
│ Polož 1 otázku                               │
│                                              │
│ 12+ POKROČILÝ ÚSPĚCH                         │
│ 2 otázky + Strážce dá extra užitečnou info   │
│                                              │
│ 6- SELHÁNÍ                                   │
│ Měkké tahy:                                  │
│  → Stopy vedou do pasti nebo slepé uličky    │
│  → Něco si všimne že lovci vyšetřují         │
│  → Falešná stopa/zavádějící indicie          │
│                                              │
│ Tvrdé tahy:                                  │
│  → Zničí důkaz vlastní neopatrností          │
│  → Příšera zaútočí při vyšetřování           │
│  → Přihlížející viděl a zavolal policii      │
│                                              │
│ [▴ Sbalit]                                   │
└──────────────────────────────────────────────┘
```

Tab 3: **Zbraně**

```
[Tahy SM] [Tahy lovců] [Zbraně]
                        ↑ active

┌──────────────────────────────────────────────┐
│ [Hledat zbraň...                    🔍]      │
│                                              │
│ IMPROVIZOVANÉ                     0-1 harm   │
│  Pěsti, kopance            0 intimní         │
│  Ostrý předmět             1 blízko          │
│  Těžký předmět             1 blízko          │
│                                              │
│ NOŽE A MEČE                       1-3 harm   │
│  Nůž, dýka                 1 blízko          │
│  Meč, mačeta               2 blízko          │
│  Velký meč                 3 blízko těžká    │
│                                              │
│ STŘELNÉ ZBRANĚ                    2-4 harm   │
│  Pistole 9mm               2 blízko hlučná   │
│  Revolver .38              2 blízko hlučná   │
│  Brokovnice                3 blízko hlučná   │
│  Lovecká puška             2 daleko          │
│  Odstřelovací puška        4 daleko pomalá   │
│                                              │
│ SPECIÁLNÍ                                    │
│  Dřevěný kůl               1 blízko dřevo    │
│  Stříbrný nůž              2 blízko stříbro  │
│  Molotov                   2 blízko ohnivá   │
│  Flamethrower              3 blízko ohnivá   │
│                                              │
│ ────────────────────────────────────         │
│                                              │
│ ŠTÍTKY                                       │
│  Hlučná  Brutální  Pomalá   Ohnivá          │
│  Plošná  Magická   Stříbrná Dřevo           │
│  Těžká   Intimní   Blízko   Daleko          │
│  [...hover pro detail]                       │
│                                              │
└──────────────────────────────────────────────┘
```

Hover na štítek "Hlučná" →
```
┌─ Tooltip ──────────────────┐
│ HLUČNÁ                     │
│ Přitahuje pozornost.       │
│ Všichni to uslyší.         │
└────────────────────────────┘
```

---

### 4.4 Sekce: PRAVIDLA

**Kdy:** Quick lookup kdykoli

**Layout:**

```
┌─ PRAVIDLA ────────────────────────────────────────────────┐
│                                                            │
│ [Hledat pravidlo...                              🔍]      │
│                                                            │
│ ▸ Základní tahy lovců (8)                                 │ ← Accordion
│                                                            │
│ ▸ Pokročilé tahy (výsledky 12+)                           │
│                                                            │
│ ▾ Tahy Strážce (13)                                       │ ← Expanded
│   ────────────────────────────                            │
│   Měkký tah (6)                                           │
│    • Naznač hrozbu                                        │
│    • Odhal nepříjemnou pravdu                             │
│    • [...]                                                │
│                                                            │
│   Tvrdý tah (7)                                           │
│    • Způsob zranění                                       │
│    • Znič výbavu/zdroj                                    │
│    • [...]                                                │
│                                                            │
│ ▸ Typy hrozeb                                             │
│                                                            │
│ ▸ Štítky zbraní (24)                                      │
│                                                            │
│ ▸ Bojový systém                                           │
│                                                            │
│ ▸ Magie a rituály                                         │
│                                                            │
│ ▸ Harm a léčení                                           │
│                                                            │
│ ▸ Zbroj                                                   │
│                                                            │
│ ▸ Štěstěna                                                │
│                                                            │
│ ▸ Hranice a edge cases                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Search field:**
- Fuzzy search (typo-tolerant)
- Real-time filtering
- Highlights matches

**Accordion behavior:**
- Click header → expand
- Smooth transition
- Only one section expanded? (Optional — může být více)

**Expanded section example:**

```
▾ Typy hrozeb — Příšery (12)

  BESTIE
  Motivace: Lovit a krmit se
  Příklady: Vlkodlak, upír, ghúl
  [Rozbalit pro více ▾]

  ČERNOKNĚŽNÍK
  Motivace: Zmocnit se nadpřirozené síly
  Příklady: Kultista, nekromant, čaroděj
  [Rozbalit pro více ▾]

  [...]
```

---

### 4.5 Spodní lišta lovců (ALWAYS VISIBLE!)

**Collapsed state (default):**

```
┌─────────────────────────────────────────────────────────────┐
│ Jan (Mstitel)    ♥♥♥♥♥♥♥ ●●●●●○○  XP:3    [▸tahy]        │
│ Petra (Expert)   ♥♥♥♥♥○○ ●●●●●●○  XP:1    [▸tahy]        │
│ Tomáš (Normál)   ♥♥♥♥♥♥♥ ●●●●○○○  XP:4    [▸tahy]        │
└─────────────────────────────────────────────────────────────┘
```

Height: 48px (3 × 16px rows)

**Expanded state (klik [▸tahy]):**

```
┌─────────────────────────────────────────────────────────────┐
│ Jan (Mstitel)    ♥♥♥♥♥♥♥ ●●●●●○○  XP:3   [▴sbalit]        │
│                                                             │
│  Znám svou kořist (auto)                                    │
│  +1 když útočíš na typ příšery tvého příběhu (upíři)        │
│                                                             │
│  Cílevědomá zuřivost                                        │
│  +1 Ostrost proti přisluhovačům tvé kořisti                 │
│                                                             │
│  Nikdy víc                                                  │
│  Když ochraňuješ civilistu: 10+ automaticky bez rizika      │
│                                                             │
│  Berserk                                                    │
│  Vydržíš až do konce souboje bez ohledu na zranění          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Height: až 300px (depends on # of moves)

**Interactions:**
- Click ♥ → harm +1 / Shift+click → harm -1
- Click ● → štěstí -1 / Shift+click → štěstí +1
- Click XP → XP +1
- Click [▸tahy] → expand playbook moves
- Click [▴sbalit] → collapse back

**Visual states:**
- Harm critical (6-7 harm): Row background turns danger red (#8b0000 with opacity)
- Štěstí empty (0 štěstí): Warning indicator
- XP ready (5/5): Highlight (ready to level up)

---

## UI Komponenty a Patterns

### Card system (univerzální komponenta)

**Base card structure:**

```
┌─ [TYP] ──────────────────────────────┐
│ Jméno: [___________________]  [✎]    │ ← Edit icon (inline edit mode)
│ Typ:   [Dropdown            ▾]       │
│ Motivace: Auto-filled based on type  │
│                                      │
│ Popis:                               │
│ [_________________________________] │
│ [_________________________________] │ ← Textarea
│ [_________________________________] │
│                                      │
│ Poznámky:                            │
│ > 19:43 — Našel ho v baru            │ ← Timestamped notes
│ > 20:15 — Lhal o Thornovi            │
│ [+ poznámka]                         │
│                                      │
│ Stav: [● Žije ▾]                    │ ← Dropdown (žije/mrtvý/nezvěstný)
│ Tagy: [piney-woods] [informátor]    │ ← Tag chips (removable)
│                                      │
│ [Obrázek — klikni nebo přetáhni]    │ ← Image drop zone
│                                      │
│ [Uložit] [Zrušit]                    │ ← Form actions
└──────────────────────────────────────┘
```

**Card variants:**
- NPC card
- Monster card (+ health bar, armor, weakness)
- Minion card (simplified monster)
- Location card (+ map upload)

**Card states:**
- View mode (default) — Click [✎] to edit
- Edit mode — Form fields editable
- Pinned (in session) — Border highlight

### Form patterns

**Text inputs:**
```
Label:
[_____________________________]
      ↑ Placeholder text
```
Style: Dark background, light border, focus state (accent color border)

**Dropdowns:**
```
Label: [Option selected        ▾]
```
Click → dropdown menu overlay

**Checkboxes (multi-select):**
```
Schopnosti:
[✓] Magie
[✓] Ovládání
[ ] Létání
[ ] Neviditelnost
[ ] Telekineze
```

**Numeric inputs:**
```
Harm: [3] ← Stepper (arrows) or direct input
```

**Textareas:**
```
Popis:
┌─────────────────────────────┐
│                             │
│ Multiline text input        │
│                             │
└─────────────────────────────┘
```
Auto-resize or fixed height with scroll.

### Interactive elements

**Buttons:**
- **Primary:** Solid background, accent color
  - Example: [Spustit session →] — Danger red or success green
- **Secondary:** Border only, transparent background
  - Example: [Uložit] [Zrušit]
- **Tertiary:** Text only, no border
  - Example: [+ Přidat kartu]

**Icon buttons:**
- [🎲] Generate — Dice icon
- [✎] Edit — Pencil icon
- [+] Add — Plus icon
- [×] Remove — X icon

**Tooltips (hover):**
- Delay: 300ms
- Position: Above element (or below if no space)
- Arrow pointing to target
- Max-width: 400px
- Background: Dark surface, light border

**Hover states:**
- Interactive elements: Subtle background change (#333 → #444)
- Cards: Border highlight
- Buttons: Background lighten/darken

**Click to expand/collapse:**
- Chevron icon: ▸ (collapsed) / ▾ (expanded)
- Smooth transition (200ms ease)
- Optional: Fade-in content

**Drag & drop:**
- Upload images: Dashed border, hover state
- Drop zone highlight on dragover

### Visual indicators

**Harm boxes (♥):**
```
♥♥♥♥♥○○  ← 5 harm taken, 2 remaining
```
- Filled: Danger red (#c41e3a)
- Empty: Dark gray (#4a4a4a)
- Clickable to increment/decrement

**Štěstí boxes (●):**
```
●●●●●○○  ← 5 štěstí available, 2 spent
```
- Filled: Info blue (#2563eb)
- Empty: Dark gray
- Clickable to spend/regain

**Health bar (monster/minion):**
```
Zdraví: ██████████ 10/10
        ↑ Progress bar, clickable to decrease

Harm taken:
Zdraví: ██████░░░░ 6/10
        ↑ Filled (green) + Empty (gray)
```

**Odpočet timeline:**
```
● Day        ← Current (filled dot, highlight)
○ Shadows    ← Future (empty dot)
○ Sunset
○ Dusk
○ Nightfall
○ Midnight
```

**Warning states:**
- Critical harm (6-7): Red background flash
- Empty štěstí: Amber border
- Failed roll: Red highlight (temporary)

**Success states:**
- Successful roll: Green highlight (temporary)
- Level up ready (XP 5/5): Gold/yellow indicator

---

## Responsive Behavior

### Primary: Desktop (1920x1080, 1440x900)

**Target:** Strážce má appku na sekundární obrazovce vedle Discordu

**Layout:**
- 3-column layout v sekci Sezení
- Sidebar navigation vždy viditelný (fixed position)
- Lišta lovců vždy spodní (fixed position)

**Minimum width:** 1280px (below this, show message to increase window size)

### Secondary: Tablet (1024x768)

**Layout changes:**
- Collapsible sidebar (hamburger menu)
- Sekce Sezení: 2-column layout
  - Left: Odpočet + Poznámky (280px)
  - Right: Karty + Panel (stacked vertically)
- Lišta lovců: Collapsed by default, click to expand

### Future: Mobile (375x667)

**Not priority for MVP** — ale návrh by měl být připravený:

- Single column layout
- Hamburger menu navigation
- Tabs pro přepínání Odpočet / Karty / Panel
- Lišta lovců minimalizovaná (jen ikony harm/štěstí, click → detail)

**Breakpoints:**
```
Desktop:  1280px+
Tablet:   768px - 1279px
Mobile:   < 768px
```

---

## Příklady reálného obsahu

### Typy příšer (12)

1. Bestie — Motivace: Lovit a krmit se
2. Černokněžník — Motivace: Zmocnit se nadpřirozené síly
3. Královna — Motivace: Vládnout
4. Mučitel — Motivace: Způsobovat utrpení a chaos
5. Ničitel — Motivace: Ničit věci
6. Parazit — Motivace: Žít za cizí
7. Pokušitel — Motivace: Svádět lidi k pokušení
8. Popravčí — Motivace: Zabíjet
9. Požírač — Motivace: Spotřebovat lidi
10. Sběratel — Motivace: Hromadit a chránit
11. Šibal — Motivace: Hrát si s lidmi
12. Zploditel — Motivace: Reprodukovat a šířit se

### Základní tahy lovců (8)

1. **Dej přes hubu** (+Ostrost) — Útok na příšeru nebo člověka
2. **Jednej pod tlakem** (+Rozvaha) — Činnost pod tlakem/rizikem
3. **Vyšetřuj záhadu** (+Bystrost) — Prozkoumání místa, stop, důkazů
4. **Zhodnoť situaci** (+Bystrost) — Sledování bojiště nebo scény
5. **Někoho ochraňuj** (+Ostrost) — Chránit někoho před útokem
6. **Někomu pomoz** (+Rozvaha) — Pomoc jinému lovci při jeho tahu
7. **Někoho zmanipuluj** (+Šarm) — Přesvědčit NPC nebo lovce
8. **Užij magii** (+Podivínství) — Použití magie, rituálu

### Playbooky (12)

1. Mstitel — Revenge-driven hunter
2. Expertka — Knows monsters inside out
3. Normál — Regular person in over their head
4. Krivák — Wrongly accused, on the run
5. Profesionálka — Part of an agency
6. Vyvolený — Destiny says they'll save the world
7. Nebeská — Angel or half-angel
8. Zasvěcená — Initiated into arcane secrets
9. Madam Paranoia — Conspiracy theorist who's right
10. Netvor — Part monster themselves
11. Poděs — Creepy kid with dark powers
12. Sesílač — Magic user

### Zbraně (příklady)

**Improvizované (0-1 harm):**
- Pěsti, kopance: 0 harm intimní
- Ostrý předmět: 1 harm blízko
- Těžký předmět: 1 harm blízko

**Nože/Meče (1-3 harm):**
- Nůž, dýka: 1 harm blízko
- Meč, mačeta: 2 harm blízko
- Velký meč: 3 harm blízko těžká

**Střelné (2-4 harm):**
- Pistole 9mm: 2 harm blízko hlučná
- Revolver .38: 2 harm blízko hlučná
- Brokovnice: 3 harm blízko hlučná brutální
- Lovecká puška: 2 harm daleko
- Odstřelovací puška: 4 harm daleko pomalá

**Speciální:**
- Dřevěný kůl: 1 harm blízko dřevo
- Stříbrný nůž: 2 harm blízko stříbro
- Molotov koktejl: 2 harm blízko ohnivá
- Plamenomet: 3 harm blízko ohnivá plošná

### Štítky zbraní (24)

- **Dosah:** Intimní, Blízko, Daleko, Extrémně daleko
- **Speciální vlastnosti:** Hlučná, Brutální, Pomalá, Těžká, Ruční, Neviditelná
- **Materiál:** Stříbrná, Dřevo, Železo (studené), Magická
- **Efekty:** Ohnivá, Plošná, Zmatení, Znehybnění
- **Využití:** Automatická, Omezeně, Nabíjení

### Atributy (-1 až +3)

- **Šarm** — Charisma, persuasion
- **Rozvaha** — Cool under pressure
- **Ostrost** — Combat prowess
- **Bystrost** — Smarts, perception
- **Podivínství** — Weirdness, magic affinity

---

## Prioritizace obrazovek

### Fáze 1 — Critical (MVP design first)

1. **Sezení** — hlavní obrazovka pro live hru
   - 3-column layout (odpočet, karty, panel)
   - Spodní lišta lovců
   - Strážcův panel (všechny 3 taby)

2. **Pravidla** — quick reference
   - Search field
   - Accordion sections

3. **Component library** — reusable components
   - Cards (NPC, Monster, Location)
   - Forms (inputs, dropdowns, checkboxes)
   - Buttons, tooltips, indicators

### Fáze 2 — Important

4. **Záhada** — příprava před session
   - Accordion form layout
   - Generator buttons
   - Card creation forms

5. **Design system dokončení**
   - Spacing, typography scale
   - Color variables
   - Responsive breakpoints

### Fáze 3 — Nice to have

6. **Kampaň** — long-term management
   - Tabs (Lovci, NPC Archiv, Oblouky, Historie)
   - Card grids

7. **Extras**
   - Animations, transitions
   - Loading states
   - Error states
   - Empty states

---

## Technické požadavky

### Rozměry

**Desktop primary:**
- Target: 1920 × 1080 (full HD)
- Minimum: 1440 × 900
- All elements visible without horizontal scroll
- Vertical scroll acceptable pro dlouhé seznamy

**Content area (main):**
- Width: 1720px (1920 - 200 sidebar)
- Height: ~970px (1080 - 60 header - 50 footer)

### Browser support

- **Chrome/Edge (primary)** — Chromium-based, latest version
- **Firefox (secondary)** — Latest version
- **Safari (optional)** — Nice to have, not critical

**CSS features:**
- CSS Grid, Flexbox (widely supported)
- CSS custom properties (variables)
- Modern selectors (:is, :where)

### Accessibility

**High contrast (dark mode):**
- Text contrast ratio: WCAG AA (4.5:1 minimum)
- Interactive elements: clearly distinguishable
- Focus indicators: visible (2px outline, accent color)

**Keyboard navigation:**
- Tab order logical
- All interactive elements focusable
- Shortcuts for common actions (optional: Ctrl+N new note, etc.)

**Screen reader:**
- Semantic HTML (header, nav, main, section, article)
- ARIA labels where needed
- Alt text for icons

**Considerations:**
- Font size: minimum 14px body text
- Clickable targets: minimum 44×44px (mobile), 32×32px (desktop)
- Color not sole indicator (use icons + color)

### Performance

**Fast rendering:**
- No heavy animations during session
- Smooth transitions (200ms max)
- Responsive interactions (<100ms feedback)

**Optimization:**
- Lazy load images
- Minimize reflows
- Use CSS transforms for animations (GPU-accelerated)

---

## Deliverables od grafika

### 1. High-fidelity wireframes (Figma/Sketch/Adobe XD)

**Obrazovky:**
- Všechny 4 sekce (Kampaň, Záhada, Sezení, Pravidla)
- Spodní lišta lovců (collapsed + expanded)
- Strážcův panel (3 taby)
- Card komponenty (NPC, Lokace, Příšera, Přisluhovač)
- Modals/overlays (card edit, confirmations)

**States:**
- Default, hover, active, disabled
- Empty states (no data yet)
- Loading states (optional)
- Error states (optional)

### 2. Design system

**Color palette:**
- Primární barvy (background, surface, text)
- Accent barvy (danger, info, warning, success)
- Semantic barvy (harm, štěstí, XP)
- Hex/RGB codes

**Typography scale:**
- Font families (primary, header, monospace)
- Font sizes (H1-H6, body, small)
- Line heights, letter spacing
- Font weights

**Spacing system:**
- Doporučeno: 8px grid (8, 16, 24, 32, 48, 64...)
- Padding, margins, gaps
- Component spacing

**Component library:**
- Buttons (primary, secondary, tertiary, icon)
- Inputs (text, number, dropdown, checkbox, textarea)
- Cards (variants)
- Indicators (harm, štěstí, health bars)
- Tooltips, modals
- Navigation (sidebar, tabs)

### 3. Prototyp (optional, ale velmi užitečné)

**Clickable Figma prototype:**
- Navigace mezi sekcemi (sidebar clicks)
- Expand/collapse interactions (accordion, cards, lišta lovců)
- Card hover states
- Tab switching (Strážcův panel)
- Form interactions (dropdown, checkboxes)

**Benefits:**
- Developer vidí jak to má fungovat
- User testing možnost
- Client approval před implementací

### 4. Assets

**Icons:**
- Harm hearts ♥ (filled, empty)
- Štěstí dots ● (filled, empty)
- Dice 🎲
- Edit ✎
- Add +
- Remove ×
- Search 🔍
- Expand/collapse ▸ ▾
- Navigation icons (optional)

**UI elements:**
- Separators (horizontal lines, dividers)
- Backgrounds (textures — optional)
- Patterns (noise, grain — optional)

**Export formáty:**
- SVG (preferred for icons, scalable)
- PNG (fallback, @1x @2x @3x if needed)

### 5. Dokumentace

**Design rationale:**
- Proč tyto volby (barvy, fonty, layout)?
- Jak podporuje use case (kokpit feeling)?
- Atmosféra (horror, dark)

**Component usage guidelines:**
- Kdy použít primary vs secondary button?
- Kdy použít card vs list item?
- Spacing rules

**Responsive breakpoints:**
- Desktop, tablet, mobile
- Layout changes na každém breakpointu

**Handoff notes:**
- Color codes (HEX/RGB)
- Font specifications (family, size, weight)
- Spacing values
- Border radius, shadows
- Transition timings

---

## Reference a inspirace

### Podobné aplikacje (UX reference)

**Roll20** (Virtual Tabletop)
- Card system
- Session tracking
- Quick reference panels
- **Avoid:** Příliš složité, příliš mnoho features

**Notion**
- Card system, databases
- Collapsible sections (accordion)
- Inline editing
- Clean, modern UI

**Discord**
- Dark mode aesthetic
- Sidebar navigation
- Chat log (inspiration pro poznámky)

**GitHub Issues / Projects**
- Task management patterns
- Tagging system
- Filters, search

### Vizuální inspirace

**TV shows:**
- Supernatural — Title cards, dark aesthetic, Americana
- X-Files — Mystery, investigation vibes
- Buffy — Mix of horror and practicality

**Dark mode dashboards:**
- GitHub (clean, professional dark mode)
- Spotify (music player dark UI)
- VS Code (developer tools dark theme)

**Horror game UIs:**
- Resident Evil — Menu systems, inventory
- Silent Hill — Atmospheric, unsettling
- Alan Wake — Mystery, notes, clues

**Pinterest boards (suggested):**
- "Dark UI dashboard"
- "Horror game interface"
- "Supernatural aesthetic"
- "Card-based UI"

### Anti-patterns (avoid these!)

**Generic RPG fantasy aesthetic:**
- Středověk, draci, dungeony — WRONG setting
- Leather textures, parchment backgrounds — too cliché
- Fantasy fonts (Celtic, Gothic) — wrong vibe

**Příliš mnoho barev:**
- Rainbow dashboards — overwhelming
- Držet dark background + 1-2 accent colors

**Comic Sans nebo playful fonts:**
- This is horror, not cartoon

**Cluttered interface:**
- Kokpit musí být čitelný i po 3 hodinách session
- White space is OK
- Progressive disclosure > všechno najednou

---

## Timeline a Milestones

### Doporučený postup grafika

**Týden 1: Wireframes + Mood board**

**Deliverables:**
- Low-fidelity wireframes všech sekcí (grayscale, boxes)
- Mood board (Pinterest/Figma)
  - Color palette samples
  - Font samples (3-5 options)
  - Visual inspiration (screenshots, photos)

**Feedback meeting:**
- Review wireframes (layout OK?)
- Approve visual direction (colors, fonts, vibe)

---

**Týden 2: High-fi design sekce Sezení**

**Deliverables:**
- Kompletní high-fidelity design hlavní obrazovky Sezení
  - 3-column layout
  - Všechny komponenty (odpočet, karty, panel, lišta lovců)
  - Všechny states (collapsed, expanded, hover)
- Component library start
  - Base card design
  - Button styles
  - Input fields

**Feedback meeting:**
- Review main screen design
- Iterate on components if needed

---

**Týden 3: Ostatní sekce + Design system**

**Deliverables:**
- High-fi design: Kampaň, Záhada, Pravidla screens
- Dokončení component library
  - All variants (NPC card, Monster card, etc.)
  - All form elements
  - Tooltips, modals
- Responsive varianty (tablet breakpoint)
- Design system dokumentace
  - Color codes
  - Typography scale
  - Spacing rules

**Final review:**
- All screens approval
- Design system complete

---

**Týden 4: Handoff**

**Deliverables:**
- Export assets (SVG icons, PNG fallbacks)
- Figma/Sketch file with organized layers
- Design system dokumentace (PDF or Notion)
- Developer handoff meeting (Q&A)

**Optional:**
- Clickable prototype (Figma)
- Video walkthrough (5-10 min screencast explaining design)

---

## Verifikace

### Checklist před odevzdáním

**Completeness:**
- [ ] Všechny 4 sekce navrženy?
- [ ] Spodní lišta lovců (collapsed + expanded)?
- [ ] Strážcův panel (3 taby)?
- [ ] Card komponenty (NPC, Monster, Location, Minion)?
- [ ] Form elements (inputs, dropdowns, checkboxes, textareas)?

**Visual consistency:**
- [ ] Jasný color palette (dark theme, accent colors)?
- [ ] Typography scale (fonts, sizes, weights)?
- [ ] Consistent spacing (grid system)?
- [ ] Icon set complete?

**Developer-ready:**
- [ ] All states documented (default, hover, active, disabled)?
- [ ] Measurements specified (px, spacing, border radius)?
- [ ] Color codes (HEX/RGB)?
- [ ] Font specifications (family, size, weight, line-height)?
- [ ] Component usage guidelines?

**Content examples:**
- [ ] Příklady reálného obsahu (NPC jména, příšery, tahy)?
- [ ] Realistic data amounts (3 lovci, 5 NPC, atd.)?
- [ ] Edge cases considered (0 harm, 7 harm, prázdný seznam)?

**Prioritization clear:**
- [ ] Grafik ví co je MVP (Sezení, Pravidla)?
- [ ] Fáze 2 a 3 označeny jako "nice to have"?

---

## Kritické soubory (pro referenci)

Pro detailní informace viz tyto soubory v projektu:

- `/home/brux/projekty/motw-tools/VISION.md` — Celková vize projektu
- `/home/brux/projekty/motw-tools/docs/app-spec.md` — Detailní UI specifikace
- `/home/brux/projekty/motw-tools/docs/rules/*.md` — Herní pravidla (obsah pro příklady)

**Obsah pravidel (pro realistické příklady):**
- `01-zaklady-hry.md` — Základní tahy, hody, mechaniky
- `02-tvorba-zahady.md` — Odpočet, příšery, NPC, lokace
- `03-hrozby.md` — Typy příšer, přisluhovačů, přihlížejících, lokalit
- `04-lovci-a-playbooky.md` — 12 playbooků, atributy, tahy
- `05-bojovy-system.md` — Zbraně, harm, zbroj, štítky
- `06-vedeni-hry.md` — Tahy Strážce (měkký, tvrdý)
- `08-selhani-a-reakce.md` — Příklady selhání pro každý tah

---

## Kontakt a komunikace

**Preferovaná komunikace:**
- Async: Email, Slack, Figma comments
- Sync: Zoom/Meet meetings (1× týdně)

**Feedback timeline:**
- Grafik pošle deliverable → 48h na review → feedback call

**Iterace:**
- Očekáváme 1-2 iterace na každý milestone
- Major changes only v Týdnu 1-2, Týden 3-4 = polish only

---

## Dodatek A: Slovník termínů (pro kontextt)

**Monster of the Week:**
- RPG hra ve stylu Buffy/Supernatural — každá session = nová záhada/příšera

**Strážce (Keeper):**
- Game Master, vede hru, hraje příšery a NPC

**Lovec (Hunter):**
- Player character, loví příšery

**Záhada (Mystery):**
- Epizoda, jedna session (2-4 hodiny), jedna příšera

**Odpočet (Countdown):**
- Timeline co se stane pokud lovci nezasáhnou (6 fází)

**Harm:**
- Zranění (0-7, na 7 = unconscious/dying)

**Štěstí (Luck):**
- Points pro záchranu života (0-7, na 0 = smrt když dostaneš smrtelný harm)

**Playbook:**
- Character class (Mstitel, Expertka, Normál, atd.)

**Tah (Move):**
- Herní mechanika (hod 2d6 + atribut, výsledek 10+/7-9/6-)

**Měkký tah (Soft move):**
- Varování, napětí, hrozba se blíží (ne ještě harm)

**Tvrdý tah (Hard move):**
- Následek, bolí to, harm, ztráta, problém

**Přisluhovač (Minion):**
- Menší monster, slouží hlavní příšeře

**Přihlížející (Bystander):**
- NPC, civilista, svědek

**Lokace (Location):**
- Místo v záhadě (bar, lesík, opuštěný kostel)

---

**Konec dokumentu**

**Verze:** 1.0
**Datum:** 2026-02-01
**Autor:** Brux + Claude
**Pro:** Grafik/Designer Strážcovského panelu
