import { composants } from './sons.js';

// Ids de sons à jouer pour des cubes (sons composés décomposés, lettres muettes et sons inconnus ignorés), sans doublon.
export function sonsRequis(cubes) {
  const res = [];
  for (const c of cubes) for (const s of composants(c.son)) if (!res.includes(s)) res.push(s);
  return res;
}

// Ids sans enregistrement, triés. Le moteur signale, il ne fabrique jamais un son.
export function sonsManquants(sons, disponibles) {
  return [...new Set(sons)].filter(s => !disponibles.has(s)).sort();
}
