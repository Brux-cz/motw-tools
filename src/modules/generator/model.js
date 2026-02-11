/**
 * Mystery Generator - Data Model
 * Unified threat entity model per UML design
 */

import { generateId } from '../../utils/id.js';

export const ThreatType = {
  PRISERA: 'PRISERA',
  PRISLUHOVAC: 'PRISLUHOVAC',
  PRIHLIZEJICI: 'PRIHLIZEJICI',
  LOKALITA: 'LOKALITA'
};

export const ThreatTypeLabels = {
  [ThreatType.PRISERA]: 'Příšera',
  [ThreatType.PRISLUHOVAC]: 'Přisluhovač',
  [ThreatType.PRIHLIZEJICI]: 'Přihlížející',
  [ThreatType.LOKALITA]: 'Lokalita'
};

/**
 * Create a new Threat (Hrozba)
 * All threat types share the same base structure, fields differ by type
 */
/**
 * Create a new Threat (Hrozba)
 * All threat types share the same base structure, fields differ by type.
 *
 * 6 attributes per MotW rules:
 * 1. typ + druh + motivace  (Type & Motivation)
 * 2. schopnosti[]           (Supernatural powers)
 * 3. utoky[] + zbroj        (Attacks & Armor) — utoky are { nazev, dmg, stitky[] }
 * 4. zivoty                 (Harm capacity, typically 8-12 for monsters)
 * 5. slabina                (Weakness — required for monsters)
 * 6. tahy[]                 (Threat moves — what it does when it acts)
 */
export function createThreat(overrides = {}) {
  return {
    id: generateId(),
    jmeno: '',
    typ: ThreatType.PRISERA,
    druh: '',
    motivace: '',
    schopnosti: [],
    utoky: [],
    zivoty: 0,
    zbroj: 0,
    slabina: '',
    tahy: [],
    mustek: '',
    ...overrides
  };
}

/**
 * Create a Countdown (Odpocet) - flat object with 6 phases
 */
export function createCountdown(overrides = {}) {
  return {
    den: '',
    priseri: '',
    zapad_slunce: '',
    soumrak: '',
    noc: '',
    pulnoc: '',
    ...overrides
  };
}

/**
 * Create a new Mystery (Zahada)
 */
export function createMystery(overrides = {}) {
  return {
    id: generateId(),
    nazev: '',
    namet: '',
    navnada: '',
    odpocet: createCountdown(),
    hrozby: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    ...overrides
  };
}
