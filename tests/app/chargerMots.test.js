import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMots } from '../../src/app/chargerMots.js';
import { urlFichier } from '../../src/app/urlFichier.js';

const carte = id => ({ id, mot: id, lettres: id.split(''), cubes: id.split('').map(g => ({ g, son: g })), etats: id.split('').map((_, i) => ({ lettres: id.slice(0, i + 1), fichier: `audio/${id}${i}.mp3` })) });
const FICHES = ['chat', 'lune', 'terre'].map(carte);
const fetchOk = (appels = []) => async url => { appels.push(url); return { ok: true, json: async () => FICHES }; };

test('chargerMots : les cartes suivent l’ordre des identifiants demandés', async () => {
  const appels = [];
  const { pack, avertissements } = await chargerMots(['terre', 'chat', 'lune'], { base: '/', fetch: fetchOk(appels) });
  assert.deepEqual(pack.cartes.map(c => c.id), ['terre', 'chat', 'lune']);
  assert.deepEqual(avertissements, []);
  assert.equal(pack.racine, 'mots');
  assert.equal(pack.mode, 'lettres');
  assert.deepEqual(appels, ['/mots/fiches.json']);
});

test('chargerMots : un identifiant retiré de la base est sauté avec un avertissement', async () => {
  const { pack, avertissements } = await chargerMots(['chat', 'disparu', 'lune'], { fetch: fetchOk() });
  assert.deepEqual(pack.cartes.map(c => c.id), ['chat', 'lune']);
  assert.deepEqual(avertissements, ['Mot retiré de la base : disparu']);
});

test('chargerMots : aucun mot trouvé → erreur française', async () => {
  await assert.rejects(chargerMots(['disparu'], { fetch: fetchOk() }), /Aucun des mots de cette tâche n'est disponible/);
});

test('chargerMots : réseau coupé ou fichier illisible → message français, jamais une exception brute', async () => {
  await assert.rejects(chargerMots(['chat'], { fetch: async () => { throw new Error('offline'); } }), /Les mots n'ont pas pu être chargés/);
  await assert.rejects(chargerMots(['chat'], { fetch: async () => ({ ok: false }) }), /Les mots n'ont pas pu être chargés/);
  await assert.rejects(chargerMots(['chat'], { fetch: async () => ({ ok: true, json: async () => { throw new Error('x'); } }) }), /Les mots n'ont pas pu être chargés/);
});

test('chargerMots : une liste vide est refusée', async () => {
  await assert.rejects(chargerMots([], { fetch: fetchOk() }), /Aucun mot à charger/);
});

test('urlFichier : base mots/ pour une liste, packs/<dossier>/ pour un ancien pack, segments encodés', () => {
  assert.equal(urlFichier('/', { racine: 'mots', nom: 'liste' }, 'audio/64_0.mp3'), '/mots/audio/64_0.mp3');
  assert.equal(urlFichier('https://x.fr/', { dossier: 'p1-100', nom: 'p1-100' }, 'images/chat.png'), 'https://x.fr/packs/p1-100/images/chat.png');
  assert.equal(urlFichier('/', { nom: 'Mon pack' }, 'images/é.png'), '/packs/Mon%20pack/images/%C3%A9.png');
});
