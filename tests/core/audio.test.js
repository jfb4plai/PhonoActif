import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, segmenterMot, sonsRequis, sonsManquants } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);

test('sonsRequis : fille demande f, i et yod (ill = i + yod), pas de son pour le e muet', () => {
  assert.deepEqual(sonsRequis(segmenterMot('fille', lex).cubes), ['f', 'i', 'yod']);
});

test('sonsRequis : ni son vide ni son inconnu, sons uniques', () => {
  const r = sonsRequis([{ g: 't', son: '' }, { g: 'x', son: null }, { g: 'a', son: 'a' }, { g: 'a', son: 'a' }]);
  assert.deepEqual(r, ['a']);
});

test('sonsManquants : triés, seulement ceux sans fichier', () => {
  assert.deepEqual(sonsManquants(['a', 'yod', 'i'], new Set(['a'])), ['i', 'yod']);
  assert.deepEqual(sonsManquants(['a'], new Set(['a'])), []);
});
