// Compare la lecture par RÈGLES (segmenterAuto, table graphème->son) à la lecture ManuLemme, mot par mot.
// Usage : node tools/comparer_regles_manulemme.js [data/p1-mots.json] [dossier de sortie]
import fs from 'node:fs';
import { creerLexique, cubesDepuisEntree, normaliserMot } from '../src/core/lexique.js';
import { segmenterAuto } from '../src/core/segmentation.js';
import { composants, SON_PAR_DEFAUT } from '../src/core/sons.js';

const racine = new URL('..', import.meta.url);
const mots = JSON.parse(fs.readFileSync(new URL(process.argv[2] || 'data/p1-mots.json', racine), 'utf8'));
const sortie = process.argv[3] || 'docs';
const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('data/lexique.json', racine), 'utf8')));

const sons = cubes => cubes.flatMap(c => (c.son === null ? ['?'] : composants(c.son)));
const lignes = [], motifs = new Map();
let absents = 0, inconnus = 0, ok = 0;
for (const mot of mots) {
  const e = lex.chercher(mot);
  if (!e || normaliserMot(e.graphemes.join('')) !== normaliserMot(mot)) { absents++; lignes.push({ mot, statut: 'absent ou incohérent', ref: '', regles: '', ecart: '' }); continue; }
  const cref = cubesDepuisEntree(e), creg = segmenterAuto(mot);
  const sref = sons(cref), sreg = sons(creg);
  if (sref.includes('?')) { inconnus++; lignes.push({ mot, statut: 'code ManuLemme inconnu', ref: e.phono, regles: sreg.join(' '), ecart: '' }); continue; }
  const pareil = sref.join(' ') === sreg.join(' ');
  if (pareil) ok++;
  // motifs : chaque cube de la référence dont le son n'est pas le son par défaut du graphème
  for (const c of cref) {
    const def = SON_PAR_DEFAUT[c.g];
    if (def !== undefined && def !== c.son) {
      const k = `${c.g} -> ${c.son === '' ? '(muet)' : c.son}`;
      const m = motifs.get(k) || { n: 0, ex: [] }; m.n++; if (m.ex.length < 4) m.ex.push(mot); motifs.set(k, m);
    }
  }
  lignes.push({ mot, statut: pareil ? 'identique' : 'écart', ref: cref.map(c => `${c.g}=${c.son}`).join(' '), regles: creg.map(c => `${c.g}=${c.son}`).join(' '),
    ecart: pareil ? '' : `${sref.join(' ')} | ${sreg.join(' ')}` });
}
const csv = ['mot;statut;manulemme;regles;sons_ref | sons_regles',
  ...lignes.map(l => [l.mot, l.statut, l.ref, l.regles, l.ecart].join(';'))].join('\n');
fs.writeFileSync(new URL(`${sortie}/ecarts-regles-manulemme.csv`, racine), '\uFEFF' + csv, 'utf8');
const tab = [...motifs.entries()].sort((a, b) => b[1].n - a[1].n);
fs.writeFileSync(new URL(`${sortie}/motifs-hors-defaut.csv`, racine), '\uFEFF' + 'motif;nb mots;exemples\n' + tab.map(([k, v]) => `${k};${v.n};${v.ex.join(' ')}`).join('\n'), 'utf8');
const ecarts = lignes.filter(l => l.statut === 'écart').length;
console.log(JSON.stringify({ mots: mots.length, identiques: ok, ecarts, absents, codesInconnus: inconnus,
  tauxIdentique: (100 * ok / (ok + ecarts)).toFixed(1) + ' %' }));
console.log('motifs hors défaut (top 25) :'); tab.slice(0, 25).forEach(([k, v]) => console.log(' ', k, v.n, v.ex.join(',')));

// Diagnostic des écarts : à segmentation identique, quel graphème est lu autrement ? Sinon, la segmentation diffère.
const causes = new Map(); let segDiff = 0; const segEx = [];
for (const mot of mots) {
  const e = lex.chercher(mot);
  if (!e || normaliserMot(e.graphemes.join('')) !== normaliserMot(mot)) continue;
  const cref = cubesDepuisEntree(e), creg = segmenterAuto(mot);
  if (sons(cref).includes('?') || sons(cref).join(' ') === sons(creg).join(' ')) continue;
  if (cref.map(c => c.g).join('|') !== creg.map(c => c.g).join('|')) {
    segDiff++; if (segEx.length < 40) segEx.push(`${mot} [ref ${cref.map(c => c.g).join('.')} / règles ${creg.map(c => c.g).join('.')}]`);
  }
  const n = Math.min(cref.length, creg.length);
  for (let i = 0; i < n; i++) if (cref[i].g === creg[i].g && cref[i].son !== creg[i].son) {
    const k = `${cref[i].g}: règles « ${creg[i].son || 'muet'} » au lieu de « ${cref[i].son || 'muet'} »`;
    const m = causes.get(k) || { n: 0, ex: [] }; m.n++; if (m.ex.length < 5) m.ex.push(mot); causes.set(k, m);
  }
}
const ct = [...causes.entries()].sort((a, b) => b[1].n - a[1].n);
fs.writeFileSync(new URL(`${sortie}/causes-ecarts-regles.csv`, racine), '\uFEFF' + 'cause;nb mots;exemples\n' + ct.map(([k, v]) => `${k};${v.n};${v.ex.join(' ')}`).join('\n'), 'utf8');
console.log(`\nMots dont la segmentation diffère : ${segDiff}`);
console.log('causes à segmentation identique (top 30) :'); ct.slice(0, 30).forEach(([k, v]) => console.log(' ', k, v.n, v.ex.join(',')));
console.log('exemples de segmentation différente :'); segEx.slice(0, 15).forEach(s => console.log(' ', s));
