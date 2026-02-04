/**
 * NPC Generator
 */

import { generateId } from '../../utils/id.js';

/**
 * Generate random NPC
 */
export async function generateNPC() {
  try {
    // Load NPC data
    const response = await fetch(import.meta.env.BASE_URL + 'data/npc-names.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate data structure
    if (!data.firstNames || !data.lastNames || !data.bystanderTypes || !data.motivations) {
      throw new Error('Invalid NPC data structure');
    }

    const gender = randomElement(['male', 'female']);
    const firstName = randomElement(data.firstNames[gender]);
    const lastName = randomElement(data.lastNames);
    const bystanderType = randomElement(data.bystanderTypes);
    const motivation = randomElement(data.motivations);

    return {
      id: generateId(),
      name: `${firstName} ${lastName}`,
      type: bystanderType.name_cz,
      typeOriginal: bystanderType.type,
      motivation: motivation,
      description: bystanderType.description,
      status: 'alive',
      tags: [],
      appearsIn: [],
      image: null,
      notes: []
    };
  } catch (error) {
    console.error('Failed to generate NPC:', error);

    // Fallback - return basic NPC
    return {
      id: generateId(),
      name: 'Neznámý NPC',
      type: 'Svědek',
      typeOriginal: 'Witness',
      motivation: 'Přežít',
      description: 'Generování selhalo - edituj ručně',
      status: 'alive',
      tags: [],
      appearsIn: [],
      image: null,
      notes: []
    };
  }
}

/**
 * Generate NPC description
 */
function generateNPCDescription(type, gender) {
  const ages = ['20s', '30s', '40s', '50s', '60s'];
  const age = randomElement(ages);

  const occupations = {
    'Busybody': ['neighbor', 'retiree', 'community organizer', 'PTA member'],
    'Detective': ['police detective', 'private investigator', 'FBI agent', 'journalist'],
    'Gossip': ['bartender', 'hairdresser', 'shop owner', 'receptionist'],
    'Helper': ['nurse', 'librarian', 'teacher', 'social worker'],
    'Innocent': ['student', 'child', 'tourist', 'new resident'],
    'Official': ['sheriff', 'mayor', 'city official', 'park ranger'],
    'Skeptic': ['scientist', 'professor', 'doctor', 'engineer'],
    'Victim': ['college student', 'hiker', 'local resident', 'traveler'],
    'Witness': ['security guard', 'delivery driver', 'dog walker', 'night shift worker']
  };

  const occupation = randomElement(occupations[type.type] || ['local resident']);
  const pronoun = gender === 'male' ? 'He' : 'She';

  const traits = [
    'nervous', 'confident', 'suspicious', 'helpful', 'scared',
    'curious', 'cautious', 'friendly', 'hostile', 'confused'
  ];
  const trait = randomElement(traits);

  return `${occupation.charAt(0).toUpperCase() + occupation.slice(1)} in ${pronoun.toLowerCase() === 'he' ? 'his' : 'her'} ${age}. ${pronoun} seems ${trait}.`;
}

/**
 * Generate NPC tags
 */
function generateNPCTags(type) {
  const tagPools = {
    'Busybody': ['nosy', 'talkative', 'knows everyone'],
    'Detective': ['observant', 'armed', 'suspicious'],
    'Gossip': ['informant', 'connected', 'chatty'],
    'Helper': ['brave', 'resourceful', 'kind'],
    'Innocent': ['vulnerable', 'trusting', 'clueless'],
    'Official': ['authoritative', 'by-the-book', 'armed'],
    'Skeptic': ['rational', 'dismissive', 'educated'],
    'Victim': ['in-danger', 'targeted', 'terrified'],
    'Witness': ['saw-something', 'unreliable', 'traumatized']
  };

  const pool = tagPools[type.type] || ['ordinary'];
  return randomSubset(pool, randomInt(1, 2));
}

/**
 * Utility: Random element from array
 */
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Fisher-Yates shuffle - uniform distribution
 */
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Utility: Random subset from array
 */
function randomSubset(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Utility: Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
