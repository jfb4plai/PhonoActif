// Usage : node tools/analyser_liste.js <data/listes/id.json>   (lit data/lexique.json et data/corrections.json)
import { readFile } from 'node:fs/promises';
import { chargerLexique } from '../src/node/chargerLexique.js';
import { chargerCorrections } from '../src/node/corrections.js';
import { rapportParNiveau, analyserListe } from '../src/core/index.js';

const chemin = process.argv[2];
if (!chemin) { console.error('Usage : node tools/analyser_liste.js <data/listes/id.json>'); process.exit(2); }
const liste = JSON.parse(await readFile(chemin, 'utf8'));
const lex = await chargerLexique(new URL('../data/lexique.json', import.meta.url));
const { corrections } = await chargerCorrections(new URL('../data/corrections.json', import.meta.url));

const { lignes, total } = rapportParNiveau(liste, lex, corrections);
console.log(`${liste.nom} (source : ${liste.source} ; licence : ${liste.licence})`);
const col = (v, n) => String(v).padStart(n);
console.log(['niveau', 'mots', 'trouvés', 'absents', 'à vérifier', 'multi-mots', 'liaisons nouv.', 'écartés'].map((t, i) => col(t, i === 0 ? 7 : 16)).join(''));
for (const l of [...lignes, total]) console.log([col(l.niveau, 7), ...['mots', 'trouves', 'absents', 'aVerifier', 'multiMots', 'liaisonsNouvelles', 'motsIgnores'].map(c => col(l[c], 16))].join(''));
const abs = analyserListe(liste.entrees.map(e => ({ mot: e.mot })), lex, undefined, corrections).absents;
console.log(`\nabsents du lexique (20 sur ${abs.length}) : ${abs.slice(0, 20).join(' | ')}`);
