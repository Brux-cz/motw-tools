/**
 * NPC Memory System
 * Tracks NPC relationships, knowledge, and secrets for continuity
 */

import { getState, updateMystery } from '../../state/store.js';

/**
 * Update NPC relationship with hunter
 * @param {string} npcId - NPC ID
 * @param {string} hunterId - Hunter ID
 * @param {Object} interaction - Interaction details
 * @returns {Object} Updated relationship
 */
export function updateNPCRelationship(npcId, hunterId, interaction) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    console.error('[NPC Memory] Mystery not found');
    return null;
  }

  // Initialize NPC memory if needed
  if (!mystery.npcMemory) {
    mystery.npcMemory = {};
  }

  // Initialize this NPC's memory if needed
  if (!mystery.npcMemory[npcId]) {
    mystery.npcMemory[npcId] = {
      npcId,
      relationships: {},
      worldKnowledge: [],
      secrets: []
    };
  }

  const npcMemory = mystery.npcMemory[npcId];

  // Initialize relationship with this hunter if needed
  if (!npcMemory.relationships[hunterId]) {
    npcMemory.relationships[hunterId] = {
      trust: 0,
      knowledge: [],
      lastInteraction: null,
      emotionalState: 'neutral',
      history: []
    };
  }

  const relationship = npcMemory.relationships[hunterId];

  // Calculate trust delta based on interaction
  const trustDelta = calculateTrustDelta(interaction);

  // Update trust (clamp between -1 and 1)
  relationship.trust = Math.max(-1, Math.min(1, relationship.trust + trustDelta));

  // Add knowledge if provided
  if (interaction.knowledge) {
    if (Array.isArray(interaction.knowledge)) {
      interaction.knowledge.forEach(k => {
        if (!relationship.knowledge.includes(k)) {
          relationship.knowledge.push(k);
        }
      });
    } else if (!relationship.knowledge.includes(interaction.knowledge)) {
      relationship.knowledge.push(interaction.knowledge);
    }
  }

  // Update emotional state
  relationship.emotionalState = determineEmotionalState(relationship.trust, interaction);

  // Record history
  relationship.history.push({
    timestamp: Date.now(),
    event: interaction.event || interaction.description || 'Interaction',
    trustDelta,
    newTrust: relationship.trust
  });

  // Keep only last 10 history entries
  if (relationship.history.length > 10) {
    relationship.history = relationship.history.slice(-10);
  }

  relationship.lastInteraction = Date.now();

  // Update mystery
  updateMystery(currentMysteryId, { npcMemory: mystery.npcMemory });

  console.log(`[NPC Memory] Updated ${npcId} relationship with ${hunterId}: trust=${relationship.trust.toFixed(2)}, state=${relationship.emotionalState}`);

  return relationship;
}

/**
 * Calculate trust delta from interaction
 * @param {Object} interaction - Interaction details
 * @returns {number} Trust delta (-1 to 1)
 */
function calculateTrustDelta(interaction) {
  const { type, outcome } = interaction;

  // Positive interactions
  if (type === 'help' || type === 'save') return 0.3;
  if (type === 'friendly') return 0.1;
  if (type === 'honest') return 0.2;
  if (type === 'gift') return 0.15;

  // Negative interactions
  if (type === 'threaten') return -0.3;
  if (type === 'lie' && outcome === 'caught') return -0.4;
  if (type === 'harm') return -0.5;
  if (type === 'betray') return -0.7;

  // Neutral/mixed
  if (type === 'question') return 0.05;
  if (type === 'investigate') return -0.05; // Slight distrust

  return 0;
}

/**
 * Determine emotional state based on trust and interaction
 * @param {number} trust - Trust level (-1 to 1)
 * @param {Object} interaction - Recent interaction
 * @returns {string} Emotional state
 */
function determineEmotionalState(trust, interaction) {
  // Interaction-specific emotions
  if (interaction.type === 'save') return 'grateful';
  if (interaction.type === 'threaten') return 'fearful';
  if (interaction.type === 'betray') return 'angry';

  // Trust-based emotions
  if (trust >= 0.7) return 'friendly';
  if (trust >= 0.4) return 'cooperative';
  if (trust >= 0.1) return 'cautious';
  if (trust >= -0.3) return 'wary';
  if (trust >= -0.6) return 'hostile';
  return 'terrified';
}

