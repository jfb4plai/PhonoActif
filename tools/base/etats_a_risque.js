// Liste les états « lettres posées » et les syllabes dont l'audio est une chaîne IPA courte contenant une voyelle moyenne
// (e é è o ò eu ø œ ə), cas signalés par Virginie le 2026-11-27 (vél, to, ʁi, arbre). Lecture seule : n'écrit que docs/etats-a-risque-voix.csv.
// Usage : node tools/base/etats_a_risque.js
// Critère (objectif, sans écoute) : 2 ou 3 sons, la voyelle moyenne est le dernier son ou n'est suivie que de l ou ʁ (formes de vé, vel, to, so, pe, ʁe). Une ligne par chaîne IPA distincte (un fichier = une écoute), avec les mots qui l'utilisent.
// Cela désigne les états à écouter en priorité ; cela ne dit PAS qu'ils sont faux.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = fileURLToPath(new URL('../..', import.meta.url));
const fiches = JSON.parse(readFileSync(path.join(racine, 'data', 'base', 'fiches.json'), 'utf8'));
const liste = Array.isArray(fiches) ? fiches : Object.values(fiches.fiches || fiches);
const RISQUE = /^[^eɛoɔøœə]+[eɛoɔøœə][lʁ]?$/u; // consonne(s) + voyelle moyenne + (l ou ʁ) en fin de chaîne
const decoder = f => {
  const m = /audio\/([0-9a-f_]+)_(-?\d+)\.mp3/.exec(f || '');
  return m ? { ipa: String.fromCodePoint(...m[1].split('_').map(h => parseInt(h, 16))), vitesse: Number(m[2]) } : null;
};
const sons = ipa => [...ipa.normalize('NFC')].filter(c => !/[̃ːː.]/u.test(c)).length;
const parIpa = new Map();
let total = 0;
for (const c of liste) {
  for (const [type, items] of [['etat', c.etats || []], ['syllabe', c.syllabes || []]]) {
    for (const e of items) {
      const d = decoder(e.fichier);
      if (!d) continue;
      total++;
      const n = sons(d.ipa);
      if (n >= 2 && n <= 3 && RISQUE.test(d.ipa.normalize('NFC'))) {
        const k = `${d.ipa}|${d.vitesse}`;
        const x = parIpa.get(k) || { ipa: d.ipa, vitesse: d.vitesse, n, mots: new Set() };
        x.mots.add(`${c.mot}${type === 'syllabe' ? '(syl)' : ''}`);
        parIpa.set(k, x);
      }
    }
  }
}
const lignes = [['ipa', 'vitesse', 'nb_sons', 'nb_mots', 'mots']];
for (const x of [...parIpa.values()].sort((a, b) => a.ipa.localeCompare(b.ipa))) lignes.push([x.ipa, x.vitesse, x.n, x.mots.size, [...x.mots].join(' ')]);
writeFileSync(path.join(racine, 'docs', 'etats-a-risque-voix.csv'), '\ufeff' + lignes.map(l => l.join(';')).join('\n') + '\n', 'utf8');
console.log(`Fiches : ${liste.length} ; fichiers décodés : ${total} ; chaînes IPA distinctes à écouter en priorité : ${lignes.length - 1}.`);
