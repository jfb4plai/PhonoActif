// Usage : node tools/montrer.js <mot> [<mot>...]   (lit data/lexique.json)
import { chargerLexique } from '../src/node/chargerLexique.js';
import { segmenterMot } from '../src/core/index.js';

const lex = await chargerLexique(new URL('../data/lexique.json', import.meta.url));
for (const mot of process.argv.slice(2)) {
  const r = segmenterMot(mot, lex);
  const cubes = r.cubes.map(c => c.g + '=' + (c.son === null ? '?' : c.son === '' ? '(muet)' : c.son)).join(' ');
  console.log(`${mot} [${r.source}${r.aVerifier ? ', à vérifier' : ''}] ${cubes}${r.raisons.length ? '  | ' + r.raisons.join(' ; ') : ''}`);
}
