import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fusionnerCartes, amorcer } from '../../tools/base/amorcer.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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

test('amorcer (sans écrire) sur les vrais packs publics : 156 fiches, 6 packs, aucun conflit, fichiers présents', async () => {
  const { fiches, packs, conflits } = await amorcer({ racine: RACINE, ecrire: false });
  assert.deepEqual(conflits, []);
  assert.equal(fiches.length, 156);
  assert.equal(packs.length, 6);
  const p100 = packs.find(p => p.id === 'p1-100');
  assert.equal(p100.mots.length, 100);
  assert.equal(new Set(p100.mots).size, 100);
  const ids = new Set(fiches.map(f => f.id));
  for (const f of fiches) assert.match(f.id, /^[a-z0-9-]+$/, `identifiant non ASCII : ${f.id}`); // la base SQL des listes n'accepte que [a-z0-9-]
  for (const p of packs) for (const m of p.mots) assert.ok(ids.has(m), `${p.id} cite ${m} sans fiche`);
});

test('amorcer écrit data/base avec les fichiers audio et images de chaque fiche', async () => {
  const sortie = await mkdtemp(path.join(tmpdir(), 'phono-base-'));
  const { fiches } = await amorcer({ racine: RACINE, sortie });
  const lues = JSON.parse(await readFile(path.join(sortie, 'fiches.json'), 'utf8'));
  assert.equal(lues.length, fiches.length);
  const chat = lues.find(f => f.id === 'chat');
  await stat(path.join(sortie, 'assets', chat.image_sans_mot));
  await stat(path.join(sortie, 'assets', chat.phraseAudio));
  await stat(path.join(sortie, 'assets', chat.etats[0].fichier));
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
