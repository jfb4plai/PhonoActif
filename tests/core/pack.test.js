import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, validerPack } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);

const carte = (mot, plus = {}) => ({
  id: `c-${mot}`, mot, image_sans_mot: `${mot}.png`, image_avec_mot: `${mot}-mot.png`,
  source: 'images de JF', licence: 'propre', ...plus
});
const fichiersDe = cartes => new Set(cartes.flatMap(c => [c.image_sans_mot, c.image_avec_mot].filter(Boolean)));
const valider = (cartes, fichiers = fichiersDe(cartes)) => validerPack({ nom: 'essai', cartes }, fichiers, lex);
const contient = (liste, texte) => liste.some(m => m.includes(texte));

test('pack valide : aucune erreur, aucun avertissement', () => {
  const r = valider([carte('chat'), carte('lune')]);
  assert.deepEqual(r, { erreurs: [], avertissements: [] });
});

test('erreur : id vide et id en double', () => {
  assert.ok(contient(valider([carte('chat', { id: '' })]).erreurs, 'id'));
  const r = valider([carte('chat', { id: 'x' }), carte('lune', { id: 'x' })]);
  assert.ok(contient(r.erreurs, 'x : id en double'));
});

test('erreur : mot vide', () => {
  assert.ok(contient(valider([carte('chat', { mot: '  ' })]).erreurs, 'c-chat : mot vide'));
});

test('erreur : image sans mot absente, une erreur par carte quand aucun fichier', () => {
  const r = valider([carte('chat'), carte('lune')], new Set());
  assert.equal(r.erreurs.filter(e => e.includes('image sans mot introuvable')).length, 2);
});

test('erreur : image avec mot déclarée mais absente', () => {
  const c = carte('chat');
  const r = valider([c], new Set([c.image_sans_mot]));
  assert.ok(contient(r.erreurs, 'c-chat : image avec mot introuvable'));
});

test('erreur : les deux faces sont le même fichier', () => {
  const r = valider([carte('chat', { image_avec_mot: 'chat.png' })]);
  assert.ok(contient(r.erreurs, 'c-chat : image avec mot identique à image sans mot'));
});

test('erreur : source ou licence vide', () => {
  assert.ok(contient(valider([carte('chat', { source: '' })]).erreurs, 'c-chat : source manquante'));
  assert.ok(contient(valider([carte('chat', { licence: ' ' })]).erreurs, 'c-chat : licence manquante'));
});

test('erreur : graphèmes fournis qui ne recomposent pas le mot', () => {
  const r = valider([carte('chat', { graphemes: 'c-h-a' })]);
  assert.ok(contient(r.erreurs, 'c-chat : graphèmes ne recomposent pas le mot'));
  assert.deepEqual(valider([carte('chat', { graphemes: 'ch-a-t' })]).erreurs, []);
});

test('avertissement : pas d\'image avec mot', () => {
  const c = carte('chat'); delete c.image_avec_mot;
  const r = valider([c]);
  assert.deepEqual(r.erreurs, []);
  assert.ok(contient(r.avertissements, 'c-chat : mode avec mot indisponible pour cette carte'));
});

test('avertissement : mot absent du lexique sans graphèmes', () => {
  const r = valider([carte('zorbalon')]);
  assert.ok(contient(r.avertissements, 'c-zorbalon : segmentation à vérifier'));
  assert.ok(!contient(valider([carte('zorbalon', { graphemes: 'z-o-r-b-a-l-on' })]).avertissements, 'segmentation'));
});

test('avertissement : mot en double dans le pack', () => {
  const r = valider([carte('chat', { id: 'a' }), carte('Chat', { id: 'b' })]);
  assert.ok(contient(r.avertissements, 'b : mot en double dans le pack'));
});

test('avertissement : licence inconnue', () => {
  assert.ok(contient(valider([carte('chat', { licence: 'inconnue' })]).avertissements, 'c-chat : licence à vérifier'));
});

test('pack vide ou sans cartes, pas d\'exception', () => {
  assert.ok(contient(valider([]).erreurs, 'pack vide'));
  assert.ok(contient(validerPack({ nom: 'x' }, new Set(), lex).erreurs, 'pack vide'));
  assert.ok(contient(validerPack(undefined, new Set(), lex).erreurs, 'pack vide'));
});
