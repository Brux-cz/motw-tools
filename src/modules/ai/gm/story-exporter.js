/**
 * Story Exporter - Convert session log into a readable Czech story
 */
import { callAI } from '../client.js';

/**
 * Export session log as a story
 * @param {Array} sessionLog - Session log entries
 * @param {Object} mystery - Mystery object
 * @returns {Promise<string>} Markdown-formatted story
 */
export async function exportStory(sessionLog, mystery) {
  if (!sessionLog || sessionLog.length === 0) {
    return '# Prázdný příběh\n\nŽádné záznamy k exportu.';
  }

  // Split log into chapters based on scene changes, countdown advances, and natural breaks
  const chapters = splitIntoChapters(sessionLog);

  // Generate story title
  const title = await generateTitle(sessionLog, mystery);

  // Process each chapter
  const storyParts = [];
  for (let i = 0; i < chapters.length; i++) {
    const chapterText = await processChapter(chapters[i], i + 1, chapters.length, mystery);
    storyParts.push(chapterText);
  }

  // Generate epilogue
  const epilogue = await generateEpilogue(sessionLog, mystery);

  // Assemble final story
  const parts = [
    `# ${title}`,
    '',
    ...storyParts,
    '',
    '## Epilog',
    '',
    epilogue
  ];

  return parts.join('\n');
}

/**
 * Split session log into chapters
 */
function splitIntoChapters(sessionLog) {
  const chapters = [];
  let currentChapter = [];

  for (const entry of sessionLog) {
    // Start new chapter on scene changes or countdown events
    const isChapterBreak =
      entry.type === 'scene' ||
      (entry.type === 'autoplay' && entry.message.includes('Countdown'));

    if (isChapterBreak && currentChapter.length > 0) {
      chapters.push(currentChapter);
      currentChapter = [];
    }

    currentChapter.push(entry);

    // Also break if chapter gets too long (15+ entries)
    if (currentChapter.length >= 15) {
      chapters.push(currentChapter);
      currentChapter = [];
    }
  }

  // Add remaining entries
  if (currentChapter.length > 0) {
    chapters.push(currentChapter);
  }

  // Merge tiny chapters (< 3 entries) with previous
  const merged = [];
  for (const chapter of chapters) {
    if (chapter.length < 3 && merged.length > 0) {
      merged[merged.length - 1].push(...chapter);
    } else {
      merged.push(chapter);
    }
  }

  return merged;
}

/**
 * Process a single chapter into prose
 */
async function processChapter(entries, chapterNum, totalChapters, mystery) {
  // Format raw log for AI
  const rawLog = entries.map(entry => {
    switch (entry.type) {
      case 'player': return `[Hráč ${entry.hunter}]: ${entry.message}`;
      case 'gm': {
        let line = `[Keeper]: ${entry.message}`;
        if (entry.roll) line += ` (hod: ${entry.roll.total}, ${entry.roll.outcome})`;
        return line;
      }
      case 'npc': return `[NPC ${entry.npc}]: ${entry.message}`;
      case 'scene': return `[Scéna]: ${entry.message}`;
      case 'ambient': return `[Atmosféra]: ${entry.message}`;
      case 'consequence': return `[Důsledek]: ${entry.message}`;
      case 'autoplay': return `[Systém]: ${entry.message}`;
      default: return `[Systém]: ${entry.message}`;
    }
  }).join('\n');

  const prompt = `Přepiš následující herní záznam z Monster of the Week do plynulé české prózy.

HERNÍ ZÁZNAM (kapitola ${chapterNum}/${totalChapters}):
${rawLog}

${mystery?.name ? `Záhada: ${mystery.name}` : ''}

PRAVIDLA PŘEPISU:
- Piš v minulém čase, 3. osoba
- Literární styl — plynulá próza, ne seznam akcí
- Odstraň herní mechaniky (kostky, harm, tahy) — zachovej jen příběh
- Přidej atmosférické přechody a popisy
- Zachovej dialogy NPC a akce lovců
- Každý lovec by měl být rozpoznatelný svým stylem jednání
- Pokud je to první kapitola, začni poutavým úvodem
- Pokud je to poslední kapitola, buduj napětí k závěru
- Délka: 150-300 slov

Odpověz POUZE prózou (bez nadpisu, bez komentářů):`;

  try {
    const prose = await callAI(prompt, {
      temperature: 0.8,
      max_tokens: 600
    });
    return `## Kapitola ${chapterNum}\n\n${prose.trim()}`;
  } catch (error) {
    console.error(`[Story Export] Error processing chapter ${chapterNum}:`, error);
    // Fallback: use raw log formatted
    const fallback = entries
      .filter(e => e.type !== 'system' && e.type !== 'autoplay')
      .map(e => e.message)
      .join('\n\n');
    return `## Kapitola ${chapterNum}\n\n${fallback}`;
  }
}

/**
 * Generate story title
 */
async function generateTitle(sessionLog, mystery) {
  const summary = sessionLog
    .filter(e => ['scene', 'gm', 'consequence'].includes(e.type))
    .slice(0, 5)
    .map(e => e.message)
    .join(' ');

  try {
    const title = await callAI(
      `Vymysli krátký, atmosférický český název příběhu (max 6 slov) na základě:\n\nZáhada: ${mystery?.name || 'neznámá'}\nÚryvek: ${summary.slice(0, 300)}\n\nOdpověz POUZE názvem (bez uvozovek):`,
      { temperature: 0.9, max_tokens: 30 }
    );
    return title.trim().replace(/^["']|["']$/g, '');
  } catch {
    return mystery?.name || 'Lovci monster';
  }
}

/**
 * Generate epilogue
 */
async function generateEpilogue(sessionLog, mystery) {
  const lastEntries = sessionLog.slice(-5).map(e => e.message).join('\n');
  const endEntry = sessionLog.filter(e => e.type === 'autoplay' && e.message.includes('dokončen')).pop();

  try {
    const epilogue = await callAI(
      `Napiš krátký epilog (3-5 vět) pro příběh Monster of the Week.

Závěr hry: ${endEntry?.message || 'Hra skončila.'}
Poslední události: ${lastEntries}
Záhada: ${mystery?.name || 'neznámá'}

Pravidla:
- Minulý čas, literární styl
- Shrň osud lovců a záhady
- Nechej prostor pro imaginaci
- Atmosférická tečka za příběhem

Odpověz POUZE epilogem:`,
      { temperature: 0.8, max_tokens: 200 }
    );
    return epilogue.trim();
  } catch {
    return 'A tak skončila další záhada v životě lovců...';
  }
}
