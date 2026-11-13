// Choisit N mots de TROIS syllabes dans la liste P1 de JF (filtre déterministe, sans IA) et calcule leurs syllabes (coupées sur les sons du mot entier).
// Filtre : liste P1 dans l'ordre ; lettres seulement ; présent dans ManuLemme ; état final sans code inconnu et non « à vérifier » ; exactement 3 syllabes.
// Écrit data/mots-3-syllabes.json : [{ mot, ipa, entier, syllabes: [{ ipa, fichier }] }]. Aucun appel réseau.
// Usage : node tools/mots_trois_syllabes.js [N=5]
import fs from 'node:fs';
import { creerLexique, etatsDuMot, composants, syllabesDeSons, SON_VERS_IPA } from '../src/core/index.js';

const N = Number(process.argv[2] || 5);
const lire = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const lexique = creerLexique(lire('../data/lexique.json'));
const nomFichier = (ipa, vitesse) => ipa.split('').map(c => c.codePointAt(0).toString(16)).join('_') + '_' + vitesse;
const nbSons = ipa => [...ipa.normalize('NFD').replace(/[̃͡]/g, '')].length;
const fichier = ipa => nomFichier(ipa, nbSons(ipa) > 1 ? -30 : 0) + '.mp3';

const sortie = [];
for (const mot of lire('../data/p1-mots.json')) {
  if (sortie.length >= N) break;
  if (!/^[a-zàâçéèêëîïôûùüœ]{4,12}$/.test(mot) || !lexique.chercher(mot)) continue;
  const dernier = etatsDuMot(mot, lexique).at(-1);
  if (dernier.aVerifier || dernier.cubes.some(c => c.son === null)) continue;
  const sons = dernier.cubes.flatMap(c => composants(c.son));
  const syl = syllabesDeSons(sons);
  if (syl.length !== 3) continue;
  const ipa = sons.map(s => SON_VERS_IPA[s]).join('');
  sortie.push({ mot, ipa, entier: fichier(ipa), syllabes: syl.map(s => { const i = s.map(x => SON_VERS_IPA[x]).join(''); return { ipa: i, fichier: fichier(i) }; }) });
}
fs.writeFileSync(new URL('../data/mots-3-syllabes.json', import.meta.url), JSON.stringify(sortie, null, 1), 'utf8');
sortie.forEach(m => console.log(m.mot.padEnd(12), '/' + m.ipa + '/', m.syllabes.map(s => s.ipa).join(' | ')));
