import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, creerListe, fileDeRevue, motsDeListe } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const L = creerListe({
  id: 'e', nom: 'E', source: 's', licence: 'l', niveaux: ['P1', 'P2', 'P3'],
  lignes: [{ mot: 'lune', niveau: 'P2' }, { mot: 'chat', niveau: 'P1' }, { mot: 'zorbalon', niveau: 'P2' }, { mot: 'à peu près', niveau: 'P3' }, { mot: 'examen', niveau: 'P3' }]
}).liste;
const mots = f => f.map(i => i.mot);

test('motsDeListe : mots distincts dans l\'ordre des niveaux', () => {
  assert.deepEqual(motsDeListe(L), ['chat', 'lune', 'zorbalon', 'à peu près', 'examen']);
});

test('motsDeListe : pas de doublon', () => {
  const l = { ...L, entrees: [...L.entrees, { ...L.entrees[0] }] };
  assert.equal(new Set(motsDeListe(l)).size, motsDeListe(l).length);
});

test('les mots d\'une liste entrent dans la file : absents et multi-mots, pas les mots sûrs', () => {
  const f = fileDeRevue(lex, creerCorrections([]).corrections, { motsSupplementaires: motsDeListe(L) });
  assert.ok(mots(f).includes('zorbalon'));
  assert.ok(mots(f).includes('à peu près'));
  assert.ok(mots(f).includes('examen'));
  assert.ok(!mots(f).includes('chat'));
  assert.ok(!mots(f).includes('lune'));
});

test('un mot déjà validé ne revient pas dans la file', () => {
  const corr = creerCorrections([{ mot: 'zorbalon', cubes: [{ g: 'zorbalon', son: 'z' }], statut: 'valide', auteur: 'JF', date: '2026-11-11', raison: '' }]).corrections;
  const f = fileDeRevue(lex, corr, { motsSupplementaires: motsDeListe(L) });
  assert.ok(!mots(f).includes('zorbalon'));
});
