import test from 'node:test';
import assert from 'node:assert/strict';
import { lireRegles, etatsLettreParLettre, normaliserChaine, sonValide, composants } from '../../src/core/index.js';

const lire = mot => lireRegles(mot).map(c => c.son || '_').join(' ');
const sonsPlats = mot => lireRegles(mot).flatMap(c => composants(c.son)).join(' ');

test('mots réguliers et contexte (sons ManuLemme confirmés)', () => {
  assert.equal(lire('chat'), 'ch a _');
  assert.equal(lire('maison'), 'm e_ouvert z on');
  assert.equal(lire('rose'), 'r o_ferme z _');
  assert.equal(lire('table'), 't a b l schwa');   // e final après consonne + l : prononcé dans ManuLemme
  assert.equal(lire('vite'), 'v i t _');
  assert.equal(lire('le'), 'l schwa');
  assert.equal(lire('quel'), 'k e_ouvert l');
  assert.equal(lire('aller'), 'a l e_ferme _');
});

test('i devant voyelle : yod ; après consonne + liquide : i puis yod', () => {
  assert.equal(sonsPlats('bien'), 'b yod in');
  assert.equal(sonsPlats('crier'), 'k r i yod e_ferme');
  assert.equal(sonsPlats('rivière'), 'r i v yod e_ouvert r');
  assert.equal(sonsPlats('vie'), 'v i');
});

test('lettres finales muettes, nasales, -tion, ill', () => {
  assert.equal(sonsPlats('grand'), 'g r an');
  assert.equal(sonsPlats('dans'), 'd an');
  assert.equal(sonsPlats('attention'), 'a t an s yod on');
  assert.equal(sonsPlats('fille'), 'f i yod');
  assert.equal(sonsPlats('feuille'), 'f eu_ouvert yod');
  assert.equal(sonsPlats('soleil'), 's o_ouvert l e_ouvert yod');
  assert.equal(sonsPlats('bonne'), 'b o_ouvert n');
});

test('états du mode lettre par lettre : « maison » change rétroactivement', () => {
  const etats = etatsLettreParLettre('maison');
  assert.deepEqual(etats.map(e => e.lettres), ['m', 'ma', 'mai', 'mais', 'maiso', 'maison']);
  assert.equal(etats[1].cubes.map(c => c.son).join(' '), 'm a');
  assert.equal(etats[2].cubes.map(c => c.son).join(' '), 'm e_ouvert');      // a + i : « mè »
  assert.equal(etats[3].cubes.map(c => c.son).join(' '), 'm e_ouvert ');     // s final muet par règle
  assert.equal(etats[4].cubes.map(c => c.son).join(' '), 'm e_ouvert z o_ferme'); // maiso -> mèzo
  assert.equal(etats[5].cubes.map(c => c.son).join(' '), 'm e_ouvert z on'); // o devient on
});

test('une lettre seule se lit comme elle se dit, jamais muette', () => {
  assert.equal(lire('s'), 's');
  assert.equal(lire('t'), 't');
  assert.equal(lire('c'), 'k');
  assert.equal(lire('m'), 'm');
});

test('signalements : lettre finale muette par règle et e instable portent ambigu', () => {
  assert.ok(lireRegles('mais').some(c => c.g === 's' && c.ambigu));
  assert.ok(lireRegles('lup').some(c => c.g === 'p' && c.ambigu));
  assert.ok(lireRegles('petit').some(c => c.g === 'e' && c.ambigu));
  assert.ok(!lireRegles('lupa').some(c => c.ambigu));
});

test('tous les sons rendus sont des sons Lilémo valides, y compris sur des chaînes quelconques', () => {
  for (const mot of ['bonjour', 'ça', 'œuf', 'zzz', 'xyzw', 'aeiou', 'qu', 'gue', 'oyoy', 'ill', 'ail', 'œil', 'hôpital', 'été', 'a', 'é']) {
    for (const c of lireRegles(mot)) assert.ok(sonValide(c.son), `${mot} : son invalide « ${c.son} » pour ${c.g}`);
  }
});

test('normalisation : majuscules, apostrophes et signes ignorés, chaîne vide sans erreur', () => {
  assert.equal(normaliserChaine("L'Été!"), 'lété');
  assert.deepEqual(lireRegles(''), []);
});

test('m après voyelle : nasale seulement devant b ou p, sinon le m se prononce', () => {
  assert.equal(sonsPlats('pom'), 'p o_ouvert m');
  assert.equal(sonsPlats('pompe'), 'p on p');
  assert.equal(sonsPlats('lampe'), 'l an p');
  assert.equal(sonsPlats('ombre'), 'on b r schwa');
  assert.equal(sonsPlats('lam'), 'l a m');
  assert.equal(sonsPlats('tim'), 't i m');
});

test('sh (anglicisme) se lit comme ch ; ch devant r, l, n se lit k', () => {
  assert.equal(sonsPlats('short'), 'ch o_ouvert r');
  assert.equal(sonsPlats('chat'), 'ch a');
  assert.ok(sonsPlats('chrome').startsWith('k r'));  // le o de chrome reste mal lu (o ouvert/fermé : limite connue)
});
