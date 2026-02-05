# AI Game Master Mode

Plně autonomní AI Game Master pro Monster of the Week.

## Přehled

AI GM Mode umožňuje AI samostatně vést herní session jako lidský Keeper:
- ✅ Vyprávění příběhů a popisů scén
- ✅ Řízení NPCs a generování dialogů
- ✅ Automatické hodnocení akcí hráčů
- ✅ Aplikace game mechanik (harm, moves, atd.)
- ✅ Ambient events a dynamické vyprávění

## Architektura

### Moduly

```
/src/modules/ai/gm/
├── gm-engine.js           - Hlavní GM loop
├── player-input-parser.js - Parsování hráčských akcí
├── mechanics-engine.js    - Dice rolls & move resolution
├── npc-engine.js          - NPC behavior & dialogue
├── scene-manager.js       - Scene tracking & turns
└── narrative-engine.js    - Dynamic storytelling
```

### UI

```
/src/modules/ui/gm/
└── gm-panel.js            - GM control panel & session log
```

## Použití

### Start GM Mode

1. Otevři AI GM tab v sidebaru
2. (Volitelně) nastav GM Settings
3. Klikni "Start GM Mode"
4. AI inicializuje scénu a začne session

### Player Actions

V GM módu můžou hráči zadávat akce:
- `"Útočím mečem na upíra"` → Trigger: Kick Some Ass move
- `"Zkoumám místnost"` → Trigger: Investigate move
- `"Chráním Sarah před útokem"` → Trigger: Protect Someone move

AI automaticky detekuje MOTW moves a hodí kostkami.

### Settings

- **Auto-apply Mechanics**: Automaticky aplikuje harm a conditions
- **Narrative Style**: Minimal / Balanced / Verbose
- **NPC Autonomy**: Jak často NPCs jednají samostatně
- **Ambient Events**: Frekvence atmosférických událostí

## Funkce

### GM Engine (gm-engine.js)

**Main Loop:**
- Continuous processing loop
- Player action queue
- Ambient events
- NPC behaviors

**Player Action Handling:**
```javascript
processPlayerAction(hunterId, actionText)
// → Parse action
// → Detect move
// → Roll dice
// → Narrate outcome
// → Apply consequences
// → NPC reactions
```

### Move Detection (player-input-parser.js)

Automaticky detekuje MOTW moves z textu:
- `"útočím"`, `"fight"` → Kick Some Ass
- `"zkoumám"`, `"investigate"` → Investigate
- `"chráním"`, `"protect"` → Protect Someone
- atd.

### Mechanics (mechanics-engine.js)

```javascript
rollDice() // 2d6
resolveMove(hunterId, moveName, context) // 10+, 7-9, 6-
applyHarm(hunterId, harmValue, source)
applyCondition(hunterId, condition)
```

### NPCs (npc-engine.js)

```javascript
generateNPCResponse(npcId, context) // Dialogue
determineNPCBehavior(npcId, situation) // Autonomous actions
shouldNPCIntervene(npcId, situation) // When to react
```

### Narrative (narrative-engine.js)

```javascript
narrateAction(parsedAction, result) // Action outcomes
generateSceneDescription(location, atmosphere, tension)
generateAmbientEvent(scene, mystery) // Atmospheric events
```

### Scene Management (scene-manager.js)

```javascript
initializeScene(location, hunters, npcs)
updateScene(updates)
getCurrentScene()
increaseTension() / decreaseTension()
```

## Session Log

Session log zaznamenává vše co se děje:
- **System**: GM mode start/stop
- **Scene**: Scene descriptions
- **Player**: Hráčské akce
- **GM**: Keeper responses (+ dice rolls)
- **NPC**: NPC dialogy a akce
- **Ambient**: Atmosférické události
- **Consequence**: Harm, conditions, atd.

## Příklad Session Flow

```
[System] AI Game Master mode activated.

[Scene] Nacházíte se v opuštěném motelu. Světla blikají, vzduch je těžký...

[Player - John] Útočím mečem na upíra

[GM] John s rozhodností míří meč proti upírovi...
🎲 Roll: 4 + 3 + 2 = 9 (partial)

[Consequence] John zasáhl upíra, ale utrpěl 1 harm od jeho drápů.

[NPC - Sarah] "John! Pozor, za tebou!"

[Ambient] Slyšíte škrábání v oknech...
```

## Safety

- **Harm limit**: Auto-apply max 4 harm (více vyžaduje approval)
- **Validation**: Safety checks na všechny akce
- **Override**: User může vždy zastavit nebo overridovat
- **Approval queue**: Kritické akce mohou jít do fronty

## Budoucí rozšíření

- [ ] Combat system (threat actions)
- [ ] Countdown progression
- [ ] Advanced NPC personalities
- [ ] Multiple scenes/locations
- [ ] Voice input pro player actions
- [ ] Rich media (images, sounds)
- [ ] Multiplayer support

## API

### Start/Stop

```javascript
import { startGMMode, stopGMMode } from './gm-engine.js';

await startGMMode();
stopGMMode();
```

### Process Action

```javascript
import { processPlayerAction } from './gm-engine.js';

processPlayerAction(hunterId, "Útočím na upíra");
```

### Session Log

```javascript
import { getGMSessionLog } from './gm-engine.js';

const log = getGMSessionLog();
```

### Settings

```javascript
import { updateGMSettings, getGMSettings } from './gm-engine.js';

updateGMSettings({
  autoApplyMechanics: true,
  narrativeStyle: 'balanced'
});
```

## Testování

```bash
npm run dev
```

1. Otevři http://localhost:5173
2. Přejdi na AI GM tab
3. Klikni "Start GM Mode"
4. Zadej player action
5. Verify AI response v session logu

## Závěr

AI GM Mode je první plně autonomní AI Game Master pro TTRPG nástroje. Kombinuje:
- Real-time processing
- MOTW rules engine
- Dynamic storytelling
- NPC autonomy
- Safety controls

Vznikl rozšířením stávajícího AI Keeper systému s novými moduly pro player interaction a autonomous gameplay.
