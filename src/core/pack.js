import { normaliserMot, estMultiMot, segmenterMot } from './lexique.js';
import { sonValide, composants } from './sons.js';
import { corrigeValide } from './corrections.js';
import { segmenterExplicite } from './segmentation.js';

/* Valide un pack de cartes préparé hors de l'app.
   Manifest = { nom, cartes: Carte[] } ; Carte = { id, mot, image_sans_mot, image_avec_mot?, graphemes?, niveau?, source, licence }
   fichiers = noms de fichiers présents dans le dossier du pack. Messages préfixés par l'id de la carte. */
export function validerPack(manifest, fichiers, lexique, corrections) {
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
      const valide = corrigeValide(corrections ? corrections.chercher(mot) : null);
      if (c.graphemes) {
        if (!segmenterExplicite(mot, c.graphemes)) err('graphèmes ne recomposent pas le mot');
      } else if (estMultiMot(mot)) {
        if (!valide) avert('entrée à plusieurs mots : à valider');
      } else if (!lexique.chercher(mot) && !valide) avert('segmentation à vérifier');
    }
  });
  return { erreurs, avertissements };
}

// Nom de fichier sans accent ni espace ; deux mots qui donnent le même nom reçoivent un suffixe (-2, -3...).
export function slugMot(mot, dejaPris) {
  let s = String(mot ?? '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s === '') s = 'carte';
  if (!dejaPris) return s;
  let candidat = s, n = 2;
  while (dejaPris.has(candidat)) candidat = `${s}-${n++}`;
  dejaPris.add(candidat);
  return candidat;
}

const champCsv = v => (/[;"\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/* Manifeste d'un pack et liste des cartes à fabriquer (CSV pour Excel, séparateur « ; », UTF-8 avec BOM).
   params = { nom, mots, source, licence, lexique, corrections?, niveaux?: { mot: niveau } }
   Les noms de fichiers sont ceux que JF ou l'enseignant donne aux images exportées de Canva (carte de 63 x 88 mm). */
export function preparerPack({ nom, mots, source, licence, lexique, corrections, niveaux = {}, baseUrl = '' }) {
  for (const [champ, v] of [['nom', nom], ['source', source], ['licence', licence]]) {
    if (typeof v !== 'string' || v.trim() === '') throw new Error(`pack : champ « ${champ} » manquant`);
  }
  const pris = new Set(), vus = new Set(), cartes = [], lignes = [];
  lignes.push('mot;id;fichier sans mot;fichier avec mot;niveau;graphèmes proposés;à vérifier;adresse de la carte');
  for (const brut of mots) {
    const mot = normaliserMot(brut);
    if (mot === '' || vus.has(mot)) continue;
    vus.add(mot);
    const id = slugMot(mot, pris);
    const carte = { id, mot, image_sans_mot: `${id}.png`, image_avec_mot: `${id}-mot.png`, source: source.trim(), licence: licence.trim() };
    if (niveaux[mot]) carte.niveau = niveaux[mot];
    const seg = segmenterMot(mot, lexique, { corrections });
    carte.cubes = seg.cubes.map(c => ({ g: c.g, son: c.son }));
    carte.aVerifier = seg.aVerifier;
    cartes.push(carte);
    lignes.push([mot, id, carte.image_sans_mot, carte.image_avec_mot, niveaux[mot] || '', seg.cubes.map(c => c.g).join('.'), seg.aVerifier ? 'oui' : 'non', baseUrl ? `${baseUrl}#/carte/${nom.trim()}/${id}` : ''].map(champCsv).join(';'));
  }
  return { manifest: { nom: nom.trim(), cartes }, csv: '﻿' + lignes.join('\r\n') };
}

/* Un pack JOUABLE a des cubes valides et sûrs pour chaque carte : l'app élève n'a pas d'autre source de sons.
   sonsDisponibles = ids de sons ayant un fichier ; un son sans fichier est signalé (une fois par son), pas bloquant. */
export function validerPackJouable(manifest, fichiers, sonsDisponibles) {
  const base = validerPack(manifest, fichiers, { chercher: () => ({}) });
  const erreurs = [...base.erreurs];
  const avertissements = base.avertissements.filter(a => !a.includes('segmentation à vérifier') && !a.includes('à plusieurs mots'));
  const signales = new Set();
  const cartes = manifest && Array.isArray(manifest.cartes) ? manifest.cartes : [];
  cartes.forEach((c, i) => {
    if (!c || typeof c !== 'object') return;
    const id = typeof c.id === 'string' && c.id.trim() !== '' ? c.id : `carte n°${i + 1}`;
    const err = m => erreurs.push(`${id} : ${m}`);
    if (!Array.isArray(c.cubes) || c.cubes.length === 0) { err('cubes manquants'); return; }
    for (const x of c.cubes) {
      if (!x || x.son === null || x.son === undefined) err(`cube sans son : ${x ? x.g : '?'}`);
      else if (!sonValide(x.son)) err(`son invalide : ${x.son}`);
    }
    if (c.cubes.map(x => (x && x.g) || '').join('') !== normaliserMot(c.mot)) err('les cubes ne recomposent pas le mot');
    if (c.aVerifier === true) err('carte à vérifier : passer par la revue');
    for (const x of c.cubes) {
      if (!x || typeof x.son !== 'string' || !sonValide(x.son)) continue;
      for (const s of composants(x.son)) {
        if (!sonsDisponibles.has(s) && !signales.has(s)) { signales.add(s); avertissements.push(`son sans fichier : ${s}`); }
      }
    }
  });
  return { erreurs, avertissements };
}
