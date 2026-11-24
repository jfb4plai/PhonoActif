// Publie la base servie public/mots/ à partir de data/base/ : fiches, catalogue (pour filtrer), modèles (les packs vus comme listes), audio et images communs.
// Seules les fiches au statut « valide » sont servies. Dossier entièrement régénéré à chaque appel.
// Usage : node tools/base/publier.js
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { composants } from '../../src/core/sons.js';
import { SON_VERS_IPA } from '../../src/core/ipa.js';

const fichiersDe = f => [f.image_sans_mot, f.image_avec_mot, f.phraseAudio, f.audio_mot,
  ...(f.etats || []).map(e => e.fichier), ...(f.syllabes || []).map(s => s.fichier)].filter(Boolean);

// Un mot sans `syllabes` dans le manifeste est un monosyllabe (constat du 2026-11-14 sur p1-100 : les 27 mots à `syllabes` ont 2 syllabes ou plus).
export const entreeCatalogue = f => ({
  id: f.id, mot: f.mot,
  ipa: f.cubes.flatMap(c => composants(c.son)).map(s => SON_VERS_IPA[s] || '').join(''),
  nbSyllabes: (f.syllabes && f.syllabes.length) || 1,
  cubes: f.cubes.map(c => c.g),
  sons: f.cubes.flatMap(c => composants(c.son)),
  image: !!(f.image_sans_mot || f.image_avec_mot), phrase: !!f.phrase, syllabes: !!(f.syllabes && f.syllabes.length),
  audio: (f.etats && f.etats.length ? f.etats[f.etats.length - 1].fichier : '') || '',
  packs: f.origine || []
});

export async function publier({ racine, base = path.join(racine, 'data', 'base'), sortie = path.join(racine, 'public', 'mots') }) {
  const toutes = JSON.parse(await readFile(path.join(base, 'fiches.json'), 'utf8'));
  const packs = JSON.parse(await readFile(path.join(base, 'packs.json'), 'utf8'));
  const fiches = toutes.filter(f => f.statut === 'valide');
  const ids = new Set(fiches.map(f => f.id));
  if (ids.size !== fiches.length) {
    const vus = new Set(), dup = fiches.find(f => (vus.has(f.id) ? true : (vus.add(f.id), false)));
    throw new Error(`identifiant en double : ${dup.id}`);
  }
  await rm(sortie, { recursive: true, force: true });
  await mkdir(sortie, { recursive: true });
  const servies = fiches.map(({ statut, origine, ...f }) => f);
  await writeFile(path.join(sortie, 'fiches.json'), JSON.stringify(servies) + '\n', 'utf8');
  const catalogue = fiches.map(entreeCatalogue).sort((a, b) => a.mot.localeCompare(b.mot, 'fr'));
  await writeFile(path.join(sortie, 'catalogue.json'), JSON.stringify(catalogue) + '\n', 'utf8');
  // Un pack à paliers n'est publié que complet (décision de JF du 2026-11-22) : un mot manquant retire tout le modèle.
  const modeles = packs.map(p => {
    const m = { id: p.id, titre: p.manifeste.titre || p.entree.label, mots: p.mots.filter(x => ids.has(x)), ...(p.manifeste.niveau ? { niveau: p.manifeste.niveau } : {}) }; // niveau : « maternelle » pour l'exercice initiale
    const paliers = p.manifeste.paliers;
    if (!Array.isArray(paliers)) return m;
    if (m.mots.length !== p.mots.length) return null;
    return { ...m, paliers: paliers.map(({ id, difficulte, annonce, mots }) => ({ id, difficulte, annonce: annonce || '', mots })) };
  }).filter(m => m && m.mots.length > 0);
  await writeFile(path.join(sortie, 'modeles.json'), JSON.stringify(modeles) + '\n', 'utf8');
  let octets = 0;
  for (const f of new Set(fiches.flatMap(fichiersDe))) {
    await mkdir(path.dirname(path.join(sortie, f)), { recursive: true });
    await copyFile(path.join(base, 'assets', f), path.join(sortie, f));
  }
  return { nbMots: fiches.length, octets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const r = await publier({ racine });
  console.log(`${r.nbMots} mots publiés dans public/mots/`);
}
