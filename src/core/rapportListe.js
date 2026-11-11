import { analyserListe } from './analyseListe.js';
import { estMultiMot } from './lexique.js';
import { liaisonsParNiveau } from './progression.js';
import { motsDuNiveau } from './listes.js';

const CHAMPS = ['mots', 'trouves', 'absents', 'aVerifier', 'multiMots', 'liaisonsNouvelles', 'motsIgnores'];

/* Rapport par année : combien de mots de la liste sont trouvés, absents, à vérifier, à plusieurs mots,
   combien de liaisons nouvelles apporte l'année et combien de mots sont écartés du calcul. */
export function rapportParNiveau(liste, lexique, corrections) {
  const prog = liaisonsParNiveau(liste, lexique, corrections);
  const lignes = liste.niveaux.map((niveau, i) => {
    const mots = motsDuNiveau(liste, niveau);
    const r = analyserListe(mots.map(mot => ({ mot })), lexique, undefined, corrections);
    return {
      niveau, mots: mots.length, trouves: r.trouves, absents: r.absents.length, aVerifier: r.aVerifier.length,
      multiMots: mots.filter(estMultiMot).length, liaisonsNouvelles: prog[i].nouvelles.length, motsIgnores: prog[i].motsIgnores.length
    };
  });
  const total = { niveau: 'total' };
  for (const c of CHAMPS) total[c] = lignes.reduce((s, l) => s + l[c], 0);
  return { lignes, total };
}
