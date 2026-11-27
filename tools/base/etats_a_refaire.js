// Remarque de Virginie sur la voix (2026-11-21) : les états « lettres posées » des fiches existantes sont relus avec les sons du mot visé
// (src/core/etats.js). Cet outil compare l'audio actuel des états à la nouvelle lecture et prépare la régénération.
//
// Usage :
//   node tools/base/etats_a_refaire.js                      # LISTE seulement : n'écrit rien dans la base ; écrit data/packs-atelier/etats-voix/ (liste Azure + changements)
//   node tools/base/etats_a_refaire.js appliquer <dossier>  # APRÈS génération Azure par JF : copie les audios, met à jour les états des fiches (data/base/fiches.json)
//   ... appliquer <dossier> --mot chien [--mot x] [--garder-syllabes]            # seulement ces mots ; met aussi à jour les cubes (graphèmes) et les syllabes de la fiche si une correction les a changés ; --garder-syllabes : même nombre de syllabes qu'avant (seul un schwa final est retiré de la dernière), décision de JF du 2026-11-27 pour e final muet
//
// Suite après la liste (clé Azure, par JF) :
//   python -I essai-tts-ipa/generer-bibliotheque.py pack etats-voix     -> public/packs/etats-voix/audio
//   node tools/base/etats_a_refaire.js appliquer public/packs/etats-voix/audio
//   node tools/base/publier.js, npx vite build, écouter petit, elle, avec, papa, puis commit et push.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../../src/node/chargerLexique.js';
import { chargerCorrections } from '../../src/node/corrections.js';
import { etatsDuMot, composants, SON_VERS_IPA, nomFichierAudio, syllabesPourCubes } from '../../src/core/index.js';

const racine = fileURLToPath(new URL('../..', import.meta.url));
const base = path.join(racine, 'data', 'base');
const NOM = 'etats-voix';
const lire = async f => JSON.parse(await readFile(f, 'utf8'));
const ecrire = (f, d) => writeFile(f, JSON.stringify(d, null, 1) + '\n', 'utf8');

// IPA et vitesse d'un nom de fichier « codes Unicode_vitesse » (réversible, voir nomFichierAudio)
const decoder = fichier => {
  const m = /^audio\/([0-9a-f_]+)_(-?\d+)\.mp3$/.exec(fichier || '');
  return m ? { ipa: m[1].split('_').map(h => String.fromCodePoint(parseInt(h, 16))).join(''), vitesse: Number(m[2]) } : null;
};

async function calculer() {
  const fiches = await lire(path.join(base, 'fiches.json'));
  const lexique = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
  const { corrections } = await chargerCorrections(path.join(racine, 'data', 'corrections.json'));
  const changements = [], ignorees = [];
  for (const f of fiches) {
    if (!Array.isArray(f.etats) || f.etats.length === 0) continue;
    const neufs = etatsDuMot(f.mot, lexique, { corrections });
    if (neufs.length !== f.etats.length || neufs.some((e, i) => e.lettres !== f.etats[i].lettres)) { ignorees.push(`${f.mot} : lettres des états différentes`); continue; }
    const etats = neufs.map((e, i) => {
      const sons = e.cubes.flatMap(c => composants(c.son));
      const ipa = sons.map(s => SON_VERS_IPA[s]).join('');
      const vitesse = sons.length > 1 ? -30 : 0;
      const fichier = ipa ? `audio/${nomFichierAudio(ipa, vitesse)}.mp3` : null;
      return { lettres: e.lettres, ipa, vitesse, fichier, ancien: f.etats[i].fichier || null, ecartAvecRegles: e.ecartAvecRegles };
    });
    const diff = etats.filter(e => e.fichier !== e.ancien);
    const cubes = neufs[neufs.length - 1].cubes.map(c => ({ g: c.g, son: c.son }));
    const cubesChangent = JSON.stringify(cubes) !== JSON.stringify((f.cubes || []).map(c => ({ g: c.g, son: c.son })));
    if (diff.length || cubesChangent) changements.push({ id: f.id, mot: f.mot, statut: f.statut, etats, cubes, cubesChangent, diff: diff.map(e => ({ lettres: e.lettres, avant: (decoder(e.ancien) || {}).ipa || null, apres: e.ipa })) });
  }
  return { fiches, changements, ignorees };
}

