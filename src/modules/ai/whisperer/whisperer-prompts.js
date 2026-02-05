/**
 * Whisperer Prompts - AI prompt templates for ambient snippets
 */

/**
 * Get system prompt for whisperer
 */
export function getWhispererSystemPrompt(mystery) {
  return `Jsi našeptávač pro Keepera hry Monster of the Week.

ÚKOL: Generuj KRÁTKÉ (2-3 věty) realistické snippety pro improvizaci.

PRAVIDLA:
- Maximálně 2-3 věty
- Používej reálné prvky (skutečná místa, běžné události)
- Adaptuj pro kontext mystery "${mystery.name}"
- Nepřehánět s horrorem - spíš atmospheric než scary
- Inspirace pro improvizaci, ne hlavní story

STYL:
- Realistický, believable
- Atmosférický
- Evokativní detaily (zvuky, počasí, atmosféra)
- "Show don't tell"

PŘÍKLAD DOBRÉ VÝSTUPU:
"Dave za barem naladil místní rádio KPNW. Zprávy: další nezvěstná osoba z oblasti Pine Woods. Sheriff Morgan vyzývá veřejnost k opatrnosti."

VÝSTUP: Jen samotný snippet text, bez formátování.`;
}

/**
 * Get category-specific prompt
 */
export function getWhisperPrompt(category, context) {
  const prompts = {
    world: `Vytvoř ambient snippet o tom co se děje ve městě/okolí právě teď. Použij běžné události (bar closing, church bell, local news).

Context: ${context}

Snippet (2-3 věty):`,

    people: `Vytvoř snippet o tom co právě dělá nějaká NPC postava. Běžné činnosti, ale atmospheric.

Context: ${context}

Snippet:`,

    environment: `Vytvoř snippet o počasí, atmosféře, sensory details (zvuky, vůně).

Context: ${context}

Snippet:`,

    news: `Vytvoř snippet jako by to byla zpráva z místního rádia/TV. Realistické, adaptované pro mystery.

Context: ${context}

Radio/TV snippet:`,

    clues: `Vytvoř subtle hint nebo clue, který keeper může použít. Nenápadné, realistické.

Context: ${context}

Clue snippet:`
  };

  return prompts[category] || prompts.world;
}

/**
 * Build context string from mystery data
 */
export function buildWhispererContext(mystery, category) {
  const parts = [];

  // Mystery name & hook
  parts.push(`Mystery: ${mystery.name}`);
  if (mystery.hook) {
    parts.push(`Hook: ${mystery.hook}`);
  }

  // Current countdown phase
  if (mystery.countdown?.currentPhase !== undefined) {
    const phase = mystery.countdown.phases[mystery.countdown.currentPhase];
    if (phase) {
      parts.push(`Countdown: ${phase.day} - ${phase.description}`);
    }
  }

  // Monster (subtle reference)
  if (mystery.monster?.name && category === 'clues') {
    parts.push(`Monster type: ${mystery.monster.type || 'unknown'}`);
  }

  // Recent spine entries for continuity
  const recentSpine = (mystery.storySpine || [])
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  if (recentSpine.length > 0) {
    parts.push('\nRecent events:');
    recentSpine.forEach(entry => {
      parts.push(`- ${entry.content.substring(0, 100)}`);
    });
  }

  // NPCs for people category
  if (category === 'people' && mystery.bystanders?.length > 0) {
    parts.push('\nAvailable NPCs:');
    mystery.bystanders.slice(0, 3).forEach(npc => {
      parts.push(`- ${npc.name}: ${npc.role || 'unknown'}`);
    });
  }

  // Locations
  if (mystery.locations?.length > 0) {
    parts.push('\nLocations:');
    mystery.locations.slice(0, 3).forEach(loc => {
      parts.push(`- ${loc.name}`);
    });
  }

  return parts.join('\n');
}
