import test from 'node:test';
import assert from 'node:assert/strict';
import { LISTE_MIN, LISTE_MAX, TACHE_MAX, validerListe, fusionnerListes, validerTache } from '../../src/core/index.js';

const ids = n => Array.from({ length: n }, (_, i) => `m${i}`);
const catalogue = n => new Set(ids(n));

test('bornes : une liste de 1 à 50 mots, une tâche de 200 mots au plus', () => {
  assert.deepEqual([LISTE_MIN, LISTE_MAX, TACHE_MAX], [1, 50, 200]);
});

test('validerListe : 0 mot refusé avec un message français', () => {
  assert.deepEqual(validerListe([], catalogue(10)).erreurs, ['Une liste contient au moins 1 mot.']);
});

test('validerListe : 50 mots acceptés, 51 refusés', () => {
  assert.deepEqual(validerListe(ids(50), catalogue(60)).erreurs, []);
  assert.deepEqual(validerListe(ids(51), catalogue(60)).erreurs, ['Une liste contient au plus 50 mots.']);
});

test('validerListe : identifiant inconnu nommé, doublons supprimés en gardant l’ordre', () => {
  const r = validerListe(['m1', 'zzz', 'm2', 'm1'], catalogue(5));
  assert.deepEqual(r.erreurs, ['Mot inconnu : zzz.']);
  assert.deepEqual(r.mots, ['m1', 'zzz', 'm2']);
});

test('validerListe : l’entrée n’est pas un tableau → refus, pas d’exception', () => {
  assert.deepEqual(validerListe(undefined, catalogue(5)).erreurs, ['Une liste contient au moins 1 mot.']);
});

test('fusionnerListes : dédoublonne et garde l’ordre des listes puis des mots', () => {
  assert.deepEqual(fusionnerListes([['a', 'b'], ['b', 'c'], ['a', 'd']]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(fusionnerListes([]), []);
});

test('validerTache : 1 à 200 mots', () => {
  assert.deepEqual(validerTache([]).erreurs, ['Choisir au moins une liste non vide.']);
  assert.deepEqual(validerTache(ids(200)).erreurs, []);
  assert.deepEqual(validerTache(ids(201)).erreurs, ['Une tâche contient au plus 200 mots (révisions comprises).']);
});

test('quatre listes de 50 mots distincts font exactement 200 mots', () => {
  const listes = [0, 1, 2, 3].map(k => Array.from({ length: 50 }, (_, i) => `l${k}-${i}`));
  const tout = fusionnerListes(listes);
  assert.equal(tout.length, 200);
  assert.deepEqual(validerTache(tout).erreurs, []);
});
