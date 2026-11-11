import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { chargerPack } from '../../src/app/chargerPack.js';
import { jouerSons } from '../../src/app/audio.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const manifest = preparerPack({ nom: 'essai', mots: ['chat', 'lune'], source: 's', licence: 'l', lexique: lex }).manifest;
const reponse = (corps, ok = true) => async () => ({ ok, status: ok ? 200 : 404, json: async () => { if (corps instanceof Error) throw corps; return corps; } });

test('manifeste valide chargé, adresse lue sous <base>packs/<nom>/manifest.json', async () => {
  let url;
  const { pack, avertissements } = await chargerPack('essai', { base: '/app/', fetch: async u => { url = u; return { ok: true, json: async () => manifest }; } });
  assert.equal(url, '/app/packs/essai/manifest.json');
  assert.equal(pack.nom, 'essai');
  assert.equal(pack.cartes.length, 2);
  assert.deepEqual(avertissements, []);
});

test('introuvable : 404 ou réseau en panne', async () => {
  await assert.rejects(chargerPack('x', { fetch: reponse({}, false) }), /pack « x » introuvable/);
  await assert.rejects(chargerPack('x', { fetch: async () => { throw new Error('réseau'); } }), /pack « x » introuvable/);
});

test('invalide : JSON illisible, tableau absent, carte sans cubes', async () => {
  await assert.rejects(chargerPack('x', { fetch: reponse(new Error('json')) }), /pack « x » invalide/);
  await assert.rejects(chargerPack('x', { fetch: reponse({ nom: 'x' }) }), /pack « x » invalide/);
  const sansCubes = structuredClone(manifest); delete sansCubes.cartes[0].cubes;
  await assert.rejects(chargerPack('x', { fetch: reponse(sansCubes) }), /pack « x » invalide : .*cubes manquants/);
});

test('une carte à vérifier rend le pack invalide', async () => {
  const m = preparerPack({ nom: 'p', mots: ['examen'], source: 's', licence: 'l', lexique: lex }).manifest;
  await assert.rejects(chargerPack('p', { fetch: reponse(m) }), /invalide/);
});

test('son sans fichier : avertissement rendu', async () => {
  const { avertissements } = await chargerPack('essai', { fetch: reponse(manifest), sonsDisponibles: new Set(['ch', 'l', 'u', 'n']) });
  assert.ok(avertissements.includes('son sans fichier : a'));
});

// --- audio ---
const faux = (comportement, journal) => url => {
  const a = { onended: null, onerror: null };
  a.play = () => {
    journal.push(url);
    if (comportement === 'ok') { queueMicrotask(() => a.onended && a.onended()); return Promise.resolve(); }
    if (comportement === 'refus') return Promise.reject(new Error('NotAllowedError'));
    queueMicrotask(() => a.onerror && a.onerror()); return Promise.resolve();
  };
  return a;
};

test('jouerSons : joue dans l\'ordre, adresse /sons/<id>.wav', async () => {
  const j = [];
  const r = await jouerSons(['ch', 'a'], { creerAudio: faux('ok', j) });
  assert.deepEqual(j, ['/sons/ch.wav', '/sons/a.wav']);
  assert.deepEqual(r, { manquants: [] });
});

test('jouerSons : lecture refusée ou fichier absent : dans manquants, sans exception', async () => {
  assert.deepEqual((await jouerSons(['a'], { creerAudio: faux('refus', []) })).manquants, ['a']);
  assert.deepEqual((await jouerSons(['a', 'b'], { creerAudio: faux('erreur', []) })).manquants, ['a', 'b']);
  const casse = () => { throw new Error('Audio indisponible'); };
  assert.deepEqual((await jouerSons(['a'], { creerAudio: casse })).manquants, ['a']);
});

test('jouerSons : liste vide résolue tout de suite', async () => {
  assert.deepEqual(await jouerSons([], { creerAudio: faux('ok', []) }), { manquants: [] });
});

test('jouerSons : un nouvel appel interrompt le précédent', async () => {
  const j = [];
  const lent = url => {
    const a = { onended: null, onerror: null };
    a.play = () => { j.push(url); setTimeout(() => a.onended && a.onended(), 5); return Promise.resolve(); };
    return a;
  };
  const premier = jouerSons(['a', 'b', 'c'], { creerAudio: lent });
  await new Promise(r => setTimeout(r, 1));
  const second = jouerSons(['z'], { creerAudio: lent });
  await Promise.all([premier, second]);
  assert.ok(j.includes('/sons/a.wav') && j.includes('/sons/z.wav'));
  assert.ok(!j.includes('/sons/c.wav'));
});
