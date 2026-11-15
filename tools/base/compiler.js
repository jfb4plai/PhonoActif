// Recompose un pack (public/packs/<id>/) à partir de la base de mots data/base/ : preuve que la base redonne les packs publiés.
// Usage : node tools/base/compiler.js <idPack> <dossier-de-sortie>
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const fichiersDe = f => [f.image_sans_mot, f.image_avec_mot, f.phraseAudio, f.audio_mot,
  ...(f.etats || []).map(e => e.fichier), ...(f.syllabes || []).map(s => s.fichier)].filter(Boolean);

export async function compilerPack({ racine, idPack, sortie, base = path.join(racine, 'data', 'base') }) {
  const packs = JSON.parse(await readFile(path.join(base, 'packs.json'), 'utf8'));
  const fiches = JSON.parse(await readFile(path.join(base, 'fiches.json'), 'utf8'));
  const pack = packs.find(p => p.id === idPack);
  if (!pack) throw new Error(`pack « ${idPack} » absent de la base`);
  const parId = new Map(fiches.map(f => [f.id, f]));
  const cartes = pack.mots.map(id => {
    const f = parId.get(id);
    if (!f) throw new Error(`mot « ${id} » absent de la base`);
    const { statut, origine, ...carte } = f;
    return carte;
  });
  const fichiers = [...new Set(cartes.flatMap(fichiersDe))];
  for (const f of fichiers) {
    await mkdir(path.dirname(path.join(sortie, f)), { recursive: true });
    await copyFile(path.join(base, 'assets', f), path.join(sortie, f));
  }
  const manifest = { ...pack.manifeste, cartes };
  await mkdir(sortie, { recursive: true });
  await writeFile(path.join(sortie, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  return { manifest, fichiers };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const [idPack, sortie] = process.argv.slice(2);
  if (!idPack || !sortie) { console.error('Usage : node tools/base/compiler.js <idPack> <dossier-de-sortie>'); process.exit(1); }
  const r = await compilerPack({ racine, idPack, sortie: path.resolve(sortie) });
  console.log(`${r.manifest.cartes.length} cartes, ${r.fichiers.length} fichiers`);
}
