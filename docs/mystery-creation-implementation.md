# Mystery Creation System - Implementation Summary

## Overview

Implementace komplexního systému pro tvorbu záhad (mysteries) v Monster of the Week aplikaci, založená na analytických podkladech a best practices z komunity MOTW.

## Implementované komponenty

### 1. **Mystery Creation Wizard** (`src/modules/ui/mystery-wizard.js`)

Průvodce krok za krokem pro vytvoření záhady:

#### Krok 1: Námět a návnada
- Výběr ze šablon nebo vlastní tvorba
- Základní koncept (jádro problému)
- Návnada (co přitáhne lovce)

#### Krok 2: Typ příšery
- Dropdown s 12 typy příšer z `threats.json`:
  - Bestie, Černokněžník, Královna, Mučitel, Ničitel, Parazit
  - Pokušitel, Popravčí, Požírač, Sběratel, Šibal, Zploditel
- Automatické doplnění motivace podle typu
- Popis příšery

#### Krok 3: Statistiky příšery
- Výdrž (Harm): 5-20 (doporučeno 8-12)
- Zbroj (Armor): 0-4 (typicky 1-2)
- Útok: popis, harm, range
- Nadpřirozené schopnosti (dynamický seznam)

#### Krok 4: Slabina příšery ⚠️
- **KRITICKY DŮLEŽITÉ POLE** - zvýrazněné červeným rámem
- Povinné pole s validací
- Příklady dobrých/špatných slabin
- Validace že slabina není prázdná

#### Krok 5: Odpočet (Countdown)
- 6 fází: Den → Příšeří → Západ → Soumrak → Noc → Půlnoc
- Každá fáze s popisem konkrétní události
- Tipy jak vytvořit logickou eskalaci
- Validace že jsou všechny fáze popsány

#### Krok 6: Přihlížející (Bystanders)
- Generování náhodných NPC
- Manuální přidání NPC
- Typy z `threats.json` (9 typů):
  - Byrokrat, Detektiv, Drbna, Nevinný, Oběť
  - Pomocník, Skeptik, Svědek, Šťoural
- Doporučení minimálně 2 NPC

#### Krok 7: Lokace
- Generování náhodných lokalit
- Manuální přidání lokací
- Typy z `threats.json` (10 typů):
  - Brána pekel, Divočina, Doupě, Knihovna, Křižovatka
  - Laboratoř, Labyrint, Past, Pevnost, Vězení

#### Krok 8: Kontrola a dokončení
- Validace celé záhady
- Zobrazení chyb (musí být opraveny)
- Zobrazení varování (doporučení)
- Souhrn všech částí
- Tlačítko "Vytvořit záhadu" pouze pokud validace prošla

### 2. **Mystery Templates** (`src/data/mystery-templates.json`)

6 předpřipravených šablon pro běžné vzory:

1. **Příšera na lovu** (Monster on a Hunt)
   - Klasická lovící příšera v oblasti
   - Bestie typ
   - Eskalace od první oběti k terorizování celé oblasti

