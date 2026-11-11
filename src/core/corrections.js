import { normaliserMot } from './lexique.js';
import { sonValide } from './sons.js';

/* Dictionnaire de corrections de JF, prioritaire sur ManuLemme.
   Correction = { mot, cubes: [{ g, son }], statut, auteur, date, raison }
   statuts : a_valider (proposé, pas encore vu), valide (JF confirme le résultat tel quel), corrige (JF l'a modifié, raison obligatoire). */
export const STATUTS = ['a_valider', 'valide', 'corrige'];

export const corrigeValide = c => !!c && (c.statut === 'valide' || c.statut === 'corrige');

export function validerCorrection(c) {
  if (!c || typeof c !== 'object') return ['correction invalide'];
  const erreurs = [];
  if (typeof c.mot !== 'string' || c.mot === '') erreurs.push('mot manquant');
  else if (c.mot !== normaliserMot(c.mot)) erreurs.push('mot non normalisé');
  if (!Array.isArray(c.cubes) || c.cubes.length === 0) erreurs.push('aucun cube');
  else {
    const forme = c.cubes.every(x => x && typeof x.g === 'string' && x.g !== '' && typeof x.son === 'string');
    if (!forme) erreurs.push('cube mal formé');
    else {
      if (typeof c.mot === 'string' && c.cubes.map(x => x.g).join('') !== c.mot) erreurs.push('graphèmes ne recomposent pas le mot');
      for (const x of c.cubes) if (!sonValide(x.son)) erreurs.push(`son inconnu : ${x.son}`);
    }
  }
  if (!STATUTS.includes(c.statut)) erreurs.push('statut inconnu');
  if (typeof c.auteur !== 'string' || c.auteur.trim() === '') erreurs.push('auteur manquant');
  if (typeof c.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) erreurs.push('date invalide');
  if (c.statut === 'corrige' && (typeof c.raison !== 'string' || c.raison.trim() === '')) erreurs.push('raison manquante');
  return erreurs;
}

// Ancienne ou nouvelle correction du même mot : un valide/corrige ne cède jamais devant un a_valider ;
// sinon la plus récente gagne, et à date égale la nouvelle.
function choisir(ancienne, nouvelle) {
  if (corrigeValide(ancienne) && !corrigeValide(nouvelle)) return ancienne;
  if (!corrigeValide(ancienne) && corrigeValide(nouvelle)) return nouvelle;
  return nouvelle.date >= ancienne.date ? nouvelle : ancienne;
}

export function fusionnerCorrections(existantes, nouvelles) {
  const parMot = new Map();
  for (const c of [...existantes, ...nouvelles]) {
    parMot.set(c.mot, parMot.has(c.mot) ? choisir(parMot.get(c.mot), c) : c);
  }
  return [...parMot.values()].sort((a, b) => (a.mot < b.mot ? -1 : a.mot > b.mot ? 1 : 0));
}

// Les corrections invalides sont rendues à part (avec leurs erreurs), jamais appliquées ni ignorées en silence.
export function creerCorrections(liste) {
  const valides = [], rejets = [];
  for (const c of liste || []) {
    const erreurs = validerCorrection(c);
    if (erreurs.length) rejets.push({ mot: c && typeof c.mot === 'string' ? c.mot : '', erreurs });
    else valides.push(c);
  }
  const fusion = fusionnerCorrections([], valides);
  const parMot = new Map(fusion.map(c => [c.mot, c]));
  return {
    corrections: { taille: fusion.length, liste: fusion, chercher: mot => parMot.get(normaliserMot(mot)) || null },
    rejets
  };
}
