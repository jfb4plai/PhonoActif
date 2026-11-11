import { readFile, writeFile, rename } from 'node:fs/promises';
import { creerCorrections, fusionnerCorrections } from '../core/index.js';

const illisible = (chemin, detail) => new Error(`Fichier de corrections illisible : ${chemin} (${detail})`);

async function lireTableau(chemin, toleranceAbsent) {
  let texte;
  try { texte = await readFile(chemin, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT' && toleranceAbsent) return [];
    throw illisible(chemin, e.message);
  }
  let donnees;
  try { donnees = JSON.parse(texte); } catch (e) { throw illisible(chemin, 'JSON invalide'); }
  if (!Array.isArray(donnees)) throw illisible(chemin, 'un tableau était attendu');
  return donnees;
}

// Fichier absent : aucune correction. Les corrections invalides sont rendues dans `rejets`, jamais appliquées.
export async function chargerCorrections(chemin) {
  return creerCorrections(await lireTableau(chemin, true));
}

// Écriture atomique : fichier temporaire puis renommage ; trié par mot.
export async function enregistrerCorrections(chemin, liste) {
  const triee = fusionnerCorrections([], liste);
  const tmp = `${chemin}.tmp`;
  await writeFile(tmp, JSON.stringify(triee, null, 1) + '\n', 'utf8');
  await rename(tmp, chemin);
}

// Fusionne un fichier exporté par la page de revue dans le fichier de corrections.
// N'écrit rien si le fichier importé est illisible ou si le fichier existant contient des corrections invalides.
export async function importerCorrections(cheminCorrections, cheminImport) {
  const importees = await lireTableau(cheminImport, false);
  const { corrections: existantes, rejets: invalidesExistantes } = await chargerCorrections(cheminCorrections);
  if (invalidesExistantes.length) {
    throw new Error(`${cheminCorrections} contient des corrections invalides (${invalidesExistantes.map(r => r.mot).join(', ')}) : les corriger avant d'importer.`);
  }
  const { corrections: nouvelles, rejets: rejetees } = creerCorrections(importees);
  await enregistrerCorrections(cheminCorrections, fusionnerCorrections(existantes.liste, nouvelles.liste));
  return { importees: nouvelles.taille, rejetees };
}
