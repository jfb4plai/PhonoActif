// Ajoute l'écoute par syllabes à un pack « lettres » déjà fabriqué (par exemple p1-100, fait avant l'écoute par syllabes).
// Usage : node tools/ajouter_syllabes_pack.js <nom-du-pack> [--tout]
//  1. calcule les syllabes de chaque mot de 2 syllabes ou plus (mêmes règles que la fabrication d'un pack) ;
//  2. écrit data/packs-atelier/<nom>/a-generer.json : les fichiers audio de syllabes à produire ;
//  3. ajoute `syllabes` au manifeste des seuls mots dont TOUS les fichiers de syllabes sont déjà dans public/packs/<nom>/audio
//     (sinon le bouton jouerait des fichiers absents). Avec --tout : tous les mots, à n'utiliser qu'une fois l'audio généré.
// Suite pour les fichiers manquants : python -I essai-tts-ipa/generer-bibliotheque.py pack <nom> (clé Azure, lancée par JF), puis relancer cet outil.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { syllabesPourCubes } from '../src/core/packAtelier.js';

const nom = process.argv[2];
if (!nom || nom.startsWith('--')) { console.error('Usage : node tools/ajouter_syllabes_pack.js <nom-du-pack> [--tout]'); process.exit(2); }
const racine = fileURLToPath(new URL('..', import.meta.url));
const chManifest = path.join(racine, 'public', 'packs', nom, 'manifest.json');
const manifest = JSON.parse(await readFile(chManifest, 'utf8'));
if (manifest.mode !== 'lettres') { console.error(`Le pack « ${nom} » n'est pas un pack « lettres ».`); process.exit(2); }

const distincts = new Map();
let multi = 0, ajoutes = 0, reportes = [];
for (const c of manifest.cartes) {
  const syl = syllabesPourCubes(c.cubes);
  if (syl.length < 2) { delete c.syllabes; continue; }
  multi++;
  syl.forEach(s => { if (!distincts.has(s.fichier)) distincts.set(s.fichier, { ipa: s.ipa, vitesse: s.vitesse, fichier: s.fichier }); });
  const tousLa = syl.every(s => existsSync(path.join(racine, 'public', 'packs', nom, 'audio', s.fichier + '.mp3')));
  if (tousLa || process.argv.includes('--tout')) {
    c.syllabes = syl.map(s => ({ ipa: s.ipa, fichier: `audio/${s.fichier}.mp3`, ...(s.cubes !== undefined ? { cubes: s.cubes } : {}) }));
    ajoutes++;
  } else { delete c.syllabes; reportes.push(c.mot); }
}
await mkdir(path.join(racine, 'data', 'packs-atelier', nom), { recursive: true });
await writeFile(path.join(racine, 'data', 'packs-atelier', nom, 'a-generer.json'), JSON.stringify({ nom, fichiersDistincts: [...distincts.values()] }, null, 1) + '\n', 'utf8');
await writeFile(chManifest, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
const absents = [...distincts.values()].filter(f => !existsSync(path.join(racine, 'public', 'packs', nom, 'audio', f.fichier + '.mp3')));
console.log(`${manifest.cartes.length} mots, ${multi} de deux syllabes ou plus, ${distincts.size} fichiers de syllabes distincts, ${absents.length} absents du dossier du pack.`);
console.log(`Syllabes ajoutées au manifeste : ${ajoutes} mot(s). Reportés (fichier manquant) : ${reportes.length}${reportes.length ? ' : ' + reportes.join(', ') : ''}.`);
if (absents.length) console.log(`Suite : python -I essai-tts-ipa/generer-bibliotheque.py pack ${nom}   (copie ce qui existe dans la bibliothèque, génère le reste avec la clé Azure), puis : node tools/ajouter_syllabes_pack.js ${nom}`);
