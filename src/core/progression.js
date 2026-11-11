import { segmenterMot } from './lexique.js';
import { liaisonsDe } from './liaisons.js';
import { motsDuNiveau } from './listes.js';

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
