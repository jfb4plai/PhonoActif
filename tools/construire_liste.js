// Usage : node tools/construire_liste.js <brut.json> --id X --nom "..." --source "..." --licence "..." --niveaux P1,P2,P3
// Écrit data/listes/<id>.json. Refuse (code 2) sans source ou sans licence.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { construireListeDepuisBrut } from '../src/node/liste.js';

const arg = nom => { const i = process.argv.indexOf(nom); return i > -1 ? process.argv[i + 1] : undefined; };
const brut = process.argv[2];
if (!brut || brut.startsWith('--')) { console.error('Usage : node tools/construire_liste.js <brut.json> --id X --nom "..." --source "..." --licence "..." --niveaux P1,P2'); process.exit(2); }
const racine = fileURLToPath(new URL('..', import.meta.url));
try {
  const { liste, avertissements } = await construireListeDepuisBrut(brut, {
    id: arg('--id'), nom: arg('--nom'), source: arg('--source'), licence: arg('--licence'),
    niveaux: (arg('--niveaux') || '').split(',').map(s => s.trim()).filter(Boolean)
  }, path.join(racine, 'data', 'listes'));
  console.log(`entrées=${liste.entrees.length} avertissements=${avertissements.length}`);
  for (const a of avertissements) console.log(`  ${a}`);
} catch (e) {
  console.error(e.message);
  process.exit(e.message.startsWith('liste :') ? 2 : 1);
}
