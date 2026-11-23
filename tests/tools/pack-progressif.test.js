import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirePack } from '../../tools/base/ajouter_pack_progressif.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(await readFile(path.join(RACINE, 'data', 'pack-progressif', 'paliers-p1.json'), 'utf8'));

test('pack progressif : 18 paliers, 93 mots distincts, annonces sans jargon', () => {
  assert.deepEqual(source.paliers.map(p => p.id), ['1', '2', '3', '4', '5', '6a', '6b', '6c', '6d', '6e', '6f', '7', '8', '9', '10', '11', '12', 'F']);
  const mots = source.paliers.flatMap(p => p.mots);
  assert.equal(mots.length, 93);
  assert.equal(new Set(mots).size, 93);
  for (const p of source.paliers) {
    assert.ok(p.annonce && p.annonce.length > 5, `annonce du palier ${p.id}`);
    assert.doesNotMatch(p.annonce, /CVC|décision/i);
  }
});

test('construirePack : identifiants de fiche dans l\'ordre des paliers, mot inconnu refusé', () => {
  const src = { paliers: [{ id: '1', difficulte: 'x', annonce: 'A', mots: ['été'] }, { id: '2', difficulte: 'y', annonce: 'B', mots: ['ami'] }] };
  const p = construirePack(src, [{ mot: 'ami', id: 'ami' }, { mot: 'été', id: 'ete' }]);
  assert.deepEqual(p.mots, ['ete', 'ami']);
  assert.deepEqual(p.manifeste.paliers[0], { id: '1', difficulte: 'x', annonce: 'A', mots: ['ete'] });
  assert.throws(() => construirePack(src, [{ mot: 'ami', id: 'ami' }]), /absent/);
});
