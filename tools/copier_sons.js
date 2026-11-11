// Usage : node tools/copier_sons.js "<dossier des sons validés>"
// Copie les fichiers .wav vers public/sons/ (ignoré par git : voix de bibliothèque, licence non vérifiée).
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = process.argv[2];
if (!source) { console.error('Usage : node tools/copier_sons.js "<dossier des sons>"'); process.exit(2); }
const racine = fileURLToPath(new URL('..', import.meta.url));
const destination = path.join(racine, 'public', 'sons');
await mkdir(destination, { recursive: true });
const fichiers = (await readdir(source)).filter(f => f.toLowerCase().endsWith('.wav'));
for (const f of fichiers) await copyFile(path.join(source, f), path.join(destination, f));
console.log(`${fichiers.length} fichiers .wav copiés vers ${destination}`);
