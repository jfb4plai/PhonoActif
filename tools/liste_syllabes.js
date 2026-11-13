// Liste des syllabes IPA à générer pour la bibliothèque audio : celles de tous les mots de ManuLemme (sons ManuLemme, coupe par sons).
// Écrit data/syllabes.json (non commité, comme le lexique) et docs/syllabes-a-generer.csv.
// Usage : node tools/liste_syllabes.js [data/p1-mots.json]   (le second jeu sert à mesurer la couverture d'une liste)
import fs from 'node:fs';
import { creerLexique, cubesDepuisEntree, composants, syllabesDeSons, SON_VERS_IPA, SONS_LILEMO, normaliserChaine } from '../src/core/index.js';

const racine = new URL('..', import.meta.url);
const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('data/lexique.json', racine), 'utf8')));
const ipa = syl => syl.map(s => SON_VERS_IPA[s]).join('');

// Exemple lisible par un non-spécialiste de l'IPA : [avant, partie à entendre, après] dans un mot courant.
// Sons isolés : mots simples, la partie à entendre est cherchée dans le mot (validés à l'oreille par JF le 2026-11-12 : voir tests essai-charline).
const EXEMPLES_SONS = {
  a: ['a', 'papa'], an: ['an', 'enfant'], b: ['b', 'bébé'], ch: ['ch', 'chat'], d: ['d', 'dos'], e_ferme: ['é', 'été'], e_ouvert: ['è', 'père'],
  schwa: ['e', 'le'], eu_ferme: ['eu', 'feu'], eu_ouvert: ['eu', 'peur'], f: ['f', 'fil'], g: ['g', 'gare'], gn: ['gn', 'vigne'], i: ['i', 'midi'],
  in: ['in', 'pain'], j: ['j', 'jour'], k: ['c', 'car'], ks: ['x', 'taxi'], l: ['l', 'lune'], m: ['m', 'mer'], n: ['n', 'nez'], o_ferme: ['au', 'chaud'],
  o_ouvert: ['o', 'pomme'], oi: ['oi', 'moi'], on: ['on', 'pont'], ou: ['ou', 'loup'], p: ['p', 'pas'], r: ['r', 'rat'], s: ['s', 'sac'], t: ['t', 'table'],
  u: ['u', 'tu'], ui: ['ui', 'nuit'], un: ['un', 'brun'], v: ['v', 'vélo'], w: ['ou', 'oui'], z: ['z', 'zéro'], yod: ['i', 'pied']
};
const exemplePour = ([cible, mot]) => { const i = mot.indexOf(cible); return [mot.slice(0, i), cible, mot.slice(i + cible.length), mot]; };

// Lettres de chaque syllabe : un cube va à la syllabe qui contient son premier son ; une lettre muette suit la syllabe précédente.
function decouperLettres(cubes, longueurs) {
  const bornes = []; let cum = 0;
  for (const n of longueurs) { cum += n; bornes.push(cum); }
  const res = longueurs.map(() => '');
  let pos = 0, k = 0;
  for (const c of cubes) {
    const n = composants(c.son).length;
    if (n > 0) while (k < bornes.length - 1 && pos >= bornes[k]) k++;
    res[k] += c.g;
    pos += n;
  }
  return res;
}

