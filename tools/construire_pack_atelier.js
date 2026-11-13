// Construit le pack jouable (mode A) d'un tableau d'enseignant déjà lu par tools/modele_pack_xlsx.py.
// Usage : node tools/construire_pack_atelier.js <nom-du-pack> [--inclure-a-verifier]
// Lit data/packs-atelier/<nom>/pack.json ; écrit public/packs/<nom>/manifest.json, data/packs-atelier/<nom>/a-generer.json (fichiers audio à générer)
// et met à jour public/packs/index.json. Aucun appel réseau. L'audio se génère ensuite avec :
//   python -I essai-tts-ipa/generer-bibliotheque.py pack <nom>      (clé Azure, lancée par JF)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../src/node/chargerLexique.js';
import { chargerCorrections } from '../src/node/corrections.js';
import { construirePackLettres, empreinteCourriel } from '../src/core/index.js';

const nom = process.argv[2];
if (!nom || nom.startsWith('--')) { console.error('Usage : node tools/construire_pack_atelier.js <nom-du-pack> [--inclure-a-verifier]'); process.exit(2); }
const racine = fileURLToPath(new URL('..', import.meta.url));
let pack;
try { pack = JSON.parse(await readFile(path.join(racine, 'data', 'packs-atelier', nom, 'pack.json'), 'utf8')); }
catch (e) { console.error(`Pack « ${nom} » introuvable : lancer d'abord python -I tools/modele_pack_xlsx.py lire <tableau.xlsx>`); process.exit(2); }

const lexique = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
const { corrections } = await chargerCorrections(path.join(racine, 'data', 'corrections.json'));
if (pack.visibilite === 'prive') pack.proprietaireEmpreinte = await empreinteCourriel(pack.proprietaire); // jamais l'adresse en clair dans les fichiers publics
const r = construirePackLettres({ pack, lexique, corrections, inclureAVerifier: process.argv.includes('--inclure-a-verifier') });
if (!r.manifest.cartes.length) { console.error('Aucun mot utilisable : voir la liste des mots écartés ci-dessous.'); r.exclus.forEach(e => console.error(`  écarté : ${e.mot} : ${e.raison}`)); process.exit(2); }

const dossier = path.join(racine, 'public', 'packs', nom);
await mkdir(dossier, { recursive: true });
await writeFile(path.join(dossier, 'manifest.json'), JSON.stringify(r.manifest, null, 1) + '\n', 'utf8');
await writeFile(path.join(racine, 'data', 'packs-atelier', nom, 'a-generer.json'), JSON.stringify({ nom, fichiersDistincts: r.fichiersDistincts }, null, 1) + '\n', 'utf8');
const chIndex = path.join(racine, 'public', 'packs', 'index.json');
const index = JSON.parse(await readFile(chIndex, 'utf8')).filter(p => p.id !== nom);
index.push(r.entreeIndex);
await writeFile(chIndex, JSON.stringify(index, null, 1) + '\n', 'utf8');

console.log(`${r.manifest.cartes.length} mots dans le pack « ${nom} » (${pack.visibilite === 'prive' ? 'personnel, propriétaire ' + pack.proprietaire + ' (empreinte seule dans les fichiers publics)' : 'à partager avec tous'}) ; ${r.fichiersDistincts.length} fichiers audio à générer.`);
r.exclus.forEach(e => console.log(`  écarté : ${e.mot} : ${e.raison}`));
r.avertissements.forEach(a => console.log(`  attention : ${a}`));
console.log(`Suite : python -I essai-tts-ipa/generer-bibliotheque.py pack ${nom}`);
