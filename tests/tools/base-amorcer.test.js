import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fusionnerCartes, amorcer } from '../../tools/base/amorcer.js';

const carte = (extra = {}) => ({ id: 'chat', mot: 'chat', lettres: ['c', 'h', 'a', 't'], cubes: [{ g: 'ch', son: 'ch' }], etats: [], phrase: 'Le chat boit du lait.', ...extra });

test('fusionnerCartes : la fiche la plus complète (avec syllabes) l’emporte, sans conflit', () => {
  const { fiche, conflits } = fusionnerCartes([['p1-100', carte()], ['p1-20-images', carte({ syllabes: [{ ipa: 'ʃa', fichier: 'audio/x.mp3', cubes: 2 }] })]]);
  assert.deepEqual(conflits, []);
  assert.equal(fiche.syllabes.length, 1);
  assert.equal(fiche.statut, 'valide');
  assert.deepEqual(fiche.origine, ['p1-100', 'p1-20-images']);
});

test('fusionnerCartes : une phrase différente est un conflit nommé', () => {
  const { conflits } = fusionnerCartes([['a', carte()], ['b', carte({ phrase: 'Autre phrase.' })]]);
  assert.deepEqual(conflits, ['chat : phrase']);
});

test('amorcer : deux mots qui donnent le même identifiant (là / la) sont un conflit, pas deux fiches silencieuses', async () => {
  const racine = await mkdtemp(path.join(tmpdir(), 'phono-ids-'));
  await mkdir(path.join(racine, 'public', 'packs', 'p'), { recursive: true });
  await writeFile(path.join(racine, 'public', 'packs', 'index.json'), JSON.stringify([{ id: 'p', label: 'P' }]));
  const c = mot => ({ id: mot, mot, lettres: [...mot], cubes: [{ g: mot, son: 'a' }], etats: [], phrase: 'x' });
  await writeFile(path.join(racine, 'public', 'packs', 'p', 'manifest.json'), JSON.stringify({ nom: 'p', mode: 'lettres', cartes: [c('là'), c('la')] }));
  const { conflits } = await amorcer({ racine, ecrire: false });
  assert.ok(conflits.some(x => /identifiant en double : la \(là, la\)/.test(x)), conflits.join(' | '));
});