const freq = new Map(), exemples = new Map(), exemplesLettres = new Map(), motsSyl = new Map();
let nMots = 0, nOcc = 0;
for (const e of lex.entrees) {
  const cubes = cubesDepuisEntree(e);
  if (cubes.some(c => c.son === null)) continue;
  const sons = cubes.flatMap(c => composants(c.son));
  if (!sons.length || !/^[a-zàâäéèêëîïôöûùüçœ]+$/.test(e.ortho)) continue;
  const decoupe = syllabesDeSons(sons);
  const syl = decoupe.map(ipa);
  if (!syl.length) continue;
  const lettres = decouperLettres(cubes, decoupe.map(a => a.length));
  nMots++;
  motsSyl.set(e.ortho, syl);
  syl.forEach((s, i) => {
    nOcc++;
    freq.set(s, (freq.get(s) || 0) + 1);
    const ex = exemples.get(s) || []; if (ex.length < 3 && !ex.includes(e.ortho)) ex.push(e.ortho); exemples.set(s, ex);
    const exl = exemplesLettres.get(s) || [];
    if (exl.length < 3 && !exl.some(x => x[3] === e.ortho)) exl.push([lettres.slice(0, i).join('-'), lettres[i], lettres.slice(i + 1).join('-'), e.ortho]);
    exemplesLettres.set(s, exl);
  });
}
const nbSons = new Map([...freq.keys()].map(s => [s, [...s.normalize('NFD').replace(/[\u0303\u0361]/g, '')].length])); // approximatif, pour la vitesse
const tri = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const paliers = [[500, 1], [1000, 2], [2000, 3], [Infinity, 4]];
let cum = 0;
const liste = tri.map(([s, n], i) => {
  cum += n;
  const palier = paliers.find(([max]) => i + 1 <= max)[1];
  return { ipa: s, occurrences: n, rang: i + 1, couvertureCumulee: +(100 * cum / nOcc).toFixed(2), palier, exemples: exemples.get(s), exemplesLettres: exemplesLettres.get(s), vitesse: nbSons.get(s) > 1 ? -30 : 0 };
});
// sons isolés (palier 0) : déjà validés avec Charline, à régénérer au même format que le reste
const isoles = SONS_LILEMO.filter(s => SON_VERS_IPA[s]).map(s => ({ ipa: SON_VERS_IPA[s], occurrences: 0, rang: 0, couvertureCumulee: 0, palier: 0, exemples: [s], exemplesLettres: [exemplePour(EXEMPLES_SONS[s])], vitesse: 0 }));
const toutes = [...isoles, ...liste.filter(l => !isoles.some(i => i.ipa === l.ipa))];
fs.writeFileSync(new URL('data/syllabes.json', racine), JSON.stringify(toutes, null, 1), 'utf8');
fs.writeFileSync(new URL('docs/syllabes-a-generer.csv', racine), '\uFEFF' + 'ipa;palier;rang;occurrences;couverture cumulée %;vitesse;exemples\n' +
  toutes.map(l => [l.ipa, l.palier, l.rang, l.occurrences, l.couvertureCumulee, l.vitesse, l.exemples.join(' ')].join(';')).join('\n'), 'utf8');

console.log(`${nMots} entrées utilisables (${motsSyl.size} orthographes distinctes), ${nOcc} syllabes (occurrences), ${freq.size} syllabes distinctes, + ${isoles.length} sons isolés = ${toutes.length} fichiers.`);
for (const [max, p] of paliers) {
  const n = toutes.filter(l => l.palier === p).length;
  console.log(`palier ${p} : ${n} fichiers (cumul ${toutes.filter(l => l.palier <= p).length}), couverture occurrences ${(liste.filter(l => l.palier <= p).at(-1) || { couvertureCumulee: 0 }).couvertureCumulee} %`);
}
// couverture en MOTS entiers : un mot est servi s'il peut être entièrement collé avec les fichiers des paliers ≤ p
const cible = process.argv[2] ? JSON.parse(fs.readFileSync(new URL(process.argv[2], racine), 'utf8')).map(normaliserChaine) : null;
const rangDe = new Map(liste.map(l => [l.ipa, l.palier]));
for (const p of [1, 2, 3, 4]) {
  const ok = [...motsSyl.values()].filter(syl => syl.every(s => (rangDe.get(s) || 9) <= p)).length;
  let ligne = `mots entièrement collables avec les paliers ≤ ${p} : ${ok}/${motsSyl.size} (${(100 * ok / motsSyl.size).toFixed(1)} %)`;
  if (cible) {
    const dans = cible.filter(m => motsSyl.has(m)), servis = dans.filter(m => motsSyl.get(m).every(s => (rangDe.get(s) || 9) <= p)).length;
    ligne += ` | liste fournie : ${servis}/${dans.length} (${(100 * servis / dans.length).toFixed(1)} %)`;
  }
  console.log(ligne);
}
const rares = liste.filter(l => l.occurrences === 1).length;
console.log(`syllabes vues une seule fois : ${rares} (${(100 * rares / freq.size).toFixed(1)} % des distinctes)`);
console.log('exemples palier 1 :', liste.slice(0, 12).map(l => l.ipa).join(' '));
console.log('exemples palier 4 :', liste.filter(l => l.palier === 4).slice(0, 12).map(l => `${l.ipa}(${l.exemples[0]})`).join(' '));
