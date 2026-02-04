#!/usr/bin/env node
/**
 * Extract game data from markdown files to JSON
 * Parses rules markdown files and generates JSON data files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '../docs/rules');
const OUTPUT_DIR = path.join(__dirname, '../src/data');

/**
 * Main extraction function
 */
async function main() {
  console.log('🎲 Extracting game data from markdown files...\n');

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Extract threats
    await extractThreats();

    // Extract playbooks
    await extractPlaybooks();

    // Extract weapons
    await extractWeapons();

    // Extract basic moves
    await extractBasicMoves();

    // Extract keeper moves
    await extractKeeperMoves();

    // Extract rules
    await extractRules();

    // Generate names database
    await generateNames();

    console.log('\n✅ All data extracted successfully!');
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

/**
 * Extract threats from 03-hrozby.md
 */
async function extractThreats() {
  console.log('📖 Extracting threats...');

  const filePath = path.join(DOCS_DIR, '03-hrozby.md');
  const content = await fs.readFile(filePath, 'utf-8');

  const monsterData = extractMonsterTypes(content);
  const minionData = extractMinionTypes(content);
  const bystanderData = extractBystanderTypes(content);
  const locationData = extractLocationTypes(content);

  const threats = {
    monsterTypes: monsterData.types || monsterData,
    monsterMoves: monsterData.genericMoves || [],
    minionTypes: minionData.types || minionData,
    minionMoves: minionData.genericMoves || [],
    bystanderTypes: bystanderData.types || bystanderData,
    bystanderMoves: bystanderData.genericMoves || [],
    locationTypes: locationData.types || locationData,
    locationMoves: locationData.genericMoves || []
  };

  await writeJSON('threats.json', threats);
  console.log(`  ✓ Extracted ${threats.monsterTypes.length} monster types`);
  console.log(`  ✓ Extracted ${threats.monsterMoves.length} monster moves`);
  console.log(`  ✓ Extracted ${threats.minionTypes.length} minion types`);
  console.log(`  ✓ Extracted ${threats.minionMoves.length} minion moves`);
  console.log(`  ✓ Extracted ${threats.bystanderTypes.length} bystander types`);
  console.log(`  ✓ Extracted ${threats.bystanderMoves.length} bystander moves`);
  console.log(`  ✓ Extracted ${threats.locationTypes.length} location types`);
  console.log(`  ✓ Extracted ${threats.locationMoves.length} location moves`);
}

/**
 * Extract monster types
 */
function extractMonsterTypes(content) {
  const monsters = [];

  // Find the table section
  const monsterSection = content.match(/## Typy příšer[\s\S]*?(?=\n## |$)/i);
  if (!monsterSection) return monsters;

  // Parse table rows (skip header and separator)
  const tableRows = monsterSection[0].split('\n')
    .filter(line => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1); // Skip header row

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const [typeCz, typeEn, motivation] = cells;
      monsters.push({
        type: typeCz.trim(),
        type_en: typeEn.trim(),
        motivation: motivation.trim()
      });
    }
  }

  // Also extract the 14 generic monster moves
  const movesSection = content.match(/### Tahy příšer[\s\S]*?(?=\n---|$)/i);
  const genericMoves = [];
  if (movesSection) {
    const moveLines = movesSection[0].split('\n')
      .filter(line => /^\d+\./.test(line.trim()));

    for (const line of moveLines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
      if (match) {
        genericMoves.push({
          name_cz: match[1].trim(),
          name_en: match[2].trim()
        });
      }
    }
  }

  return { types: monsters, genericMoves };
}

/**
 * Extract minion types
 */
function extractMinionTypes(content) {
  const minions = [];

  // Find the table section
  const minionSection = content.match(/## Typy přisluhovačů[\s\S]*?(?=\n## |$)/i);
  if (!minionSection) return minions;

  // Parse table rows
  const tableRows = minionSection[0].split('\n')
    .filter(line => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const [typeCz, typeEn, motivation] = cells;
      minions.push({
        type: typeCz.trim(),
        type_en: typeEn.trim(),
        motivation: motivation.trim()
      });
    }
  }

  // Extract generic minion moves
  const movesSection = content.match(/### Tahy přisluhovačů[\s\S]*?(?=\n###|$)/i);
  const genericMoves = [];
  if (movesSection) {
    const moveLines = movesSection[0].split('\n')
      .filter(line => /^\d+\./.test(line.trim()));

    for (const line of moveLines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
      if (match) {
        genericMoves.push({
          name_cz: match[1].trim(),
          name_en: match[2].trim()
        });
      }
    }
  }

  return { types: minions, genericMoves };
}

/**
 * Extract bystander types
 */
function extractBystanderTypes(content) {
  const bystanders = [];

  // Find the table section
  const bystanderSection = content.match(/## Typy přihlížejících[\s\S]*?(?=\n## |$)/i);
  if (!bystanderSection) return bystanders;

  // Parse table rows
  const tableRows = bystanderSection[0].split('\n')
    .filter(line => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const [typeCz, typeEn, motivation] = cells;
      bystanders.push({
        type: typeCz.trim(),
        type_en: typeEn.trim(),
        motivation: motivation.trim()
      });
    }
  }

  // Extract generic bystander moves
  const movesSection = content.match(/### Tahy přihlížejících[\s\S]*?(?=\n###|$)/i);
  const genericMoves = [];
  if (movesSection) {
    const moveLines = movesSection[0].split('\n')
      .filter(line => /^\d+\./.test(line.trim()));

    for (const line of moveLines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
      if (match) {
        genericMoves.push({
          name_cz: match[1].trim(),
          name_en: match[2].trim()
        });
      }
    }
  }

  return { types: bystanders, genericMoves };
}

/**
 * Extract location types
 */
function extractLocationTypes(content) {
  const locations = [];

  // Find the table section
  const locationSection = content.match(/## Typy lokalit[\s\S]*?(?=\n## |$)/i);
  if (!locationSection) return locations;

  // Parse table rows
  const tableRows = locationSection[0].split('\n')
    .filter(line => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const [typeCz, typeEn, motivation] = cells;
      locations.push({
        type: typeCz.trim(),
        type_en: typeEn.trim(),
        motivation: motivation.trim()
      });
    }
  }

  // Extract generic location moves
  const movesSection = content.match(/### Tahy lokalit[\s\S]*?(?=\n###|$)/i);
  const genericMoves = [];
  if (movesSection) {
    const moveLines = movesSection[0].split('\n')
      .filter(line => /^\d+\./.test(line.trim()));

    for (const line of moveLines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
      if (match) {
        genericMoves.push({
          name_cz: match[1].trim(),
          name_en: match[2].trim()
        });
      }
    }
  }

  return { types: locations, genericMoves };
}

/**
 * Extract playbooks (stub - will be implemented if needed)
 */
async function extractPlaybooks() {
  console.log('📖 Extracting playbooks...');

  // For now, create a stub with known playbooks
  const playbooks = [
    'Chosen',
    'Crooked',
    'Divine',
    'Expert',
    'Flake',
    'Initiate',
    'Monstrous',
    'Mundane',
    'Professional',
    'Spell-Slinger',
    'Spooky',
    'Wronged'
  ];

  const playbooksData = {};
  playbooks.forEach(name => {
    playbooksData[name] = {
      name,
      name_cz: name, // TODO: Add Czech translations
      description: `Playbook ${name}`,
      // TODO: Extract from individual playbook files
    };
  });

  await writeJSON('playbooks.json', playbooksData);
  console.log(`  ✓ Extracted ${playbooks.length} playbooks (stub)`);
}

/**
 * Extract weapons from 05-bojovy-system.md
 */
async function extractWeapons() {
  console.log('📖 Extracting weapons...');

  const filePath = path.join(DOCS_DIR, '05-bojovy-system.md');

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const weapons = {
      weapons: extractWeaponsList(content),
      tags: extractWeaponTags(content)
    };

    await writeJSON('weapons.json', weapons);
    console.log(`  ✓ Extracted ${weapons.weapons.length} weapons`);
    console.log(`  ✓ Extracted ${weapons.tags.length} weapon tags`);
  } catch (error) {
    console.log('  ⚠ weapons file not found, creating stub');
    await writeJSON('weapons.json', { weapons: [], tags: [] });
  }
}

/**
 * Extract weapons list
 */
function extractWeaponsList(content) {
  const weapons = [];

  // Find all weapon tables (skip the tags table)
  const sections = content.split(/\n### /);

  for (const section of sections) {
    // Skip if this is the tags section
    if (section.includes('Štítky útoků') || section.includes('Dosah útoků')) continue;

    // Parse table rows
    const lines = section.split('\n');
    let inTable = false;

    for (const line of lines) {
      if (line.trim().startsWith('|') && !line.includes('---')) {
        // Check if this is a header row
        if (line.toLowerCase().includes('zbraň') || line.toLowerCase().includes('štítek')) {
          inTable = true;
          continue;
        }

        if (!inTable) continue;

        const cells = line.split('|').map(c => c.trim()).filter(c => c);

        // Weapon table format: | Zbraň | EN | Zranění | Dosah | Štítky |
        if (cells.length >= 5) {
          const [nameCz, nameEn, harmStr, range, tagsStr] = cells;

          // Parse harm value
          const harmMatch = harmStr.match(/(\d+)/);
          if (!harmMatch) continue;

          const harm = parseInt(harmMatch[1]);

          // Parse tags
          const tags = tagsStr
            .split(',')
            .map(t => t.trim())
            .filter(t => t && t !== '—');

          weapons.push({
            name_cz: nameCz.trim(),
            name_en: nameEn.trim(),
            harm,
            range: range.trim(),
            tags
          });
        }
      }
    }
  }

  return weapons;
}

/**
 * Extract weapon tags
 */
function extractWeaponTags(content) {
  const tags = [];

  // Find the tags table section
  const tagsSection = content.match(/## Štítky útoků[\s\S]*?(?=\n## |$)/i);
  if (!tagsSection) return tags;

  // Parse table rows
  const tableRows = tagsSection[0].split('\n')
    .filter(line => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const [tagCz, tagEn, description] = cells;
      tags.push({
        tag_cz: tagCz.trim(),
        tag_en: tagEn.trim(),
        description: description.trim()
      });
    }
  }

  return tags;
}

/**
 * Extract basic moves (stub)
 */
async function extractBasicMoves() {
  console.log('📖 Extracting basic moves...');

  const basicMoves = [
    {
      name: 'Kick Some Ass',
      name_cz: 'Nakopej prdel',
      trigger: 'When you attack an enemy in close combat',
      stat: 'Tough'
    },
    {
      name: 'Act Under Pressure',
      name_cz: 'Jednej pod tlakem',
      trigger: 'When you act under pressure',
      stat: 'Cool'
    },
    {
      name: 'Help Out',
      name_cz: 'Pomoz',
      trigger: 'When you help another hunter',
      stat: 'Cool'
    },
    {
      name: 'Investigate a Mystery',
      name_cz: 'Vyšetřuj záhadu',
      trigger: 'When you investigate a mystery',
      stat: 'Sharp'
    },
    {
      name: 'Manipulate Someone',
      name_cz: 'Manipuluj s někým',
      trigger: 'When you manipulate an NPC',
      stat: 'Charm'
    },
    {
      name: 'Protect Someone',
      name_cz: 'Ochraň někoho',
      trigger: 'When you prevent harm to another hunter',
      stat: 'Tough'
    },
    {
      name: 'Read a Bad Situation',
      name_cz: 'Vyčti špatnou situaci',
      trigger: 'When you look around and read a charged situation',
      stat: 'Sharp'
    },
    {
      name: 'Use Magic',
      name_cz: 'Použij magii',
      trigger: 'When you use magic',
      stat: 'Weird'
    }
  ];

  await writeJSON('basic-moves.json', basicMoves);
  console.log(`  ✓ Extracted ${basicMoves.length} basic moves`);
}

/**
 * Extract keeper moves (stub)
 */
async function extractKeeperMoves() {
  console.log('📖 Extracting keeper moves...');

  const keeperMoves = [
    'Separate them',
    'Capture someone',
    'Put someone in trouble',
    'Trade harm for harm',
    'Announce off-screen badness',
    'Announce future badness',
    'Inflict harm',
    'Turn their move back on them',
    'Make a threat move',
    'Reveal an unwelcome truth',
    'Offer an opportunity',
    'Take away something',
    'After every move, ask "What do you do?"'
  ];

  await writeJSON('keeper-moves.json', keeperMoves);
  console.log(`  ✓ Extracted ${keeperMoves.length} keeper moves`);
}

/**
 * Extract rules from all markdown files
 */
async function extractRules() {
  console.log('📖 Extracting rules...');

  const rulesFiles = [
    { file: '01-zaklady-hry.md', title: 'Základy hry', icon: 'psychology' },
    { file: '02-tvorba-zahady.md', title: 'Tvorba záhady', icon: 'mystery' },
    { file: '03-hrozby.md', title: 'Hrozby', icon: 'dangerous' },
    { file: '04-lovci-a-playbooky.md', title: 'Lovci a playbooky', icon: 'group' },
    { file: '05-bojovy-system.md', title: 'Bojový systém', icon: 'swords' },
    { file: '06-vedeni-hry.md', title: 'Vedení hry', icon: 'gamepad' },
    { file: '08-selhani-a-reakce.md', title: 'Selhání a reakce', icon: 'warning' },
    { file: '09-hranicni-pripady.md', title: 'Hraniční případy', icon: 'help' }
  ];

  const sections = [];
  let totalSubsections = 0;

  for (const { file, title, icon } of rulesFiles) {
    const filePath = path.join(DOCS_DIR, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const section = parseRuleSection(content, title, icon, file);

      if (section && section.subsections.length > 0) {
        sections.push(section);
        totalSubsections += section.subsections.length;
      }
    } catch (error) {
      console.log(`  ⚠ ${file} not found, skipping`);
    }
  }

  const rules = { sections };
  await writeJSON('rules.json', rules);
  console.log(`  ✓ Extracted ${sections.length} sections with ${totalSubsections} subsections`);
}

/**
 * Parse a single rule section from markdown
 */
function parseRuleSection(content, title, icon, filename) {
  const subsections = [];

  // Split by level 2 headers (##)
  const parts = content.split(/\n## /);

  // Skip the first part (before first ##) as it's usually metadata
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const lines = part.split('\n');
    const subsectionTitle = lines[0].trim();

    // Skip metadata sections and very short titles
    if (subsectionTitle.startsWith('>') || subsectionTitle.length < 3) continue;

    // Get content (everything after title)
    let subsectionContent = lines.slice(1).join('\n').trim();

    // Convert markdown to simple HTML
    subsectionContent = convertMarkdownToHTML(subsectionContent);

    // Skip if content is too short
    if (subsectionContent.length < 20) continue;

    subsections.push({
      id: `${filename.replace('.md', '')}-${i}`,
      title: subsectionTitle.replace(/\s*—.*$/, '').trim(), // Remove counts like "— 12 typů"
      content: subsectionContent
    });
  }

  if (subsections.length === 0) return null;

  return {
    id: filename.replace('.md', ''),
    title,
    icon,
    subsections
  };
}

/**
 * Convert markdown to simple HTML
 */
function convertMarkdownToHTML(markdown) {
  let html = markdown;

  // Convert headers (### and ####)
  html = html.replace(/\n#### (.+)/g, '\n<h4>$1</h4>');
  html = html.replace(/\n### (.+)/g, '\n<h3>$1</h3>');

  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert unordered lists
  html = html.replace(/\n- (.+)/g, '\n<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');

  // Convert ordered lists
  html = html.replace(/\n\d+\. (.+)/g, '\n<li>$1</li>');

  // Convert tables to simple HTML (basic support)
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split('\n').filter(r => !r.includes('---'));
    if (rows.length < 2) return match;

    const [header, ...dataRows] = rows;
    const headerCells = header.split('|').map(c => c.trim()).filter(c => c);
    const tableHTML = ['<table class="rules-table">'];

    // Header
    tableHTML.push('<thead><tr>');
    headerCells.forEach(cell => tableHTML.push(`<th>${cell}</th>`));
    tableHTML.push('</tr></thead>');

    // Body
    tableHTML.push('<tbody>');
    dataRows.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length > 0) {
        tableHTML.push('<tr>');
        cells.forEach(cell => tableHTML.push(`<td>${cell}</td>`));
        tableHTML.push('</tr>');
      }
    });
    tableHTML.push('</tbody></table>');

    return tableHTML.join('');
  });

  // Convert paragraphs (double newline)
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<[uh])/g, '$1'); // Don't wrap lists/headers in p
  html = html.replace(/(<\/[uh][^>]*>)<\/p>/g, '$1');

  return html;
}

/**
 * Generate American names database
 */
async function generateNames() {
  console.log('📖 Generating names database...');

  const names = {
    male: [
      'John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
      'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
      'Sam', 'Dean', 'Bobby', 'Castiel', 'Jack', 'Crowley', 'Garth', 'Rufus', 'Ash', 'Kevin'
    ],
    female: [
      'Mary', 'Jennifer', 'Linda', 'Patricia', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa',
      'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda',
      'Ellen', 'Jo', 'Charlie', 'Ruby', 'Meg', 'Rowena', 'Claire', 'Jody', 'Annie', 'Pamela'
    ],
    surnames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Winchester', 'Singer', 'Harvelle', 'Novak', 'Campbell', 'Mills', 'Turner', 'Bradbury', 'Hanscum', 'Holloway'
    ]
  };

  await writeJSON('names.json', names);
  console.log(`  ✓ Generated ${names.male.length} male names`);
  console.log(`  ✓ Generated ${names.female.length} female names`);
  console.log(`  ✓ Generated ${names.surnames.length} surnames`);
}

/**
 * Write JSON file
 */
async function writeJSON(filename, data) {
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Run extraction
main();
