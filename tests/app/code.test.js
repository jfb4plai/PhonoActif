import test from 'node:test';
import assert from 'node:assert/strict';
import { codeValide } from '../../src/app/code.js';

test('codes élève valides : lettres, chiffres et tiret, 1 à 12 caractères', () => {
  for (const c of ['E07', 'a', 'ABC-123', 'x'.repeat(12)]) assert.equal(codeValide(c), true, c);
});

test('codes invalides : vide, espaces, accents, trop long, ponctuation', () => {
  for (const c of ['', ' ', 'E 07', 'Étienne', 'x'.repeat(13), 'E07!', 'E07\n', 'a_b', undefined, null, 7]) assert.equal(codeValide(c), false, String(c));
});
