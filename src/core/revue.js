import { sonDepuisCodes } from './codes.js';
import { cubesDepuisEntree, normaliserMot, segmenterMot, estMultiMot } from './lexique.js';
import { liaisonsDe } from './liaisons.js';
import { corrigeValide } from './corrections.js';

/* Aide à la revue : ce que JF doit voir, dans quel ordre, avec une proposition à accepter ou corriger.
   Le moteur propose, il ne déclare jamais un son correct : l'oreille de JF tranche. */

// Code inconnu décomposé phonème par phonème (Ej -> e_ouvert+yod) ; null si un phonème n'a pas de son.
export function decomposerCodes(codes) {
  const texte = String(codes);
  if (sonDepuisCodes(texte) !== null) return null;
  const chars = [...texte];
  if (chars.length < 2) return null;
  const sons = chars.map(c => sonDepuisCodes(c));
  if (sons.some(s => s === null || s === '')) return null;
  return sons.join('+');
}

// Comme cubesDepuisEntree, avec une proposition (toujours « à vérifier ») pour les codes décomposables.
export function proposerCubes(entree) {
  return cubesDepuisEntree(entree).map((cube, i) => {
    if (cube.son !== null) return cube;
    const prop = decomposerCodes(entree.codes[i]);
    return prop === null ? cube : { g: cube.g, son: prop, aVerifier: true };
  });
}

/* ItemRevue = { mot, raisons, cubes, freqP1, statut: 'a_valider'|null }
   options = { motsSupplementaires?: string[], limite?: number } */
export function fileDeRevue(lexique, corrections, options = {}) {
  const items = new Map();
  const corr = mot => (corrections ? corrections.chercher(mot) : null);

  for (const e of lexique.entrees) {
    const cle = normaliserMot(e.ortho);
    if (items.has(cle)) continue;
    const entree = lexique.chercher(cle);
    const c = corr(cle);
    if (corrigeValide(c)) continue;
    const raisons = [];
    const inconnus = [...new Set(entree.codes.filter(x => sonDepuisCodes(x) === null))];
    if (inconnus.length) raisons.push(`code inconnu : ${inconnus.join(', ')}`);
    const multi = estMultiMot(cle);
    if (multi) raisons.push('entrée à plusieurs mots : à valider');
    if (raisons.length === 0 && !c) continue;
    const cubes = c ? c.cubes : multi ? segmenterMot(cle, lexique).cubes : proposerCubes(entree);
    items.set(cle, { mot: cle, raisons, cubes, freqP1: entree.freq.P1, statut: c ? 'a_valider' : null });
  }

  for (const brut of options.motsSupplementaires || []) {
    const m = normaliserMot(brut);
    if (m === '' || items.has(m)) continue;
    const c = corr(m);
    if (corrigeValide(c)) continue;
    const entree = lexique.chercher(m);
    const raisons = [];
    if (!entree) raisons.push('absent du lexique');
    if (estMultiMot(m)) raisons.push('entrée à plusieurs mots : à valider');
    if (raisons.length === 0 && !c) continue;
    items.set(m, { mot: m, raisons, cubes: c ? c.cubes : segmenterMot(m, lexique).cubes, freqP1: entree ? entree.freq.P1 : 0, statut: c ? 'a_valider' : null });
  }

  // une correction « à valider » ne se perd jamais, même hors lexique et hors liste fournie
  for (const c of corrections ? corrections.liste : []) {
    if (c.statut !== 'a_valider' || items.has(c.mot)) continue;
    const entree = lexique.chercher(c.mot);
    items.set(c.mot, { mot: c.mot, raisons: ['correction à valider'], cubes: c.cubes, freqP1: entree ? entree.freq.P1 : 0, statut: 'a_valider' });
  }

  const liste = [...items.values()].sort((a, b) => b.freqP1 - a.freqP1 || (a.mot < b.mot ? -1 : a.mot > b.mot ? 1 : 0));
  return options.limite !== undefined ? liste.slice(0, options.limite) : liste;
}

// Mots validés dont le résultat actuel du lexique a changé depuis la validation (lexique régénéré).
// On compare à la proposition du lexique : valider une proposition ne crée donc pas de dérive.
export function deriveDuLexique(corrections, lexique) {
  const derives = [];
  for (const c of corrections.liste) {
    if (c.statut !== 'valide') continue;
    const entree = lexique.chercher(c.mot);
    if (!entree || normaliserMot(entree.graphemes.join('')) !== c.mot) continue;
    const lex = liaisonsDe(proposerCubes(entree)), cor = liaisonsDe(c.cubes);
    if (lex.join('|') !== cor.join('|')) derives.push({ mot: c.mot, correction: cor, lexique: lex });
  }
  return derives;
}
