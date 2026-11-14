import { etatsDuMot } from './etats.js';
import { composants } from './sons.js';
import { SON_VERS_IPA } from './ipa.js';
import { syllabesDeSons, cubesParSyllabe } from './syllabes.js';

/* Pack « lettres » (mode A) fabriqué à partir d'un tableau rempli par un enseignant (voir tools/modele_pack_xlsx.py).
   Fonction pure : prend le pack lu et le lexique, rend le manifeste, la liste des fichiers audio à générer, les mots écartés.
   Règles (décidées par JF) : aucun choix de mot par IA ; ManuLemme et les corrections n'interviennent qu'à l'état final ;
   un mot dont la lecture finale n'est pas sûre (absent du lexique, ou code inconnu) est écarté sauf option explicite. */

// L'adresse e-mail d'un enseignant ne doit jamais figurer en clair dans un fichier public (manifeste, index des packs) : on n'y met qu'une empreinte.
// Pseudonymisation, pas anonymat : une personne qui connaît une adresse peut vérifier qu'elle correspond à une empreinte.
export async function empreinteCourriel(courriel) {
  const octets = new TextEncoder().encode('phonoactif|' + String(courriel || '').trim().toLowerCase());
  const h = await globalThis.crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const ipaDe = sons => sons.map(s => SON_VERS_IPA[s]).join('');
// même nommage que la bibliothèque audio : codes Unicode de l'IPA + vitesse (-30 % au-delà d'un son)
export const nomFichierAudio = (ipa, vitesse) => ipa.split('').map(c => c.codePointAt(0).toString(16)).join('_') + '_' + vitesse;
// Même règle que la bibliothèque de syllabes (tools/liste_syllabes.js) : -30 % de vitesse au-delà d'un son, comptés sur l'IPA sans les diacritiques de nasalité et de liaison.
const nbSonsIpa = ipa => [...ipa.normalize('NFD').replace(/[̃͡]/g, '')].length;
const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const identifiantCarte = mot => sansAccent(mot).replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]/g, '');

// Syllabes d'un mot à partir de ses cubes finaux (graphème, son) : IPA, vitesse, nom du fichier audio et nombre de cubes couverts.
// Utilisé à la fabrication d'un pack et pour ajouter les syllabes à un pack déjà fabriqué (tools/ajouter_syllabes_pack.js).
export function syllabesPourCubes(cubes) {
  const nbCubes = cubesParSyllabe(cubes);
  return syllabesDeSons(cubes.flatMap(x => composants(x.son))).map((s, i) => {
    const ipa = ipaDe(s);
    const vitesse = nbSonsIpa(ipa) > 1 ? -30 : 0;
    return { ipa, vitesse, fichier: nomFichierAudio(ipa, vitesse), ...(nbCubes ? { cubes: nbCubes[i] } : {}) };
  });
}

export function construirePackLettres({ pack, lexique, corrections = null, inclureAVerifier = false }) {
  if (pack.visibilite === 'prive' && !/^[a-f0-9]{64}$/.test(pack.proprietaireEmpreinte || '')) {
    throw new Error("Pack personnel : calculer d'abord l'empreinte du propriétaire (pack.proprietaireEmpreinte), l'adresse e-mail ne doit pas être publiée en clair.");
  }
  const cartes = [], exclus = [], avertissements = [];
  const distincts = new Map();
  const ids = new Set();
  for (const c of pack.cartes) {
    const etats = etatsDuMot(c.mot, lexique, corrections ? { corrections } : {});
    if (!etats.length) { exclus.push({ mot: c.mot, raison: 'mot vide' }); continue; }
    const dernier = etats.at(-1);
    if (etats.some(e => e.cubes.some(x => x.son === null))) {
      exclus.push({ mot: c.mot, raison: 'code de lecture inconnu du moteur : à faire traiter par JF' });
      continue;
    }
    if (dernier.aVerifier && !inclureAVerifier) {
      exclus.push({ mot: c.mot, raison: 'absent du lexique de lecture (pluriel, forme conjuguée, nom propre, mot rare) : lecture par règles non vérifiée' });
      continue;
    }
    const id = identifiantCarte(c.mot);
    if (!id || ids.has(id)) { exclus.push({ mot: c.mot, raison: 'identifiant déjà utilisé par un autre mot' }); continue; }
    ids.add(id);
    if (dernier.aVerifier) avertissements.push(`« ${c.mot} » : lecture par règles non vérifiée, à écouter avant diffusion.`);
    if (dernier.ecartAvecRegles) avertissements.push(`« ${c.mot} » : la lecture finale (lexique) diffère de la lecture par règles : l'élève entendra un changement à la dernière lettre.`);
    const carte = {
      id, mot: c.mot, lettres: [...c.mot], cubes: dernier.cubes.map(x => ({ g: x.g, son: x.son })),
      etats: etats.map(e => {
        const sons = e.cubes.flatMap(x => composants(x.son));
        const ipa = ipaDe(sons);
        const vitesse = sons.length > 1 ? -30 : 0;
        const fichier = ipa ? nomFichierAudio(ipa, vitesse) : null;
        if (fichier && !distincts.has(fichier)) distincts.set(fichier, { ipa, vitesse, fichier });
        return { lettres: e.lettres, fichier: fichier ? `audio/${fichier}.mp3` : null, ecartAvecRegles: e.ecartAvecRegles };
      })
    };
    // Syllabes du mot entier (coupées sur les sons, pas sur les lettres) : servent à l'écoute « par syllabes ».
    // `cubes` = nombre de cubes (graphèmes) de la syllabe : sert à surligner la syllabe à l'écran pendant l'écoute.
    carte.syllabes = syllabesPourCubes(dernier.cubes).map(({ ipa, vitesse, fichier, cubes }) => {
      if (!distincts.has(fichier)) distincts.set(fichier, { ipa, vitesse, fichier });
      return { ipa, fichier: `audio/${fichier}.mp3`, ...(cubes !== undefined ? { cubes } : {}) };
    });
    if (c.niveau) carte.niveau = c.niveau;
    if (c.image) { carte.image_sans_mot = c.image; carte.source = c.source; carte.licence = c.licence; }
    if (c.image_mot) carte.image_avec_mot = c.image_mot;
    if (c.phrase) carte.phrase = c.phrase;
    if (dernier.aVerifier) carte.aVerifier = true;
    cartes.push(carte);
  }
  const manifest = {
    nom: pack.nom, mode: 'lettres', titre: pack.titre, visibilite: pack.visibilite,
    ...(pack.visibilite === 'prive' ? { proprietaire: pack.proprietaireEmpreinte } : {}),
    source: 'tableau rempli par un enseignant (modèle xlsx), mots filtrés sans IA', cartes
  };
  const entree = { id: pack.nom, label: pack.visibilite === 'prive' ? `${pack.titre} (personnel)` : pack.titre, visibilite: pack.visibilite, ...(pack.visibilite === 'prive' ? { proprietaire: pack.proprietaireEmpreinte } : {}) };
  return { manifest, fichiersDistincts: [...distincts.values()], exclus, avertissements, entreeIndex: entree };
}

// Un pack privé n'est visible que de son propriétaire (empreinte de l'adresse du compte PLAI, voir empreinteCourriel) ; un pack commun l'est de tous.
export function packsVisibles(packs, empreinte) {
  const moi = typeof empreinte === 'string' ? empreinte : '';
  return (Array.isArray(packs) ? packs : []).filter(p => p && p.id && p.label && (p.visibilite !== 'prive' || (moi !== '' && p.proprietaire === moi)));
}
