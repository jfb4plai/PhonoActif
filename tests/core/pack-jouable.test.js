import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, preparerPack, validerPackJouable } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const params = (plus = {}) => ({ nom: 'essai', mots: ['chat', 'lune'], source: 'listes de JF', licence: 'propre', lexique: lex, ...plus });
const fichiersDe = m => new Set(m.cartes.flatMap(c => [c.image_sans_mot, c.image_avec_mot]));
const SONS = new Set(['ch', 'a', 'l', 'u', 'n', 'p', 'in']);
const lire = c => c.cubes.map(x => x.g + '=' + (x.son === null ? '?' : x.son)).join(' ');

test('preparerPack : les cubes de chaque carte, le mot à vérifier', () => {
  const { manifest } = preparerPack(params({ mots: ['chat', 'zorbalon', 'examen'] }));
  const [chat, zor, exa] = manifest.cartes;
  assert.equal(lire(chat), 'ch=ch a=a t=');
  assert.equal(chat.aVerifier, false);
  assert.equal(zor.aVerifier, true);
  assert.ok(exa.cubes.some(c => c.son === null));
  assert.equal(exa.aVerifier, true);
});

test('csv : colonne « adresse de la carte »', () => {
  const avec = preparerPack(params({ baseUrl: 'https://exemple.test/' })).csv.slice(1).split('\r\n');
  assert.ok(avec[0].endsWith(';adresse de la carte'));
  assert.ok(avec[1].endsWith(';https://exemple.test/#/carte/essai/chat'));
  const sans = preparerPack(params()).csv.slice(1).split('\r\n');
  assert.ok(sans[0].endsWith(';adresse de la carte'));
  assert.ok(sans[1].endsWith(';'));
});

test('validerPackJouable : pack complet sans message', () => {
  const { manifest } = preparerPack(params());
  assert.deepEqual(validerPackJouable(manifest, fichiersDe(manifest), SONS), { erreurs: [], avertissements: [] });
});

test('son sans fichier : un seul avertissement par son', () => {
  const { manifest } = preparerPack(params({ mots: ['chat', 'maman'] }));
  const r = validerPackJouable(manifest, fichiersDe(manifest), new Set(['ch', 'm', 'an']));
  assert.deepEqual(r.erreurs, []);
  assert.deepEqual(r.avertissements.filter(a => a === 'son sans fichier : a'), ['son sans fichier : a']);
});

test('carte à vérifier ou à cube sans son : erreurs', () => {
  const { manifest } = preparerPack(params({ mots: ['examen'] }));
  const r = validerPackJouable(manifest, fichiersDe(manifest), SONS);
  assert.ok(r.erreurs.some(e => e.includes('cube sans son : x')));
  assert.ok(r.erreurs.some(e => e.includes('carte à vérifier : passer par la revue')));
});

test('cubes manquants, invalides ou qui ne recomposent pas le mot', () => {
  const { manifest } = preparerPack(params());
  const m1 = structuredClone(manifest); delete m1.cartes[0].cubes;
  assert.ok(validerPackJouable(m1, fichiersDe(m1), SONS).erreurs.some(e => e.includes('c' + 'hat : cubes manquants') || e.includes('cubes manquants')));
  const m2 = structuredClone(manifest); m2.cartes[0].cubes[0].son = 'zz';
  assert.ok(validerPackJouable(m2, fichiersDe(m2), SONS).erreurs.some(e => e.includes('son invalide : zz')));
  const m3 = structuredClone(manifest); m3.cartes[0].cubes.pop();
  assert.ok(validerPackJouable(m3, fichiersDe(m3), SONS).erreurs.some(e => e.includes('les cubes ne recomposent pas le mot')));
});

test('les erreurs ordinaires du pack restent signalées (image manquante)', () => {
  const { manifest } = preparerPack(params());
  const r = validerPackJouable(manifest, new Set(), SONS);
  assert.ok(r.erreurs.some(e => e.includes('image sans mot introuvable')));
});

test('pas de bruit de segmentation ni de multi-mots dans les avertissements', () => {
  const { manifest } = preparerPack(params());
  const r = validerPackJouable(manifest, fichiersDe(manifest), SONS);
  assert.ok(!r.avertissements.some(a => a.includes('segmentation à vérifier')));
});
