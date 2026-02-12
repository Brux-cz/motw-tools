/**
 * Countdown Engine — structured 3-slot countdown generator
 *
 * Each phase (Den–Noc) produces { projev, akce, kontext }.
 * Půlnoc is a single string.
 */

import {
  KATEGORIE_TITULU, STYL_TYPU,
  PROJEV, AKCE, KONTEXT,
  PULNOC_DEFAULT, PULNOC_ZVRAT
} from './countdown-pools.js';

const FAZE = ['den', 'priseri', 'zapad_slunce', 'soumrak', 'noc'];

// ─── Category / style lookup ───────────────────────────────────

export function zjistiKategorii(titul) {
  return KATEGORIE_TITULU[titul] || 'bestie';
}

export function zjistiStyl(monsterTypeName) {
  return STYL_TYPU[monsterTypeName] || 'obecny';
}

// ─── Gender helpers ────────────────────────────────────────────

function verbEnding(rod) {
  if (rod === 'f') return 'a';
  if (rod === 'n') return 'o';
  return '';
}

function possessive(rod) {
  return rod === 'f' ? 'její' : 'jeho';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function dosadPlaceholdery(text, ctx) {
  return text
    .replace(/\{v\}/g, verbEnding(ctx.rod))
    .replace(/\{l\}/g, verbEnding(ctx.lokaceRod || 'f'))
    .replace(/\{j\}/g, possessive(ctx.rod))
    .replace(/\{prisera\}/g, ctx.titul || '')
    .replace(/\{prisluhovac\}/g, ctx.minionTypeName || '')
    .replace(/\{lokace_gen\}/g, ctx.jmenoLokaceGen || '')
    .replace(/\{lokace_nom\}/g, ctx.jmenoLokaceNom || '')
    // {LOKACE_LOK} = capitalized (for sentence start), {lokace_lok} = as-is
    .replace(/\{LOKACE_LOK\}/g, capitalize(ctx.jmenoLokaceLok || ''))
    .replace(/\{lokace_lok\}/g, ctx.jmenoLokaceLok || '');
}

// ─── Main generator ────────────────────────────────────────────

export function generujStrukturovanyOdpocet({
  kategorie, typ, lokace, styl, rod,
  titul, jmenoLokaceGen, jmenoLokaceNom, jmenoLokaceLok,
  lokaceRod, minionTypeName, zvratKategorie, pickRandom
}) {
  const ctx = { rod, lokaceRod, titul, minionTypeName, jmenoLokaceGen, jmenoLokaceNom, jmenoLokaceLok };
  const odpocet = {};

  // Fallback to existing pools if the requested category/type/location is not yet implemented
  const efKategorie = PROJEV[kategorie] ? kategorie : 'bestie';

  for (const faze of FAZE) {
    const projevPool = PROJEV[efKategorie]?.[faze];
    const akcePool = AKCE[typ]?.[faze];
    const kontextPool = KONTEXT[lokace]?.[styl]?.[faze];

    odpocet[faze] = {
      projev: projevPool ? dosadPlaceholdery(pickRandom(projevPool), ctx) : '',
      akce: akcePool ? dosadPlaceholdery(pickRandom(akcePool), ctx) : '',
      kontext: kontextPool ? dosadPlaceholdery(pickRandom(kontextPool), ctx) : ''
    };
  }

  // Půlnoc
  let pulnoc = PULNOC_DEFAULT[typ] || 'Příšera dokončila svůj plán. Následky jsou nevratné.';
  pulnoc = dosadPlaceholdery(pulnoc, ctx);

  // Zvrat (volitelný)
  if (zvratKategorie && PULNOC_ZVRAT[zvratKategorie]?.length) {
    pulnoc += ' ' + dosadPlaceholdery(pickRandom(PULNOC_ZVRAT[zvratKategorie]), ctx);
  }

  odpocet.pulnoc = pulnoc;
  return odpocet;
}
