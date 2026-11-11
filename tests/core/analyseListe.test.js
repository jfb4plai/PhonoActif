import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, analyserListe } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const LISTE = [{ mot: 'chat' }, { mot: 'Chat ' }, { mot: 'zorbalon' }, { mot: '' }, { mot: 'lune' }];

test('total, doublons, absents et mots à vérifier', () => {
  const r = analyserListe(LISTE, lex);
  assert.equal(r.total, 4);
  assert.equal(r.trouves, 3);
  assert.deepEqual(r.doublons, ['chat']);
  assert.deepEqual(r.absents, ['zorbalon']);
  assert.ok(r.aVerifier.includes('zorbalon'));
  assert.equal(r.parMot.length, 3);
  assert.equal(r.parMot.find(p => p.mot === 'chat').trouve, true);
  assert.equal(r.parMot.find(p => p.mot === 'zorbalon').trouve, false);
});

test('liaisonsRequises : un mot en double compte une fois', () => {
  const r = analyserListe(LISTE, lex);
  assert.equal(r.liaisonsRequises['ch=ch'], 1);
  assert.equal(r.liaisonsRequises['a=a'], 1);
  assert.equal(r.liaisonsRequises['l=l'], 1);
});

test('liaisons inconnues d\'après les liaisons connues', () => {
  const r = analyserListe(LISTE, lex, new Set(['a=a', 't=']));
  assert.deepEqual(r.parMot.find(p => p.mot === 'chat').inconnues, ['ch=ch']);
});

test('sans liaisons connues, aucune liaison inconnue', () => {
  const r = analyserListe(LISTE, lex);
  assert.deepEqual(r.parMot.find(p => p.mot === 'chat').inconnues, []);
});

test('lignes sans mot : ignorées, pas d\'exception', () => {
  const r = analyserListe([{ mot: undefined }, null, {}, { mot: '   ' }, { mot: 'lune' }], lex);
  assert.equal(r.total, 1);
  assert.deepEqual(r.absents, []);
});

test('un mot dont un son est inconnu est à vérifier mais trouvé', () => {
  const r = analyserListe([{ mot: 'examen' }], lex);
  assert.equal(r.trouves, 1);
  assert.deepEqual(r.absents, []);
  assert.deepEqual(r.aVerifier, ['examen']);
});
