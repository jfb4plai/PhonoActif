import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publier } from '../../tools/base/publier.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lire = async f => JSON.parse(await readFile(f, 'utf8'));

test('publier : seules les fiches au statut « valide » sont servies, avec leurs fichiers', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'phono-b-'));
  const sortie = await mkdtemp(path.join(tmpdir(), 'phono-s-'));
  const fiche = (id, statut) => ({ id, mot: id, lettres: id.split(''), cubes: id.split('').map(g => ({ g, son: g })), etats: [{ lettres: id, fichier: `audio/${id}.mp3` }], phrase: 'P.', phraseAudio: `audio/phrase-${id}.mp3`, statut, origine: ['p'] });
  await mkdir(path.join(base, 'assets', 'audio'), { recursive: true });
  for (const f of ['audio/ab.mp3', 'audio/phrase-ab.mp3', 'audio/cd.mp3', 'audio/phrase-cd.mp3']) await writeFile(path.join(base, 'assets', f), 'x');
  await writeFile(path.join(base, 'fiches.json'), JSON.stringify([fiche('ab', 'valide'), fiche('cd', 'a-verifier')]));
  await writeFile(path.join(base, 'packs.json'), JSON.stringify([{ id: 'p', entree: { id: 'p', label: 'Pack P' }, manifeste: { nom: 'p' }, mots: ['ab', 'cd'] }]));
  const r = await publier({ racine: RACINE, base, sortie });
  assert.equal(r.nbMots, 1);
  assert.deepEqual((await lire(path.join(sortie, 'catalogue.json'))).map(c => c.id), ['ab']);
  assert.deepEqual((await lire(path.join(sortie, 'modeles.json'))), [{ id: 'p', titre: 'Pack P', mots: ['ab'] }]);
  await access(path.join(sortie, 'audio', 'ab.mp3'));
  await assert.rejects(access(path.join(sortie, 'audio', 'cd.mp3')));
});

test('publier sur la vraie base : au moins 156 mots triés, fiches < 600 Ko, tout fichier cité présent, modèle p1-100 de 101 mots', async () => {
  const sortie = await mkdtemp(path.join(tmpdir(), 'phono-mots-'));
  const r = await publier({ racine: RACINE, sortie });
  assert.ok(r.nbMots >= 156, `${r.nbMots} mots publiés`);
  const catalogue = await lire(path.join(sortie, 'catalogue.json'));
  assert.deepEqual(catalogue.map(c => c.mot), [...catalogue.map(c => c.mot)].sort((a, b) => a.localeCompare(b, 'fr')));
  const chat = catalogue.find(c => c.id === 'chat');
  assert.deepEqual({ ...chat, packs: undefined }, { id: 'chat', mot: 'chat', ipa: 'ʃa', nbSyllabes: 1, cubes: ['ch', 'a', 't'], sons: ['ch', 'a'], image: true, phrase: true, syllabes: true, audio: chat.audio, packs: undefined });
  assert.match(chat.audio, /^audio\/.+\.mp3$/); // fichier du mot entier (dernier état), pour le bouton « Écouter » du catalogue
  assert.ok((await stat(path.join(sortie, 'fiches.json'))).size < 600 * 1024);
  const fiches = await lire(path.join(sortie, 'fiches.json'));
  for (const f of fiches) for (const fichier of [f.image_sans_mot, f.phraseAudio, ...f.etats.map(e => e.fichier)].filter(Boolean)) await access(path.join(sortie, fichier));
  const modeles = await lire(path.join(sortie, 'modeles.json'));
  assert.equal(modeles.find(m => m.id === 'p1-100').mots.length, 101);
});

test('publier refuse une base qui contient deux fiches de même identifiant', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'phono-b-'));
  const sortie = await mkdtemp(path.join(tmpdir(), 'phono-s-'));
  const f = mot => ({ id: 'la', mot, lettres: [...mot], cubes: [{ g: mot, son: 'a' }], etats: [], statut: 'valide', origine: ['p'] });
  await writeFile(path.join(base, 'fiches.json'), JSON.stringify([f('là'), f('la')]));
  await writeFile(path.join(base, 'packs.json'), '[]');
  await assert.rejects(publier({ racine: RACINE, base, sortie }), /identifiant en double : la/);
});

test('la base (data/base) est cohérente : au moins 156 fiches valides, identifiants ASCII uniques, fichiers présents, 6 modèles', async () => {
  const fiches = await lire(path.join(RACINE, 'data', 'base', 'fiches.json'));
  assert.equal(new Set(fiches.map(f => f.id)).size, fiches.length);
  for (const f of fiches) { assert.match(f.id, /^[a-z0-9-]{1,60}$/); assert.ok(['valide', 'brouillon'].includes(f.statut), `${f.id} : statut ${f.statut}`); }
  const valides = fiches.filter(f => f.statut === 'valide');
  assert.ok(valides.length >= 156, `${valides.length} fiches valides`);
  // une fiche « valide » est servie : tous ses fichiers doivent exister (un brouillon peut en attendre : audio à générer)
  const fichiers = f => [f.image_sans_mot, f.phraseAudio, ...(f.etats || []).map(e => e.fichier), ...(f.syllabes || []).map(s => s.fichier)].filter(Boolean);
  for (const f of valides) for (const x of fichiers(f)) assert.ok(existsSync(path.join(RACINE, 'data', 'base', 'assets', x)), `${f.id} : fichier absent ${x}`);
  const packs = await lire(path.join(RACINE, 'data', 'base', 'packs.json'));
  assert.deepEqual(packs.map(p => p.id), ['p1-100', 'p1-20-images', 'p1-illustre-2', 'p1-illustre-3', 'p1-illustre-4', 'p1-illustre-5']);
});
