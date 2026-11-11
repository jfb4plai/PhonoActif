import test from 'node:test';
import assert from 'node:assert/strict';
import { sonValide, composants, sonDepuisCodes, SONS_LILEMO } from '../../src/core/index.js';

test('sonValide : muet, id, composé et séquences valides', () => {
  for (const s of ['', 'schwa', 'ij', 'e_ouvert+yod', 'w+a+yod']) assert.equal(sonValide(s), true, s);
});

test('sonValide : null, id inconnu, ancien id e_muet et séquences incomplètes invalides', () => {
  for (const s of [null, undefined, 'e_muet', 'zz', 'a+', '+a', 'a+zz', 'a++b']) assert.equal(sonValide(s), false, String(s));
});

test('sonValide : les noms hérités d\'Object ne sont pas des sons', () => {
  for (const s of ['constructor', 'toString', '__proto__', 'a+constructor']) assert.equal(sonValide(s), false, s);
  assert.deepEqual(composants('constructor'), ['constructor']);
});

test('composants d\'une séquence', () => {
  assert.deepEqual(composants('e_ouvert+yod'), ['e_ouvert', 'yod']);
  assert.deepEqual(composants('i+ij'), ['i', 'i', 'yod']);
  assert.deepEqual(composants('ij'), ['i', 'yod']);
  assert.deepEqual(composants(''), []);
  assert.deepEqual(composants(null), []);
});

test('le schwa a son propre id, e_muet disparaît', () => {
  assert.equal(sonDepuisCodes('%'), 'schwa');
  assert.ok(SONS_LILEMO.includes('schwa'));
  assert.ok(!SONS_LILEMO.includes('e_muet'));
  assert.equal(SONS_LILEMO.length, 37);
});
