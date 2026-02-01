# Specifikace appky — Strážcovský panel

> Detailní popis obrazovek, interakcí a dat.
> Živý dokument — bude se vyvíjet.
> Poslední aktualizace: 2026-02-01

---

## Přehled

Webová appka běžící vedle Discord voice callu. Jeden uživatel (Strážce),
žádné přihlašování, data v prohlížeči.

### Layout

```
┌──────────────────────────────────────────────────┐
│ ☰  PŘÍŠERA TÝDNE — Strážcovský panel             │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│ Kampaň │   [aktivní obsah podle sekce]           │
│ Záhada │                                         │
│ Sezení │                                         │
│Pravidla│                                         │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│ Lovci: Jan ♥♥♥♥♥♥♥  Petra ♥♥♥♥♥♥♥  Tomáš ♥♥♥♥♥ │
└──────────────────────────────────────────────────┘
```

- Levý sidebar: navigace mezi sekcemi
- Hlavní oblast: obsah aktivní sekce
- **Spodní lišta lovců: vždy viditelná** (harm, štěstí, XP — na každé záložce)

---

## 1. Sekce: KAMPAŇ

**Kdy:** Mezi sezeními — přehled celé hry.

### Obsah

**Lovci** — seznam s kartami:
- Jméno, playbook (dropdown z 12)
- Atributy (Šarm, Rozvaha, Bystrost, Ostrost, Podivínství)
- Harm (7 boxů), Štěstí (7 boxů), XP (0-5)
- Zbraně a výbava
- Tahy playbooku (automatické + vybrané)
- **Poznámky Strážce** — privátní háčky, tajemství, plány pro lovce

**Příběhové oblouky:**
- Název oblouku
- Odpočet (6 fází: Den → Stíny → Západ → Soumrak → Setmění → Půlnoc)
- Seznam záhad v oblouku (vyřešené / probíhající / plánované)

**NPC archiv:**
- Všechna NPC z celé kampaně
- Filtrování: typ, stav (žije/mrtvý/nezvěstný), lokace, tagy
- Kliknutím otevřeš kartu NPC

**Historie sezení:**
- Datum, záhada, stručné poznámky co se stalo

### Přidání lovce

```
Přidat lovce:
  Jméno: [____________]
  Playbook: [Mstitel ▾]

  → appka předvyplní:
    - 5 řádků atributů na výběr (hráč řekne který)
    - startovní zbraně na výběr
    - tahy na výběr

  Strážce zaklikne co hráč vybral.
```

Playbooky jsou v JSON datech — appka zná tahy, zbraně, atributy pro každý playbook.
Hráči dostávají PDF playbooky nezávisle na appce.

---

## 2. Sekce: ZÁHADA

**Kdy:** Příprava před session.

### Start nové záhady

Dvě volby:
- **Prázdná šablona** — prázdná struktura, vyplníš sám
- **Vygenerovat základ 🎲** — random příšera + NPC + lokace + návrh odpočtu

### Struktura záhady (scrollovatelná stránka, sbalitelné sekce)

**Námět a návnada:**
- Námět: volný text (o čem záhada je)
- Návnada: volný text (co přitáhne lovce)
- Typ návnady: dropdown (Zprávy / Svědectví / Osobní kontakt / Nadpřirozený zdroj / Mise)

**Příšera** (karta) — `[Generovat 🎲]`:
- Jméno (text)
- Typ: dropdown z 12 typů (Bestie, Černokněžník, Královna...)
  - Automaticky vyplní motivaci podle typu
- Popis (volný text)
- Nadpřirozené schopnosti: checkboxy (Magie, Létání, Ovládání, Neviditelnost, Telekineze, Proměna) + vlastní
- Útok: popis + harm (dropdown 1-5) + dosah (dropdown) + štítky (checkboxy)
- Zdraví (číslo), Zbroj (číslo)
- Slabina (volný text)
- Tahy příšery: checkboxy z 14 tahů příšer
- Obrázek (upload/paste, volitelné)

**Odpočet:**
- 6 textových polí (Den, Stíny, Západ, Soumrak, Setmění, Půlnoc)
- Dropdown: struktura (Přímá eskalace / Ďáblova smlouva / Není co se zdá)

**Přisluhovači** — `[+ Přidat]` `[Generovat 🎲]`:
- Karty, stejný formát jako příšera ale jednodušší (typ z 10, harm, zdraví, zbroj)

