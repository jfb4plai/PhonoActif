// IPA de l'état final (ManuLemme si le mot y est, sinon règles) de mots entiers, pour la comparaison Charline / Lingua Libre.
// Usage : node tools/mots_charline.js maison chat ...   ->  essai-tts-ipa/comparaison-mots.json
import fs from 'node:fs';
import { creerLexique, etatsDuMot, composants, SON_VERS_IPA } from '../src/core/index.js';

const mots = process.argv.slice(2);
if (!mots.length) { console.error('Donner au moins un mot.'); process.exit(1); }
const lexique = creerLexique(JSON.parse(fs.readFileSync(new URL('../data/lexique.json', import.meta.url), 'utf8')));
// Codes ManuLemme que le moteur ne sait pas encore lire (file de revue de JF) : IPA écrit à la main depuis le champ phono du lexique,
// uniquement pour cet essai d'écoute (ville vil, nuit n8i, soleil sOlEj, crayon kREj§). Hypothèse de lecture, à valider à l'oreille.
const A_LA_MAIN = { ville: 'vil', nuit: 'nɥi', soleil: 'sɔlɛj', crayon: 'kʁɛjɔ̃' };
const sortie = mots.map(mot => {
  const e = etatsDuMot(mot, lexique).at(-1);
  if (e.aVerifier && A_LA_MAIN[mot]) return { mot, ipa: A_LA_MAIN[mot], source: 'a la main', aVerifier: true, vitesse: -30 };
  const sons = e.cubes.flatMap(c => composants(c.son));
  return { mot, ipa: sons.map(s => SON_VERS_IPA[s]).join(''), source: e.source, aVerifier: !!e.aVerifier, vitesse: sons.length > 1 ? -30 : 0 };
});
fs.writeFileSync(new URL('../essai-tts-ipa/comparaison-mots.json', import.meta.url), JSON.stringify(sortie, null, 1), 'utf8');
sortie.forEach(x => console.log(x.mot.padEnd(10), x.source.padEnd(8), '/' + x.ipa + '/', x.vitesse, x.aVerifier ? 'A VERIFIER' : ''));
