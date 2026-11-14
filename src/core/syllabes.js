import { VOYELLES_SONS, composants } from './sons.js';
import { SON_VERS_IPA } from './ipa.js';

const GLISSANTES = new Set(['yod', 'w']);
const OBSTRUANTES = new Set(['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'ch', 'j', 's', 'z']);
const LIQUIDES = new Set(['l', 'r']);
const OCCLUSIVES = new Set(['p', 't', 'k']);
const DENTALES = new Set(['t', 'd']); // tr, dr tiennent devant une glissante (en-droit, dé-truire), pas kr, pl, fr (in-croy-able, em-ploi)

// Plus longue attaque légale en fin d'un bloc de consonnes (sons) :
//  - s + occlusive (+ liquide) quand le s suit une autre consonne (ex-cuse, obs-cur, lors-que) ; après une voyelle le s ferme la syllabe (res-ter, es-pè-re) ;
//  - obstruante + liquide (pr, bl), sauf devant une glissante, sauf pour t et d (in-croy-able, em-ploi, mais en-droit, dé-truire) ;
//  - sinon une consonne. Règles recoupées avec la syllabation phonologique de Lexique 4.1 (voir docs/rapport-lexique-org.md).
function longueurAttaque(sons, a, fin, glissanteApres) {
  const n = fin - a;
  if (n >= 4 && sons[fin - 3] === 's' && OCCLUSIVES.has(sons[fin - 2]) && LIQUIDES.has(sons[fin - 1])) return 3;
  if (n >= 3 && sons[fin - 2] === 's' && OCCLUSIVES.has(sons[fin - 1])) return 2;
  if (n >= 2 && (!glissanteApres || DENTALES.has(sons[fin - 2])) && OBSTRUANTES.has(sons[fin - 2]) && LIQUIDES.has(sons[fin - 1])) return 2;
  return n >= 1 ? 1 : 0;
}

export function syllabesDeSons(entree) {
  const sons = entree.flatMap(s => composants(s)).flatMap(s => (s === 'ks' ? ['k', 's'] : [s])); // x = k + s : « ex-cuse », « tak-si »
  const noyaux = sons.flatMap((s, i) => (VOYELLES_SONS.has(s) ? [i] : []));
  if (noyaux.length <= 1) return sons.length ? [sons] : [];
  const coupes = [0];
  for (let k = 0; k < noyaux.length - 1; k++) {
    const a = noyaux[k] + 1, b = noyaux[k + 1];
    let fin = b;
    while (fin > a && GLISSANTES.has(sons[fin - 1])) fin--;
    coupes.push(fin - longueurAttaque(sons, a, fin, fin < b));
  }
  coupes.push(sons.length);
  return coupes.slice(0, -1).map((c, i) => sons.slice(c, coupes[i + 1])).filter(x => x.length);
}

// Pour l'affichage : combien de cubes (graphèmes) couvre chaque syllabe. Un cube muet suit la syllabe du cube précédent
// (le premier, la première syllabe) ; un cube dont les sons chevauchent une coupure (x = k+s) va avec la syllabe où il commence.
// Rend un tableau dont la somme vaut cubes.length, ou null si les sons ne se découpent pas.
export function cubesParSyllabe(cubes) {
  const proprio = [];
  const sons = [];
  cubes.forEach((c, i) => composants(c.son).flatMap(s => (s === 'ks' ? ['k', 's'] : [s])).forEach(s => { sons.push(s); proprio.push(i); }));
  const syl = syllabesDeSons(sons);
  if (!syl.length) return null;
  const parCube = new Array(cubes.length).fill(null);
  let k = 0;
  syl.forEach((s, si) => { for (let j = 0; j < s.length; j++, k++) if (parCube[proprio[k]] === null) parCube[proprio[k]] = si; });
  let dernier = 0;
  const attribue = parCube.map(v => (v === null ? dernier : (dernier = v)));
  return syl.map((_, si) => attribue.filter(v => v === si).length);
}

// Même découpage, en IPA : une chaîne par syllabe, prête pour la bibliothèque audio.
export const syllabesIPA = sons => syllabesDeSons(sons).map(syl => syl.map(s => SON_VERS_IPA[s]).join(''));
