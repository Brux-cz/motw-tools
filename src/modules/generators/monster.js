/**
 * Monster Generator
 */

import threatsData from '../../data/threats.json';
import namesData from '../../data/names.json';

/**
 * Generate random monster
 */
export function generateMonster() {
  const type = randomElement(threatsData.monsterTypes);
  const name = generateMonsterName();

  return {
    id: generateId(),
    name,
    type: type.type,
    type_cz: type.type_cz,
    motivation: type.motivation,
    description: generateMonsterDescription(type),
    powers: generatePowers(type),
    attack: generateAttack(),
    harm: randomInt(8, 12),
    currentHarm: 0,
    armor: randomInt(0, 3),
    weakness: generateWeakness(type),
    moves: type.moves,
    image: null,
    notes: []
  };
}

/**
 * Generate monster name
 */
function generateMonsterName() {
  const templates = [
    () => {
      const title = randomElement(['Reverend', 'Doctor', 'Professor', 'Father', 'Mother', 'Brother', 'Sister', 'Lord', 'Lady']);
      const name = randomElement([...namesData.male, ...namesData.female]);
      const surname = randomElement(namesData.surnames);
      return `${title} ${name} ${surname}`;
    },
    () => {
      const article = randomElement(['The', '']);
      const adjective = randomElement(['Dark', 'Ancient', 'Cursed', 'Vengeful', 'Twisted', 'Shadow', 'Blood', 'Iron']);
      const noun = randomElement(['Beast', 'One', 'Hunter', 'Wraith', 'Demon', 'Spirit', 'Entity', 'Thing']);
      return article ? `${article} ${adjective} ${noun}` : `${adjective} ${noun}`;
    },
    () => {
      const name = randomElement([...namesData.male, ...namesData.female]);
      const surname = randomElement(namesData.surnames);
      return `${name} ${surname}`;
    }
  ];

  return randomElement(templates)();
}

/**
 * Generate monster description
 */
function generateMonsterDescription(type) {
  const templates = {
    'Sorcerer': 'A powerful magic user who seeks forbidden knowledge and dark power.',
    'Beast': 'A savage creature driven by primal instincts to hunt and kill.',
    'Torturer': 'A sadistic entity that feeds on pain and terror.',
    'Queen': 'A commanding presence that rules over minions and thralls.',
    'Trickster': 'A cunning being that delights in chaos and deception.',
    'Executioner': 'A methodical killer that follows dark rituals.',
    'Devourer': 'An insatiable hunger given form, consuming all in its path.',
    'Breeder': 'A spawning horror that multiplies endlessly.',
    'Collector': 'An obsessive hoarder of souls, items, or victims.',
    'Destroyer': 'Pure destructive force seeking to lay waste to everything.',
    'Parasite': 'A controlling entity that infests and dominates its hosts.',
    'Plague': 'A spreading contagion that brings disease and death.'
  };

  return templates[type.type] || 'A dangerous supernatural entity.';
}

/**
 * Generate monster powers
 */
function generatePowers(type) {
  const allPowers = [
    'Telekinesis',
    'Mind Control',
    'Shapeshifting',
    'Invisibility',
    'Super Strength',
    'Regeneration',
    'Flight',
    'Possession',
    'Pyrokinesis',
    'Necromancy',
    'Illusions',
    'Toxic Touch',
    'Dark Magic',
    'Shadow Walking',
    'Blood Magic',
    'Teleportation',
    'Weather Control',
    'Time Manipulation'
  ];

  const count = randomInt(1, 3);
  return randomSubset(allPowers, count);
}

/**
 * Generate attack
 */
function generateAttack() {
  const attackTypes = [
    { description: 'Claws', harm: 3, tags: ['hand', 'messy'] },
    { description: 'Teeth', harm: 3, tags: ['intimate', 'messy'] },
    { description: 'Magic blast', harm: 4, tags: ['close', 'magic', 'ignore-armour'] },
    { description: 'Curse', harm: 3, tags: ['close', 'magic'] },
    { description: 'Tentacles', harm: 2, tags: ['hand', 'restraining'] },
    { description: 'Poison', harm: 3, tags: ['intimate', 'slow'] },
    { description: 'Psychic assault', harm: 2, tags: ['close', 'ignore-armour'] },
    { description: 'Fire', harm: 4, tags: ['close', 'fire'] }
  ];

  const attack = randomElement(attackTypes);
  return {
    description: attack.description,
    harm: attack.harm + randomInt(0, 2),
    range: randomElement(['intimate', 'hand', 'close', 'far']),
    tags: attack.tags
  };
}

/**
 * Generate weakness
 */
function generateWeakness(type) {
  const weaknessTemplates = [
    'Destroy its source of power',
    'Complete a specific ritual',
    'Use a blessed weapon',
    'Speak its true name',
    'Destroy its tether to this world',
    'Kill it in its place of power',
    'Expose it to holy water',
    'Burn its earthly remains',
    'Break the curse that created it',
    'Sever its connection to victims'
  ];

  return randomElement(weaknessTemplates);
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
  return shuffled.slice(0, count);
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
