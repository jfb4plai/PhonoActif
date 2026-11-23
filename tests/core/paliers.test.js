import test from 'node:test';
import assert from 'node:assert/strict';
import { paliersPourMots, numeroDePalier, estFinDePalier } from '../../src/core/paliers.js';

const MODELE = {
  id: 'pp',
  mots: ['a', 'b', 'c', 'd', 'e'],
  paliers: [
    { id: '1', difficulte: 'x', mots: ['a', 'b'] },
    { id: '2', difficulte: 'y', mots: ['c', 'd', 'e'] },
  ],
};

test('deux paliers complets', () => {
  const p = paliersPourMots(['a', 'b', 'c', 'd', 'e'], [MODELE]);
  assert.equal(p.length, 2);
  assert.deepEqual([p[0].debut, p[0].fin, p[1].debut, p[1].fin], [0, 1, 2, 4]);
  assert.equal(p[0].annonce, '');
});

test('liste partielle', () => {
  const p = paliersPourMots(['a', 'b', 'c'], [MODELE]);
  assert.deepEqual(p[1].ids, ['c']);
  assert.deepEqual([p[1].debut, p[1].fin], [2, 2]);
});

test('un seul palier non vide : null', () => {
  assert.equal(paliersPourMots(['a', 'b'], [MODELE]), null);
});

test('ordre contraire : null', () => {
  assert.equal(paliersPourMots(['c', 'a', 'b'], [MODELE]), null);
});

test('aucun modèle à paliers : null', () => {
  assert.equal(paliersPourMots(['a', 'b'], [{ id: 'z', mots: ['a', 'b'] }]), null);
});

test('estFinDePalier et numeroDePalier', () => {
  const p = paliersPourMots(['a', 'b', 'c', 'd', 'e'], [MODELE]);
  assert.equal(estFinDePalier(p, 1), true);
  assert.equal(estFinDePalier(p, 0), false);
  assert.equal(estFinDePalier(p, 4), false);
  assert.equal(estFinDePalier(null, 0), false);
  assert.equal(numeroDePalier(p, 3), 1);
});
