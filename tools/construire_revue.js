// Usage : node tools/construire_revue.js --sons "<dossier des sons>" [--limite N] [--ext .wav]
// Écrit revue/revue.html : page autonome (hors ligne) pour vérifier, corriger et valider les sons.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../src/node/chargerLexique.js';
import { chargerCorrections } from '../src/node/corrections.js';
import { fileDeRevue, SONS_LILEMO } from '../src/core/index.js';
import { construirePageRevue } from '../src/revue/page.js';

const arg = (nom, defaut) => { const i = process.argv.indexOf(nom); return i > -1 ? process.argv[i + 1] : defaut; };
const sons = arg('--sons');
if (!sons) { console.error('Usage : node tools/construire_revue.js --sons "<dossier des sons>" [--limite N] [--ext .wav]'); process.exit(2); }
const limite = arg('--limite') !== undefined ? Number(arg('--limite')) : undefined;
const extension = arg('--ext', '.wav');

const racine = fileURLToPath(new URL('..', import.meta.url));
const lex = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
const { corrections } = await chargerCorrections(path.join(racine, 'data', 'corrections.json'));
const items = fileDeRevue(lex, corrections, { limite });

const html = construirePageRevue({
  items, sons: SONS_LILEMO, extension, date: new Date().toISOString().slice(0, 10),
  dossierSons: pathToFileURL(path.resolve(sons)).href + '/'
});
mkdirSync(path.join(racine, 'revue'), { recursive: true });
const sortie = path.join(racine, 'revue', 'revue.html');
writeFileSync(sortie, html, 'utf8');
console.log(`${sortie} : ${items.length} mots, ${(Buffer.byteLength(html) / 1048576).toFixed(2)} Mo`);
