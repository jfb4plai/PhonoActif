import CONSIGNES from './consignes.json';

/* Consignes vocales (P1 à P3, élèves qui ne lisent pas encore) : un court fichier audio par situation, partagé par toutes les listes.
   Textes dans consignes.json (à l'infinitif, une action par phrase) ; audio généré avec la voix Charline :
   python essai-tts-ipa/generer-bibliotheque.py consignes  ->  public/consignes/<id>.mp3 */
export const IDS_CONSIGNES = Object.keys(CONSIGNES);
export const VALEURS_CONSIGNES = ['voix', 'non'];

export function urlConsigne(base, id) {
  return `${String(base).replace(/\/+$/, '')}/consignes/${encodeURIComponent(id)}.mp3`;
}

// Consignes vocales actives : réglage de la tâche, sinon « oui » avec les commandes épurées (P1), « non » sinon.
export function consignesActives(tache) {
  const choix = tache && tache.consignes;
  return (VALEURS_CONSIGNES.includes(choix) ? choix : (tache && tache.commandes === 'epure' ? 'voix' : 'non')) === 'voix';
}

// Variantes d'une consigne (juste, juste_2, juste_3… ; faux, faux_2…) : une est tirée à chaque fois, jamais la même deux fois de suite.
export const variantesConsigne = base => IDS_CONSIGNES.filter(id => id === base || new RegExp(`^${base}_\\d+$`).test(id));
export function choisirVariante(base, derniere, rng = Math.random) {
  const toutes = variantesConsigne(base);
  const autres = toutes.filter(id => id !== derniere);
  const liste = autres.length > 0 ? autres : toutes;
  return liste.length > 0 ? liste[Math.min(liste.length - 1, Math.floor(rng() * liste.length))] : base;
}
