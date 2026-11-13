// Sélectionne N mots de la liste P1 de JF (ordre de la liste = ordre de fréquence) et calcule leurs états « mode A » (lettre par lettre).
// Filtre déterministe, sans IA (règle de JF) : mot de 3 à 7 lettres, une seule graphie sans espace ni trait d'union,
// présent dans ManuLemme, état final lu sans code inconnu, aucun état à son nul.
// Écrit data/mode-a.json : mots + états (IPA, vitesse, nom de fichier) + liste des fichiers distincts à générer.
// Usage : node tools/mode_a_mots.js [N=100]
import fs from 'node:fs';
import { creerLexique, etatsDuMot, composants, SON_VERS_IPA } from '../src/core/index.js';

const N = Number(process.argv[2] || 100);
const lire = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const lexique = creerLexique(lire('../data/lexique.json'));
const p1 = lire('../data/p1-mots.json');

// même nom que essai-tts-ipa/generer-bibliotheque.py : codes Unicode de l'IPA + vitesse (les états identiques sont partagés)
const nomFichier = (ipa, vitesse) => ipa.split('').map(c => c.codePointAt(0).toString(16)).join('_') + '_' + vitesse;

const mots = [], rejets = { forme: 0, absent: 0, aVerifier: 0, sonNul: 0 };
for (const mot of p1) {
  if (mots.length >= N) break;
  if (!/^[a-zàâçéèêëîïôûùüœ]{3,7}$/.test(mot)) { rejets.forme++; continue; }
  if (!lexique.chercher(mot)) { rejets.absent++; continue; }
  const etats = etatsDuMot(mot, lexique);
  const dernier = etats.at(-1);
  if (dernier.aVerifier) { rejets.aVerifier++; continue; }
  if (etats.some(e => e.cubes.some(c => c.son === null))) { rejets.sonNul++; continue; }
  mots.push({
    mot,
    cubes: dernier.cubes.map(c => ({ g: c.g, son: c.son })),
    etats: etats.map(e => {
      const sons = e.cubes.flatMap(c => composants(c.son));
      const ipa = sons.map(s => SON_VERS_IPA[s]).join('');
      const vitesse = sons.length > 1 ? -30 : 0;
      return { lettres: e.lettres, ipa, vitesse, fichier: ipa ? nomFichier(ipa, vitesse) : null, source: e.source, ecartAvecRegles: e.ecartAvecRegles };
    })
  });
}
const distincts = new Map();
mots.forEach(m => m.etats.forEach(e => { if (e.fichier && !distincts.has(e.fichier)) distincts.set(e.fichier, { ipa: e.ipa, vitesse: e.vitesse, fichier: e.fichier }); }));
const sortie = {
  criteres: 'liste P1 de JF dans l\'ordre ; 3 à 7 lettres ; dans ManuLemme ; état final sans code inconnu ; aucun état à son nul',
  rejets, nbMots: mots.length, nbEtats: mots.reduce((s, m) => s + m.etats.length, 0), fichiersDistincts: [...distincts.values()], mots
};
fs.writeFileSync(new URL('../data/mode-a.json', import.meta.url), JSON.stringify(sortie, null, 1), 'utf8');

// Pack jouable en mode A : public/packs/p1-100/manifest.json (cartes sans image : le mot est dit ou affiché selon le réglage).
const NOM_PACK = `p1-${N}`;
const dossierPack = new URL(`../public/packs/${NOM_PACK}/`, import.meta.url);
fs.mkdirSync(dossierPack, { recursive: true });
const manifest = {
  nom: NOM_PACK, mode: 'lettres', source: 'liste P1 de JF, filtre déterministe sans IA (tools/mode_a_mots.js)',
  cartes: mots.map(m => ({
    id: m.mot, mot: m.mot, lettres: [...m.mot], cubes: m.cubes,
    etats: m.etats.map(e => ({ lettres: e.lettres, fichier: e.fichier ? `audio/${e.fichier}.mp3` : null, ecartAvecRegles: e.ecartAvecRegles }))
  }))
};
fs.writeFileSync(new URL('manifest.json', dossierPack), JSON.stringify(manifest, null, 1), 'utf8');
const cheminIndex = new URL('../public/packs/index.json', import.meta.url);
const index = JSON.parse(fs.readFileSync(cheminIndex, 'utf8')).filter(p => p.id !== NOM_PACK);
index.push({ id: NOM_PACK, label: `${mots.length} mots de P1, lecture lettre par lettre (voix Charline)` });
fs.writeFileSync(cheminIndex, JSON.stringify(index, null, 1), 'utf8');
console.log(`${sortie.nbMots} mots, ${sortie.nbEtats} états, ${distincts.size} fichiers distincts ; rejets`, rejets);
console.log('mots :', mots.map(m => m.mot).join(' '));
console.log('états sans son (silence) :', mots.flatMap(m => m.etats.filter(e => !e.fichier).map(e => `${m.mot}:${e.lettres}`)).join(' ') || 'aucun');
console.log('états où le lexique change la lecture finale :', mots.filter(m => m.etats.at(-1).ecartAvecRegles).map(m => m.mot).join(' ') || 'aucun');
