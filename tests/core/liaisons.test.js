import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, segmenterMot, liaisonsDe, liaisonsDeMots, filtrerMots } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const mots = res => res.map(r => r.mot);
const TOUT = { tolerance: 99 };

test('liaisonsDe : une clé graphème=son par cube, son vide pour une lettre muette', () => {
  assert.deepEqual(liaisonsDe(segmenterMot('chat', lex).cubes), ['ch=ch', 'a=a', 't=']);
  assert.deepEqual(liaisonsDe([{ g: 'x', son: null }]), ['x=?']);
});

test('filtrerMots : mot dont toutes les liaisons sont connues, avec sa raison', () => {
  const res = filtrerMots(lex, { liaisonsConnues: new Set(['ch=ch', 'a=a', 't=']) });
  const chat = res.find(r => r.mot === 'chat');
  assert.ok(chat);
  assert.deepEqual(chat.inconnues, []);
  assert.ok(chat.raisons.includes('toutes les liaisons connues'));
  assert.ok(chat.raisons.some(r => r.startsWith('fréquence P1')));
});

test('la casse compte : connaître s=s ne rend pas ch=ch connu', () => {
  const connues = new Set(['s=s', 'a=a', 't=']);
  assert.ok(!mots(filtrerMots(lex, { liaisonsConnues: connues })).includes('chat'));
  const avecTolerance = filtrerMots(lex, { liaisonsConnues: connues, tolerance: 1 });
  assert.deepEqual(avecTolerance.find(r => r.mot === 'chat').inconnues, ['ch=ch']);
});

test('contient : liaisons obligatoires', () => {
  const res = filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT, contient: ['ch=ch'] });
  assert.deepEqual(mots(res).sort(), ['chat', 'chien']);
  res.forEach(r => assert.ok(r.raisons.includes('contient ch=ch')));
});

test('un seul résultat par mot, même avec plusieurs lignes dans le lexique', () => {
  const base = { phono: 'l%', nbSyllabes: 1, graphemes: ['l', 'e'], codes: ['l', '%'] };
  const l = creerLexique([
    { ...base, ortho: 'le', classe: 'DET', freq: { P1: 10, P2: 10, P1_5: 10 } },
    { ...base, ortho: 'le', classe: 'PRO', freq: { P1: 99, P2: 99, P1_5: 99 } }
  ]);
  const res = filtrerMots(l, { liaisonsConnues: new Set(), ...TOUT });
  assert.equal(res.length, 1);
  assert.equal(res[0].entree.classe, 'PRO');
});

test('nbSyllabesMax, exclure, classes, freqMinP1', () => {
  const tous = mots(filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT }));
  assert.ok(tous.includes('petit'));
  assert.ok(!mots(filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT, nbSyllabesMax: 1 })).includes('petit'));
  assert.ok(!mots(filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT, exclure: new Set(['chat']) })).includes('chat'));
  const adj = filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT, classes: ['ADJ'] });
  assert.ok(adj.length > 0);
  adj.forEach(r => assert.equal(r.entree.classe, 'ADJ'));
  const frequents = filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT, freqMinP1: 1000 });
  frequents.forEach(r => assert.ok(r.entree.freq.P1 >= 1000));
  assert.ok(!mots(frequents).includes('sept'));
});

test('triés par fréquence P1 décroissante', () => {
  const res = filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT });
  for (let i = 1; i < res.length; i++) assert.ok(res[i - 1].entree.freq.P1 >= res[i].entree.freq.P1);
});

test('un mot avec un son inconnu n\'est jamais proposé', () => {
  const res = mots(filtrerMots(lex, { liaisonsConnues: new Set(), ...TOUT }));
  assert.ok(!res.includes('zz'));
  assert.ok(!res.includes('examen'));
});

test('liaisonsDeMots : union des liaisons, mots absents signalés', () => {
  const { liaisons, absents } = liaisonsDeMots(['chat', 'zorbalon'], lex);
  assert.deepEqual([...liaisons].sort(), ['a=a', 'ch=ch', 't=']);
  assert.deepEqual(absents, ['zorbalon']);
});