2. **Ďábelský rituál** (Devil's Ritual)
   - Temný rituál s katastrofickými důsledky
   - Černokněžník typ
   - Sběr ingrediencí → Oběti → Katastrofa

3. **Není to, čím se zdá** (Not What It Seems)
   - Zdánlivě normální situace skrývá nebezpečí
   - Parazit typ
   - Postupná infekce/ovládání populace

4. **Prokletý artefakt** (Cursed Artifact)
   - Mocný magický předmět způsobuje chaos
   - Sběratel typ
   - Artefakt mění majitele a realitu

5. **Mstivý duch** (Vengeful Spirit)
   - Duch touží po pomstě
   - Popravčí typ
   - Zabíjení vinných → Získání tělesné formy

6. **Množící se hrůza** (Breeding Horror)
   - Rychle se množící příšera
   - Zploditel typ
   - Exponenciální růst populace → Infestace

Každá šablona obsahuje:
- Předvyplněný hook a koncept
- Typ příšery s motivací
- Statistiky (harm, armor, powers, attack)
- Template slabiny
- 6 fází odpočtu
- Doporučené typy NPC a lokalit

### 3. **Store Functions** (`src/modules/state/store.js`)

Nové funkce pro správu záhad:

#### `validateMystery(mystery)`
Validuje strukturu záhady:
- **Chyby** (blokující):
  - Slabina příšery není definována
  - Odpočet nemá 6 fází
- **Varování** (doporučení):
  - Méně než 2 NPC
  - Návnada příliš krátká
  - Fáze odpočtu nemají popis
  - Příšera nemá popis

#### `updateMystery(mysteryId, updates)`
Immutable update existující záhady v kampani.

#### `advanceCountdown(mysteryId, reason)`
Posun odpočtu o jednu fázi dopředu:
- Uloží timestamp
- Uloží důvod posunu
- Uchovává historii změn

#### `setCountdownPhase(mysteryId, phase, reason)`
Nastavení odpočtu na konkrétní fázi:
- Umožňuje skok na libovolnou fázi
- Uchovává historii změn
- Validace rozsahu fáze (0-5)

#### `addCustomMove(mysteryId, customMove)`
Přidání custom move k záhadě:
- Generuje ID
- Přidá timestamp
- Uloží do mystery.customMoves[]

#### `removeCustomMove(mysteryId, moveId)`
Odstranění custom move ze záhady.

### 4. **Enhanced Countdown Tracker** (`src/modules/tabs/session.js`)

Vylepšený countdown systém v Session tabu:

#### Funkce
- Vizuální indikátory aktuální/dokončené/budoucí fáze
- Kliknutelné fáze pro přeskok na konkrétní bod
- Tlačítka "Zpět" a "Posunout"
- Automatické logování změn do herního logu
- Historie změn (ukládá timestamp + důvod)

#### Integrace
- Používá store funkce `advanceCountdown()` a `setCountdownPhase()`
- Automatické trackování historie
- Partial updates pro optimalizaci výkonu

### 5. **Integration** (`src/main.js`)

Tlačítko "Nový prvek" v hlavičce:
- Otevírá Mystery Creation Wizard
- Dynamický import pro optimalizaci velikosti bundle
- Error handling při načítání

## Data Structure

### Mystery Object

```javascript
{
  id: string,
  name: string,
  status: "active" | "resolved",
  hook: string,
  concept: string,

  monster: {
    id: string,
    name: string,
    type: string,              // e.g. "Beast"
    type_cz: string,           // e.g. "Bestie"
    motivation: string,
    description: string,
    powers: string[],
    attack: {
      description: string,
      harm: number,
      range: string            // intimate|hand|close|far
    },
    harm: number,              // Max harm (8-12 typicky)
    currentHarm: number,       // Aktuální zranění
    armor: number,             // 0-4
    weakness: string           // KRITICKÉ!
  },

  bystanders: [{
    id: string,
    name: string,
    type: string,
    motivation: string,
    description: string,
    status: "alive" | "dead" | "missing"
  }],

  locations: [{
    id: string,
    name: string,
    type: string,
    motivation: string,
    description: string
  }],

  minions: [{
    id: string,
    name: string,
    type: string,
    motivation: string,
    description: string,
    harm: number,
    armor: number
  }],

  countdown: {
    structure: "escalation",
    currentPhase: number,      // 0-5
    history: [{
      timestamp: number,
      fromPhase: number,
      toPhase: number,
      reason: string
    }],
    phases: [
      { day: "Day", description: string },
      { day: "Shadows", description: string },
      { day: "Sunset", description: string },
      { day: "Dusk", description: string },
      { day: "Nightfall", description: string },
      { day: "Midnight", description: string }
    ]
  },

  customMoves: [{
    id: string,
    name: string,
    trigger: string,
    type: "roll" | "modifier" | "effect",
    results: {
      success: string,
      partial: string,
      failure: string
    },
    createdAt: number
  }]
}
```

## Workflow

### Tvorba nové záhady

1. **Start**: Kliknutí na "Nový prvek" v hlavičce
2. **Krok 1**: Výběr šablony nebo vlastní koncept
3. **Krok 2**: Výběr typu příšery
4. **Krok 3**: Definice statistik
5. **Krok 4**: ⚠️ **Definice slabiny** (KRITICKÉ)
6. **Krok 5**: Vytvoření 6 fází odpočtu
7. **Krok 6**: Přidání minimálně 2 NPC
8. **Krok 7**: Přidání lokalit
9. **Krok 8**: Kontrola a validace
10. **Dokončení**: Vytvoření záhady + automatické uložení

### Použití během hry

1. **Countdown Management**:
   - Kliknutí na fázi → přeskok na tuto fázi
   - Tlačítko "Posunout" → další fáze
   - Tlačítko "Zpět" → předchozí fáze
   - Všechny změny logované + historie

2. **Cards Management**:
   - Kliknutí na kartu → editace
   - ✕ tlačítko → odstranění karty
   - Harm track → kliknutí přidává/odebírá zranění

## Validation Rules

### KRITICKÉ (blokují uložení)
- ✅ Slabina příšery definována
- ✅ Odpočet má 6 fází

### DOPORUČENÉ (varování)
- ⚠️ Minimálně 2 NPC
- ⚠️ Návnada alespoň 10 znaků
- ⚠️ Všechny fáze mají popis
- ⚠️ Příšera má popis

## Best Practices (implementované v UI)

### Slabina příšery
- ✅ Červené zvýraznění povinného pole
- ✅ Příklady dobrých/špatných slabin
- ✅ Validace před uložením
- ✅ Tipy pro objevitelnost

### Odpočet
- ✅ Vysvětlení "Co kdyby lovci nepřišli?"
- ✅ Konkrétní příklady pro každou fázi
- ✅ Připomínka flexibility během hry
- ✅ Historie změn pro review

### NPC
- ✅ Doporučení minimálně 2
- ✅ Generátor pro rychlost
- ✅ 9 typů s motivacemi
- ✅ Vysvětlení role přihlížejících

### Šablony
- ✅ 6 běžných vzorů
- ✅ Předvyplněné hodnoty
- ✅ Upravitelné detaily
- ✅ Příklady best practices

## Technical Features

### Performance
- ✅ Lazy loading wizardu (dynamic import)
- ✅ Partial updates countdown display
- ✅ Cache pro JSON data (5 min TTL)
- ✅ Immutable state updates

### UX
- ✅ Progress bar s 8 kroky
- ✅ Validace před každým krokem
- ✅ Zvýraznění aktuálního kroku
- ✅ Tlačítka Zpět/Pokračovat
- ✅ Modal overlay s escape key support

### Data Integrity
- ✅ Immutable updates
- ✅ Validace před uložením
- ✅ Auto-save do IndexedDB
- ✅ History tracking countdown změn

## Files Modified/Created

### Nové soubory
- ✅ `src/modules/ui/mystery-wizard.js` (832 řádků)
- ✅ `src/data/mystery-templates.json` (6 šablon)
- ✅ `docs/mystery-creation-implementation.md` (tento soubor)

### Upravené soubory
- ✅ `src/modules/state/store.js` (+150 řádků)
  - `validateMystery()`
  - `updateMystery()`
  - `advanceCountdown()`
  - `setCountdownPhase()`
  - `addCustomMove()`
  - `removeCustomMove()`

- ✅ `src/modules/tabs/session.js` (integrace historie)
  - Import nových funkcí
  - Použití `advanceCountdown()`
  - Použití `setCountdownPhase()`

- ✅ `src/main.js` (integrace tlačítka)
  - Dynamic import wizardu
  - Error handling

## Testování

### Dev server
```bash
npm run dev
```
Server běží na: http://localhost:3001/motw-tools/

### Test workflow
1. ✅ Otevřít aplikaci
2. ✅ Kliknout "Nový prvek"
3. ✅ Projít všech 8 kroků wizardu
4. ✅ Vyzkoušet validaci (schválně nezadat slabinu)
5. ✅ Vytvořit záhadu
6. ✅ Otestovat countdown ovládání
7. ✅ Ověřit automatické ukládání

## Future Enhancements (mimo rozsah této implementace)

### Custom Moves Builder
- GUI pro tvorbu custom moves
- Template selector (Roll/Modifier/Effect)
- Trigger builder s příklady
- Preview jak bude vypadat u stolu

### Mystery Export
- PDF export s formátováním
- Markdown export pro sharing
- JSON backup
- Plain text pro quick notes

### Advanced Features
- Story arc countdown (dlouhodobé kampaně)
- Minions management (přisluhovači příšery)
- Threat interconnections (vztahy mezi hrozbami)
- Custom threat types (vlastní typy hrozeb)

## Závěr

Systém pro tvorbu záhad je plně funkční a implementuje všechny klíčové prvky z analytických podkladů:

✅ **8-krokový wizard** s validací
✅ **6 šablon** pro běžné vzory
✅ **Kritická validace slabiny**
✅ **Odpočet s historií**
✅ **Immutable state management**
✅ **Best practices z komunity MOTW**

Systém je připraven k použití a poskytuje Strážci všechny nástroje pro systematickou přípravu kvalitních záhad podle pravidel Monster of the Week.
