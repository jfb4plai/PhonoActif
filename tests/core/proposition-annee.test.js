import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, creerListe, filtrerMots, proposerPourNiveau } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const liste = lignes => creerListe({ id: 'e', nom: 'E', source: 's', licence: 'l', niveaux: ['P1', 'P2', 'P3'], lignes }).liste;
const L = liste([
  { mot: 'chat', niveau: 'P1' }, { mot: 'lune', niveau: 'P2' }, { mot: 'pain', niveau: 'P2' },
  { mot: 'zorbalon', niveau: 'P2' }, { mot: 'examen', niveau: 'P3' }
]);
const mots = r => r.map(x => x.mot);
const EXAMEN = [{ g: 'e', son: 'e_ouvert' }, { g: 'x', son: 'g+z' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'en', son: 'in' }];

test('filtrerMots : motsPermis restreint les mots proposés', () => {
  const base = { liaisonsConnues: new Set(), tolerance: 99 };
  assert.deepEqual(mots(filtrerMots(lex, { ...base, motsPermis: new Set(['chat']) })), ['chat']);
  assert.deepEqual(filtrerMots(lex, { ...base, motsPermis: new Set() }), []);
  assert.ok(mots(filtrerMots(lex, base)).length > 1);
});

test('P1 : rien n\'est connu avant P1, tolérance 0 ne propose rien', () => {
  assert.deepEqual(proposerPourNiveau(lex, L, 'P1'), []);
  assert.deepEqual(mots(proposerPourNiveau(lex, L, 'P1', { tolerance: 3 })), ['chat']);
});

test('P2 : seuls les mots dont les liaisons étaient connues en fin de P1', () => {
  assert.deepEqual(proposerPourNiveau(lex, L, 'P2'), []);
  const r = proposerPourNiveau(lex, L, 'P2', { tolerance: 4 });
  assert.ok(mots(r).includes('lune'));
  assert.ok(mots(r).includes('pain'));
  const lune = r.find(x => x.mot === 'lune');
  assert.deepEqual(lune.inconnues.sort(), ['e=', 'l=l', 'n=n', 'u=u']);
});

test('la raison « année suggérée » vient en premier', () => {
  const r = proposerPourNiveau(lex, L, 'P2', { tolerance: 4 });
  assert.equal(r.find(x => x.mot === 'lune').raisons[0], 'année suggérée : P2');
});

test('un mot de la liste absent du lexique n\'est jamais proposé', () => {
  assert.ok(!mots(proposerPourNiveau(lex, L, 'P2', { tolerance: 99 })).includes('zorbalon'));
});

test('jusquAuNiveau ajoute les mots des années précédentes avec leur propre année', () => {
  const r = proposerPourNiveau(lex, L, 'P2', { tolerance: 99, jusquAuNiveau: true });
  assert.equal(r.find(x => x.mot === 'chat').raisons[0], 'année suggérée : P1');
  assert.equal(r.find(x => x.mot === 'lune').raisons[0], 'année suggérée : P2');
});

test('la tolérance exclut les mots qui apportent trop de liaisons nouvelles', () => {
  const r = proposerPourNiveau(lex, L, 'P2', { tolerance: 3 });
  assert.ok(mots(r).includes('pain'));
  assert.ok(!mots(r).includes('lune'));
});

test('niveau inconnu : tableau vide', () => {
  assert.deepEqual(proposerPourNiveau(lex, L, 'P7', { tolerance: 99 }), []);
});

test('les corrections valides rendent un mot proposable', () => {
  assert.ok(!mots(proposerPourNiveau(lex, L, 'P3', { tolerance: 99 })).includes('examen'));
  const corr = creerCorrections([{ mot: 'examen', cubes: EXAMEN, statut: 'corrige', auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;
  assert.ok(mots(proposerPourNiveau(lex, L, 'P3', { tolerance: 99, corrections: corr })).includes('examen'));
});

test('nbSyllabesMax et classes sont transmis', () => {
  assert.deepEqual(proposerPourNiveau(lex, L, 'P2', { tolerance: 99, nbSyllabesMax: 0 }), []);
  assert.deepEqual(proposerPourNiveau(lex, L, 'P2', { tolerance: 99, classes: ['ADJ'] }), []);
  assert.ok(mots(proposerPourNiveau(lex, L, 'P2', { tolerance: 99, classes: ['NC'] })).includes('pain'));
});
