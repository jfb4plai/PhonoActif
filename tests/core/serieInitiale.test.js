import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prng, serieInitiale } from '../../src/core/serieInitiale.js';
import { lettreInitiale } from '../../src/core/voyellesInitiale.js';

const fiches = JSON.parse(readFileSync(new URL('../../public/mots/fiches.json', import.meta.url), 'utf8'));
const modele = JSON.parse(readFileSync(new URL('../../public/mots/modeles.json', import.meta.url), 'utf8')).find(m => m.id === 'maternelle-initiale');
const cartes = modele.mots.map(id => fiches.find(f => f.id === id));
const resume = s => s.map(x => `${x.carte.id}:${x.lettres.join('')}`).join('|');

test('prng : une même graine redonne la même suite, deux graines donnent deux suites', () => {
  const a = prng(42), b = prng(42), c = prng(43);
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const x of sa) assert.ok(x >= 0 && x < 1);
});

test('serieInitiale : même graine = mêmes mots, même ordre, mêmes lettres, même si les cartes arrivent dans un autre ordre', () => {
  assert.equal(resume(serieInitiale(cartes, 7)), resume(serieInitiale([...cartes].reverse(), 7)));
  assert.notEqual(resume(serieInitiale(cartes, 7)), resume(serieInitiale(cartes, 8)));
});

test('serieInitiale : trois lettres distinctes dont la bonne, jamais a avec é ; toutes les cartes une fois', () => {
  for (const graine of [1, 2, 3, 99, 12345]) {
    const s = serieInitiale(cartes, graine);
    assert.equal(s.length, cartes.length);
    assert.equal(new Set(s.map(x => x.carte.id)).size, cartes.length);
    for (const x of s) {
      assert.equal(x.lettres.length, 3); assert.equal(new Set(x.lettres).size, 3);
      assert.ok(x.lettres.includes(x.cible)); assert.equal(x.cible, lettreInitiale(x.carte));
      assert.ok(!(x.lettres.includes('a') && x.lettres.includes('é')), x.lettres.join());
    }
  }
});

test('serieInitiale : nb garde le début de la série, les lettres ne changent pas avec nb', () => {
  const tout = serieInitiale(cartes, 5), huit = serieInitiale(cartes, 5, 8);
  assert.equal(huit.length, 8);
  assert.equal(resume(huit), resume(tout.slice(0, 8)));
  assert.equal(serieInitiale(cartes, 5, 0).length, cartes.length);
  assert.equal(serieInitiale(cartes, 5, 1000).length, cartes.length);
});
