// Écrit l'IPA de chaque état « lettre par lettre » de mots donnés, pour la génération Charline.
// États intermédiaires : règles. État final : ManuLemme si le mot y est (data/lexique.json), sinon règles.
// Usage : node tools/etats_charline.js maison chien pomme   ->  essai-tts-ipa/etats.json
import fs from 'node:fs';
import { creerLexique, etatsDuMot, composants, SON_VERS_IPA } from '../src/core/index.js';

const mots = process.argv.slice(2);
if (!mots.length) { console.error('Donner au moins un mot.'); process.exit(1); }
const chemin = new URL('../data/lexique.json', import.meta.url);
const lexique = creerLexique(fs.existsSync(chemin) ? JSON.parse(fs.readFileSync(chemin, 'utf8')) : []);
if (!lexique.taille) console.error('Attention : data/lexique.json absent, tout est lu par règles.');
const etats = [];
for (const mot of mots) {
  etatsDuMot(mot, lexique).forEach((e, k) => {
    const sons = e.cubes.flatMap(c => composants(c.son));
    const ipa = sons.map(s => SON_VERS_IPA[s]).join('');
    etats.push({ id: `${mot}-${k + 1}-${e.lettres}`, mot, lettres: e.lettres, ipa, nbSons: sons.length, source: e.source,
      lecture: e.cubes.map(c => `${c.g}=${c.son || 'muet'}${c.ambigu ? '?' : ''}`).join(' ') + (e.ecartAvecRegles ? '  [lexique ≠ règles]' : ''),
      vitesse: sons.length > 1 ? -30 : 0 }); // décision du 2026-11-12 : sons isolés à vitesse normale, syllabes et au-delà à -30 %
  });
}
fs.writeFileSync(new URL('../essai-tts-ipa/etats.json', import.meta.url), JSON.stringify(etats, null, 2), 'utf8');
etats.forEach(e => console.log(e.id.padEnd(18), e.source.padEnd(8), ('/' + e.ipa + '/').padEnd(14), e.vitesse, e.lecture));
