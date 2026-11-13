import { lireRegles, normaliserChaine } from './regles.js';
import { segmenterMot } from './lexique.js';
import { composants } from './sons.js';

const sonsPlats = cubes => cubes.flatMap(c => (c.son === null ? ['?'] : composants(c.son))).join(' ');

/* Mode lettre par lettre : les états d'un mot cible, un par lettre posée.
   RÈGLE (JF, 2026-11-12) : tous les états intermédiaires suivent la lecture par RÈGLES, même quand la partie posée est
   elle-même un mot (« mais » dans « maison », « pom » dans « pomme »). Le lexique (ManuLemme, corrections de JF) n'intervient
   qu'à l'état final, quand toutes les lettres du mot cible sont posées.
   Renvoie [{ lettres, cubes, source, aVerifier, ecartAvecRegles }] ; source = 'regles' | 'lexique' | 'correction' | ...
   ecartAvecRegles : à l'état final, la lecture du lexique diffère de celle des règles (trop, peur, femme...) : l'élève entendra un changement. */
export function etatsDuMot(mot, lexique, options = {}) {
  const lettres = normaliserChaine(mot);
  const etats = [...lettres].map((_, k) => {
    const posees = lettres.slice(0, k + 1);
    return { lettres: posees, cubes: lireRegles(posees), source: 'regles', aVerifier: false, ecartAvecRegles: false };
  });
  if (!etats.length) return etats;
  const dernier = etats[etats.length - 1];
  const finale = segmenterMot(mot, lexique, options);
  const memeMot = finale.cubes.map(c => c.g).join('') === lettres;
  if (finale.source !== 'auto' && memeMot) {
    dernier.ecartAvecRegles = sonsPlats(finale.cubes) !== sonsPlats(dernier.cubes);
    dernier.cubes = finale.cubes;
    dernier.source = finale.source;
    dernier.aVerifier = finale.aVerifier;
  } else {
    dernier.aVerifier = true; // mot absent du lexique : lecture par règles, à faire valider
  }
  return etats;
}
