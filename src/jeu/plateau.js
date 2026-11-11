import { choisirIntrus } from '../core/index.js';

/* Plateau d'une carte : une pièce par cube du mot (lettres muettes et répétitions comprises) plus des intrus,
   mélangés. Les ids p0, p1... sont attribués avant le mélange : ils restent stables. */
export function construirePlateau(carte, { nbIntrus = 3, rng = Math.random } = {}) {
  const pieces = carte.cubes.map((c, i) => ({ id: `p${i}`, g: c.g, son: c.son, intrus: false }));
  const intrus = nbIntrus > 0 ? choisirIntrus(carte.cubes, nbIntrus, rng) : [];
  intrus.forEach((x, j) => pieces.push({ id: `p${carte.cubes.length + j}`, g: x.g, son: x.son, intrus: true }));
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}
