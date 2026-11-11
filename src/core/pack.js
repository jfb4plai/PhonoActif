import { normaliserMot } from './lexique.js';
import { segmenterExplicite } from './segmentation.js';

/* Valide un pack de cartes préparé hors de l'app.
   Manifest = { nom, cartes: Carte[] } ; Carte = { id, mot, image_sans_mot, image_avec_mot?, graphemes?, niveau?, source, licence }
   fichiers = noms de fichiers présents dans le dossier du pack. Messages préfixés par l'id de la carte. */
export function validerPack(manifest, fichiers, lexique) {
  const erreurs = [], avertissements = [];
  const cartes = manifest && Array.isArray(manifest.cartes) ? manifest.cartes : [];
  if (cartes.length === 0) return { erreurs: ['pack vide'], avertissements };

  const ids = new Set(), mots = new Set();
  cartes.forEach((c, i) => {
    if (!c || typeof c !== 'object') { erreurs.push(`carte n°${i + 1} : carte invalide`); return; }
    const vide = v => typeof v !== 'string' || v.trim() === '';
    const id = vide(c.id) ? `carte n°${i + 1}` : c.id;
    const err = m => erreurs.push(`${id} : ${m}`), avert = m => avertissements.push(`${id} : ${m}`);

    if (vide(c.id)) err('id manquant');
    else if (ids.has(c.id)) err('id en double');
    else ids.add(c.id);

    const mot = normaliserMot(c.mot);
    if (mot === '') err('mot vide');
    else if (mots.has(mot)) avert('mot en double dans le pack');
    else mots.add(mot);

    if (vide(c.image_sans_mot) || !fichiers.has(c.image_sans_mot)) err(`image sans mot introuvable (${c.image_sans_mot ?? ''})`);
    if (vide(c.image_avec_mot)) avert('mode avec mot indisponible pour cette carte');
    else {
      if (!fichiers.has(c.image_avec_mot)) err(`image avec mot introuvable (${c.image_avec_mot})`);
      if (c.image_avec_mot === c.image_sans_mot) err('image avec mot identique à image sans mot');
    }
    if (vide(c.source)) err('source manquante');
    if (vide(c.licence)) err('licence manquante');
    else if (c.licence.trim().toLowerCase() === 'inconnue') avert('licence à vérifier');

    if (mot !== '') {
      if (c.graphemes) {
        if (!segmenterExplicite(mot, c.graphemes)) err('graphèmes ne recomposent pas le mot');
      } else if (!lexique.chercher(mot)) avert('segmentation à vérifier');
    }
  });
  return { erreurs, avertissements };
}
