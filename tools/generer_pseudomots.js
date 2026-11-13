// Générateur de pseudo-mots par chaîne de trigrammes de lettres, appris sur une liste de mots (sans IA, graine fixe).
// Filtres : (1) absent de Lexique 4.1 (toutes formes), (2) lecture par règles sans cube ambigu ni inconnu,
// (3) pas pseudo-homophone d'un mot de ManuLemme, (4) nombre de voisins orthographiques (Lexique 4.1) borné.
// Usage : node tools/generer_pseudomots.js [--liste data/p1-mots.json] [--n 40] [--voisins 3] [--graine 7] [--csv sortie.csv]
import fs from 'node:fs';
import { creerLexique, cubesDepuisEntree, normaliserMot } from '../src/core/lexique.js';
import { lireRegles, normaliserChaine } from '../src/core/regles.js';
import { composants } from '../src/core/sons.js';

const racine = new URL('..', import.meta.url);
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const liste = JSON.parse(fs.readFileSync(new URL(opt('--liste', 'data/p1-mots.json'), racine), 'utf8'));
const N = +opt('--n', 40), MAXV = +opt('--voisins', 3);
let graine = +opt('--graine', 7);
const rnd = () => { graine = (graine * 1664525 + 1013904223) % 4294967296; return graine / 4294967296; };

const sons = cubes => cubes.flatMap(c => (c.son === null ? ['?'] : composants(c.son))).join(' ');
const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('data/lexique.json', racine), 'utf8')));
const lectureReelle = new Map(); // lecture ManuLemme -> un mot
for (const e of lex.entrees) {
  const ref = cubesDepuisEntree(e); const s = sons(ref);
  if (!s.includes('?') && !lectureReelle.has(s)) lectureReelle.set(s, e.ortho);
}
const reels = new Set();
for (const l of fs.readFileSync(new URL('data/lexique-org/Lexique4.1/Lexique4.1.tsv', racine), 'utf8').split('\n').slice(1)) {
  const m = l.slice(0, l.indexOf('\t')); if (m) reels.add(normaliserMot(m));
}
for (const e of lex.entrees) reels.add(normaliserMot(e.ortho));

const alpha = [...'abcdefghijklmnopqrstuvwxyzàâäéèêëîïôöûùüçœ'];
const voisins = m => { let n = 0; for (let i = 0; i < m.length; i++) for (const c of alpha) if (c !== m[i] && reels.has(m.slice(0, i) + c + m.slice(i + 1))) n++; return n; };

// Modèle : contexte = 2 dernières lettres ('^' = début), valeur = lettres suivantes pondérées par fréquence (avec répétitions)
const modele = new Map();
for (const mot of new Set(liste.map(normaliserChaine).filter(m => m.length >= 2))) {
  const s = '^^' + mot + '$';
  for (let i = 2; i < s.length; i++) { const k = s.slice(i - 2, i); if (!modele.has(k)) modele.set(k, []); modele.get(k).push(s[i]); }
}
const MINC = +opt('--minc', 1); // transition retenue seulement si vue au moins MINC fois dans la liste
const tirer = () => {
  let m = '^^';
  while (m.length < 14) { const brut = modele.get(m.slice(-2)); if (!brut) break;
    const cpt = {}; for (const c of brut) cpt[c] = (cpt[c] || 0) + 1;
    const suite = brut.filter(c => cpt[c] >= MINC); if (!suite.length) break; const c = suite[Math.floor(rnd() * suite.length)]; if (c === '$') break; m += c; }
  return m.slice(2);
};

const raisons = {}; const rejet = r => { raisons[r] = (raisons[r] || 0) + 1; };
const retenus = new Map(); // longueur -> liste
const vus = new Set();
for (let essai = 0; essai < 400000; essai++) {
  const m = tirer(); if (m.length < 3 || m.length > 6 || vus.has(m)) continue; vus.add(m);
  const L = m.length; if ((retenus.get(L) || []).length >= N) continue;
  if (reels.has(m)) { rejet('mot réel'); continue; }
  const cubes = lireRegles(m);
  if (cubes.some(c => c.ambigu)) { rejet('lecture ambiguë'); continue; }
  if (cubes.some(c => c.son === null || c.inconnu)) { rejet('son inconnu'); continue; }
  if (!cubes.some(c => c.son && ['a','e_ferme','e_ouvert','schwa','i','o_ferme','o_ouvert','u','ou','eu_ferme','eu_ouvert','an','on','in','un'].includes(c.son))) { rejet('sans voyelle'); continue; }
  const s = sons(cubes);
  if (lectureReelle.has(s)) { rejet('pseudo-homophone de ' + lectureReelle.get(s)); continue; }
  const v = voisins(m); if (v > MAXV) { rejet('trop de voisins'); continue; }
  if (!retenus.has(L)) retenus.set(L, []);
  retenus.get(L).push({ m, v, lecture: s });
}
const motifs = Object.entries(raisons).map(([k, n]) => [k.startsWith('pseudo-homophone') ? 'pseudo-homophone' : k, n]).reduce((a, [k, n]) => (a[k] = (a[k] || 0) + n, a), {});
console.log('liste', liste.length, 'mots | modèle', modele.size, 'contextes | rejets', motifs);
const lignes = ['pseudo-mot;longueur;voisins;lecture'];
for (const L of [3, 4, 5, 6]) {
  const r = retenus.get(L) || [];
  console.log(`${L} lettres : ${r.length} retenus ->`, r.slice(0, 16).map(x => x.m).join(' '));
  for (const x of r) lignes.push([x.m, L, x.v, x.lecture].join(';'));
}
const csv = opt('--csv'); if (csv) fs.writeFileSync(csv, '﻿' + lignes.join('\n'), 'utf8');
