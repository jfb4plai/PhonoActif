// Usage : node tools/preparer_pack.js --liste data/listes/vob.json --niveau P2 [--jusqua] --nom p2-essai
//         --source "..." --licence "..." [--tolerance N] [--base-url https://...]
// Écrit packs/<nom>/manifest.json et packs/<nom>/a-fabriquer.csv : la liste des cartes à fabriquer dans Canva
// (carte de 63 x 88 mm, un fichier « <id>.png » sans le mot et un « <id>-mot.png » avec le mot).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../src/node/chargerLexique.js';
import { chargerCorrections } from '../src/node/corrections.js';
import { proposerPourNiveau, preparerPack } from '../src/core/index.js';

const arg = nom => { const i = process.argv.indexOf(nom); return i > -1 ? process.argv[i + 1] : undefined; };
const obligatoires = ['--liste', '--niveau', '--nom', '--source', '--licence'];
const manquants = obligatoires.filter(a => arg(a) === undefined);
if (manquants.length) { console.error(`Manque : ${manquants.join(', ')}\nUsage : node tools/preparer_pack.js --liste <liste.json> --niveau P2 [--jusqua] --nom <nom> --source "..." --licence "..." [--tolerance N]`); process.exit(2); }

const racine = fileURLToPath(new URL('..', import.meta.url));
const liste = JSON.parse(await readFile(arg('--liste'), 'utf8'));
const lexique = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
const { corrections } = await chargerCorrections(path.join(racine, 'data', 'corrections.json'));

const propositions = proposerPourNiveau(lexique, liste, arg('--niveau'), {
  corrections, tolerance: arg('--tolerance') !== undefined ? Number(arg('--tolerance')) : 0, jusquAuNiveau: process.argv.includes('--jusqua')
});
const niveaux = Object.fromEntries(liste.entrees.map(e => [e.mot, e.niveau]));
try {
  const { manifest, csv } = preparerPack({ nom: arg('--nom'), mots: propositions.map(p => p.mot), source: arg('--source'), licence: arg('--licence'), lexique, corrections, niveaux, baseUrl: arg('--base-url') || '' });
  const dossier = path.join(racine, 'packs', manifest.nom);
  await mkdir(dossier, { recursive: true });
  await writeFile(path.join(dossier, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  await writeFile(path.join(dossier, 'a-fabriquer.csv'), csv, 'utf8');
  console.log(`${manifest.cartes.length} cartes dans ${dossier} (à vérifier : ${manifest.cartes.filter(c => c.aVerifier).length})`);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
