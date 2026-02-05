/**
 * Decision Engine - Decides what autonomous goal to pursue
 */

// Agent goals
export const AGENT_GOALS = {
  WRITE_LORE: 'write_lore',
  WRITE_STORY: 'write_story',
  COMPILE_NOTES: 'compile_notes',
  CREATE_EVENT: 'create_event',
  GENERATE_TWIST: 'generate_twist',
  EXPAND_WORLD: 'expand_world'
};

/**
 * Decide what the agent should do next
 * @param {Object} mystery - Current mystery data
 * @param {Array} sessionLog - Session log entries
 * @param {Object} settings - Autonomous settings
 * @returns {Promise<Object>} - Selected goal with context
 */
export async function decideNextGoal(mystery, sessionLog, settings) {
  console.log('[Decision Engine] Analyzing game state...');

  const priorities = [];

  // 1. Check countdown urgency
  const currentPhase = mystery?.countdown?.currentPhase || 0;
  if (currentPhase >= 4) {
    priorities.push({
      goal: AGENT_GOALS.CREATE_EVENT,
      priority: 10,
      reason: `Countdown je ve fázi ${currentPhase}/6 - blíží se půlnoc, měli bychom vytvořit dramatickou událost`
    });
  }

  // 2. Check if mystery has little lore
  const customLore = mystery?.customLore || [];
  const existingLore = mystery?.lore || '';
  const totalLoreLength = customLore.join(' ').length + existingLore.length;

  if (totalLoreLength < 500) {
    priorities.push({
      goal: AGENT_GOALS.WRITE_LORE,
      priority: 9,
      reason: `Záhada má málo lore (${totalLoreLength} znaků) - měli bychom rozvinout pozadí`
    });
  }

  // 3. Check session length - compile notes if long
  if (sessionLog && sessionLog.length > 15) {
    priorities.push({
      goal: AGENT_GOALS.COMPILE_NOTES,
      priority: 7,
      reason: `Dlouhé sezení (${sessionLog.length} záznamů) - měli bychom zkompilovat poznámky`
    });
  }

  // 4. Check for unanswered questions
  const unknowns = analyzeUnknowns(mystery, sessionLog);
  if (unknowns.length > 3) {
    priorities.push({
      goal: AGENT_GOALS.WRITE_LORE,
      priority: 8,
      reason: `Zjištěno ${unknowns.length} nezodpovězených otázek - měli bychom napsat lore`
    });
  }

  // 5. Creative storytelling - always an option
  priorities.push({
    goal: AGENT_GOALS.WRITE_STORY,
    priority: 6,
    reason: 'Kreativní vypravování - napsat co se děje "off-screen"'
  });

  // 6. World expansion
  priorities.push({
    goal: AGENT_GOALS.EXPAND_WORLD,
    priority: 5,
    reason: 'Rozšíření světa - přidat nové lokace, NPC nebo souvislosti'
  });

  // 7. Random twist (low priority, high creativity)
  const creativityLevel = settings?.creativityLevel || 'medium';
  if (creativityLevel === 'high' && Math.random() > 0.7) {
    priorities.push({
      goal: AGENT_GOALS.GENERATE_TWIST,
      priority: 4,
      reason: 'Kreativní twist - neočekávaný zvrat v příběhu'
    });
  }

  // Sort by priority (highest first)
  priorities.sort((a, b) => b.priority - a.priority);

  const selected = priorities[0];

  console.log('[Decision Engine] Selected goal:', selected.goal);
  console.log('[Decision Engine] Reason:', selected.reason);
  console.log('[Decision Engine] All priorities:', priorities.map(p => `${p.goal}: ${p.priority}`));

  return {
    goal: selected.goal,
    priority: selected.priority,
    reason: selected.reason,
    alternatives: priorities.slice(1, 3)
  };
}

/**
 * Analyze unknowns in mystery
 */
function analyzeUnknowns(mystery, sessionLog) {
  const unknowns = [];

  // Check if monster weakness is discovered
  const weaknessRevealed = sessionLog?.some(log =>
    log.text?.toLowerCase().includes('slabina') ||
    log.text?.toLowerCase().includes('weakness')
  );

  if (!weaknessRevealed) {
    unknowns.push('Slabina příšery není známá');
  }

  // Check if monster motivation is clear
  const motivation = mystery?.monster?.motivation || '';
  if (motivation.length < 50) {
    unknowns.push('Motivace příšery není jasná');
  }

  // Check if bystanders have backstories
  const bystanders = mystery?.bystanders || [];
  bystanders.forEach((b, idx) => {
    if (!b.description || b.description.length < 30) {
      unknowns.push(`NPC "${b.name}" nemá dostatečný popis`);
    }
  });

  // Check if locations are described
  const locations = mystery?.locations || [];
  locations.forEach(loc => {
    if (!loc.description || loc.description.length < 30) {
      unknowns.push(`Lokace "${loc.name}" nemá detailní popis`);
    }
  });

  return unknowns;
}

/**
 * Evaluate game state priorities
 */
export function evaluateGameState(mystery, sessionLog) {
  const evaluation = {
    countdownUrgency: (mystery?.countdown?.currentPhase || 0) / 6,
    loreDepth: calculateLoreDepth(mystery),
    sessionComplexity: (sessionLog?.length || 0) / 20,
    unknownFactors: analyzeUnknowns(mystery, sessionLog).length,
    timestamp: Date.now()
  };

  console.log('[Decision Engine] Game state evaluation:', evaluation);

  return evaluation;
}

/**
 * Calculate lore depth score (0-1)
 */
function calculateLoreDepth(mystery) {
  const customLore = mystery?.customLore || [];
  const existingLore = mystery?.lore || '';
  const totalLength = customLore.join(' ').length + existingLore.length;

  // 0 = no lore, 1 = rich lore (2000+ chars)
  return Math.min(totalLength / 2000, 1);
}

/**
 * Get goal type from goal constant
 */
export function getGoalType(goal) {
  const typeMap = {
    [AGENT_GOALS.WRITE_LORE]: 'lore',
    [AGENT_GOALS.WRITE_STORY]: 'story',
    [AGENT_GOALS.COMPILE_NOTES]: 'notes',
    [AGENT_GOALS.CREATE_EVENT]: 'event',
    [AGENT_GOALS.GENERATE_TWIST]: 'twist',
    [AGENT_GOALS.EXPAND_WORLD]: 'world'
  };

  return typeMap[goal] || 'story';
}
