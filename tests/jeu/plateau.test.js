import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { construirePlateau } from '../../src/jeu/plateau.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const cartes = preparerPack({ nom: 't', mots: ['chat', 'été', 'pain'], source: 's', licence: 'l', lexique: lex }).manifest.cartes;
const carte = mot => cartes.find(c => c.mot === mot);
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;

test('une pièce par cube, lettres muettes comprises, plus les intrus', () => {
  const p = construirePlateau(carte('chat'), { rng: graine() });
  assert.equal(p.length, 6);
  assert.equal(p.filter(x => !x.intrus).length, 3);
  assert.equal(p.filter(x => x.intrus).length, 3);
  const muet = p.find(x => x.g === 't');
  assert.equal(muet.son, '');
});

test('graphème répété : deux pièces distinctes', () => {
  const p = construirePlateau(carte('été'), { nbIntrus: 0, rng: graine() });
  const e = p.filter(x => x.g === 'é');
  assert.equal(e.length, 2);
  assert.notEqual(e[0].id, e[1].id);
});

test('un intrus n\'est jamais un graphème du mot ni le miroir d\'une de ses lettres', () => {
  const c = { id: 'b', mot: 'bateau', cubes: [{ g: 'b', son: 'b' }, { g: 'a', son: 'a' }, { g: 't', son: 't' }, { g: 'eau', son: 'o_ferme' }] };
  for (let i = 1; i <= 200; i++) {
    const p = construirePlateau(c, { nbIntrus: 3, rng: graine(i) });
    for (const x of p.filter(y => y.intrus)) {
      assert.ok(!['b', 'a', 't', 'eau'].includes(x.g), x.g);
      assert.notEqual(x.g, 'd');
    }
  }
});

test('nbIntrus 0 : seulement les pièces du mot', () => {
  assert.equal(construirePlateau(carte('pain'), { nbIntrus: 0 }).length, 2);
});

test('mélange reproductible avec la même graine, différent avec une autre', () => {
  const a = construirePlateau(carte('chat'), { rng: graine(7) }).map(x => x.id).join();
  const b = construirePlateau(carte('chat'), { rng: graine(7) }).map(x => x.id).join();
  assert.equal(a, b);
  const autres = new Set();
  for (let g = 1; g <= 30; g++) autres.add(construirePlateau(carte('chat'), { rng: graine(g) }).map(x => x.id).join());
  assert.ok(autres.size > 1);
});

test('ids stables dans l\'ordre de création avant mélange', () => {
  const p = construirePlateau(carte('chat'), { rng: graine(3) });
  const parId = Object.fromEntries(p.map(x => [x.id, x]));
  assert.equal(parId.p0.g, 'ch'); assert.equal(parId.p1.g, 'a'); assert.equal(parId.p2.g, 't');
  assert.ok(parId.p3.intrus && parId.p4.intrus && parId.p5.intrus);
});
