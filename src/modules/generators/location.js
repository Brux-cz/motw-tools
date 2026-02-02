/**
 * Location Generator
 */

import threatsData from '../../data/threats.json';

/**
 * Generate random location
 */
export function generateLocation() {
  const type = randomElement(threatsData.locationTypes);
  const name = generateLocationName(type);

  return {
    id: generateId(),
    name,
    type: type.type,
    type_cz: type.type_cz,
    motivation: type.motivation,
    description: generateLocationDescription(type),
    npcs: [],
    tags: generateLocationTags(type),
    appearsIn: [],
    map: null,
    notes: []
  };
}

/**
 * Generate location name
 */
function generateLocationName(type) {
  const nameTemplates = {
    'Crossroads': [
      'Main Street Diner',
      'Town Square',
      'The Junction Bar',
      'Central Station',
      'Community Center'
    ],
    'Deathtrap': [
      'Abandoned Factory',
      'Old Mill',
      'Condemned Building',
      'Collapsed Mine',
      'Broken Bridge'
    ],
    'Den': [
      'Hidden Cave',
      'Underground Lair',
      'Secret Basement',
      'Forest Clearing',
      'Abandoned Warehouse'
    ],
    'Fortress': [
      'Gated Mansion',
      'Fortified Compound',
      'Secure Facility',
      'Castle Ruins',
      'Bunker Complex'
    ],
    'Hellgate': [
      'St. Michael\'s Church',
      'Old Cemetery',
      'Ancient Well',
      'Cursed Crossroads',
      'Ritual Site'
    ],
    'Hub': [
      'Town Hall',
      'Bus Station',
      'Shopping Mall',
      'University Campus',
      'Hospital'
    ],
    'Lab': [
      'Research Facility',
      'Medical Lab',
      'University Lab',
      'Secret Workshop',
      'Tech Startup'
    ],
    'Maze': [
      'Old Mansion',
      'Catacombs',
      'Forest Trails',
      'Sewer System',
      'Hedge Maze'
    ],
    'Prison': [
      'County Jail',
      'Abandoned Asylum',
      'Detention Center',
      'Locked Ward',
      'Holding Facility'
    ],
    'Wilds': [
      'Pine Woods',
      'Mountain Trail',
      'Swampland',
      'Desert Outskirts',
      'National Park'
    ]
  };

  const names = nameTemplates[type.type] || ['Unknown Location'];
  return randomElement(names);
}

/**
 * Generate location description
 */
function generateLocationDescription(type) {
  const descriptions = {
    'Crossroads': 'A popular gathering place where people meet and information flows freely.',
    'Deathtrap': 'A dangerous structure that poses significant physical threats to anyone who enters.',
    'Den': 'A hidden refuge where dark forces gather and evil plots are hatched.',
    'Fortress': 'A heavily defended location that is difficult to access or breach.',
    'Hellgate': 'A portal or nexus point where supernatural forces can cross into our world.',
    'Hub': 'A central location that connects many people and serves as a community focal point.',
    'Lab': 'A place of experimentation and discovery, often with dangerous or unethical research.',
    'Maze': 'A confusing, labyrinthine space designed to disorient and separate intruders.',
    'Prison': 'A place of confinement that traps and isolates those within.',
    'Wilds': 'An untamed natural area far from civilization and its protections.'
  };

  return descriptions[type.type] || 'A location of significance to the mystery.';
}

/**
 * Generate location tags
 */
function generateLocationTags(type) {
  const tagPools = {
    'Crossroads': ['public', 'busy', 'neutral-ground'],
    'Deathtrap': ['dangerous', 'unstable', 'isolated'],
    'Den': ['hidden', 'defended', 'dark'],
    'Fortress': ['secure', 'defended', 'isolated'],
    'Hellgate': ['cursed', 'sacred', 'powerful'],
    'Hub': ['public', 'busy', 'connected'],
    'Lab': ['secure', 'high-tech', 'sterile'],
    'Maze': ['confusing', 'dark', 'claustrophobic'],
    'Prison': ['locked', 'secure', 'monitored'],
    'Wilds': ['isolated', 'natural', 'dangerous']
  };

  const pool = tagPools[type.type] || ['ordinary'];
  return randomSubset(pool, randomInt(1, 3));
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