/**
 * Get NPC context for AI prompts
 * @param {string} npcId - NPC ID
 * @param {string} hunterId - Hunter ID (optional)
 * @returns {Object} NPC context
 */
export function getNPCContext(npcId, hunterId = null) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    console.error('[NPC Memory] Mystery not found');
    return null;
  }

  const npc = mystery.bystanders?.find(b => b.id === npcId);
  if (!npc) {
    console.error('[NPC Memory] NPC not found:', npcId);
    return null;
  }

  const npcMemory = mystery.npcMemory?.[npcId];

  const context = {
    npcId,
    name: npc.name,
    description: npc.description,
    motivation: npc.motivation,
    worldKnowledge: npcMemory?.worldKnowledge || [],
    secrets: npcMemory?.secrets || []
  };

  // Add relationship data if hunter specified
  if (hunterId && npcMemory?.relationships?.[hunterId]) {
    const relationship = npcMemory.relationships[hunterId];
    context.relationship = {
      trust: relationship.trust,
      trustLevel: getTrustLevel(relationship.trust),
      knowledge: relationship.knowledge,
      emotionalState: relationship.emotionalState,
      recentInteractions: relationship.history.slice(-3).map(h => h.event)
    };
  }

  return context;
}

/**
 * Get trust level label
 * @param {number} trust - Trust value (-1 to 1)
 * @returns {string} Trust level label
 */
function getTrustLevel(trust) {
  if (trust >= 0.7) return 'Velmi vysoká';
  if (trust >= 0.4) return 'Vysoká';
  if (trust >= 0.1) return 'Mírná';
  if (trust >= -0.3) return 'Nízká';
  if (trust >= -0.6) return 'Velmi nízká';
  return 'Nepřátelská';
}

/**
 * Check if NPC should reveal secret
 * @param {string} npcId - NPC ID
 * @param {string} hunterId - Hunter ID
 * @param {Object} context - Conversation context
 * @returns {Object|null} Secret to reveal or null
 */
export function shouldRevealSecret(npcId, hunterId, context = {}) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery?.npcMemory?.[npcId]) {
    return null;
  }

  const npcMemory = mystery.npcMemory[npcId];
  const relationship = npcMemory.relationships[hunterId];

  if (!relationship) {
    return null;
  }

  // Check secrets for reveal conditions
  for (const secret of npcMemory.secrets) {
    // Already revealed
    if (secret.revealedAt) {
      continue;
    }

    // Check trust threshold
    if (secret.trustThreshold && relationship.trust < secret.trustThreshold) {
      continue;
    }

    // Check context relevance (simple keyword matching)
    if (secret.revealTrigger) {
      const contextText = JSON.stringify(context).toLowerCase();
      const trigger = secret.revealTrigger.toLowerCase();
      if (!contextText.includes(trigger)) {
        continue;
      }
    }

    // Random factor based on personality (if defined)
    const revealChance = secret.revealChance || 0.7;
    if (Math.random() > revealChance) {
      continue;
    }

    // Reveal this secret
    return secret;
  }

  return null;
}

/**
 * Mark secret as revealed
 * @param {string} npcId - NPC ID
 * @param {string} secretId - Secret ID
 */
export function revealSecret(npcId, secretId) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery?.npcMemory?.[npcId]) {
    return;
  }

  const npcMemory = mystery.npcMemory[npcId];
  const secret = npcMemory.secrets.find(s => s.id === secretId);

  if (secret) {
    secret.revealedAt = Date.now();

    // Update mystery
    const { updateMystery } = require('../../state/store.js');
    updateMystery(currentMysteryId, { npcMemory: mystery.npcMemory });

    console.log(`[NPC Memory] Secret revealed: ${secret.secret}`);
  }
}

/**
 * Add knowledge to NPC (what NPC knows about the world/mystery)
 * @param {string} npcId - NPC ID
 * @param {string} knowledge - Knowledge item
 * @param {string} source - Source of knowledge
 */
