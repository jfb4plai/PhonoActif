/* Adresse d'un fichier (audio, image) d'un pack : « mots/ » pour une liste chargée par identifiant (pack.racine), « packs/<dossier>/ » pour un ancien pack.
   Chaque segment est encodé ; les sous-dossiers (audio/, images/) sont conservés. */
export function urlFichier(base, pack, fichier) {
  const racine = String(base).replace(/\/+$/, '') + '/';
  const e = encodeURIComponent;
  const chemin = String(fichier).split('/').map(e).join('/');
  return pack.racine ? `${racine}${e(pack.racine)}/${chemin}` : `${racine}packs/${e(pack.dossier || pack.nom)}/${chemin}`;
}
