/**
 * NPC Generator
 */

import threatsData from '../../data/threats.json';
import namesData from '../../data/names.json';

/**
 * Generate random NPC
 */
export function generateNPC() {
  const type = randomElement(threatsData.bystanderTypes);
  const gender = randomElement(['male', 'female']);
  const firstName = randomElement(namesData[gender]);
  const lastName = randomElement(namesData.surnames);

  return {
    id: generateId(),
    name: `${firstName} ${lastName}`,
    type: type.type,
    type_cz: type.type_cz,
    motivation: type.motivation,
    description: generateNPCDescription(type, gender),
    status: 'alive',
    tags: generateNPCTags(type),
    appearsIn: [],
    image: null,
    notes: []
  };
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
 * Utility: Random subset from array
 */
function randomSubset(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Utility: Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Utility: Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
