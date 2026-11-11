import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, normaliserMot, segmenterMot } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const lire = r => r.cubes.map(c => c.g + '=' + (c.son === null ? '?' : c.son)).join(' ');

test('normaliserMot : casse, espaces, apostrophe typographique, accents décomposés', () => {
  assert.equal(normaliserMot('  Chat '), 'chat');
  assert.equal(normaliserMot('aujourd’hui'), 'aujourd\'hui');
  assert.equal(normaliserMot('été'), 'été');
  assert.equal(normaliserMot('pomme   de  terre'), 'pomme de terre');
  assert.equal(normaliserMot(undefined), '');
  assert.equal(normaliserMot(null), '');
});

test('segmenterMot : mot du lexique', () => {
  const r = segmenterMot('bien', lex);
  assert.equal(r.source, 'lexique');
  assert.equal(r.aVerifier, false);
  assert.equal(lire(r), 'b=b i=yod en=in');
});

test('segmenterMot : majuscule et espace donnent le même résultat', () => {
  assert.deepEqual(segmenterMot('Chien ', lex), segmenterMot('chien', lex));
  assert.equal(segmenterMot('Chien ', lex).source, 'lexique');
});

test('segmenterMot : mot absent du lexique, repli signalé', () => {
  const r = segmenterMot('zorbalon', lex);
  assert.equal(r.source, 'auto');
  assert.equal(r.aVerifier, true);
  assert.ok(r.raisons.includes('absent du lexique'));
  assert.ok(r.cubes.length > 0);
});

test('segmenterMot : graphèmes explicites valides', () => {
  const r = segmenterMot('chat', lex, { graphemes: 'ch-a-t' });
  assert.equal(r.source, 'explicite');
  assert.equal(r.aVerifier, false);
});

test('segmenterMot : graphèmes explicites invalides, retour au lexique avec la raison', () => {
  const r = segmenterMot('chat', lex, { graphemes: 'c-h-a' });
  assert.equal(r.source, 'lexique');
  assert.ok(r.raisons.some(x => x.includes('ne correspond pas')));
  assert.equal(lire(r), 'ch=ch a=a t=');
});

test('segmenterMot : son inconnu dans le lexique, mot à vérifier', () => {
  const r = segmenterMot('examen', lex);
  assert.equal(r.source, 'lexique');
  assert.equal(r.aVerifier, true);
  assert.ok(r.raisons.some(x => x.includes('x')));
});

test('segmenterMot : graphèmes du lexique incohérents avec le mot', () => {
  const faux = creerLexique([{ ortho: 'chat', phono: 'Sa', classe: 'NC', nbSyllabes: 1, freq: { P1: 1, P2: 1, P1_5: 1 },
    graphemes: ['c', 'a'], codes: ['k', 'a'] }]);
  const r = segmenterMot('chat', faux);
  assert.equal(r.source, 'auto');
  assert.equal(r.aVerifier, true);
  assert.ok(r.raisons.includes('graphèmes du lexique incohérents avec le mot'));
});

test('segmenterMot : mot vide, pas d\'exception', () => {
  const r = segmenterMot('', lex);
  assert.deepEqual(r.cubes, []);
  assert.equal(r.aVerifier, true);
  assert.deepEqual(segmenterMot(undefined, lex).cubes, []);
});

test('lexique : même mot en plusieurs lignes, la plus fréquente gagne', () => {
  const base = { phono: 'l%', nbSyllabes: 1, graphemes: ['l', 'e'], codes: ['l', '%'] };
  const l = creerLexique([
    { ...base, ortho: 'le', classe: 'DET', freq: { P1: 10, P2: 10, P1_5: 10 } },
    { ...base, ortho: 'le', classe: 'PRO', freq: { P1: 99, P2: 99, P1_5: 99 } }
  ]);
  assert.equal(l.chercher('le').classe, 'PRO');
  assert.equal(l.chercherTous('Le').length, 2);
  assert.equal(l.taille, 2);
  assert.equal(l.chercher('inconnu'), null);
  assert.deepEqual(l.chercherTous('inconnu'), []);
});