**Přihlížející** — `[+ Přidat]` `[Generovat 🎲]` `[Z archivu kampaně]`:
- NPC karty (jméno, typ z 9, motivace, popis, poznámky)
- Tři zdroje: ručně, generátor, z archivu kampaně

**Lokace** — `[+ Přidat]` `[Generovat 🎲]`:
- Karty (název, typ z 10, motivace, popis, NPC tady, poznámky)
- Mapa/nákres (upload/paste, volitelné)

**Tahy na míru** — `[+ Přidat]`:
- Název, spouštěč (volný text)
- Typ: dropdown (S hodem / Bonus-malus / Speciální efekt)
- Pokud s hodem: atribut (dropdown) + výsledky 10+, 7-9, 6- (text)

### Akce

- **Uložit** — záhada se uloží do kampaně
- **Spustit session →** — přepne do sekce Sezení s předvyplněnou záhadou
- **Exportovat JSON** — stažení záhady jako soubor

### Generátor příšer (🎲)

Jeden klik → výsledek:
- Náhodný typ (z 12) → motivace automaticky
- Náhodné 1-3 schopnosti
- Doporučený útok (harm + dosah)
- Doporučené staty (zdraví, zbroj)
- Náhodná slabina
- Americké jméno

Výsledek je předvyplněný ve formuláři. Strážce upraví co chce.

### Generátor NPC (🎲)

Jeden klik → výsledek:
- Americké jméno (muž/žena, náhodně)
- Typ přihlížejícího (z 9) + motivace
- Krátký popis (věk, povolání, výrazný rys)

### Generátor lokace (🎲)

Jeden klik → výsledek:
- Americký název místa
- Typ (z 10) + motivace

---

## 3. Sekce: SEZENÍ

**Kdy:** Během živé hry — hlavní obrazovka.

### Layout session obrazovky

```
┌───────────────┬────────────┬───────────────────┐
│               │            │                   │
│  ODPOČET      │  PŘIPNUTÉ  │  STRÁŽCŮV PANEL   │
│  + POZNÁMKY   │  KARTY     │                   │
│               │            │                   │
├───────────────┴────────────┴───────────────────┤
│ Lovci: harm, štěstí, XP  [rozbalit tahy ▾]    │
└────────────────────────────────────────────────┘
```

Všechno na jedné obrazovce. Žádné přepínání záložek během hry.

### Levý sloupec: Odpočet + poznámky

**Odpočet:**
- 6 fází, vizuální indikátor aktuální fáze
- Tlačítko [Posunout ▸] — posune o fázi dopředu
- Kliknutím na fázi zobrazí popis (z přípravy záhady)

**Poznámky:**
- Chronologický seznam
- Tlačítko [+ poznámka] nebo klávesová zkratka
- Rychlý textový vstup — zapsat a zpět do hry

### Střední sloupec: Připnuté karty

Karty z přípravy záhady + nově přidané za běhu:
- Miniaturní zobrazení (jméno, typ, klíčový stat)
- Kliknutím otevřeš detail → editneš → zavřeš → zpět
- Tlačítka [+ Karta] a [Generovat NPC 🎲]
- Zdraví příšery/přisluhovačů — klikáš dolů když dostávají harm

**Nové karty za běhu:**
- Vytvořit ručně, generovat, nebo vybrat z archivu kampaně
- Automaticky se uloží do kampaně

### Pravý sloupec: Strážcův panel

Tři režimy, přepínání záložkami nebo klávesou:

```
[Tahy SM]  [Tahy lovců]  [Zbraně]
```

---

### Strážcův panel — Tahy Strážce (Měkkého)

Kompaktní seznam, žádné odstavce. Tooltip při najetí myší = detail + příklad.

```
MĚKKÝ TAH  (varování, napětí)

 • Naznač hrozbu
 • Odhal nepříjemnou pravdu
 • Dej jim příležitost
 • Ukaž příznak blížícího se zla
 • Něco sebere, něco chce
 • Odděl je

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

TVRDÝ TAH  (následek, bolí)

 • Způsob zranění
 • Znič výbavu / zdroj
 • Posuň odpočet
 • Zajmi někoho
 • Přivolej další hrozbu
 • Obrať jejich tah proti nim
 • Aktivuj slabinu / temnou str.
```

**Tooltip při najetí:**
- Co tah znamená (1 věta)
- Příklad použití (1-2 věty)
- Příklad: "Naznač hrozbu" → "Řekni lovci co vidí/slyší/cítí, ale nenech to
  ještě dopadnout. Hráč musí reagovat — pokud ne, příště tvrdý tah."

