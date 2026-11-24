import { lettreInitiale, voyellesProposees } from './voyellesInitiale.js';

/* Série de l'exercice « première lettre » fixée par une graine : mêmes mots, même ordre, mêmes trois lettres proposées, quel que soit l'appareil.
   Sert à deux endroits qui doivent montrer exactement la même chose : l'écran du TBI et la feuille à imprimer (JF 2026-11-24 : les autres élèves répondent sur papier).
   Sans graine, l'exercice tire au sort à chaque départ (voir Initiale.jsx). */

// Générateur pseudo-aléatoire à graine (mulberry32) : une même graine redonne toujours la même suite.
export function prng(graine) {
  let a = Number(graine) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cartes : cartes utilisables (voyelle seule + image). Tri par identifiant d'abord : le résultat ne dépend pas de l'ordre de chargement.
// nb : nombre de cartes gardées (le début de la série) ; absent ou invalide = toutes. Les lettres d'une carte ne dépendent pas de nb.
export function serieInitiale(cartes, graine, nb) {
  const rng = prng(graine);
  const l = [...cartes].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  const serie = l.map(carte => { const cible = lettreInitiale(carte); return { carte, cible, lettres: voyellesProposees(cible, rng) || [cible] }; });
  return Number.isInteger(nb) && nb > 0 ? serie.slice(0, nb) : serie;
}
