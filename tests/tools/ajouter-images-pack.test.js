import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ajouterImages, SOURCE_PAR_DEFAUT, LICENCE_PAR_DEFAUT } from '../../tools/ajouter_images_pack.js';

async function monde() {
  const racine = await mkdtemp(path.join(tmpdir(), 'phono-img-'));
  await mkdir(path.join(racine, 'public', 'packs', 'x'), { recursive: true });
  await writeFile(path.join(racine, 'public', 'packs', 'x', 'manifest.json'), JSON.stringify({ nom: 'x', mode: 'lettres', cartes: [{ id: 'école', mot: 'école' }, { id: 'dans', mot: 'dans' }, { id: 'rivière', mot: 'rivière' }] }));
  const a = path.join(racine, 'a'), b = path.join(racine, 'b');
  await mkdir(a); await mkdir(b);
  await writeFile(path.join(a, 'ecole.png'), 'A-ecole');
  await writeFile(path.join(b, 'ecole.png'), 'B-ecole');
  await writeFile(path.join(b, 'riviere.png'), 'B-riviere');
  return { racine, a, b };
}

test('ajouterImages : le fichier est cherché sans accent, le premier dossier l’emporte, les mots sans image restent intacts', async () => {
  const { racine, a, b } = await monde();
  const r = await ajouterImages({ racine, pack: 'x', dossiers: [a, b] });
  assert.deepEqual(r.avec, ['école', 'rivière']);
  assert.deepEqual(r.sans, ['dans']);
  const m = JSON.parse(await readFile(path.join(racine, 'public', 'packs', 'x', 'manifest.json'), 'utf8'));
  const [ecole, dans, riviere] = m.cartes;
  assert.equal(ecole.image_sans_mot, 'images/ecole.png');
  assert.equal(ecole.source, SOURCE_PAR_DEFAUT);
  assert.equal(ecole.licence, LICENCE_PAR_DEFAUT);
  assert.equal(riviere.image_sans_mot, 'images/riviere.png');
  assert.equal(dans.image_sans_mot, undefined);
  assert.equal(await readFile(path.join(racine, 'public', 'packs', 'x', 'images', 'ecole.png'), 'utf8'), 'A-ecole');
  assert.deepEqual((await readdir(path.join(racine, 'public', 'packs', 'x', 'images'))).sort(), ['ecole.png', 'riviere.png']);
});

test('ajouterImages : relancer ne change rien (idempotent)', async () => {
  const { racine, a, b } = await monde();
  await ajouterImages({ racine, pack: 'x', dossiers: [a, b] });
  const un = await readFile(path.join(racine, 'public', 'packs', 'x', 'manifest.json'), 'utf8');
  await ajouterImages({ racine, pack: 'x', dossiers: [a, b] });
  assert.equal(await readFile(path.join(racine, 'public', 'packs', 'x', 'manifest.json'), 'utf8'), un);
});
