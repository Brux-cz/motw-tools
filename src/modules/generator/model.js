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
    stopaKSlabine: '',
    vedi: [],
    stopy: [],
    tahNaMiru: '',
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

/** Normalize a countdown phase — old string → structured object */
export function normalizeCountdownPhase(phase) {
  if (!phase) return { projev: '', akce: '', kontext: '' };
  if (typeof phase === 'string') return { projev: phase, akce: '', kontext: '' };
  return { projev: phase.projev || '', akce: phase.akce || '', kontext: phase.kontext || '' };
}

/** Get display text for a countdown phase (joined non-empty slots) */
export function getCountdownPhaseText(phase) {
  if (!phase) return '';
  if (typeof phase === 'string') return phase;
  return [phase.projev, phase.akce, phase.kontext].filter(Boolean).join(' ');
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
    narativ: '',
    odpocet: createCountdown(),
    hrozby: [],
    _aiEnhanced: false,
    _original: null,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    ...overrides
  };
}
