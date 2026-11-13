import { validerPackJouable, SONS_LILEMO } from '../core/index.js';

/* Charge et valide un pack servi par l'app (<base>packs/<nom>/manifest.json).
   Lève une erreur en français : pack « x » introuvable / invalide : <première erreur>. */
export async function chargerPack(nom, options = {}) {
  const { base = '/', fetch: chercher = globalThis.fetch, sonsDisponibles = new Set(SONS_LILEMO) } = options;
  const url = `${base}packs/${encodeURIComponent(nom)}/manifest.json`;
  let reponse;
  try { reponse = await chercher(url); } catch (e) { throw new Error(`pack « ${nom} » introuvable`); }
  if (!reponse || !reponse.ok) throw new Error(`pack « ${nom} » introuvable`);
  let manifest;
  try { manifest = await reponse.json(); } catch (e) { throw new Error(`pack « ${nom} » invalide : fichier illisible`); }
  if (!manifest || !Array.isArray(manifest.cartes)) throw new Error(`pack « ${nom} » invalide : liste de cartes absente`);
  if (manifest.mode === 'lettres') return { pack: { nom: manifest.nom || nom, dossier: nom, mode: 'lettres', cartes: manifest.cartes }, avertissements: validerPackLettres(manifest) };
  const fichiers = new Set(manifest.cartes.flatMap(c => (c ? [c.image_sans_mot, c.image_avec_mot] : []).filter(Boolean)));
  const { erreurs, avertissements } = validerPackJouable(manifest, fichiers, sonsDisponibles);
  if (erreurs.length) throw new Error(`pack « ${nom} » invalide : ${erreurs[0]}`);
  return { pack: { nom: manifest.nom || nom, dossier: nom, cartes: manifest.cartes }, avertissements };
}

// Pack « lettres » (mode A) : pas d'image obligatoire. Chaque carte doit avoir ses lettres, ses graphèmes finaux qui recomposent le mot et ses états.
function validerPackLettres(manifest) {
  manifest.cartes.forEach((c, i) => {
    const id = c && c.id ? c.id : `carte n°${i + 1}`;
    const faute = m => { throw new Error(`pack « ${manifest.nom} » invalide : ${id} : ${m}`); };
    if (!c || !Array.isArray(c.lettres) || c.lettres.length === 0) faute('lettres manquantes');
    if (c.lettres.join('') !== c.mot) faute('les lettres ne recomposent pas le mot');
    if (!Array.isArray(c.cubes) || c.cubes.map(x => x.g).join('') !== c.mot) faute('les graphèmes ne recomposent pas le mot');
    if (!Array.isArray(c.etats) || c.etats.length !== c.lettres.length) faute('un état par lettre est attendu');
  });
  return [];
}
