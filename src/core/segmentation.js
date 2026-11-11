import { SON_PAR_DEFAUT, GRAPHEMES_TRIES } from './sons.js';

const LETTRES_VOYELLES = 'aàâeéèêëiîïoôuûùüyœ';
const NASALES = ['an', 'am', 'en', 'em', 'on', 'om', 'in', 'im', 'un', 'um', 'ain', 'ein'];

const estVoyelleLettre = c => c !== undefined && LETTRES_VOYELLES.includes(c);

// Découpe automatique : heuristique, à faire relire par l'enseignant
export function segmenterAuto(mot) {
  mot = mot.toLowerCase();
  const out = [];
  let i = 0;
  while (i < mot.length) {
    let g = GRAPHEMES_TRIES.find(t => mot.startsWith(t, i)) || mot[i];
    // digramme nasal seulement s'il n'est pas suivi d'une voyelle ou de n/m (« ani » ≠ « an-i »)
    if (NASALES.includes(g)) {
      const suiv = mot[i + g.length];
      if (estVoyelleLettre(suiv) || suiv === 'n' || suiv === 'm') g = mot[i];
    }
    out.push({ g, i });
    i += g.length;
  }
  return out.map((t, k) => {
    let son = SON_PAR_DEFAUT[t.g] !== undefined ? SON_PAR_DEFAUT[t.g] : '';
    const suiv = mot[t.i + t.g.length], prec = mot[t.i - 1];
    const dernier = k === out.length - 1;
    if (t.g === 'c' && suiv && 'eiyéèê'.includes(suiv)) son = 's';
    if (t.g === 'g' && suiv && 'eiyéèê'.includes(suiv)) son = 'j';
    if (t.g === 's' && estVoyelleLettre(prec) && estVoyelleLettre(suiv)) son = 'z';
    if (t.g === 'e' && dernier && out.length > 1) son = '';
    if (dernier && 'stdxp'.includes(t.g) && out.length > 2 && estVoyelleLettre(prec)) son = '';
    return { g: t.g, son };
  });
}

// "ch-a-t" ou "r-o-s=z-e=" (g=son ; son vide = muet). Renvoie null si incohérent avec le mot.
export function segmenterExplicite(mot, spec) {
  const jetons = String(spec).toLowerCase().split('-').map(s => s.trim()).filter(Boolean);
  const res = jetons.map(j => {
    const [g, son] = j.split('=');
    return { g, son: son !== undefined ? son : (SON_PAR_DEFAUT[g] !== undefined ? SON_PAR_DEFAUT[g] : '') };
  });
  return res.map(r => r.g).join('') === mot.toLowerCase() ? res : null;
}

export function segmenter(ligne) {
  const mot = String(ligne.Mot || '').trim();
  if (ligne.Graphemes) {
    const ex = segmenterExplicite(mot, ligne.Graphemes);
    if (ex) return { cubes: ex, auto: false };
    return { cubes: segmenterAuto(mot), auto: true, erreur: `Graphemes « ${ligne.Graphemes} » ne correspond pas à « ${mot} »` };
  }
  return { cubes: segmenterAuto(mot), auto: true };
}
