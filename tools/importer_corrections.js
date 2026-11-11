// Usage : node tools/importer_corrections.js <fichier exporté par la page de revue>
// Fusionne dans data/corrections.json (n'écrit rien en cas d'erreur de lecture).
import { importerCorrections } from '../src/node/corrections.js';

const fichier = process.argv[2];
if (!fichier) { console.error('Usage : node tools/importer_corrections.js <fichier.json>'); process.exit(2); }
try {
  const r = await importerCorrections(new URL('../data/corrections.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fichier);
  console.log(`importées=${r.importees} rejetées=${r.rejetees.length}`);
  for (const x of r.rejetees) console.log(`  rejetée : ${x.mot || '(sans mot)'} : ${x.erreurs.join(' ; ')}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