---

### Strážcův panel — Tahy lovců

Kompaktní zobrazení všech 8 tahů (16 řádků, celé na jednom pohledu):

```
Dej přes hubu          +Ostrost
10+ harm+volba  7-9 harm oboustr.

Jednej pod tlakem     +Rozvaha
10+ zvládneš   7-9 cena/horší

Vyšetřuj záhadu      +Bystrost
10+ 2 otázky   7-9 1 otázka

Zhodnoť situaci      +Bystrost
10+ 3 držení   7-9 1 držení

Ochraňuj             +Ostrost
10+ ochráníš   7-9 Strážce volí

Pomoz                +Rozvaha
10+ dáš +1     7-9 oba v ohrož.

Zmanipuluj             +Šarm
10+ udělá to   7-9 s podmínkou

Užij magii       +Podivínství
10+ efekt      7-9 efekt+problém
```

**Kliknutím na tah — rozbalí se detail:**
- Seznam otázek/voleb (u tahů co je mají)
- Pokročilý výsledek 12+
- **6- SELHÁNÍ:** specifické příklady měkkého a tvrdého tahu jako reakce
  - Ne generické — pro každý tah jiné
  - Data z `docs/rules/08-selhani-a-reakce.md`

Příklad rozbalení Vyšetřuj záhadu:

```
VYŠETŘUJ ZÁHADU — 2d6 + Bystrost

10+ Polož 2 otázky:
 • Co se tu stalo?
 • Co to ohrožuje?
 • Co je tu divného?
 • Co tu nevidím?
 • Co tu zanechalo stopy?

7-9 Polož 1 otázku

12+ (pokročilý) 2 otázky + extra užitečná odpověď

6- SELHÁNÍ
 Měkký:
  → Stopy vedou do pasti
  → Něco si všimne že lovci vyšetřují
  → Falešná stopa
 Tvrdý:
  → Zničí důkaz vlastní neopatrností
  → Příšera zaútočí při vyšetřování
  → Přihlížející viděl a zavolal policii
```

### Progresivní detail — 3 úrovně

| Úroveň | Co vidíš | Kdy |
|---------|----------|-----|
| 1. Mrkneš | `Vyšetřuj záhadu +Byst 10+ 2ot 7-9 1ot` | 90 % hodů |
| 2. Rozklikneš | Seznam otázek, 12+, příklady selhání | Potřebuješ otázky nebo selhání |
| 3. Plný text | Kompletní pravidlový text, edge cases | Výjimečně, spor o pravidlo |

---

### Strážcův panel — Zbraně

```
[Hledat...          🔍]

IMPROVIZOVANÉ          0-1 harm
 Pěsti, kopance          0 intimní
 Ostrý předmět          1 blízko
 Těžký předmět          1 blízko

NOŽE / MEČE            1-3 harm
 Nůž, dýka              1 blízko
 Meč, mačeta            2 blízko
 Velký meč              3 blízko

STŘELNÉ               2-4 harm
 Pistole                2 blízko
 Brokovnice             3 blízko
 Lovecká puška          2 daleko
 Odstřelovací puška     4 daleko

ŠTÍTKY
 Hlučná Brutální Pomalá Ohnivá
 Plošná  Magická  Stříbrná ...
```

Kliknutím na štítek → tooltip s vysvětlením.

---

### Spodní lišta lovců

Vždy viditelná na každé obrazovce:

```
┌─────────────────────────────────────────────────────┐
│ Jan (Mstitel) ♥♥♥♥♥♥♥ ●●●●●○○  XP:3  [▸tahy]     │
│ Petra (Expert) ♥♥♥♥♥○○ ●●●●●●○  XP:1  [▸tahy]     │
│ Tomáš (Normál) ♥♥♥♥♥♥♥ ●●●●○○○  XP:4  [▸tahy]     │
└─────────────────────────────────────────────────────┘
```

- **Klik na ♥** → harm +1 / -1
- **Klik na ●** → štěstí +1 / -1
- **Klik na XP** → XP +1 / -1
- **[▸tahy]** → rozbalí playbook tahy daného lovce

Rozbalení playbook tahů:

