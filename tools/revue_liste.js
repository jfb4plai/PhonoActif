// Usage : node tools/revue_liste.js [--limite N]   (lit data/lexique.json et data/corrections.json)
import { chargerLexique } from '../src/node/chargerLexique.js';
import { chargerCorrections } from '../src/node/corrections.js';
import { fileDeRevue, deriveDuLexique } from '../src/core/index.js';

const i = process.argv.indexOf('--limite');
const limite = i > -1 ? Number(process.argv[i + 1]) : undefined;
const chemin = nom => new URL(`../data/${nom}`, import.meta.url);

const lex = await chargerLexique(chemin('lexique.json'));
const { corrections, rejets } = await chargerCorrections(chemin('corrections.json'));
const file = fileDeRevue(lex, corrections);

const compte = motif => file.filter(x => x.raisons.some(r => r.startsWith(motif))).length;
console.log(`file de revue : ${file.length} mots (code inconnu : ${compte('code inconnu')} ; plusieurs mots : ${compte('entrée à plusieurs')} ; correction à valider : ${compte('correction à valider')})`);
const parStatut = s => corrections.liste.filter(c => c.statut === s).length;
console.log(`corrections : ${corrections.taille} (à valider ${parStatut('a_valider')} ; validées ${parStatut('valide')} ; corrigées ${parStatut('corrige')}) ; rejetées ${rejets.length}`);
console.log(`dérives du lexique : ${deriveDuLexique(corrections, lex).length}`);
const montre = c => c.son === null ? `${c.g}=?` : `${c.g}=${c.son === '' ? '(muet)' : c.son}`;
for (const x of file.slice(0, limite ?? 20)) console.log(`${String(Math.round(x.freqP1)).padStart(6)}  ${x.mot}  [${x.raisons.join(' ; ')}]  ${x.cubes.map(montre).join(' ')}`);
