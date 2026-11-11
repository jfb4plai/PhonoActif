import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, decomposerCodes, proposerCubes, fileDeRevue, deriveDuLexique } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const entree = mot => entrees.find(e => e.ortho === mot);
const corr = (mot, cubes, statut = 'corrige') =>
  creerCorrections([{ mot, cubes, statut, auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;
const AUCUNE = creerCorrections([]).corrections;
const mots = f => f.map(i => i.mot);
const EXAMEN = [{ g: 'e', son: 'e_ouvert' }, { g: 'x', son: 'g+z' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'en', son: 'in' }];

test('decomposerCodes : un code inconnu se décompose phonème par phonème', () => {
  assert.equal(decomposerCodes('Ej'), 'e_ouvert+yod');
  assert.equal(decomposerCodes('w5'), 'w+in');
  assert.equal(decomposerCodes('dZ'), 'd+j');
  assert.equal(decomposerCodes('ER'), 'e_ouvert+r');
  assert.equal(decomposerCodes('waj'), 'w+a+yod');
});

test('decomposerCodes : rien à proposer pour 8, G, A, vide, ni pour un code déjà connu', () => {
  for (const c of ['8', 'G', 'A', '', 'S', 'wa', 'g8']) assert.equal(decomposerCodes(c), null, c);
});

test('proposerCubes : proposition marquée à vérifier, code sans proposition laissé inconnu', () => {
  assert.deepEqual(proposerCubes(entree('zz')), [{ g: 'zz', son: null, aVerifier: true }]);
  const soleil = { ortho: 'soleil', phono: 'sOlEj', classe: 'NC', nbSyllabes: 2, freq: { P1: 5, P2: 5, P1_5: 5 },
    graphemes: ['s', 'o', 'l', 'eil'], codes: ['s', 'o', 'l', 'Ej'] };
  const cubes = proposerCubes(soleil);
  assert.deepEqual(cubes[3], { g: 'eil', son: 'e_ouvert+yod', aVerifier: true });
  assert.deepEqual(cubes[0], { g: 's', son: 's' });
});

test('fileDeRevue : code inconnu et sans correction', () => {
  const f = fileDeRevue(lex, AUCUNE);
  assert.ok(mots(f).includes('examen'));
  assert.ok(mots(f).includes('zz'));
  assert.ok(!mots(f).includes('chat'));
  assert.ok(f.find(i => i.mot === 'examen').raisons.includes('code inconnu : gz'));
  assert.equal(f.find(i => i.mot === 'examen').statut, null);
});

test('fileDeRevue : mots supplémentaires absents ou à plusieurs mots', () => {
  const f = fileDeRevue(lex, AUCUNE, { motsSupplementaires: ['zorbalon', 'pomme de terre', 'chat'] });
  assert.ok(f.find(i => i.mot === 'zorbalon').raisons.includes('absent du lexique'));
  assert.ok(f.find(i => i.mot === 'pomme de terre').raisons.includes('entrée à plusieurs mots : à valider'));
  assert.ok(!mots(f).includes('chat'));
});

test('fileDeRevue : une correction valide ou corrigée retire le mot, une a_valider le garde', () => {
  assert.ok(!mots(fileDeRevue(lex, corr('examen', EXAMEN))).includes('examen'));
  assert.ok(!mots(fileDeRevue(lex, corr('examen', EXAMEN, 'valide'))).includes('examen'));
  const item = fileDeRevue(lex, corr('examen', EXAMEN, 'a_valider')).find(i => i.mot === 'examen');
  assert.equal(item.statut, 'a_valider');
  assert.equal(item.cubes[1].son, 'g+z');
});

test('fileDeRevue : une correction a_valider d\'un mot hors lexique reste dans la file', () => {
  const zor = [{ g: 'zorbalon', son: 'z+o_ouvert+r+b+a+l+on' }];
  const f = fileDeRevue(lex, corr('zorbalon', zor, 'a_valider'));
  assert.equal(f.find(i => i.mot === 'zorbalon').statut, 'a_valider');
});

test('fileDeRevue : entrée multi-mots du lexique à valider', () => {
  const multi = { ortho: 'peut-être', phono: 'pøtEtR', classe: 'ADV', nbSyllabes: 2, freq: { P1: 500, P2: 500, P1_5: 500 },
    graphemes: ['p', 'eu', 't', '-', 'ê', 't', 'r', 'e'], codes: ['p', '2', 't', '#', 'E', 't', 'R', '°'] };
  const f = fileDeRevue(creerLexique([multi]), AUCUNE);
  assert.deepEqual(mots(f), ['peut-être']);
  assert.ok(f[0].raisons.includes('entrée à plusieurs mots : à valider'));
});

test('fileDeRevue : tri par fréquence P1 décroissante puis limite', () => {
  const f = fileDeRevue(lex, AUCUNE, { motsSupplementaires: ['zorbalon'] });
  for (let i = 1; i < f.length; i++) assert.ok(f[i - 1].freqP1 >= f[i].freqP1);
  assert.equal(fileDeRevue(lex, AUCUNE, { limite: 1 }).length, 1);
});

test('deriveDuLexique : valide identique au lexique, rien ; différent, listé', () => {
  const chat = (son) => [{ g: 'ch', son }, { g: 'a', son: 'a' }, { g: 't', son: '' }];
  assert.deepEqual(deriveDuLexique(corr('chat', chat('ch'), 'valide'), lex), []);
  const d = deriveDuLexique(corr('chat', chat('s'), 'valide'), lex);
  assert.equal(d.length, 1);
  assert.deepEqual(d[0], { mot: 'chat', correction: ['ch=s', 'a=a', 't='], lexique: ['ch=ch', 'a=a', 't='] });
});

test('deriveDuLexique : valider la proposition d\'un mot à code inconnu ne crée pas de dérive', () => {
  assert.deepEqual(deriveDuLexique(corr('examen', EXAMEN, 'valide'), lex), []);
});

test('deriveDuLexique : un corrige n\'est jamais listé, ni un mot absent du lexique', () => {
  const chat = [{ g: 'ch', son: 's' }, { g: 'a', son: 'a' }, { g: 't', son: '' }];
  assert.deepEqual(deriveDuLexique(corr('chat', chat, 'corrige'), lex), []);
  assert.deepEqual(deriveDuLexique(corr('zorbalon', [{ g: 'zorbalon', son: 'z' }], 'valide'), lex), []);
});
