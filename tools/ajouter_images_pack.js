// Ajoute des images à un pack déjà fabriqué : pour chaque carte dont un fichier <mot sans accent>.png existe dans l'un des dossiers donnés,
// copie l'image dans public/packs/<pack>/images/ et renseigne image_sans_mot, source et licence. Les cartes sans image ne changent pas.
// Idempotent : on peut relancer après chaque nouvelle image.
// Usage : node tools/ajouter_images_pack.js <pack> --dossier <dossier> [--dossier <dossier2> ...] [--source "…"] [--licence "…"]
//   Le premier dossier qui contient le fichier l'emporte (mettre le plus récent en premier).
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { identifiantCarte } from '../src/core/packAtelier.js';

export const SOURCE_PAR_DEFAUT = "Canva (génération d'images par IA, compte éducation), style papier découpé, fond bleu ciel";
export const LICENCE_PAR_DEFAUT = 'Image générée par IA (Canva, compte éducation), usage scolaire non commercial';

export async function ajouterImages({ racine, pack, dossiers, source = SOURCE_PAR_DEFAUT, licence = LICENCE_PAR_DEFAUT }) {
  const chManifest = path.join(racine, 'public', 'packs', pack, 'manifest.json');
  const manifest = JSON.parse(await readFile(chManifest, 'utf8'));
  const dest = path.join(racine, 'public', 'packs', pack, 'images');
  await mkdir(dest, { recursive: true });
  const avec = [], sans = [];
  for (const c of manifest.cartes) {
    const nom = identifiantCarte(c.mot) + '.png';
    const origine = dossiers.map(d => path.join(d, nom)).find(f => existsSync(f));
    if (!origine) { sans.push(c.mot); continue; }
    await copyFile(origine, path.join(dest, nom));
    c.image_sans_mot = `images/${nom}`;
    c.source = source;
    c.licence = licence;
    avec.push(c.mot);
  }
  await writeFile(chManifest, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  return { avec, sans, total: manifest.cartes.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const pack = args[0];
  const prendre = nom => args.flatMap((a, i) => (a === nom ? [args[i + 1]] : []));
  const dossiers = prendre('--dossier').map(d => path.resolve(d));
  if (!pack || pack.startsWith('--') || dossiers.length === 0) { console.error('Usage : node tools/ajouter_images_pack.js <pack> --dossier <dossier> [--dossier <dossier2>] [--source "…"] [--licence "…"]'); process.exit(2); }
  const racine = fileURLToPath(new URL('..', import.meta.url));
  const r = await ajouterImages({ racine, pack, dossiers, source: prendre('--source')[0], licence: prendre('--licence')[0] });
  console.log(`${r.avec.length} mot(s) avec image sur ${r.total} : ${r.avec.join(', ')}`);
  console.log(`${r.sans.length} sans image.`);
}
