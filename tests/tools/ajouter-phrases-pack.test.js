import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ajouterPhrases } from '../../tools/ajouter_phrases_pack.js';

async function monde() {
  const racine = await mkdtemp(path.join(tmpdir(), 'phono-phr-'));
  const pack = path.join(racine, 'public', 'packs', 'x');
  await mkdir(path.join(pack, 'audio'), { recursive: true });
  await mkdir(path.join(racine, 'data', 'packs-atelier', 'x'), { recursive: true });
  const carte = (mot, graphemes) => ({ id: mot, mot, lettres: [...mot], cubes: graphemes, etats: [] });
  await writeFile(path.join(pack, 'manifest.json'), JSON.stringify({ nom: 'x', mode: 'lettres', cartes: [
    carte('dans', [{ g: 'd', son: 'd' }, { g: 'an', son: 'an' }, { g: 's', son: '' }]),
    carte('avec', [{ g: 'a', son: 'a' }, { g: 'v', son: 'v' }, { g: 'e', son: 'e_ouvert' }, { g: 'c', son: 'k' }]),
    carte('plus', [{ g: 'p', son: 'p' }])
  ] }));
  await writeFile(path.join(racine, 'data', 'packs-atelier', 'x', 'phrases.json'), JSON.stringify({ dans: 'Le chat dort dans le panier.', avec: 'Je joue avec mon chien.', inconnu: 'Un mot absent du pack.' }));
  return { racine, pack };
}

test('ajouterPhrases : le fichier à produire est listé avec l’IPA du mot ; phraseAudio seulement si le fichier existe', async () => {
  const { racine, pack } = await monde();
  await writeFile(path.join(pack, 'audio', 'phrase-dans.mp3'), 'audio');
  const r = await ajouterPhrases({ racine, pack: 'x' });
  assert.deepEqual(r.ajoutes, ['dans']);
  assert.deepEqual(r.attente, ['avec']);
  assert.deepEqual(r.inconnus, ['inconnu']);
  const m = JSON.parse(await readFile(path.join(pack, 'manifest.json'), 'utf8'));
  assert.equal(m.cartes[0].phraseAudio, 'audio/phrase-dans.mp3');
  assert.equal(m.cartes[0].phrase, 'Le chat dort dans le panier.');
  assert.equal(m.cartes[1].phraseAudio, undefined);          // avec : pas encore d'audio
  assert.equal(m.cartes[1].phrase, 'Je joue avec mon chien.');
  assert.equal(m.cartes[2].phrase, undefined);               // plus : pas de phrase écrite
  const liste = JSON.parse(await readFile(path.join(racine, 'data', 'packs-atelier', 'x', 'phrases-a-generer.json'), 'utf8')).phrases;
  assert.deepEqual(liste.map(x => [x.mot, x.ipa, x.fichier]), [['dans', 'dɑ̃', 'audio/phrase-dans.mp3'], ['avec', 'avɛk', 'audio/phrase-avec.mp3']]);
});

test('ajouterPhrases : relancer ne change rien, --tout ajoute phraseAudio sans fichier', async () => {
  const { racine, pack } = await monde();
  await ajouterPhrases({ racine, pack: 'x' });
  const un = await readFile(path.join(pack, 'manifest.json'), 'utf8');
  await ajouterPhrases({ racine, pack: 'x' });
  assert.equal(await readFile(path.join(pack, 'manifest.json'), 'utf8'), un);
  const r = await ajouterPhrases({ racine, pack: 'x', tout: true });
  assert.deepEqual(r.ajoutes, ['dans', 'avec']);
});
