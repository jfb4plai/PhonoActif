import { normaliserMot, segmenterMot } from './lexique.js';
import { liaisonsDe } from './liaisons.js';

/* Rapport sur une liste de mots reçue (programme, manuel, liste d'école...).
   lignes : { mot, niveau?, source? }[] ; liaisonsConnues : Set<string> facultatif.
   total = lignes non vides ; trouves = lignes dont le mot est dans le lexique ;
   liaisonsRequises = nombre de MOTS DISTINCTS qui contiennent chaque liaison. */
export function analyserListe(lignes, lexique, liaisonsConnues) {
  const valides = (lignes || []).filter(l => l && typeof l.mot === 'string' && normaliserMot(l.mot) !== '');
  const compte = new Map();
  let trouves = 0;
  for (const l of valides) {
    const m = normaliserMot(l.mot);
    compte.set(m, (compte.get(m) || 0) + 1);
    if (lexique.chercher(m)) trouves++;
  }
  const doublons = [...compte].filter(([, n]) => n > 1).map(([m]) => m);
  const absents = [], aVerifier = [], parMot = [], liaisonsRequises = {};
  for (const m of compte.keys()) {
    const trouve = lexique.chercher(m) !== null;
    const seg = segmenterMot(m, lexique);
    // les liaisons d'un mot absent viennent de l'heuristique : non fiables, donc non comptées
    const liaisons = trouve ? liaisonsDe(seg.cubes) : [];
    const inconnues = liaisonsConnues ? [...new Set(liaisons.filter(x => !liaisonsConnues.has(x)))] : [];
    if (!trouve) absents.push(m);
    if (!trouve || seg.aVerifier) aVerifier.push(m);
    new Set(liaisons).forEach(x => { liaisonsRequises[x] = (liaisonsRequises[x] || 0) + 1; });
    parMot.push({ mot: m, trouve, liaisons, inconnues });
  }
  return { total: valides.length, trouves, absents, doublons, aVerifier, parMot, liaisonsRequises };
}
