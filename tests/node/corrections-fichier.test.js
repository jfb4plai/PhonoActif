import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chargerCorrections, enregistrerCorrections, importerCorrections } from '../../src/node/corrections.js';

const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'phono-'));
const soleil = (plus = {}) => ({
  mot: 'soleil',
  cubes: [{ g: 's', son: 's' }, { g: 'o', son: 'o_ferme' }, { g: 'l', son: 'l' }, { g: 'eil', son: 'e_ouvert+yod' }],
  statut: 'corrige', auteur: 'JF', date: '2026-11-11', raison: 'eil = /ɛj/', ...plus
});
const bien = (plus = {}) => ({ mot: 'bien', cubes: [{ g: 'bien', son: 'b+i+in' }], statut: 'valide', auteur: 'JF', date: '2026-11-11', raison: '', ...plus });

test('écrire puis relire : même contenu, trié par mot', async () => {
  const f = path.join(dossier(), 'corrections.json');
  await enregistrerCorrections(f, [soleil(), bien()]);
  const { corrections, rejets } = await chargerCorrections(f);
  assert.deepEqual(corrections.liste.map(c => c.mot), ['bien', 'soleil']);
  assert.deepEqual(rejets, []);
  assert.ok(fs.readFileSync(f, 'utf8').includes('ɛj'));
});

test('aucun fichier temporaire après écriture', async () => {
  const d = dossier();
  await enregistrerCorrections(path.join(d, 'corrections.json'), [soleil()]);
  assert.deepEqual(fs.readdirSync(d), ['corrections.json']);
});

test('fichier absent : aucune correction, pas d\'erreur', async () => {
  const { corrections, rejets } = await chargerCorrections(path.join(dossier(), 'absent.json'));
  assert.equal(corrections.taille, 0);
  assert.deepEqual(rejets, []);
});

test('JSON invalide ou pas un tableau : erreur « illisible »', async () => {
  const d = dossier();
  fs.writeFileSync(path.join(d, 'a.json'), '{ pas du json');
  fs.writeFileSync(path.join(d, 'b.json'), '{"x":1}');
  await assert.rejects(chargerCorrections(path.join(d, 'a.json')), /illisible/);
  await assert.rejects(chargerCorrections(path.join(d, 'b.json')), /illisible/);
});

test('une correction invalide du fichier est rendue dans les rejets, les valides sont chargées', async () => {
  const f = path.join(dossier(), 'c.json');
  fs.writeFileSync(f, JSON.stringify([soleil(), bien({ statut: 'zz' })]));
  const { corrections, rejets } = await chargerCorrections(f);
  assert.equal(corrections.taille, 1);
  assert.equal(rejets[0].mot, 'bien');
});

test('importer : fusion avec l\'existant, un a_valider plus récent n\'écrase pas un corrigé', async () => {
  const d = dossier();
  const data = path.join(d, 'data.json'), imp = path.join(d, 'import.json');
  await enregistrerCorrections(data, [soleil({ date: '2026-01-01', raison: 'ancienne' })]);
  fs.writeFileSync(imp, JSON.stringify([soleil({ statut: 'a_valider', date: '2026-11-11', raison: '' }), bien()]));
  const r = await importerCorrections(data, imp);
  assert.equal(r.importees, 2);
  assert.deepEqual(r.rejetees, []);
  const { corrections } = await chargerCorrections(data);
  assert.equal(corrections.chercher('soleil').statut, 'corrige');
  assert.equal(corrections.chercher('bien').statut, 'valide');
});

test('importer : une correction invalide est rejetée avec ses erreurs, les autres sont importées', async () => {
  const d = dossier();
  const data = path.join(d, 'data.json'), imp = path.join(d, 'import.json');
  fs.writeFileSync(imp, JSON.stringify([soleil(), bien({ auteur: '' })]));
  const r = await importerCorrections(data, imp);
  assert.equal(r.importees, 1);
  assert.equal(r.rejetees[0].mot, 'bien');
  assert.ok(r.rejetees[0].erreurs.some(e => e.includes('auteur manquant')));
});

test('importer : fichier d\'import illisible, rien n\'est écrit', async () => {
  const d = dossier();
  const data = path.join(d, 'data.json'), imp = path.join(d, 'import.json');
  await enregistrerCorrections(data, [soleil()]);
  const avant = fs.readFileSync(data, 'utf8');
  fs.writeFileSync(imp, 'pas du json');
  await assert.rejects(importerCorrections(data, imp), /illisible/);
  assert.equal(fs.readFileSync(data, 'utf8'), avant);
});

test('importer : le fichier existant contient une correction invalide, on refuse de le réécrire', async () => {
  const d = dossier();
  const data = path.join(d, 'data.json'), imp = path.join(d, 'import.json');
  fs.writeFileSync(data, JSON.stringify([soleil(), bien({ statut: 'zz' })]));
  fs.writeFileSync(imp, JSON.stringify([soleil()]));
  const avant = fs.readFileSync(data, 'utf8');
  await assert.rejects(importerCorrections(data, imp), /invalides/);
  assert.equal(fs.readFileSync(data, 'utf8'), avant);
});
