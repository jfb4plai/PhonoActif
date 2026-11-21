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
  assert.equal(lecture(e[1]), 's e_ouvert');       // le e se lit comme dans « sept » (mot visé), pas comme le « se » d'un mot complet
  assert.equal(e[1].source, 'regles');             // la source reste « regles », jamais « lexique », pour un état intermédiaire
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

// Remarque de Virginie sur la voix (2026-11-21) : un état est lu avec les sons du MOT VISÉ, pas comme un mot complet.
test('petit : le e reste schwa quand on pose le t (avant : pè)', () => {
  const e = etatsDuMot('petit', lex);
  assert.equal(lecture(e[1]), 'p schwa');
  assert.equal(lecture(e[2]), 'p schwa t');         // avant : « p e_ouvert _ » (t final muet), le e changeait de son
  assert.equal(lecture(e[3]), 'p schwa t i');
});

test('lettre muette du mot visé : reste silencieuse (t de chat)', () => {
  const e = etatsDuMot('chat', lex);
  assert.equal(lecture(e[3]), 'ch a _');
});

test('mot absent du lexique : états lus selon la lecture par règles du mot entier (papa : le dernier p posé est dit)', () => {
  const e = etatsDuMot('papa', lex);
  assert.equal(lecture(e[2]), 'p a p');              // avant : « p a _ » (p final muet)
  assert.equal(e.at(-1).aVerifier, true);
});

test('graphème pas encore complet : lecture par règles de ses lettres (c de ch)', () => {
  const e = etatsDuMot('chat', lex);
  assert.equal(lecture(e[0]), 'k');                 // « c » seul
  assert.equal(lecture(e[1]), 'ch');                // « ch » complet
});
