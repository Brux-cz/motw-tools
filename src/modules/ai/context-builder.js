/**
 * Context Builder - Builds game context for AI
 */

import { getState } from '../state/store.js';

/**
 * Build complete game context for AI
 * @param {string} mysteryId - Current mystery ID
 * @returns {string} Formatted game context
 */
export function buildGameContext(mysteryId) {
  const { campaign } = getState();

  if (!campaign) {
    return 'Není načtena žádná kampaň.';
  }

  const mystery = campaign.mysteries?.find(m => m.id === mysteryId);
  if (!mystery) {
    return 'Záhada nenalezena.';
  }

  const sections = [];

  // 1. MYSTERY INFO
  sections.push(`# ZÁHADA: ${mystery.name || 'Bez názvu'}`);

  if (mystery.hook) {
    sections.push(`\n**Návnada (Hook):**\n${mystery.hook}`);
  }

  // 2. MONSTER
  if (mystery.monster) {
    const monster = mystery.monster;
    sections.push(`\n## PŘÍŠERA`);
    sections.push(`**Název:** ${monster.name || 'Neznámá příšera'}`);
    sections.push(`**Typ:** ${monster.type || 'Neznámý'}`);

    if (monster.description) {
      sections.push(`**Popis:** ${monster.description}`);
    }

    if (monster.powers && monster.powers.length > 0) {
      sections.push(`**Schopnosti:** ${monster.powers.join(', ')}`);
    }

    if (monster.attacks && monster.attacks.length > 0) {
      sections.push(`**Útoky:** ${monster.attacks.map(a => `${a.name} (${a.harm} harm)`).join(', ')}`);
    }

    if (monster.armour !== undefined) {
      sections.push(`**Zbroj:** ${monster.armour}`);
    }

    if (monster.harmCapacity !== undefined) {
      sections.push(`**Harm kapacita:** ${monster.harmCapacity}`);
      sections.push(`**Aktuální harm:** ${monster.currentHarm || 0}/${monster.harmCapacity}`);
    }

    // CRITICALLY IMPORTANT: Weakness is secret!
    sections.push(`**Slabina:** ${monster.weakness || '???'} (TAJNÉ - lovci to musí objevit!)`);

    if (monster.motivation) {
      sections.push(`**Motivace:** ${monster.motivation}`);
    }
  }

  // 3. NPCs (BYSTANDERS & MINIONS)
  if (mystery.bystanders && mystery.bystanders.length > 0) {
    sections.push(`\n## NPC (Přihlížející)`);
    mystery.bystanders.forEach(npc => {
      sections.push(`\n**${npc.name}** (${npc.type || 'NPC'})`);
      if (npc.description) sections.push(`  Popis: ${npc.description}`);
      if (npc.motivation) sections.push(`  Motivace: ${npc.motivation}`);
    });
  }

  if (mystery.minions && mystery.minions.length > 0) {
    sections.push(`\n## POSKOCI`);
    mystery.minions.forEach(minion => {
      sections.push(`\n**${minion.name}** (${minion.type || 'Poskok'})`);
      if (minion.description) sections.push(`  Popis: ${minion.description}`);
      if (minion.motivation) sections.push(`  Motivace: ${minion.motivation}`);
    });
  }

  // 4. LOCATIONS
  if (mystery.locations && mystery.locations.length > 0) {
    sections.push(`\n## LOKACE`);
    mystery.locations.forEach(loc => {
      sections.push(`\n**${loc.name}** (${loc.type || 'Místo'})`);
      if (loc.description) sections.push(`  ${loc.description}`);
      if (loc.threats) sections.push(`  Hrozby: ${loc.threats}`);
    });
  }

  // 5. COUNTDOWN
  if (mystery.countdown) {
    const countdown = mystery.countdown;
    const currentPhase = countdown.currentPhase || 0;

    sections.push(`\n## ODPOČET`);
    sections.push(`**Aktuální fáze:** ${currentPhase + 1}/6 - ${countdown.phases[currentPhase]?.day || 'Neznámá fáze'}`);

    sections.push(`\n**Všechny fáze:**`);
    countdown.phases.forEach((phase, idx) => {
      const marker = idx === currentPhase ? '→ **AKTUÁLNÍ**' : '';
      const status = idx < currentPhase ? '[DOKONČENO]' : idx === currentPhase ? '[PROBÍHÁ]' : '[ČEKÁ]';
      sections.push(`${idx + 1}. ${phase.day} ${status} ${marker}`);
      if (phase.description) {
        sections.push(`   ${phase.description}`);
      }
    });

    // Countdown history
    if (countdown.history && countdown.history.length > 0) {
      sections.push(`\n**Historie odpočtu:**`);
      countdown.history.slice(-3).forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleString('cs-CZ');
        sections.push(`- ${date}: Fáze ${entry.fromPhase + 1} → ${entry.toPhase + 1} (${entry.reason})`);
      });
    }
  }

  // 6. HUNTERS
  if (campaign.hunters && campaign.hunters.length > 0) {
    sections.push(`\n## LOVCI`);
    campaign.hunters.forEach(hunter => {
      sections.push(`\n**${hunter.name}** - ${hunter.playbook || 'Neznámý typ'}`);
      sections.push(`  Stats: Cool ${hunter.cool || 0}, Tough ${hunter.tough || 0}, Charm ${hunter.charm || 0}, Sharp ${hunter.sharp || 0}, Weird ${hunter.weird || 0}`);
      sections.push(`  Harm: ${hunter.harm || 0}/7, Luck: ${hunter.luck || 7}/${hunter.maxLuck || 7}, XP: ${hunter.experience || 0}`);

      if (hunter.gear && hunter.gear.length > 0) {
        sections.push(`  Výbava: ${hunter.gear.map(g => g.name || g).join(', ')}`);
      }

      if (hunter.storyTags && hunter.storyTags.length > 0) {
        sections.push(`  Story Tags: ${hunter.storyTags.map(t => t.name || t).join(', ')}`);
      }
    });
  }

  // 7. SESSION LOG (last 10 entries)
  if (campaign.sessionLog && campaign.sessionLog.length > 0) {
    sections.push(`\n## POSLEDNÍ UDÁLOSTI (Session Log)`);
    const recentLogs = campaign.sessionLog.slice(-10);
    recentLogs.forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit'
      });
      sections.push(`[${time}] ${entry.text}`);
    });
  }

  // 8. CUSTOM MOVES
  if (mystery.customMoves && mystery.customMoves.length > 0) {
    sections.push(`\n## VLASTNÍ TAHY PRO TUTO ZÁHADU`);
    mystery.customMoves.forEach(move => {
      sections.push(`\n**${move.name}**`);
      if (move.trigger) sections.push(`  Trigger: ${move.trigger}`);
      if (move.effect) sections.push(`  Effect: ${move.effect}`);
    });
  }

  return sections.join('\n');
}

/**
 * Build conversation context for API
 * @param {Array} messages - All messages
 * @param {number} limit - Max messages to include
 * @returns {Array} API-formatted messages
 */
export function buildConversationContext(messages, limit = 50) {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Take last N messages
  const recentMessages = messages.slice(-limit);

  // Convert to API format
  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Estimate context size in tokens
 * @param {string} mysteryId - Mystery ID
 * @param {Array} messages - Conversation messages
 * @returns {Object} Token estimates
 */
export function estimateContextSize(mysteryId, messages = []) {
  const gameContext = buildGameContext(mysteryId);
  const conversationContext = buildConversationContext(messages);

  // Rough estimate: 1 token ≈ 3 characters for Czech
  const gameContextTokens = Math.ceil(gameContext.length / 3);

  const conversationTokens = conversationContext.reduce((sum, msg) => {
    return sum + Math.ceil(msg.content.length / 3);
  }, 0);

  const systemPromptTokens = 1500; // Approximate

  return {
    gameContext: gameContextTokens,
    conversation: conversationTokens,
    systemPrompt: systemPromptTokens,
    total: gameContextTokens + conversationTokens + systemPromptTokens
  };
}
