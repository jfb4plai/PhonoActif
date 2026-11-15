/* Listes de mots de l'enseignant (décisions de JF, 2026-11-15) : une liste = 1 à 50 mots ; une tâche peut charger plusieurs listes (révisions).
   Borne technique d'une tâche : 200 mots après fusion (hypothèse H2 de la spécification, à confirmer par JF). Fonctions pures. */
export const LISTE_MIN = 1;
export const LISTE_MAX = 50;
export const TACHE_MAX = 200;

const sansDoublons = ids => [...new Set(ids)];

/* ids = identifiants de mots ; catalogueIds = Set des identifiants du catalogue publié. Retourne { erreurs, mots } (mots sans doublons, ordre conservé). */
export function validerListe(ids, catalogueIds) {
  const mots = Array.isArray(ids) ? sansDoublons(ids) : [];
  const erreurs = [];
  if (mots.length < LISTE_MIN) erreurs.push(`Une liste contient au moins ${LISTE_MIN} mot.`);
  else if (mots.length > LISTE_MAX) erreurs.push(`Une liste contient au plus ${LISTE_MAX} mots.`);
  for (const m of mots) if (!catalogueIds.has(m)) erreurs.push(`Mot inconnu : ${m}.`);
  return { erreurs, mots };
}

// Plusieurs listes chargées ensemble : doublons supprimés, ordre des listes puis des mots conservé.
export const fusionnerListes = listes => sansDoublons(listes.flat());

export function validerTache(ids) {
  const erreurs = [];
  if (!Array.isArray(ids) || ids.length < 1) erreurs.push('Choisir au moins une liste non vide.');
  else if (ids.length > TACHE_MAX) erreurs.push(`Une tâche contient au plus ${TACHE_MAX} mots (révisions comprises).`);
  return { erreurs };
}

// Coupe à n caractères (et non n unités UTF-16) : un émoji n'est jamais coupé en deux.
export const couper = (texte, n) => Array.from(String(texte)).slice(0, n).join('');
