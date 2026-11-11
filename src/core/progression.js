import { segmenterMot } from './lexique.js';
import { liaisonsDe } from './liaisons.js';
import { motsDuNiveau, motsJusquAuNiveau } from './listes.js';
import { filtrerMots } from './liaisons.js';

/* Liaisons graphème=son connues à chaque année, tirées d'une liste (jamais écrites dans le code).
   NiveauProgression = { niveau, nouvelles: string[], cumulees: Set<string>, motsRetenus, motsIgnores: [{ mot, raison }] }
   Un mot à vérifier (absent, code inconnu, multi-mots non validé) ne contribue pas : il est listé dans motsIgnores. */
export function liaisonsParNiveau(liste, lexique, corrections) {
  const cumul = new Set();
  const resultat = [];
  for (const niveau of liste.niveaux) {
    const nouvelles = new Set(), motsIgnores = [];
    let motsRetenus = 0;
    for (const mot of motsDuNiveau(liste, niveau)) {
      const seg = segmenterMot(mot, lexique, { corrections });
      if (seg.aVerifier) { motsIgnores.push({ mot, raison: seg.raisons[0] || 'à vérifier' }); continue; }
      motsRetenus++;
      for (const l of liaisonsDe(seg.cubes)) if (!cumul.has(l)) nouvelles.add(l);
    }
    nouvelles.forEach(l => cumul.add(l));
    resultat.push({ niveau, nouvelles: [...nouvelles].sort(), cumulees: new Set(cumul), motsRetenus, motsIgnores });
  }
  return resultat;
}

export function liaisonsConnuesJusqua(progression, niveau) {
  const n = progression.find(x => x.niveau === niveau);
  return n ? new Set(n.cumulees) : new Set();
}

/* Mots d'une année proposés sans IA : ceux de la liste à ce niveau dont toutes les liaisons étaient connues
   à la fin du niveau précédent (à la tolérance près). options = { corrections, tolerance = 0, nbSyllabesMax, classes, jusquAuNiveau } */
export function proposerPourNiveau(lexique, liste, niveau, options = {}) {
  const i = liste.niveaux.indexOf(niveau);
  if (i === -1) return [];
  const { corrections, tolerance = 0, nbSyllabesMax, classes, jusquAuNiveau = false } = options;
  const prog = liaisonsParNiveau(liste, lexique, corrections);
  const liaisonsConnues = i === 0 ? new Set() : prog[i - 1].cumulees;
  const motsPermis = new Set(jusquAuNiveau ? motsJusquAuNiveau(liste, niveau) : motsDuNiveau(liste, niveau));
  const anneeDe = new Map(liste.entrees.map(e => [e.mot, e.niveau]));
  return filtrerMots(lexique, { liaisonsConnues, tolerance, nbSyllabesMax, classes, corrections, motsPermis })
    .map(r => ({ ...r, raisons: [`année suggérée : ${anneeDe.get(r.mot)}`, ...r.raisons] }));
}
