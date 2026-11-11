import test from 'node:test';
import assert from 'node:assert/strict';
import { sonDepuisCodes, composants, SONS_LILEMO, SONS_COMPOSES } from '../../src/core/index.js';

test('la casse des codes compte : S (ʃ) n\'est pas s', () => {
  assert.equal(sonDepuisCodes('S'), 'ch');
  assert.equal(sonDepuisCodes('s'), 's');
});

test('E (ɛ) et e (e) sont distincts, O (ɔ) et o (o) aussi', () => {
  assert.equal(sonDepuisCodes('E'), 'e_ouvert');
  assert.equal(sonDepuisCodes('e'), 'e_ferme');
  assert.equal(sonDepuisCodes('O'), 'o_ouvert');
  assert.equal(sonDepuisCodes('o'), 'o_ferme');
});

test('lettres muettes et schwa', () => {
  assert.equal(sonDepuisCodes('#'), '');
  assert.equal(sonDepuisCodes('°'), '');
  assert.equal(sonDepuisCodes('%'), 'e_muet');
});

test('séquences de deux phonèmes pour un graphème', () => {
  assert.equal(sonDepuisCodes('wa'), 'oi');
  assert.equal(sonDepuisCodes('8i'), 'ui');
  assert.equal(sonDepuisCodes('ij'), 'ij');
  assert.equal(sonDepuisCodes('ks'), 'ks');
});

test('voyelles nasales', () => {
  assert.equal(sonDepuisCodes('§'), 'on');
  assert.equal(sonDepuisCodes('@'), 'an');
  assert.equal(sonDepuisCodes('5'), 'in');
  assert.equal(sonDepuisCodes('1'), 'un');
});

test('le yod et le /ʒ/ ont des ids distincts', () => {
  assert.equal(sonDepuisCodes('j'), 'yod');
  assert.equal(sonDepuisCodes('Z'), 'j');
});

test('code ou séquence inconnu : null, jamais d\'exception', () => {
  for (const c of ['A', 'G', '8', 'gz', '', 'zz', 'x']) assert.equal(sonDepuisCodes(c), null, c);
});

test('composants des sons composés', () => {
  assert.deepEqual(composants('ij'), ['i', 'yod']);
  assert.deepEqual(composants(''), []);
  assert.deepEqual(composants('ch'), ['ch']);
});

test('tout son produit par la table existe dans SONS_LILEMO ou SONS_COMPOSES', () => {
  const codes = ['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'm', 'n', 'l', 'w', 'S', 'Z', 'N', 'R', 'j', 'i', 'e', 'E',
    'a', 'y', 'u', 'o', 'O', '2', '9', '@', '§', '5', '1', '%', 'wa', '8i', 'ks', 'ij'];
  for (const c of codes) {
    const son = sonDepuisCodes(c);
    assert.ok(typeof son === 'string', c);
    if (son !== '') assert.ok(SONS_LILEMO.includes(son) || son in SONS_COMPOSES, `${c} -> ${son}`);
  }
  assert.equal(SONS_LILEMO.length, 37);
});
