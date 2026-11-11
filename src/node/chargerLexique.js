import { readFile } from 'node:fs/promises';
import { creerLexique } from '../core/lexique.js';

// Lit data/lexique.json (produit par tools/construire_lexique.py). Node seulement.
export async function chargerLexique(chemin) {
  return creerLexique(JSON.parse(await readFile(chemin, 'utf8')));
}
