// Syllabes (coupées sur les SONS du mot entier) de chaque mot du pack mode A : IPA et nom de fichier (même convention que la bibliothèque).
// Écrit data/syllabes-mots.json : { mot: [{ ipa, fichier }] }. Lecture seule du lexique, aucun appel réseau.
// Usage : node tools/syllabes_mots.js
import fs from 'node:fs';
import { composants, syllabesDeSons, SON_VERS_IPA } from '../src/core/index.js';

const lire = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const nomFichier = (ipa, vitesse) => ipa.split('').map(c => c.codePointAt(0).toString(16)).join('_') + '_' + vitesse;
// même règle que tools/liste_syllabes.js : vitesse -30 % au-delà d'un son
const nbSons = ipa => [...ipa.normalize('NFD').replace(/[̃͡]/g, '')].length;

const sortie = {};
for (const m of lire('../data/mode-a.json').mots) {
  const sons = m.cubes.flatMap(c => composants(c.son));
  sortie[m.mot] = syllabesDeSons(sons).map(s => {
    const ipa = s.map(x => SON_VERS_IPA[x]).join('');
    return { ipa, fichier: nomFichier(ipa, nbSons(ipa) > 1 ? -30 : 0) + '.mp3' };
  });
}
fs.writeFileSync(new URL('../data/syllabes-mots.json', import.meta.url), JSON.stringify(sortie, null, 1), 'utf8');
const n = Object.values(sortie).filter(s => s.length > 1).length;
console.log(`${Object.keys(sortie).length} mots, dont ${n} de plusieurs syllabes.`);
