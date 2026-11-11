import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { construireListeDepuisBrut } from '../../src/node/liste.js';

const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'liste-'));
const PARAMS = { id: 'essai', nom: 'Essai', source: 'test', licence: 'propre', niveaux: ['P1', 'P2'] };
const brut = d => {
  const f = path.join(d, 'brut.json');
  fs.writeFileSync(f, JSON.stringify([{ mot: 'chat', niveau: 'P1' }, { mot: 'août ou aout', niveau: 'P2' }, { mot: 'x', niveau: 'P9' }]));
  return f;
};

test('écrit data/listes/<id>.json et rend les avertissements', async () => {
  const d = dossier();
  const sortie = path.join(d, 'listes');
  const { liste, avertissements } = await construireListeDepuisBrut(brut(d), PARAMS, sortie);
  assert.equal(liste.entrees.length, 3);
  assert.deepEqual(avertissements, ['x : niveau inconnu « P9 »']);
  const relu = JSON.parse(fs.readFileSync(path.join(sortie, 'essai.json'), 'utf8'));
  assert.deepEqual(relu, liste);
});

test('source ou licence vide : erreur, rien d\'écrit', async () => {
  const d = dossier();
  const sortie = path.join(d, 'listes');
  await assert.rejects(construireListeDepuisBrut(brut(d), { ...PARAMS, source: '' }, sortie), /source/);
  assert.ok(!fs.existsSync(path.join(sortie, 'essai.json')));
});

test('fichier brut illisible', async () => {
  const d = dossier();
  const f = path.join(d, 'mauvais.json');
  fs.writeFileSync(f, 'pas du json');
  await assert.rejects(construireListeDepuisBrut(f, PARAMS, path.join(d, 'listes')), /illisible/);
  fs.writeFileSync(f, '{"a":1}');
  await assert.rejects(construireListeDepuisBrut(f, PARAMS, path.join(d, 'listes')), /illisible/);
});
