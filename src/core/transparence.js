import { SON_PAR_DEFAUT } from './sons.js';

/* Lecture d'un mot : « régulière » si chaque graphème se lit comme son son habituel (SON_PAR_DEFAUT) et qu'aucune lettre n'est muette,
   donc que l'élève peut le décoder lettre par lettre (voie d'assemblage). Sinon « irrégulière » : au moins une lettre muette ou un son
   qui dépend du contexte (e de « avec », t de « petit »…), donc un mot à mémoriser (voie d'adressage).
   Calcul par règle sur les cubes {g, son}, sans IA. Critère de conception posé le 2026-11-21 d'après la remarque de Virginie ;
   aucune référence scientifique n'est citée ici (non vérifiée dans le RISS). Un « h » muet seul ne compte pas (hibou, homme). */
export function lectureDuMot(cubes) {
  const raisons = [];
  for (const c of Array.isArray(cubes) ? cubes : []) {
    if (!c || typeof c.g !== 'string') continue;
    const habituel = SON_PAR_DEFAUT[c.g];
    if (c.son === '') { if (c.g !== 'h') raisons.push(`« ${c.g} » ne se lit pas`); continue; }
    if (habituel === undefined) raisons.push(`« ${c.g} » : lecture hors table`);
    else if (habituel !== c.son) raisons.push(`« ${c.g} » ne se lit pas comme d'habitude`);
  }
  return { reguliere: raisons.length === 0, raisons };
}
