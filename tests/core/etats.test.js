import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, etatsDuMot } from '../../src/core/index.js';

const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8')));
const lecture = e => e.cubes.map(c => c.son || '_').join(' ');

test('un état par lettre posée, tous suivent les règles sauf le dernier', () => {
  const e = etatsDuMot('sept', lex);
  assert.deepEqual(e.map(x => x.lettres), ['s', 'se', 'sep', 'sept']);
  assert.deepEqual(e.map(x => x.source), ['regles', 'regles', 'regles', 'lexique']);
});

test('une partie posée qui est elle-même un mot suit quand même les règles (« se » dans « sept »)', () => {
  const e = etatsDuMot('sept', lex);
  assert.equal(lecture(e[1]), 's schwa');          // règles : e final de monosyllabe. Le lexique dit « se » = s + schwa aussi ;
  assert.equal(e[1].source, 'regles');             // ce qui compte : la source reste « regles », jamais « lexique »
  const p = etatsDuMot('petit', lex);              // « pet » n'est pas lu par le lexique mais par les règles
  assert.equal(p[2].source, 'regles');
});

test('à l\'état final le lexique remplace les règles et signale l\'écart', () => {
  const e = etatsDuMot('sept', lex);
  assert.equal(lecture(e[3]), 's e_ouvert _ t');   // ManuLemme : p muet, t prononcé
  assert.equal(e[3].ecartAvecRegles, true);
  const c = etatsDuMot('chat', lex);
  assert.equal(c[2].ecartAvecRegles, false);       // règles et lexique d'accord
});

test('mot absent du lexique : tout par règles, dernier état à vérifier', () => {
  const e = etatsDuMot('lupa', lex);
  assert.ok(e.every(x => x.source === 'regles'));
  assert.equal(e[e.length - 1].aVerifier, true);
});

test('chaîne vide sans erreur', () => {
  assert.deepEqual(etatsDuMot('', lex), []);
});
