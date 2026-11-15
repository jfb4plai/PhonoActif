import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilerPack } from '../../tools/base/compiler.js';
import { identifiantCarte } from '../../src/core/packAtelier.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKS = ['p1-100', 'p1-20-images', 'p1-illustre-2', 'p1-illustre-3', 'p1-illustre-4', 'p1-illustre-5'];
// Les 20 mots communs à p1-100 et p1-20-images (constat : tous reçoivent `niveau: 'P1'` ; 11 reçoivent aussi `syllabes`).
const MOTS_COMMUNS = ['chat', 'maison', 'chien', 'voiture', 'poisson', 'vélo', 'porte', 'neige', 'loup', 'tortue', 'forêt', 'souris', 'sac', 'table', 'lune', 'pomme', 'ours', 'livre', 'rat', 'eau'];
const MOTS_AVEC_SYLLABES_AJOUTEES = ['chat', 'eau', 'chien', 'ours', 'neige', 'porte', 'loup', 'sac', 'lune', 'pomme', 'rat'];
const FICHIERS = c => [c.image_sans_mot, c.image_avec_mot, c.phraseAudio, c.audio_mot, ...(c.etats || []).map(e => e.fichier), ...(c.syllabes || []).map(s => s.fichier)].filter(Boolean);

for (const idPack of PACKS) {
  test(`compilerPack ${idPack} : manifeste équivalent à public/packs, fichiers identiques octet pour octet`, async () => {
    const sortie = await mkdtemp(path.join(tmpdir(), 'phono-compile-'));
    const { manifest } = await compilerPack({ racine: RACINE, idPack, sortie });
    const original = JSON.parse(await readFile(path.join(RACINE, 'public', 'packs', idPack, 'manifest.json'), 'utf8'));
    const { cartes: cartesO, ...enteteO } = original;
    const { cartes, ...entete } = manifest;
    assert.deepEqual(entete, enteteO);
    assert.equal(cartes.length, cartesO.length);
    cartes.forEach((c, i) => {
      const o = cartesO[i];
      assert.equal(c.mot, o.mot, 'ordre des cartes conservé');
      assert.equal(c.id, identifiantCarte(o.mot), 'identifiant ASCII');
      const { id: _a, syllabes: sc, ...resteC } = c;
      const { id: _b, syllabes: so, ...resteO } = o;
      // Ruling (Task 2) : l'union des champs ajoute aussi `niveau: 'P1'` (présent dans p1-20-images) aux 20 mots communs de p1-100.
      if (idPack === 'p1-100' && MOTS_COMMUNS.includes(o.mot) && resteO.niveau === undefined && resteC.niveau === 'P1') delete resteC.niveau;
      assert.deepEqual(resteC, resteO, `carte ${o.mot}`);
      if (JSON.stringify(sc) !== JSON.stringify(so)) {
        assert.ok(idPack === 'p1-100' && so === undefined && MOTS_AVEC_SYLLABES_AJOUTEES.includes(o.mot), `syllabes différentes non prévues : ${idPack}/${o.mot}`);
      }
    });
    for (const c of cartes) for (const f of FICHIERS(c)) {
      await access(path.join(sortie, f));
      const orig = path.join(RACINE, 'public', 'packs', idPack, f);
      const existe = await access(orig).then(() => true, () => false);
      if (existe) assert.equal((await readFile(path.join(sortie, f))).compare(await readFile(orig)), 0, `octets différents : ${f}`);
    }
  });
}
