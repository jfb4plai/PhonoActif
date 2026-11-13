import { reponseJuste } from '../core/index.js';

/* Mode A (décidé par JF le 2026-11-12) : l'élève pose des LETTRES une à une ; à chaque dépôt l'app lit ce qui est posé.
   Un pack « lettres » (manifest.mode === 'lettres') porte, par carte, les lettres du mot, les graphèmes finaux (cubes, pour le suivi
   graphème-son) et les états (une lecture pré-générée par chaîne de lettres posées). Fonctions pures. */

const VOYELLES = 'aàâäeéèêëiîïoôöuùûüyœ';
// Lettres proposées en plus (jamais une lettre du mot ni son miroir). « ch » et « ou » existent comme pavés du Lilémo physique.
const POOL_INTRUS = ['s', 'm', 'l', 'r', 't', 'f', 'v', 'z', 'j', 'a', 'i', 'o', 'e', 'ch', 'ou'];
const MIROIR = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm', u: 'n' };

// Écoute « par syllabes » : valeurs choisies à l'oreille par JF le 2026-11-13 (espace entre syllabes, vitesse de la dernière). Relecture par un·e spécialiste de phonologie en attente.
export const REGLAGES_SYLLABES = { pauseMs: 500, vitesseDerniere: 0.75 };

// Une seule syllabe : « par syllabes » n'apporterait rien de plus que « Écouter » : le bouton n'est proposé qu'à partir de deux.
export const syllabesDeCarte = carte => (carte && Array.isArray(carte.syllabes) && carte.syllabes.length > 1 ? carte.syllabes : null);

export const estPackLettres = pack => !!pack && pack.mode === 'lettres';

// La carte vue par la logique de session : un cube par lettre. Le « son » ne sert qu'à la couleur (voyelle ou consonne).
export function carteDeSession(carte) {
  return { ...carte, graphemes: carte.cubes, cubes: carte.lettres.map(l => ({ g: l, son: VOYELLES.includes(l) ? 'a' : 'b' })) };
}

export function packDeSession(pack) {
  return { ...pack, cartes: pack.cartes.map(carteDeSession) };
}

// Plateau : une pièce par lettre du mot (répétitions comprises) plus nbIntrus lettres en trop, mélangées. Ids p0, p1... stables.
export function construirePlateauLettres(carte, { nbIntrus = 3, rng = Math.random } = {}) {
  const pieces = carte.cubes.map((c, i) => ({ id: `p${i}`, g: c.g, son: c.son, intrus: false }));
  const presents = new Set(carte.cubes.map(c => c.g));
  const interdits = new Set(presents);
  presents.forEach(g => { if (MIROIR[g]) interdits.add(MIROIR[g]); });
  const candidats = POOL_INTRUS.filter(g => !interdits.has(g) && ![...g].every(l => presents.has(l)));
  for (let j = 0; j < nbIntrus && candidats.length; j++) {
    const g = candidats.splice(Math.floor(rng() * candidats.length), 1)[0];
    pieces.push({ id: `p${carte.cubes.length + j}`, g, son: VOYELLES.includes(g[0]) ? 'a' : 'b', intrus: true });
  }
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

// Lecture pré-générée de la chaîne posée, ou null (lettre en trop ou hors ordre : lecture en direct, non construite).
export function etatPourChaine(carte, chaine) {
  return (carte.etats || []).find(e => e.lettres === chaine && e.fichier) || null;
}

export const etatFinal = carte => (carte.etats || []).at(-1) || null;

// Suivi graphème-son à partir des lettres posées : chaque graphème final reçoit les lettres posées à sa place.
export function positionsGraphemes(carte, lettresPosees, exigerAccents) {
  let debut = 0;
  return carte.graphemes.map(c => {
    const fin = debut + [...c.g].length;
    const pose = lettresPosees.length >= fin ? lettresPosees.slice(debut, fin).join('') : (lettresPosees.length > debut ? lettresPosees.slice(debut).join('') : null);
    debut = fin;
    return { liaison: `${c.g}=${c.son}`, pose, juste: pose !== null && reponseJuste([pose], [c.g], exigerAccents) };
  });
}
