/* Un cube = un GRAPHÈME (ch, ou, on, eau...), jamais une lettre isolée quand plusieurs
   lettres notent un seul son. Chaque cube porte un SON (nom de fichier sons/<son>),
   enregistré comme monophonème (/b/, pas « bé »). Son vide '' = lettre muette.
   Repris tel quel du cœur de Lilémo (version phonémique.html). */

export const VOYELLES_SONS = new Set(['a', 'e_ferme', 'e_ouvert', 'schwa', 'i', 'o_ferme', 'o_ouvert', 'u', 'ou',
  'eu_ferme', 'eu_ouvert', 'an', 'on', 'in', 'un', 'oi', 'ui']);

// graphème -> son par défaut (hors contexte)
export const SON_PAR_DEFAUT = {
  'eau': 'o_ferme', 'au': 'o_ferme', 'ou': 'ou', 'oi': 'oi', 'on': 'on', 'om': 'on', 'an': 'an', 'am': 'an', 'en': 'an', 'em': 'an',
  'in': 'in', 'im': 'in', 'un': 'un', 'um': 'un', 'ain': 'in', 'ein': 'in', 'ai': 'e_ouvert', 'ei': 'e_ouvert',
  'eu': 'eu_ferme', 'oeu': 'eu_ouvert', 'œu': 'eu_ouvert', 'ch': 'ch', 'ph': 'f', 'gn': 'gn', 'qu': 'k', 'gu': 'g', 'ui': 'ui',
  'a': 'a', 'à': 'a', 'â': 'a', 'b': 'b', 'c': 'k', 'ç': 's', 'd': 'd', 'e': 'schwa', 'é': 'e_ferme', 'è': 'e_ouvert', 'ê': 'e_ouvert', 'ë': 'e_ouvert',
  'f': 'f', 'g': 'g', 'h': '', 'i': 'i', 'î': 'i', 'ï': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o_ouvert', 'ô': 'o_ferme',
  'p': 'p', 'q': 'k', 'r': 'r', 's': 's', 't': 't', 'u': 'u', 'û': 'u', 'ù': 'u', 'ü': 'u', 'v': 'v', 'w': 'w', 'x': 'ks', 'y': 'i', 'z': 'z',
  'ss': 's', 'tt': 't', 'pp': 'p', 'ff': 'f', 'll': 'l', 'mm': 'm', 'nn': 'n', 'rr': 'r', 'dd': 'd', 'bb': 'b', 'gg': 'g', 'cc': 'k'
};
export const GRAPHEMES_TRIES = Object.keys(SON_PAR_DEFAUT).sort((a, b) => b.length - a.length);

// Les 36 sons visés par Lilémo, plus le yod /j/ (id « j » = /ʒ/ dans le cœur d'origine).
// « schwa » = le e prononcé de « le », « se », « de » (ManuLemme : code %). La lettre muette n'a pas de son ('').
export const SONS_LILEMO = ['a', 'an', 'b', 'ch', 'd', 'e_ferme', 'e_ouvert', 'schwa', 'eu_ferme', 'eu_ouvert', 'f', 'g', 'gn',
  'i', 'in', 'j', 'k', 'ks', 'l', 'm', 'n', 'o_ferme', 'o_ouvert', 'oi', 'on', 'ou', 'p', 'r', 's', 't', 'u', 'ui', 'un',
  'v', 'w', 'z', 'yod'];

// Sons sans enregistrement propre : joués en enchaînant leurs composants.
export const SONS_COMPOSES = { ij: ['i', 'yod'] };

// Un son peut être une séquence « a+b » (par exemple e_ouvert+yod) : on la décompose, puis les sons composés aussi.
export const composants = son => son === '' || son == null ? []
  : son.split('+').flatMap(s => Object.hasOwn(SONS_COMPOSES, s) ? SONS_COMPOSES[s] : [s]);

// '' (lettre muette), un id, un son composé, ou une séquence d'ids valides.
export const sonValide = son => {
  if (typeof son !== 'string') return false;
  if (son === '') return true;
  return son.split('+').every(s => s !== '' && (SONS_LILEMO.includes(s) || Object.hasOwn(SONS_COMPOSES, s)));
};

export const classeCube = son => son === null ? 'inconnu' : son === '' ? 'muet' : (VOYELLES_SONS.has(son) ? 'voyelle' : 'consonne');