```
┌─────────────────────────────────────────────────────┐
│ Jan (Mstitel) ♥♥♥♥♥♥♥ ●●●●●○○  XP:3               │
│                                                     │
│  Znám svou kořist (auto)                            │
│  +1 když útočíš na typ příšery svého příběhu        │
│                                                     │
│  Cílevědomá zuřivost                                │
│  +1 Ostrost proti přisluhovačům tvé kořisti         │
│                                                     │
│  Nikdy víc                                          │
│  Když ochraňuješ civilistu: 10+ automaticky         │
└─────────────────────────────────────────────────────┘
```

---

### Spuštění session

Klik [Spustit session →] v záhadě:
- Přepne do sekce Sezení
- Záhada předvyplněná (odpočet na Den, příšera plné zdraví)
- NPC a lokace připnuté jako karty
- Harm lovců kde zůstal z minulé session

### Ukončení session

- Stav se průběžně automaticky ukládá
- Strážce dopíše poznámky
- Záhada: označí stav (Vyřešena / Nedokončena / Probíhá)
- Nové NPC jsou v archivu kampaně
- Harm/štěstí/XP lovců zůstávají aktuální

---

## 4. Sekce: PRAVIDLA

**Kdy:** Kdykoli — quick lookup.

### Layout

```
[Hledat...          🔍]

▸ Základní tahy lovců (8)
▸ Pokročilé tahy (12+)
▸ Tahy Strážce (13)
▸ Typy hrozeb
▸ Štítky zbraní (24)
▸ Bojový systém
▸ Magie a rituály
▸ Harm a léčení
▸ Zbroj
▸ Štěstěna
▸ Hranice a edge cases
```

Accordion sekce — klikneš, rozbalí se detail. Fulltextové hledání napříč pravidly.

Data z `docs/rules/*.md` souborů.

---

## Systém karet

### Princip

Všechno je karta — NPC, lokace, příšera, přisluhovač. Jednotný formát,
editovatelné kdykoli, patří kampani.

### NPC karta

```
┌─ NPC ────────────────────────────┐
│ Jméno: [Dave Holloway     ] [✎] │
│ Typ: [Drbna ▾]                  │
│ Motivace: Šířit fámy            │
│                                  │
│ Popis:                           │
│ [Barman v Rusty Nail, 50,      ]│
│ [tlustý, ví o všech všechno    ]│
│                                  │
│ Poznámky:                        │
│ > Řekl lovkům o světlech (S2)   │
│ > Lže o Thornovi                 │
│ [+ poznámka]                     │
│                                  │
│ Stav: [● Žije ▾]                │
│ Tagy: [piney-woods] [informátor]│
│ [Obrázek — klikni/přetáhni]     │
└──────────────────────────────────┘
```

### Lokace karta

```
┌─ LOKACE ─────────────────────────┐
│ Název: [Rusty Nail Bar     ] [✎]│
│ Typ: [Křižovatka ▾]             │
│ Motivace: Svádět dohromady      │
│                                  │
│ Popis:                           │
│ [Jediný bar ve městě. Dřevěná ]│
│ [bouda na kraji Route 9.       ]│
│                                  │
│ NPC tady: Dave Holloway, Sheriff │
│                                  │
│ Poznámky:                        │
│ > Lovci tu slyšeli o zmizení    │
│ > Ve sklepě pentagram (S3)      │
│ [+ poznámka]                     │
│                                  │
│ [Mapa/nákres — klikni/přetáhni]  │
└──────────────────────────────────┘
```

### Příšera karta

```
┌─ PŘÍŠERA ────────────────────────┐
│ Jméno: [Rev. Silas Thorne  ] [✎]│
│ Typ: [Černokněžník ▾]           │
│ Motivace: Zmocnit se nad. síly  │
│                                  │
│ Schopnosti: Magie, Ovládání     │
│ Útok: 3 harm blízko (magie)     │
│ Zdraví: ██████████ 10/10        │
│ Zbroj: 1                        │
│ Slabina: Zlomit berlu           │
│                                  │
│ Poznámky:                        │
│ [+ poznámka]                     │
│ [Obrázek — klikni/přetáhni]     │
└──────────────────────────────────┘
```

### Vlastnosti karet

- **Vždy editovatelné** — klikneš ✎, změníš cokoli
- **Poznámky narůstají** — přidáváš za běhu, chronologicky
- **Propojené** — NPC odkazuje na lokaci, lokace na NPC
- **Tagy** — vlastní štítky pro filtrování
- **Stav** — žije/mrtvý/nezvěstný (NPC), aktivní/zničená (lokace)
- **Připnutí** — připneš na session obrazovku
- **Obrázky** — upload/paste, volitelné, jako příloha

