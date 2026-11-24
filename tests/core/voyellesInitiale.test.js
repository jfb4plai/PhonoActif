import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { VOYELLES_INITIALE, lettreInitiale, voyellesProposees } from '../../src/core/voyellesInitiale.js';

const fiches = JSON.parse(readFileSync(new URL('../../public/mots/fiches.json', import.meta.url), 'utf8'));
const mot = m => fiches.find(f => f.mot === m);

test('chaque son de voyelle a un fichier audio publié', () => {
  for (const [v, { fichier }] of Object.entries(VOYELLES_INITIALE)) assert.ok(existsSync(new URL(`../../public/mots/${fichier}`, import.meta.url)), `${v} : ${fichier} absent`);
});

test('le son de la lettre est celui du premier état du mot (ami, école, orange)', () => {
  for (const m of ['ami', 'école', 'orange']) assert.equal(mot(m).etats[0].fichier, VOYELLES_INITIALE[lettreInitiale(mot(m))].fichier, m);
});

test('lettreInitiale : voyelle seule retenue, digraphe et h muet écartés (catalogue réel)', () => {
  assert.deepEqual(['ami', 'âne', 'arbre', 'armoire', 'avec', 'avion'].map(m => lettreInitiale(mot(m))), ['a', 'a', 'a', 'a', 'a', 'a']);
  assert.deepEqual(['école', 'étoile', 'échelle'].map(m => lettreInitiale(mot(m))), ['é', 'é', 'é']);
  assert.equal(lettreInitiale(mot('orange')), 'o');
  assert.deepEqual(['univers', 'uniforme'].map(m => lettreInitiale(mot(m))), ['u', 'u']);
  assert.deepEqual(['imiter', 'identité', 'igloo', 'île'].map(m => lettreInitiale(mot(m))), ['i', 'i', 'i', 'i']);
  for (const m of ['eau', 'ours', 'oiseau', 'œuf', 'hibou', 'homme']) assert.equal(lettreInitiale(mot(m)), null, m);
});

test('voyellesProposees : 3 lettres distinctes, la bonne dedans, jamais a avec é, quel que soit le tirage', () => {
  for (const cible of Object.keys(VOYELLES_INITIALE)) {
    for (let k = 0; k < 200; k++) {
      const t = voyellesProposees(cible, Math.random);
      assert.equal(t.length, 3); assert.equal(new Set(t).size, 3); assert.ok(t.includes(cible));
      assert.ok(!(t.includes('a') && t.includes('é')), t.join());
    }
  }
  assert.equal(voyellesProposees('y'), null);
});

test('voyellesProposees : déterministe avec un rng fixe', () => {
  assert.deepEqual(voyellesProposees('a', () => 0), voyellesProposees('a', () => 0));
});
