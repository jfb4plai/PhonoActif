// Usage : node tools/rapport_audio.js <dossier des sons> [extension=.wav]
import { readdirSync } from 'node:fs';
import { SONS_LILEMO, sonsManquants } from '../src/core/index.js';

const [dossier, ext = '.wav'] = process.argv.slice(2);
if (!dossier) { console.error('Usage : node tools/rapport_audio.js <dossier> [extension]'); process.exit(2); }
const dispo = new Set(readdirSync(dossier).filter(f => f.endsWith(ext)).map(f => f.slice(0, -ext.length)));
const manquants = sonsManquants(SONS_LILEMO, dispo);
console.log(`${SONS_LILEMO.length - manquants.length} sons sur ${SONS_LILEMO.length} ont un fichier ${ext}`);
console.log(manquants.length ? `Manquants (${manquants.length}) : ${manquants.join(', ')}` : 'Aucun son manquant');