async function lister() {
  const { changements, ignorees } = await calculer();
  const bibliotheque = path.join(racine, 'essai-tts-ipa', 'sortie', 'bibliotheque', 'norm');
  const distincts = new Map();
  changements.forEach(c => c.etats.forEach(e => { if (e.fichier && e.fichier !== e.ancien && !distincts.has(e.fichier)) distincts.set(e.fichier, { ipa: e.ipa, vitesse: e.vitesse, fichier: path.basename(e.fichier, '.mp3') }); }));
  const deja = f => existsSync(path.join(base, 'assets', 'audio', f.fichier + '.mp3')) || existsSync(path.join(bibliotheque, f.fichier + '.mp3'));
  const aGenerer = [...distincts.values()].filter(f => !deja(f));
  const dossier = path.join(racine, 'data', 'packs-atelier', NOM);
  await mkdir(dossier, { recursive: true });
  await ecrire(path.join(dossier, 'a-generer.json'), { nom: NOM, fichiersDistincts: aGenerer });
  await ecrire(path.join(dossier, 'changements.json'), changements.map(({ etats, ...c }) => c));
  const nbEtats = changements.reduce((s, c) => s + c.diff.length, 0);
  console.log(`${changements.length} fiches ont des états qui changent (${nbEtats} états) ; ${distincts.size} fichiers audio nouveaux nécessaires, dont ${aGenerer.length} absents de la base et de la bibliothèque (à générer avec Azure).`);
  ignorees.forEach(x => console.log(`  ignorée : ${x}`));
  changements.slice(0, 12).forEach(c => console.log(`  ${c.mot} : ${c.diff.map(d => `${d.lettres} /${d.avant}/→/${d.apres}/`).join(' ; ')}`));
  console.log(`Écrit : ${path.join(dossier, 'a-generer.json')} et changements.json. Rien n'a été modifié dans data/base.`);
  console.log(`Suite (clé Azure, par JF) :\n  python -I essai-tts-ipa/generer-bibliotheque.py pack ${NOM}\n  node tools/base/etats_a_refaire.js appliquer public/packs/${NOM}/audio`);
}

async function appliquer(dossierAudio, mots, garder = false) {
  if (!dossierAudio) throw new Error('Donner le dossier des audios générés.');
  const calcul = await calculer();
  const { fiches } = calcul;
  const changements = mots.length ? calcul.changements.filter(c => mots.includes(c.mot)) : calcul.changements;
  if (mots.length) { const absents = mots.filter(m => !changements.some(c => c.mot === m)); if (absents.length) console.log(`Rien à changer pour : ${absents.join(', ')}`); }
  const parId = new Map(fiches.map(f => [f.id, f]));
  let copies = 0, mises = 0;
  const incomplets = [];
  for (const c of changements) {
    const manquants = [];
    for (const e of c.etats) {
      if (!e.fichier) continue;
      const dest = path.join(base, 'assets', e.fichier);
      if (existsSync(dest)) continue;
      // le générateur ne refait pas un fichier déjà dans la bibliothèque : on le prend là s'il n'est pas dans le dossier du pack
      const candidats = [path.join(path.resolve(dossierAudio), path.basename(e.fichier)), path.join(racine, 'essai-tts-ipa', 'sortie', 'bibliotheque', 'norm', path.basename(e.fichier))];
      const src = candidats.find(x => existsSync(x));
      if (src) { await mkdir(path.dirname(dest), { recursive: true }); await copyFile(src, dest); copies++; } else manquants.push(e.fichier);
    }
    if (manquants.length) { incomplets.push(`${c.mot} : ${manquants.length} audio(s) absent(s)`); continue; } // la fiche garde ses anciens états
    const f = parId.get(c.id);
    f.etats = f.etats.map((old, i) => ({ ...old, fichier: c.etats[i].fichier, ecartAvecRegles: c.etats[i].ecartAvecRegles }));
    if (mots.length && c.cubesChangent) {
      f.cubes = c.cubes; // cubes : seulement en mode --mot (correction voulue), jamais en masse
      if (Array.isArray(f.syllabes) && f.syllabes.length) { // syllabes recalculées sur les nouveaux cubes ; fichier absent = on garde les anciennes
        let neuves = syllabesPourCubes(c.cubes).map(({ ipa, fichier, cubes }) => ({ ipa, fichier: `audio/${fichier}.mp3`, ...(cubes !== undefined ? { cubes } : {}) }));
        if (garder && neuves.length < f.syllabes.length) { // mêmes syllabes qu'avant, sans le schwa final de la dernière ; le nombre de cubes ne change pas
          const sansSchwa = x => { const ipa = x.ipa.replace(/ə$/u, ''); const vitesse = [...ipa.normalize('NFD').replace(/[\u0303\u0361]/g, '')].length > 1 ? -30 : 0; return { ...x, ipa, fichier: `audio/${nomFichierAudio(ipa, vitesse)}.mp3` }; };
          neuves = f.syllabes.map((x, i, t) => (i < t.length - 1 ? x : sansSchwa(x)));
        }
        if (neuves.every(x => existsSync(path.join(base, 'assets', x.fichier)))) f.syllabes = neuves; else incomplets.push(`${c.mot} : syllabes gardées (audio absent)`);
      }
    }
    mises++;
  }
  await ecrire(path.join(base, 'fiches.json'), fiches);
  console.log(`${copies} audios copiés ; ${mises} fiches mises à jour sur ${changements.length}.`);
  incomplets.forEach(x => console.log(`  gardée telle quelle : ${x}`));
  console.log('Suite : node tools/base/publier.js, npx vite build, écouter petit, elle, avec, papa, puis commit et push.');
}

const args = process.argv.slice(2);
const mots = args.flatMap((a, i) => (a === '--mot' && args[i + 1] ? [args[i + 1]] : []));
const [commande, arg] = args;
(commande === 'appliquer' ? appliquer(arg, mots, args.includes('--garder-syllabes')) : lister()).catch(e => { console.error(e.message); process.exit(1); });
