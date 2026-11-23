// Transitions de fin de palier choisies par l'adulte (moteur pur : aucune décision automatique).
import { allerACarte, suivant } from './session.js';
import { numeroDePalier } from '../core/paliers.js';

const terminee = (etat) => etat.statut === 'juste' || etat.statut === 'revelation';

export function continuerPalier(etat, paliers) {
  if (!terminee(etat)) return etat;
  return suivant(etat);
}

// Saute le palier annoncé (le suivant) ; s'il n'y a rien après, le jeu est fini.
export function passerPalier(etat, paliers) {
  if (!terminee(etat)) return etat;
  const n = numeroDePalier(paliers, etat.index);
  const saute = paliers[n + 1];
  if (!saute) return suivant(etat);
  const paliersSautes = [...(etat.paliersSautes || []), saute.id];
  const apres = paliers[n + 2];
  if (!apres) return { ...etat, paliersSautes, statut: 'fini' };
  return { ...allerACarte(etat, apres.debut), paliersSautes };
}

export function arreterApresPalier(etat, paliers) {
  if (!terminee(etat)) return etat;
  const n = numeroDePalier(paliers, etat.index);
  return { ...etat, statut: 'fini', arret: { apres: paliers[n].id } };
}
