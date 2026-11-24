/* Niveau choisi en premier (décision de JF 2026-11-24) : il règle les valeurs de départ et décide quelles options sont proposées.
   « maternelle » (M1 à M3) : exercice « première lettre » ; l'app fixe seule les réglages qui n'ont pas de sens à cet âge.
   « primaire » (P1 et plus) : construction du mot, toutes les options. */

// Valeurs imposées au changement de niveau (elles remplacent les réglages en cours).
export const REGLAGES_DU_NIVEAU = {
  maternelle: { casse: 'majuscules', commandes: 'epure', modeMot: 'sans', habillage: 'album', nbIntrus: 0, digraphes: [], consignes: undefined },
  primaire: { casse: 'minuscules', commandes: 'complet', modeMot: 'sans', habillage: 'album', nbIntrus: 3, digraphes: [2, 3, 4], consignes: undefined }
};

// Options qui n'ont pas de sens en maternelle : pas de mot à construire, donc ni cubes en trop, ni accents, ni blocs, ni lettre muette, ni syllabes.
const MASQUEES_MATERNELLE = new Set(['mode', 'habillage', 'intrus', 'accents', 'blocs', 'muet', 'syllabes', 'commandes', 'consignes']);

export const niveauDe = tache => (tache && tache.niveau === 'maternelle' ? 'maternelle' : 'primaire');
export const optionVisible = (tache, option) => !(niveauDe(tache) === 'maternelle' && MASQUEES_MATERNELLE.has(option));

// Listes proposées : une liste porte son niveau (« maternelle ») ; sans niveau, elle est du primaire.
export const listesDuNiveau = (listes, tache) => (listes || []).filter(l => ((l && l.niveau) === 'maternelle' ? 'maternelle' : 'primaire') === niveauDe(tache));
