// Mesure les règles contextuelles (src/core/regles.js) contre ManuLemme, avant/après.
// Deux jeux : « P1 » (941 mots qui ont servi à écrire les règles) et « hors P1 » (mots de ManuLemme jamais regardés).
// Usage : node tools/mesurer_regles.js [--ecarts P1|hors] [--n 40]
import fs from 'node:fs';
import { creerLexique, cubesDepuisEntree, normaliserMot } from '../src/core/lexique.js';
import { segmenterAuto } from '../src/core/segmentation.js';
import { lireRegles } from '../src/core/regles.js';
import { composants } from '../src/core/sons.js';

const racine = new URL('..', import.meta.url);
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('data/lexique.json', racine), 'utf8')));
const p1 = JSON.parse(fs.readFileSync(new URL('data/p1-mots.json', racine), 'utf8'));
const setP1 = new Set(p1);

const sons = cubes => cubes.flatMap(c => (c.son === null ? ['?'] : composants(c.son))).join(' ');
const comparable = mot => {
  const e = lex.chercher(mot);
  if (!e || normaliserMot(e.graphemes.join('')) !== normaliserMot(mot)) return null;
  const ref = cubesDepuisEntree(e);
  if (sons(ref).includes('?')) return null;
  return ref;
};

const horsP1 = [...new Set(lex.entrees.filter(e => e.freq.P1_5 > 0).map(e => normaliserMot(e.ortho)))]
  .filter(m => /^[a-zàâäéèêëîïôöûùüçœ]+$/.test(m) && !setP1.has(m));
// Le hors-P1 est coupé en deux moitiés fixes (rang pair / impair dans l'ordre alphabétique) :
// A sert au diagnostic et aux corrections, B n'est jamais regardé : seul son taux est lu.
const triees = [...horsP1].sort();
const jeux = { P1: p1, 'hors P1 moitié A (diagnostic)': triees.filter((_, i) => i % 2 === 0), 'hors P1 moitié B (jamais regardée)': triees.filter((_, i) => i % 2 === 1) };
const ecarts = Object.fromEntries(Object.keys(jeux).map(k => [k, []]));

for (const [nom, mots] of Object.entries(jeux)) {
  let n = 0, auto = 0, regles = 0, ambigus = 0, reglesSansAmbigu = 0;
  for (const mot of mots) {
    const ref = comparable(mot);
    if (!ref) continue;
    n++;
    const sRef = sons(ref), cr = lireRegles(mot), sReg = sons(cr);
    if (sons(segmenterAuto(mot)) === sRef) auto++;
    const amb = cr.some(c => c.ambigu);
    if (sReg === sRef) { regles++; if (!amb) reglesSansAmbigu++; } else ecarts[nom].push({ mot, ref: sRef, regles: sReg, g: cr.map(c => c.g).join('.'), signale: amb });
    if (amb) ambigus++;
  }
  console.log(`${nom} : ${n} mots comparables | ancien segmenterAuto ${auto} (${(100 * auto / n).toFixed(1)} %) | règles ${regles} (${(100 * regles / n).toFixed(1)} %) | dont ${reglesSansAmbigu} sans signalement e instable | ${ambigus} mots avec un signalement | erreurs NON signalées : ${ecarts[nom].filter(e => !e.signale).length} sur ${ecarts[nom].length}`);
}
const quel = opt('--ecarts');
if (quel) {
  const liste = ecarts[quel === 'hors' ? 'hors P1 moitié A (diagnostic)' : 'P1'];
  const nmax = Number(opt('--n') || 40);
  // regroupe par première divergence de sons
  const motifs = new Map();
  for (const e of liste) {
    const a = e.ref.split(' '), b = e.regles.split(' ');
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const k = `${a[i] ?? '∅'} -> ${b[i] ?? '∅'} (contexte : ${a.slice(Math.max(0, i - 1), i + 2).join(' ')})`;
    const m = motifs.get(k) || []; m.push(e.mot); motifs.set(k, m);
  }
  [...motifs.entries()].sort((x, y) => y[1].length - x[1].length).slice(0, nmax)
    .forEach(([k, v]) => console.log(String(v.length).padStart(4), k, '|', v.slice(0, 6).join(',')));
}
