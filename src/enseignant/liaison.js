import { SON_VERS_IPA } from '../core/ipa.js';

/* Libellé lisible d'une liaison « lettres=son » (format interne, ex. « ch=ch », « t= »).
   « ch=ch » -> « ch → [ʃ] » ; « t= » (son vide dans les fiches) -> « t → muet ». Un son inconnu du tableau IPA est affiché tel quel. */
export function libelleLiaison(liaison) {
  const texte = String(liaison);
  const i = texte.indexOf('=');
  if (i < 0) return texte;
  const lettres = texte.slice(0, i), son = texte.slice(i + 1);
  if (son === '') return `${lettres} → muet`;
  return `${lettres} → [${Object.hasOwn(SON_VERS_IPA, son) ? SON_VERS_IPA[son] : son}]`;
}

/* Synthèse d'une classe : les liaisons les plus ratées au premier coup, et pour chaque élève un état par liaison.
   Seuils PROVISOIRES (choix de Claude, non validés par un spécialiste) : « difficile » à partir de 50 % de ratés au premier coup,
   « fragile » entre 1 % et 49 %, « acquis » à 0 %, « aucun » sans essai. Entrée : les lignes de resultats() (api.js). */
export const SEUIL_DIFFICILE = 0.5;
export const SYMBOLES = { difficile: '✗', fragile: '~', acquis: '✓', aucun: '–' };
export const NOMS_ETATS = { difficile: 'difficile', fragile: 'fragile', acquis: 'acquis', aucun: 'pas encore d’essai' };

export function etatLiaison(l) {
  if (!l || l.essais === 0) return 'aucun';
  const taux = (l.essais - l.justesDuPremierCoup) / l.essais;
  return taux >= SEUIL_DIFFICILE ? 'difficile' : taux > 0 ? 'fragile' : 'acquis';
}

export function syntheseClasse(lignes, max = 6) {
  const parLiaison = new Map();
  for (const e of lignes) for (const l of e.liaisons || []) {
    const t = parLiaison.get(l.liaison) || { liaison: l.liaison, essais: 0, rates: 0, nbDifficile: 0, nbConcernes: 0 };
    t.essais += l.essais; t.rates += l.essais - l.justesDuPremierCoup;
    const etat = etatLiaison(l);
    if (etat === 'difficile') t.nbDifficile += 1;
    if (etat === 'difficile' || etat === 'fragile') t.nbConcernes += 1;
    parLiaison.set(l.liaison, t);
  }
  const liaisons = [...parLiaison.values()].filter(t => t.rates > 0)
    .map(t => ({ ...t, taux: t.essais === 0 ? 0 : t.rates / t.essais }))
    .sort((a, b) => b.nbDifficile - a.nbDifficile || b.nbConcernes - a.nbConcernes || b.taux - a.taux || (a.liaison < b.liaison ? -1 : 1))
    .slice(0, max);
  const grille = lignes.map(e => ({ id: e.id, code: e.code, essais: e.essais,
    cellules: liaisons.map(t => etatLiaison((e.liaisons || []).find(l => l.liaison === t.liaison))) }));
  return { liaisons, grille };
}
