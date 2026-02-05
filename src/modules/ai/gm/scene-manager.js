/**
 * Scene Manager - Track scenes and turns
 */

let currentScene = {
  location: null,
  huntersPresent: [],
  npcsPresent: [],
  threats: [],
  tension: 5,
  turnOrder: [],
  currentTurn: 0,
  timestamp: null
};

/**
 * Get current scene
 * @returns {Object} Current scene state
 */
export function getCurrentScene() {
  return { ...currentScene };
}

/**
 * Update scene with new data
 * @param {Object} updates - Partial scene updates
 * @returns {Object} Updated scene
 */
export function updateScene(updates) {
  currentScene = { ...currentScene, ...updates };
  return getCurrentScene();
}

/**
 * Initialize new scene
 * @param {Object} location - Location object
 * @param {Array} hunters - Hunter IDs present
 * @param {Array} npcs - NPC IDs present
 * @returns {Object} Initialized scene
 */
export function initializeScene(location, hunters = [], npcs = []) {
  currentScene = {
    location,
    huntersPresent: hunters,
    npcsPresent: npcs,
    threats: [],
    tension: 5,
    turnOrder: [...hunters, ...npcs],
    currentTurn: 0,
    timestamp: Date.now()
  };
  return getCurrentScene();
}

/**
 * Add threat to scene
 * @param {Object} threat - Threat object
 */
export function addThreat(threat) {
  if (!currentScene.threats.find(t => t.id === threat.id)) {
    currentScene.threats.push(threat);
    currentScene.turnOrder.push(threat.id);
  }
}

/**
 * Remove threat from scene
 * @param {string} threatId - Threat ID
 */
export function removeThreat(threatId) {
  currentScene.threats = currentScene.threats.filter(t => t.id !== threatId);
  currentScene.turnOrder = currentScene.turnOrder.filter(id => id !== threatId);
}

/**
 * Increase scene tension
 * @param {number} amount - Amount to increase (default 1)
 */
export function increaseTension(amount = 1) {
  currentScene.tension = Math.min(10, currentScene.tension + amount);
}

/**
 * Decrease scene tension
 * @param {number} amount - Amount to decrease (default 1)
 */
export function decreaseTension(amount = 1) {
  currentScene.tension = Math.max(0, currentScene.tension - amount);
}

/**
 * Advance to next turn
 * @returns {string} ID of entity whose turn it is
 */
export function nextTurn() {
  currentScene.currentTurn = (currentScene.currentTurn + 1) % currentScene.turnOrder.length;
  return currentScene.turnOrder[currentScene.currentTurn];
}

/**
 * Get whose turn it is
 * @returns {string} ID of current entity
 */
export function getCurrentTurn() {
  return currentScene.turnOrder[currentScene.currentTurn];
}

/**
 * Add hunter to scene
 * @param {string} hunterId - Hunter ID
 */
export function addHunter(hunterId) {
  if (!currentScene.huntersPresent.includes(hunterId)) {
    currentScene.huntersPresent.push(hunterId);
    currentScene.turnOrder.push(hunterId);
  }
}

/**
 * Remove hunter from scene
 * @param {string} hunterId - Hunter ID
 */
export function removeHunter(hunterId) {
  currentScene.huntersPresent = currentScene.huntersPresent.filter(id => id !== hunterId);
  currentScene.turnOrder = currentScene.turnOrder.filter(id => id !== hunterId);
}

/**
 * Add NPC to scene
 * @param {string} npcId - NPC ID
 */
export function addNPC(npcId) {
  if (!currentScene.npcsPresent.includes(npcId)) {
    currentScene.npcsPresent.push(npcId);
    currentScene.turnOrder.push(npcId);
  }
}

/**
 * Remove NPC from scene
 * @param {string} npcId - NPC ID
 */
export function removeNPC(npcId) {
  currentScene.npcsPresent = currentScene.npcsPresent.filter(id => id !== npcId);
  currentScene.turnOrder = currentScene.turnOrder.filter(id => id !== npcId);
}

/**
 * Reset scene to empty state
 */
export function resetScene() {
  currentScene = {
    location: null,
    huntersPresent: [],
    npcsPresent: [],
    threats: [],
    tension: 5,
    turnOrder: [],
    currentTurn: 0,
    timestamp: null
  };
}
