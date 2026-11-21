import { SON_PAR_DEFAUT } from './sons.js';

/* Lecture d'un mot, en trois niveaux :
   - « reguliere » : chaque graphème se lit comme son son habituel (SON_PAR_DEFAUT) et aucune lettre n'est muette : le mot se décode lettre par lettre ;
   - « finale » : la seule irrégularité est UNE lettre muette à la fin (chat, petit, dans) : le mot se décode, sauf la dernière lettre à retenir ;
   - « irreguliere » : tout le reste (lettre muette au milieu, plusieurs irrégularités, son inhabituel : elle, avec, bien) : mot à mémoriser (voie d'adressage).
   Calcul par règle sur les cubes {g, son}, sans IA. Critère posé le 2026-11-21 d'après la remarque de Virginie, affiné le même jour (piste 1 de JF) ;
   aucune référence scientifique n'est citée ici (non vérifiée dans le RISS). Un « h » muet seul ne compte pas (hibou, homme). */
export function lectureDuMot(cubes) {
  const liste = (Array.isArray(cubes) ? cubes : []).filter(c => c && typeof c.g === 'string');
  const raisons = [];
  let muetsFinaux = 0, autres = 0;
  liste.forEach((c, i) => {
    const habituel = SON_PAR_DEFAUT[c.g];
    if (c.son === '') {
      if (c.g === 'h') return;
      raisons.push(`« ${c.g} » ne se lit pas`);
      if (i === liste.length - 1) muetsFinaux++; else autres++;
    } else if (habituel === undefined) { raisons.push(`« ${c.g} » : lecture hors table`); autres++; }
    else if (habituel !== c.son) { raisons.push(`« ${c.g} » ne se lit pas comme d'habitude`); autres++; }
  });
  const niveau = raisons.length === 0 ? 'reguliere' : (autres === 0 && muetsFinaux === 1 ? 'finale' : 'irreguliere');
  return { reguliere: niveau === 'reguliere', niveau, raisons };
}
