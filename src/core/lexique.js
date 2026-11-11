import { sonDepuisCodes } from './codes.js';

/* EntreeLexique = { ortho, phono, classe, nbSyllabes, freq: { P1, P2, P1_5 }, graphemes: string[], codes: string[] }
   graphemes[i] et codes[i] sont alignés (bien : ['b','i','en'] et ['b','j','5']). */

// Un cube par graphème. Code inconnu : son null, à faire vérifier.
export function cubesDepuisEntree(entree) {
  return entree.graphemes.map((g, i) => {
    const son = sonDepuisCodes(entree.codes[i]);
    return son === null ? { g, son: null, aVerifier: true } : { g, son };
  });
}
