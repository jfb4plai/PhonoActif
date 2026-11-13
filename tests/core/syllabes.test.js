import test from 'node:test';
import assert from 'node:assert/strict';
import { lireRegles, composants, syllabesDeSons, syllabesIPA } from '../../src/core/index.js';

const sons = mot => lireRegles(mot).flatMap(c => composants(c.son));
const coupe = mot => syllabesDeSons(sons(mot)).map(s => s.join(' ')).join(' | ');

test('on coupe les sons de la lecture du mot entier, pas les lettres', () => {
  assert.equal(coupe('maison'), 'm e_ouvert | z on');       // z vient du s entre voyelles : mai|son lu seul donnerait s
  assert.deepEqual(syllabesIPA(sons('maison')), ['mɛ', 'zɔ̃']);
});

test('attaque maximale : une consonne va avec la voyelle suivante, obstruante + liquide ensemble', () => {
  assert.equal(coupe('chocolat'), 'ch o_ouvert | k o_ouvert | l a');
  assert.equal(coupe('secret'), 's schwa | k r e_ouvert');
  assert.equal(coupe('matin'), 'm a | t in');
});

test('deux consonnes qui ne forment pas un groupe sont séparées', () => {
  assert.equal(coupe('partir'), 'p a r | t i r');
});

test('une glissante reste avec la voyelle suivante, un mot à une voyelle reste entier', () => {
  assert.equal(coupe('bien'), 'b yod in');
  assert.equal(coupe('chat'), 'ch a');
});

test('suite vide ou sans voyelle : pas d\'erreur', () => {
  assert.deepEqual(syllabesDeSons([]), []);
  assert.deepEqual(syllabesDeSons(['p', 't']), [['p', 't']]);
});

test('s + occlusive reste en attaque (ex-cuse, ex-plique) et x se décompose en k + s (tak-si)', () => {
  assert.equal(coupe('excuse'), 'e_ouvert k | s k u z');   // Lexique 4.1 : Ek-skyz
  assert.equal(coupe('expliquer'), 'e_ouvert k | s p l i | k e_ferme');
  assert.equal(coupe('taxi'), 't a k | s i');
});
