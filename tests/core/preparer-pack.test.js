import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, slugMot, preparerPack, validerPack } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const params = (plus = {}) => ({ nom: 'essai', mots: ['chat', 'lune'], source: 'listes de JF', licence: 'propre', lexique: lex, ...plus });
const fichiers = m => new Set(m.cartes.flatMap(c => [c.image_sans_mot, c.image_avec_mot]));

test('slugMot : accents retirés, séparateurs en tirets', () => {
  assert.equal(slugMot('pêche'), 'peche');
  assert.equal(slugMot("l'ami"), 'l-ami');
  assert.equal(slugMot('à côté'), 'a-cote');
  assert.equal(slugMot('cœur'), 'coeur');
  assert.equal(slugMot('arc-en-ciel'), 'arc-en-ciel');
  assert.equal(slugMot('!!!'), 'carte');
  assert.equal(slugMot(''), 'carte');
});

test('slugMot : deux mots au même nom de fichier ne s\'écrasent jamais', () => {
  const pris = new Set();
  assert.equal(slugMot('pêche', pris), 'peche');
  assert.equal(slugMot('peche', pris), 'peche-2');
  assert.equal(slugMot('pèche', pris), 'peche-3');
  assert.ok(pris.has('peche-3'));
});

test('preparerPack : une carte par mot, noms de fichiers attendus', () => {
  const { manifest } = preparerPack(params());
  assert.equal(manifest.nom, 'essai');
  assert.deepEqual(manifest.cartes.map(c => [c.id, c.mot, c.image_sans_mot, c.image_avec_mot]), [
    ['chat', 'chat', 'chat.png', 'chat-mot.png'], ['lune', 'lune', 'lune.png', 'lune-mot.png']
  ]);
  assert.ok(manifest.cartes.every(c => c.source === 'listes de JF' && c.licence === 'propre'));
});

test('le manifeste produit passe la validation du pack quand les images existent', () => {
  const { manifest } = preparerPack(params());
  assert.deepEqual(validerPack(manifest, fichiers(manifest), lex), { erreurs: [], avertissements: [] });
});

test('licence inconnue : avertissement de validation', () => {
  const { manifest } = preparerPack(params({ licence: 'inconnue' }));
  assert.ok(validerPack(manifest, fichiers(manifest), lex).avertissements.some(a => a.includes('licence à vérifier')));
});

test('source ou licence vide : erreur', () => {
  assert.throws(() => preparerPack(params({ source: '' })), /source/);
  assert.throws(() => preparerPack(params({ licence: ' ' })), /licence/);
  assert.throws(() => preparerPack(params({ nom: '' })), /nom/);
});

test('csv : BOM, en-tête, une ligne par carte, à vérifier oui ou non', () => {
  const { csv } = preparerPack(params({ mots: ['chat', 'zorbalon'], niveaux: { chat: 'P1' } }));
  assert.ok(csv.startsWith('﻿'));
  const lignes = csv.slice(1).split('\r\n');
  assert.equal(lignes.length, 3);
  assert.equal(lignes[0], 'mot;id;fichier sans mot;fichier avec mot;niveau;graphèmes proposés;à vérifier;adresse de la carte');
  assert.equal(lignes[1], 'chat;chat;chat.png;chat-mot.png;P1;ch.a.t;non;');
  assert.ok(lignes[2].startsWith('zorbalon;zorbalon;zorbalon.png;zorbalon-mot.png;;'));
  assert.ok(lignes[2].endsWith(';oui;'));
});

test('csv : un point-virgule ou un guillemet dans un mot est protégé', () => {
  const { csv } = preparerPack(params({ mots: ['a;b'] }));
  assert.ok(csv.includes('"a;b";'));
});

test('mots en double : une seule carte par mot', () => {
  const { manifest } = preparerPack(params({ mots: ['chat', 'Chat ', 'lune'] }));
  assert.deepEqual(manifest.cartes.map(c => c.mot), ['chat', 'lune']);
});

test('noms de fichiers uniques même pour des mots proches', () => {
  const { manifest } = preparerPack(params({ mots: ['pêche', 'peche'] }));
  const noms = manifest.cartes.flatMap(c => [c.image_sans_mot, c.image_avec_mot]);
  assert.equal(new Set(noms).size, noms.length);
});
