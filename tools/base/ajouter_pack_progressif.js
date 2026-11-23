// Écrit (ou remplace) l'entrée `pack-progressif-p1` de data/base/packs.json à partir de data/pack-progressif/paliers-p1.json.
// Les mots du fichier sont des mots écrits ; les paliers du pack portent des identifiants de fiche.
// Usage : node tools/base/ajouter_pack_progressif.js
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function construirePack(source, fiches) {
  const parMot = new Map(fiches.map(f => [f.mot, f.id]));
  const paliers = source.paliers.map(p => ({
    id: p.id, difficulte: p.difficulte, annonce: p.annonce || '',
    mots: p.mots.map(m => { if (!parMot.has(m)) throw new Error(`mot absent de la base : ${m}`); return parMot.get(m); })
  }));
  const mots = paliers.flatMap(p => p.mots);
  const titre = `Pack progressif P1 (${mots.length} mots, ${paliers.length} paliers)`;
  return { id: 'pack-progressif-p1', entree: { id: 'pack-progressif-p1', label: titre },
    manifeste: { nom: 'pack-progressif-p1', mode: 'lettres', titre, paliers, source: 'apport de Virginie, data/pack-progressif/paliers-p1.json' }, mots };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const source = JSON.parse(await readFile(path.join(racine, 'data', 'pack-progressif', 'paliers-p1.json'), 'utf8'));
  const fiches = JSON.parse(await readFile(path.join(racine, 'data', 'base', 'fiches.json'), 'utf8'));
  const fp = path.join(racine, 'data', 'base', 'packs.json');
  const packs = JSON.parse(await readFile(fp, 'utf8')).filter(p => p.id !== 'pack-progressif-p1');
  const pack = construirePack(source, fiches);
  packs.push(pack);
  await writeFile(fp, JSON.stringify(packs, null, 1) + '\n', 'utf8');
  console.log(`${pack.mots.length} mots, ${pack.manifeste.paliers.length} paliers écrits dans packs.json`);
}
