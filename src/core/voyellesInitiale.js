/* Maternelle, exercice « initiale » : l'élève choisit la première lettre d'un mot parmi 3 voyelles, puis entend le son de la lettre, puis le mot.
   Les sons de voyelles ne sont pas à enregistrer : ce sont les fichiers déjà publiés dans public/mots/audio (premier état « lettre par lettre » des mots de P1,
   voix Charline), nommés par le code IPA : 61 = a, 65 = é, 69 = i, 254 = o (comme dans « orange »), 79 = u (/y/, ajouté avec les mots univers et uniforme, lot 21).
   Attention : 75_0 est /u/ (« ou »), pas la lettre u. */

export const VOYELLES_INITIALE = {
  'a': { son: 'a', fichier: 'audio/61_0.mp3' },
  'é': { son: 'e_ferme', fichier: 'audio/65_0.mp3' },
  'i': { son: 'i', fichier: 'audio/69_0.mp3' },
  'o': { son: 'o_ouvert', fichier: 'audio/254_0.mp3' },
  'u': { son: 'u', fichier: 'audio/79_0.mp3' }
};

// Paires jamais proposées ensemble : lettres visuellement proches (Virginie, règle 1 : e/a ; é compte comme e, décision de JF 2026-11-20).
const PROCHES = [['a', 'é']];
const proches = (x, y) => PROCHES.some(([p, q]) => (p === x && q === y) || (p === y && q === x));

// Première lettre d'un mot si c'est une voyelle seule de VOYELLES_INITIALE (â → a) ; sinon null (digraphe : eau, ours, oiseau, œuf ; h muet : hibou, homme).
export function lettreInitiale(carte) {
  const g = carte && Array.isArray(carte.cubes) && carte.cubes[0] ? carte.cubes[0].g : null;
  if (typeof g !== 'string') return null;
  const base = g === 'â' || g === 'à' ? 'a' : g === 'î' ? 'i' : g === 'ô' ? 'o' : g === 'û' ? 'u' : g === 'è' || g === 'ê' ? 'é' : g;
  return Object.hasOwn(VOYELLES_INITIALE, base) ? base : null;
}

// 3 voyelles dont la bonne, sans paire proche, dans un ordre tiré au hasard. rng : fonction [0,1[ (injectable pour les tests).
export function voyellesProposees(cible, rng = Math.random) {
  if (!Object.hasOwn(VOYELLES_INITIALE, cible)) return null;
  const autres = Object.keys(VOYELLES_INITIALE).filter(v => v !== cible && !proches(v, cible));
  const choisies = [];
  while (choisies.length < 2) {
    const candidats = autres.filter(v => !choisies.includes(v) && choisies.every(c => !proches(c, v)));
    if (candidats.length === 0) return null;
    choisies.push(candidats[Math.floor(rng() * candidats.length)]);
  }
  const tirage = [cible, ...choisies];
  for (let i = tirage.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [tirage[i], tirage[j]] = [tirage[j], tirage[i]]; }
  return tirage;
}