### Vznik karet — tři zdroje

1. **V přípravě** — zakládáš záhadu, přidáváš karty dopředu
2. **Za běhu** — generátor nebo ruční vytvoření, automaticky uloženo
3. **Z archivu** — znovu použití existující karty z kampaně

---

## Data model

```
Kampaň
├── název, popis
├── Lovci[]
│   ├── jméno, playbook, atributy (5)
│   ├── harm (0-7), štěstí (0-7), XP (0-5)
│   ├── zbraně[], výbava[]
│   ├── tahy[] (automatické + vybrané)
│   └── poznámky[] (privátní, chronologické)
├── Příběhové oblouky[]
│   ├── název
│   ├── odpočet (6 fází, aktuální pozice)
│   └── záhady[] (reference)
├── NPC archiv[]
│   ├── jméno, typ (z 9), motivace
│   ├── popis, poznámky[]
│   ├── stav (žije/mrtvý/nezvěstný)
│   ├── tagy[], obrázek (volitelné)
│   └── záhady[] (kde se objevilo)
├── Lokace archiv[]
│   ├── název, typ (z 10), motivace
│   ├── popis, poznámky[]
│   ├── NPC[] (reference)
│   ├── tagy[], mapa (volitelné)
│   └── záhady[] (kde se objevila)
├── Záhady[]
│   ├── název, stav (rozpracovaná/připravená/probíhající/vyřešená/nedokončená)
│   ├── námět, návnada, typ návnady
│   ├── příšera (karta)
│   ├── odpočet (6 fází s popisem, aktuální pozice)
│   ├── přisluhovači[] (karty)
│   ├── přihlížející[] (reference na NPC)
│   ├── lokace[] (reference na lokace)
│   └── tahy na míru[]
│       ├── název, spouštěč
│       ├── typ (s hodem / bonus-malus / speciální)
│       └── výsledky (10+, 7-9, 6-)
└── Session log[]
    ├── datum, záhada (reference)
    ├── poznámky[]
    └── stav lovců na konci (snapshot)
```

### Persistence

- **localStorage / IndexedDB** — vše v prohlížeči
- **Export/import JSON** — ruční backup, přenos mezi zařízeními
- **Automatické ukládání** — průběžně během session

---

## Herní data (JSON)

Statická data extrahovaná z `docs/rules/`:

- **Playbooky** (12): atributy, tahy, zbraně, štěstěna
- **Základní tahy** (8): mechaniky, otázky, selhání
- **Pokročilé tahy** (8): výsledky 12+
- **Tahy Strážce** (13): měkké/tvrdé + popisy + příklady
- **Typy příšer** (12): motivace, doporučené staty, tahy
- **Typy přisluhovačů** (10): motivace, tahy
- **Typy přihlížejících** (9): motivace, tahy
- **Typy lokalit** (10): motivace, tahy
- **Zbraně** (60+): harm, dosah, štítky
- **Štítky zbraní** (24): popisy
- **Jména NPC**: americká, muž/žena/neutrální
- **Nadpřirozené schopnosti**: seznam pro generátor příšer
- **Slabiny**: seznam pro generátor příšer

---

## Typický průběh použití

### Příprava (před session)

1. Otevřeš **Kampaň** → podíváš se na poznámky z minula
2. Otevřeš **Záhada** → klikneš [Nová záhada]
3. Buď vyplníš sám, nebo klikneš [Vygenerovat základ 🎲]
4. Upravíš příšeru, dopíšeš NPC, odpočet, lokace
5. Zapíšeš ke každému lovci háčky v **Kampani**
6. Klikneš [Uložit]

### Hra (session)

1. Klikneš [Spustit session →]
2. Discord voice vedle
3. Hraješ — klikáš harm, posouváš odpočet, píšeš poznámky
4. Potřebuješ NPC? → [Generovat NPC 🎲] nebo [Z archivu]
5. Hráč hodí — mrkneš na Tahy lovců, řekneš výsledek
6. Hráč selhal — rozklikneš tah, vidíš příklady selhání
7. Potřebuješ pravidlo? → přepneš na Pravidla, najdeš, zpět

### Po hře

1. Dopíšeš poznámky co se stalo
2. Záhada → stav: Vyřešena / Nedokončena
3. Nové NPC jsou v archivu kampaně
4. Harm/štěstí/XP lovců zůstávají aktuální
5. Plánuješ další session v **Kampani**
