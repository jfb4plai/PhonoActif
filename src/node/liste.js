import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { creerListe } from '../core/index.js';

const illisible = (chemin, detail) => new Error(`Fichier de lignes illisible : ${chemin} (${detail})`);

// Lit des lignes brutes (tableau JSON), construit la liste validée et l'écrit dans <dossierSortie>/<id>.json.
// Rien n'est écrit si la liste est invalide (source ou licence vide, par exemple).
export async function construireListeDepuisBrut(cheminBrut, params, dossierSortie) {
  let donnees;
  try { donnees = JSON.parse(await readFile(cheminBrut, 'utf8')); } catch (e) { throw illisible(cheminBrut, e.code === 'ENOENT' ? 'fichier absent' : 'JSON invalide'); }
  if (!Array.isArray(donnees)) throw illisible(cheminBrut, 'un tableau était attendu');
  const resultat = creerListe({ ...params, lignes: donnees });
  await mkdir(dossierSortie, { recursive: true });
  await writeFile(path.join(dossierSortie, `${resultat.liste.id}.json`), JSON.stringify(resultat.liste, null, 1) + '\n', 'utf8');
  return resultat;
}
