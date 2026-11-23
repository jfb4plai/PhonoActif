import { reponseJuste, composants } from '../core/index.js';
import { construirePlateau } from './plateau.js';

/* Logique du jeu de construction de mot : fonctions pures, l'état n'est jamais modifié en place.
   Le hasard (rng) et l'horloge (maintenant) sont injectables. Aucune durée n'est enregistrée.
   Etat = { pack, code, session, cartes, index, plateau, poses, verrous, tentative, aide, indice, statut, reglages, essais, outils } */

const NIVEAUX_AIDE = ['aucune', 'ecoute', 'indice', 'revelation'];

export const sonsDuMot = carte => carte.cubes.flatMap(c => composants(c.son));

function melanger(liste, rng) {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

const carteCourante = etat => etat.cartes[etat.index];
// Mode lettres (reglages.parLettres) : une pièce « ch » compte pour 2 lettres ; les positions se lisent lettre par lettre.
const graphemesPoses = etat => {
  const g = etat.poses.map(id => etat.plateau.find(p => p.id === id).g);
  return etat.reglages.parLettres ? g.flatMap(x => [...x]) : g;
};

function positionsDe(etat) {
  const poses = graphemesPoses(etat);
  return carteCourante(etat).cubes.map((c, i) => {
    const pose = poses[i] === undefined ? null : poses[i];
    return { liaison: `${c.g}=${c.son}`, pose, juste: pose !== null && reponseJuste([pose], [c.g], etat.reglages.exigerAccents) };
  });
}

function ligneEssai(etat, positions, juste) {
  const carte = carteCourante(etat);
  return {
    id: etat.outils.nouvelId(), jeton: etat.jeton, ...(etat.cle ? { cle: etat.cle } : {}), session: etat.session, code: etat.code, pack: etat.pack, carte: carte.id, mot: carte.mot, modeMot: etat.reglages.modeMot,
    tentative: etat.tentative, juste, aide: etat.aide, positions, date: etat.outils.maintenant()
  };
}

export function demarrerJeu({ pack, reglages, code, jeton = null, cle = null, session, rng = Math.random, maintenant = () => new Date().toISOString(), nouvelId = () => globalThis.crypto.randomUUID() }) {
  const cartes = reglages.melanger ? melanger(pack.cartes, rng) : [...pack.cartes];
  const id = session || `s-${maintenant().replace(/\D/g, '').slice(0, 14)}-${Math.floor(rng() * 36 ** 4).toString(36).padStart(4, '0')}`;
  const base = {
    pack: pack.nom, code, jeton, cle, session: id, cartes, index: 0, poses: [], verrous: 0, tentative: 1, aide: 'aucune', indice: null,
    statut: 'en_cours', reglages, essais: [], outils: { rng, maintenant, nouvelId }
  };
  if (cartes.length === 0) return { ...base, plateau: [], statut: 'fini' };
  return { ...base, plateau: (reglages.construirePlateau || construirePlateau)(cartes[0], { nbIntrus: reglages.nbIntrus, rng, digraphes: reglages.digraphes }) };
}

export function poser(etat, pieceId) {
  if (etat.statut !== 'en_cours') return etat;
  if (!etat.plateau.some(p => p.id === pieceId) || etat.poses.includes(pieceId)) return etat;
  const piece = etat.plateau.find(p => p.id === pieceId);
  const poids = etat.reglages.parLettres ? [...piece.g].length : 1;
  if (graphemesPoses(etat).length + poids > carteCourante(etat).cubes.length) return etat;
  return { ...etat, poses: [...etat.poses, pieceId] };
}

// Les pièces verrouillées (cadenas) sont les premières pièces justes gardées après une vérification fausse : on ne les retire pas.
const verrousDe = etat => etat.verrous || 0;

export function retirer(etat) {
  if (etat.statut !== 'en_cours' || etat.poses.length <= verrousDe(etat)) return etat;
  return { ...etat, poses: etat.poses.slice(0, -1) };
}

export function vider(etat) {
  if (etat.statut !== 'en_cours' || etat.poses.length <= verrousDe(etat)) return etat;
  return { ...etat, poses: etat.poses.slice(0, verrousDe(etat)) };
}

// Décision de JF 2026-11-23 (option B) : après une vérification fausse, on garde les pièces justes de gauche à droite, jusqu'à la première pièce fausse.
// Une pièce de plusieurs lettres (« oi ») compte en entier : elle est gardée seulement si toutes ses lettres sont justes à leur place.
export function prefixeJuste(etat) {
  const carte = carteCourante(etat);
  let debut = 0;
  let n = 0;
  for (const id of etat.poses) {
    const g = etat.plateau.find(p => p.id === id).g;
    const lettres = etat.reglages.parLettres ? [...g] : [g];
    const juste = lettres.every((l, j) => carte.cubes[debut + j] !== undefined && reponseJuste([l], [carte.cubes[debut + j].g], etat.reglages.exigerAccents));
    if (!juste) break;
    debut += lettres.length;
    n++;
  }
  return n;
}

export function verifier(etat) {
  if (etat.statut !== 'en_cours' || graphemesPoses(etat).length < carteCourante(etat).cubes.length) return { etat, resultat: 'incomplet' };
  const positions = positionsDe(etat);
  const juste = positions.every(p => p.juste);
  const essais = [...etat.essais, ligneEssai(etat, positions, juste)];
  if (juste) return { etat: { ...etat, essais, statut: 'juste' }, resultat: 'juste' };
  if (etat.tentative >= (etat.reglages.essaisMax ?? 3)) return { etat: { ...etat, essais, poses: [], verrous: 0, statut: 'revelation' }, resultat: 'revelation' };
  const gardees = prefixeJuste(etat);
  return { etat: { ...etat, essais, poses: etat.poses.slice(0, gardees), verrous: gardees, tentative: etat.tentative + 1 }, resultat: 'faux' };
}

// Aide graduée : écoute (rejouer le mot), indice (premier graphème à corriger), révélation (fin de la carte, non acquise).
export function aider(etat) {
  if (etat.statut !== 'en_cours') return { etat, sons: [] };
  const suite = NIVEAUX_AIDE[NIVEAUX_AIDE.indexOf(etat.aide) + 1];
  if (!suite) return { etat, sons: [] };
  const carte = carteCourante(etat);
  if (suite === 'ecoute') return { etat: { ...etat, aide: 'ecoute' }, sons: sonsDuMot(carte) };
  if (suite === 'indice') {
    const poses = graphemesPoses(etat);
    let position = carte.cubes.findIndex((c, i) => poses[i] === undefined || !reponseJuste([poses[i]], [c.g], etat.reglages.exigerAccents));
    if (position === -1) position = Math.min(poses.length, carte.cubes.length - 1);
    return { etat: { ...etat, aide: 'indice', indice: { position, g: carte.cubes[position].g } }, sons: [] };
  }
  // révélation : si aucun essai n'a été enregistré pour cette carte, l'abandon est enregistré comme un échec
  const aEssaye = etat.essais.some(l => l.carte === carte.id);
  const revele = { ...etat, aide: 'revelation', statut: 'revelation' };
  const essais = aEssaye ? etat.essais : [...etat.essais, ligneEssai(revele, positionsDe(etat), false)];
  return { etat: { ...revele, essais }, sons: [] };
}

export function suivant(etat) {
  if (etat.statut === 'en_cours' || etat.statut === 'fini') return etat;
  if (etat.index + 1 >= etat.cartes.length) return { ...etat, statut: 'fini' };
  return allerACarte(etat, etat.index + 1);
}

// Positionne le jeu sur la carte `index` : pièces, tentatives, aide et plateau remis à zéro.
export function allerACarte(etat, index) {
  return {
    ...etat, index, poses: [], verrous: 0, tentative: 1, aide: 'aucune', indice: null, statut: 'en_cours',
    plateau: (etat.reglages.construirePlateau || construirePlateau)(etat.cartes[index], { nbIntrus: etat.reglages.nbIntrus, rng: etat.outils.rng, digraphes: etat.reglages.digraphes })
  };
}
