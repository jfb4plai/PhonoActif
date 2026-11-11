import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, segmenterMot, estMultiMot } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const lire = r => r.cubes.map(c => c.g + '=' + (c.son === null ? '?' : c.son)).join(' ');
const corr = (mot, cubes, statut = 'corrige') =>
  creerCorrections([{ mot, cubes, statut, auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;
const BIEN = [{ g: 'b', son: 'b' }, { g: 'i', son: 'i' }, { g: 'en', son: 'an' }];

test('une correction l\'emporte sur le lexique', () => {
  const r = segmenterMot('bien', lex, { corrections: corr('bien', BIEN) });
  assert.equal(r.source, 'correction');
  assert.equal(r.aVerifier, false);
  assert.equal(lire(r), 'b=b i=i en=an');
  assert.ok(r.raisons[0].includes('corrige') && r.raisons[0].includes('JF'));
});

test('une correction a_valider reste à vérifier', () => {
  const r = segmenterMot('bien', lex, { corrections: corr('bien', BIEN, 'a_valider') });
  assert.equal(r.source, 'correction');
  assert.equal(r.aVerifier, true);
});

test('la correction l\'emporte sur les graphèmes explicites de la carte', () => {
  const r = segmenterMot('bien', lex, { corrections: corr('bien', BIEN), graphemes: 'b-i-en' });
  assert.equal(r.source, 'correction');
});

test('sans correction, rien ne change', () => {
  assert.equal(segmenterMot('bien', lex).source, 'lexique');
  assert.equal(lire(segmenterMot('chat', lex)), 'ch=ch a=a t=');
  assert.equal(segmenterMot('chat', lex, { corrections: corr('bien', BIEN) }).source, 'lexique');
});

test('estMultiMot', () => {
  for (const m of ['pomme de terre', "l'ami", 'peut-être', "aujourd'hui"]) assert.equal(estMultiMot(m), true, m);
  for (const m of ['chat', '', undefined]) assert.equal(estMultiMot(m), false, String(m));
});

test('entrée à plusieurs mots : découpée, toujours à valider', () => {
  const r = segmenterMot('pomme de terre', lex);
  assert.equal(r.source, 'multi-mots');
  assert.equal(r.aVerifier, true);
  assert.ok(r.raisons.includes('entrée à plusieurs mots : à valider'));
  assert.deepEqual(r.cubes.filter(c => c.g === ' ').length, 2);
  assert.equal(r.cubes.map(c => c.g).join(''), 'pomme de terre');
  assert.ok(r.cubes.filter(c => c.g === ' ').every(c => c.son === ''));
});

test('deux espaces donnent le même résultat qu\'un seul', () => {
  assert.deepEqual(segmenterMot('pomme  de terre', lex), segmenterMot('pomme de terre', lex));
});

test('apostrophe et trait d\'union : séparateurs à son vide, aucune partie vide', () => {
  const a = segmenterMot("l'ami", lex);
  assert.equal(a.cubes.map(c => c.g).join(''), "l'ami");
  assert.equal(a.cubes.find(c => c.g === "'").son, '');
  assert.ok(a.cubes.every(c => c.g !== ''));
  const t = segmenterMot('peut-être', lex);
  assert.equal(t.source, 'multi-mots');
  assert.equal(t.cubes.find(c => c.g === '-').son, '');
});

test('séparateur en bout de mot : pas de cube vide, pas d\'exception', () => {
  for (const m of ['-chat', 'chat-', "'", '-']) {
    const r = segmenterMot(m, lex);
    assert.ok(r.cubes.every(c => c.g !== ''), m);
    assert.equal(r.aVerifier, true, m);
  }
  assert.equal(segmenterMot('chat-', lex).cubes.map(c => c.g).join(''), 'chat-');
});

test('une correction valide fait sortir une entrée multi-mots de l\'état à vérifier', () => {
  const cubes = [{ g: 'pomme', son: 'p+o_ouvert+m' }, { g: ' ', son: '' }, { g: 'de', son: 'd+schwa' }, { g: ' ', son: '' }, { g: 'terre', son: 't+e_ouvert+r' }];
  const r = segmenterMot('pomme de terre', lex, { corrections: corr('pomme de terre', cubes, 'valide') });
  assert.equal(r.source, 'correction');
  assert.equal(r.aVerifier, false);
});
