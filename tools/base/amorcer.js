// Amorce la base de mots unique (data/base/) à partir des packs publics de public/packs/index.json.
// Une fiche par mot : la carte du manifeste + { statut: 'valide', origine: [packs] }. Les fichiers audio et images sont mis en commun (assets/).
// Hypothèse H1 de la spécification : tous les mots des packs publics sont « validés » (JF a rendu les packs publics le 2026-11-15).
// Usage : node tools/base/amorcer.js
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { identifiantCarte } from '../../src/core/packAtelier.js';

const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* paires = [[idPack, carte], ...] pour un même mot. Union des champs ; un champ défini deux fois avec des valeurs différentes est un conflit
   (sauf `syllabes` : la version la plus complète l'emporte). Retourne { fiche, conflits }. */
export function fusionnerCartes(paires) {
  const fiche = {}, conflits = [];
  const mot = paires[0][1].mot;
  const cles = [...new Set(paires.flatMap(([, c]) => Object.keys(c)))];
  for (const cle of cles) {
    const valeurs = paires.map(([, c]) => c[cle]).filter(v => v !== undefined);
    if (cle === 'syllabes') { fiche[cle] = valeurs.reduce((a, b) => (b.length > a.length ? b : a)); continue; }
    if (valeurs.some(v => !egal(v, valeurs[0]))) { conflits.push(`${mot} : ${cle}`); fiche[cle] = valeurs[0]; continue; }
    fiche[cle] = valeurs[0];
  }
  fiche.statut = 'valide';
  fiche.origine = paires.map(([pack]) => pack);
  return { fiche, conflits };
}

const fichiersDe = f => [f.image_sans_mot, f.image_avec_mot, f.phraseAudio, f.audio_mot,
  ...(f.etats || []).map(e => e.fichier), ...(f.syllabes || []).map(s => s.fichier)].filter(Boolean);

export async function amorcer({ racine, sortie = path.join(racine, 'data', 'base'), ecrire = true }) {
  const index = JSON.parse(await readFile(path.join(racine, 'public', 'packs', 'index.json'), 'utf8'));
  const parMot = new Map(), packs = [], conflits = [];
  for (const entree of index) {
    const manifest = JSON.parse(await readFile(path.join(racine, 'public', 'packs', entree.id, 'manifest.json'), 'utf8'));
    const { cartes, ...manifeste } = manifest;
    // Ruling (plan, Task 1) : l'identifiant de la base est identifiantCarte(mot), ASCII ([a-z0-9-]) comme l'exige la base SQL des listes.
    // 13 cartes de p1-100 avaient l'identifiant accentué (« vélo ») ; leurs fichiers n'en dépendent pas.
    const normalisees = cartes.map(c => ({ ...c, id: identifiantCarte(c.mot) }));
    packs.push({ id: entree.id, entree, manifeste, mots: normalisees.map(c => c.id) });
    for (const c of normalisees) {
      if (!parMot.has(c.mot)) parMot.set(c.mot, []);
      parMot.get(c.mot).push([entree.id, c]);
    }
  }
  const fiches = [];
  for (const paires of parMot.values()) {
    const r = fusionnerCartes(paires);
    conflits.push(...r.conflits);
    fiches.push(r.fiche);
  }
  // Garde-fou : deux mots différents ne doivent pas donner le même identifiant (là / la, où / ou, sûr / sur) ni un identifiant hors [a-z0-9-]{1,60}.
  const parId = new Map();
  for (const f of fiches) { if (!parId.has(f.id)) parId.set(f.id, []); parId.get(f.id).push(f.mot); }
  for (const [id, mots] of parId) if (mots.length > 1) conflits.push(`identifiant en double : ${id} (${mots.join(', ')})`);
  for (const f of fiches) if (!/^[a-z0-9-]{1,60}$/.test(f.id)) conflits.push(`${f.mot} : identifiant invalide (${f.id})`);
  // Fichiers communs : un nom de fichier = un contenu (vérifié le 2026-11-15 : aucune collision entre packs).
  const copies = new Map();
  for (const f of fiches) {
    for (const fichier of fichiersDe(f)) {
      const source = f.origine.map(p => path.join(racine, 'public', 'packs', p, fichier)).find(existsSync);
      if (!source) { conflits.push(`${f.mot} : fichier absent (${fichier})`); continue; }
      const dest = path.join(sortie, 'assets', fichier);
      if (copies.has(fichier)) {
        if ((await readFile(copies.get(fichier))).compare(await readFile(source)) !== 0) conflits.push(`${f.mot} : fichier différent sous le même nom (${fichier})`);
        continue;
      }
      copies.set(fichier, source);
      if (ecrire) { await mkdir(path.dirname(dest), { recursive: true }); await copyFile(source, dest); }
    }
  }
  if (ecrire) {
    await mkdir(sortie, { recursive: true });
    await writeFile(path.join(sortie, 'fiches.json'), JSON.stringify(fiches, null, 1) + '\n', 'utf8');
    await writeFile(path.join(sortie, 'packs.json'), JSON.stringify(packs, null, 1) + '\n', 'utf8');
  }
  return { fiches, packs, conflits };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const r = await amorcer({ racine });
  console.log(`${r.fiches.length} fiches, ${r.packs.length} packs, ${r.conflits.length} conflit(s)`);
  r.conflits.forEach(c => console.log(' - ' + c));
}
