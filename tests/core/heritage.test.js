// Assertions reprises de test-lilemo.js (cœur d'origine de Lilémo), lignes 11 à 35.
import test from 'node:test';
import assert from 'node:assert/strict';
import { segmenter, segmenterAuto, choisirIntrus, reponseJuste, classeCube } from '../../src/core/index.js';

const g = w => segmenterAuto(w).map(c => c.g).join('-');
const s = w => segmenterAuto(w).map(c => c.g + (c.son === '' ? '(muet)' : '=' + c.son)).join(' ');

test('digrammes, nasales et muets', () => {
  assert.equal(g('chat'), 'ch-a-t'); assert.equal(g('bateau'), 'b-a-t-eau');
  assert.equal(g('lune'), 'l-u-n-e'); assert.equal(g('maman'), 'm-a-m-an');
  assert.equal(g('animal'), 'a-n-i-m-a-l');
  assert.equal(g('poule'), 'p-ou-l-e'); assert.equal(g('pont'), 'p-on-t');
  assert.equal(g('gnome'), 'gn-o-m-e'); assert.equal(g('balle'), 'b-a-ll-e');
});

test('sons contextuels', () => {
  assert.match(s('cerise'), /c=s/); assert.match(s('rose'), /s=z/); assert.match(s('gomme'), /g=g/);
  assert.match(s('girafe'), /g=j/); assert.match(s('lune'), /e\(muet\)/);
});

test('graphèmes explicites valides et invalides', () => {
  assert.equal(segmenter({ Mot: 'chat', Graphemes: 'ch-a-t' }).auto, false);
  assert.equal(segmenter({ Mot: 'chat', Graphemes: 'c-h-a' }).auto, true);
  assert.equal(segmenter({ Mot: 'rose', Graphemes: 'r-o=o_ferme-s=z-e=' }).cubes[2].son, 'z');
});

test('aucun graphème ne produit le nom d\'une lettre', () => {
  for (const w of ['bibi', 'papa', 'tomate', 'fourchette', 'oiseau', 'écolier'])
    segmenterAuto(w).forEach(c => assert.ok(!/^(be|de|ef|ka|el|em|en|er|te|ve|ze)$/.test(c.son), w + ':' + c.son));
});

test('intrus : jamais de miroir ni de doublon avec le mot', () => {
  for (let i = 0; i < 200; i++) {
    const cubes = segmenterAuto('bateau'), intr = choisirIntrus(cubes, 3);
    assert.equal(intr.length, 3);
    intr.forEach(x => { assert.ok(!cubes.some(c => c.g === x.g)); assert.notEqual(x.g, 'd'); });
  }
});

test('accents exigés ou non', () => {
  assert.equal(reponseJuste(['e', 't', 'e'], ['é', 't', 'é'], true), false);
  assert.equal(reponseJuste(['e', 't', 'e'], ['é', 't', 'é'], false), true);
});

test('classe de cube', () => {
  assert.equal(classeCube(''), 'muet'); assert.equal(classeCube('ou'), 'voyelle'); assert.equal(classeCube('ch'), 'consonne');
});
