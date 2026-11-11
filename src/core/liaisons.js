import { cubesDepuisEntree, normaliserMot, segmenterMot, estMultiMot } from './lexique.js';
import { corrigeValide } from './corrections.js';

// Une liaison = « graphème=son » (son vide pour une lettre muette : « t= »). Comparaison stricte de chaînes.
export const liaisonsDe = cubes => cubes.map(c => `${c.g}=${c.son === null ? '?' : c.son}`);

// Liaisons connues d'après des mots connus ; les mots absents du lexique sont rendus à part.
export function liaisonsDeMots(mots, lexique) {
  const liaisons = new Set();
  const absents = [];
  for (const mot of mots) {
    if (!lexique.chercher(mot)) { absents.push(mot); continue; }
    liaisonsDe(segmenterMot(mot, lexique).cubes).forEach(l => liaisons.add(l));
  }
  return { liaisons, absents };
}

/* Choix de mots sans IA. Criteres = { liaisonsConnues: Set, tolerance = 0, classes, nbSyllabesMax, freqMinP1, exclure: Set, contient: string[], corrections?: Corrections }
   Chaque mot proposé dit pourquoi (raisons) et quelles liaisons restent inconnues. */
export function filtrerMots(lexique, criteres) {
  const { liaisonsConnues, tolerance = 0, classes, nbSyllabesMax, freqMinP1, exclure, contient = [], corrections } = criteres;
  const vus = new Set();
  const res = [];
  for (const e of lexique.entrees) {
    const cle = normaliserMot(e.ortho);
    if (vus.has(cle)) continue;
    vus.add(cle);
    const entree = lexique.chercher(cle);
    // Une correction valide ou corrigée l'emporte ; une correction à valider exclut le mot ;
    // sans correction, un mot à plusieurs mots ou à son inconnu reste exclu.
    const corr = corrections ? corrections.chercher(cle) : null;
    let cubes;
    if (corrigeValide(corr)) cubes = corr.cubes;
    else {
      if (corr || estMultiMot(cle)) continue;
      if (normaliserMot(entree.graphemes.join('')) !== cle) continue;
      cubes = cubesDepuisEntree(entree);
      if (cubes.some(c => c.son === null)) continue;
    }
    if (exclure && exclure.has(cle)) continue;
    if (classes && !classes.includes(entree.classe)) continue;
    if (nbSyllabesMax !== undefined && entree.nbSyllabes > nbSyllabesMax) continue;
    if (freqMinP1 !== undefined && entree.freq.P1 < freqMinP1) continue;
    const liaisons = liaisonsDe(cubes);
    if (!contient.every(l => liaisons.includes(l))) continue;
    const inconnues = [...new Set(liaisons.filter(l => !liaisonsConnues.has(l)))];
    if (inconnues.length > tolerance) continue;
    const raisons = [
      ...contient.map(l => `contient ${l}`),
      `${entree.nbSyllabes} syllabe${entree.nbSyllabes > 1 ? 's' : ''}`,
      `fréquence P1 : ${Math.round(entree.freq.P1)}`,
      inconnues.length === 0 ? 'toutes les liaisons connues' : `liaisons à découvrir : ${inconnues.join(', ')}`
    ];
    res.push({ mot: cle, entree, liaisons, inconnues, raisons });
  }
  return res.sort((a, b) => b.entree.freq.P1 - a.entree.freq.P1 || a.mot.localeCompare(b.mot));
}