export function addNPCKnowledge(npcId, knowledge, source = 'unknown') {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return;
  }

  // Initialize NPC memory if needed
  if (!mystery.npcMemory) {
    mystery.npcMemory = {};
  }

  if (!mystery.npcMemory[npcId]) {
    mystery.npcMemory[npcId] = {
      npcId,
      relationships: {},
      worldKnowledge: [],
      secrets: []
    };
  }

  const npcMemory = mystery.npcMemory[npcId];

  // Add knowledge with metadata
  npcMemory.worldKnowledge.push({
    knowledge,
    source,
    timestamp: Date.now()
  });

  // Update mystery
  updateMystery(currentMysteryId, { npcMemory: mystery.npcMemory });

  console.log(`[NPC Memory] Added knowledge to ${npcId}: ${knowledge}`);
}

/**
 * Add secret to NPC
 * @param {string} npcId - NPC ID
 * @param {Object} secret - Secret object
 */
export function addNPCSecret(npcId, secret) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return;
  }

  // Initialize NPC memory if needed
  if (!mystery.npcMemory) {
    mystery.npcMemory = {};
  }

  if (!mystery.npcMemory[npcId]) {
    mystery.npcMemory[npcId] = {
      npcId,
      relationships: {},
      worldKnowledge: [],
      secrets: []
    };
  }

  const npcMemory = mystery.npcMemory[npcId];

  const secretEntry = {
    id: `secret-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    secret: secret.secret,
    trustThreshold: secret.trustThreshold || 0.5,
    revealTrigger: secret.revealTrigger || null,
    revealChance: secret.revealChance || 0.7,
    revealedAt: null
  };

  npcMemory.secrets.push(secretEntry);

  // Update mystery
  updateMystery(currentMysteryId, { npcMemory: mystery.npcMemory });

  console.log(`[NPC Memory] Added secret to ${npcId}`);
}

/**
 * Get all NPCs with memory
 * @param {string} mysteryId - Mystery ID
 * @returns {Array} NPCs with memory
 */
export function getNPCsWithMemory(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.npcMemory) {
    return [];
  }

  return Object.keys(mystery.npcMemory).map(npcId => ({
    npcId,
    ...mystery.npcMemory[npcId]
  }));
}

/**
 * Initialize NPC memory from bystander data
 * @param {string} npcId - NPC ID
 * @param {Object} bystanderData - Bystander data from mystery
 */
export function initializeNPCMemory(npcId, bystanderData) {
  const { campaign, currentMysteryId } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === currentMysteryId);

  if (!mystery) {
    return;
  }

  // Initialize NPC memory structure
  if (!mystery.npcMemory) {
    mystery.npcMemory = {};
  }

  if (!mystery.npcMemory[npcId]) {
    mystery.npcMemory[npcId] = {
      npcId,
      relationships: {},
      worldKnowledge: [],
      secrets: []
    };
  }

  // Extract secrets from bystander description if any
  // This is a simple heuristic - can be enhanced
  if (bystanderData.description) {
    const secretKeywords = ['tajemství', 'skrývá', 'neví nikdo', 'secret', 'hiding'];
    const hasSecret = secretKeywords.some(kw =>
      bystanderData.description.toLowerCase().includes(kw)
    );

    if (hasSecret && mystery.npcMemory[npcId].secrets.length === 0) {
      // Add placeholder secret to be defined
      addNPCSecret(npcId, {
        secret: bystanderData.description,
        trustThreshold: 0.6
      });
    }
  }

  console.log(`[NPC Memory] Initialized memory for ${npcId}`);
}

/**
 * Get summary of all known NPCs for a mystery
 * @param {string} mysteryId - Mystery ID
 * @returns {Array<Object>} List of NPC summaries
 */
export function getKnownNPCsSummary(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries?.find(m => m.id === mysteryId);

  if (!mystery?.bystanders) return [];

  return mystery.bystanders.map(npc => ({
    id: npc.id,
    name: npc.name,
    type: npc.type || 'bystander',
    description: npc.description?.substring(0, 80) || 'No description'
  }));
}
