/* Charge des mots par identifiant (<base>mots/fiches.json, publié par tools/base/publier.js) et les assemble en un pack « lettres » en mémoire.
   Les cartes suivent l'ordre des identifiants. Un identifiant absent de la base est sauté avec un avertissement (une tâche déjà donnée ne doit pas planter). */
const ERREUR_CHARGEMENT = "Les mots n'ont pas pu être chargés.";

export async function chargerMots(ids, options = {}) {
  const { base = '/', fetch: chercher = globalThis.fetch } = options;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('Aucun mot à charger.');
  let fiches;
  try {
    const reponse = await chercher(`${String(base).replace(/\/+$/, '')}/mots/fiches.json`);
    if (!reponse || !reponse.ok) throw new Error('http');
    fiches = await reponse.json();
    if (!Array.isArray(fiches)) throw new Error('format');
  } catch (e) { throw new Error(ERREUR_CHARGEMENT); }
  const parId = new Map(fiches.map(f => [f.id, f]));
  const cartes = [], avertissements = [];
  for (const id of ids) {
    const f = parId.get(id);
    if (f) cartes.push(f); else avertissements.push(`Mot retiré de la base : ${id}`);
  }
  if (cartes.length === 0) throw new Error("Aucun des mots de cette tâche n'est disponible.");
  return { pack: { nom: 'liste', racine: 'mots', mode: 'lettres', cartes }, avertissements };
}
