import { SON_PAR_DEFAUT } from './sons.js';

// lettres en miroir : ne jamais proposer l'une comme intrus d'un mot contenant l'autre
const MIROIR = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm', u: 'n' };
const POOL_INTRUS = ['s', 'm', 'l', 'r', 't', 'f', 'v', 'z', 'j', 'ch', 'ou', 'on', 'an', 'in', 'a', 'i', 'o', 'é'];

export function choisirIntrus(cubes, nb, rng = Math.random) {
  const presents = new Set(cubes.map(c => c.g));
  const interdits = new Set(presents);
  presents.forEach(g => { if (MIROIR[g]) interdits.add(MIROIR[g]); });
  const candidats = POOL_INTRUS.filter(g => !interdits.has(g));
  const tires = [];
  while (tires.length < nb && candidats.length) {
    tires.push(candidats.splice(Math.floor(rng() * candidats.length), 1)[0]);
  }
  return tires.map(g => ({ g, son: SON_PAR_DEFAUT[g] }));
}
