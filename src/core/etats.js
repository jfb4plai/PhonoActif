import { lireRegles, normaliserChaine } from './regles.js';
import { segmenterMot } from './lexique.js';
import { composants } from './sons.js';

const sonsPlats = cubes => cubes.flatMap(c => (c.son === null ? ['?'] : composants(c.son))).join(' ');

// Cubes de la partie posée (les `k` premières lettres du mot) : les graphèmes déjà complets gardent le son qu'ils ont DANS le mot visé ;
// les lettres d'un graphème pas encore complet (le « c » de « ch ») se lisent par règles.
function cubesPartiels(cible, posees) {
  const k = [...posees].length;
  const faits = [];
  let n = 0;
  for (const c of cible) {
    const l = [...c.g].length;
    if (n + l > k) break;
    faits.push(c);
    n += l;
  }
  const reste = [...posees].slice(n).join('');
  return reste ? [...faits, ...lireRegles(reste)] : faits;
}

/* Mode lettre par lettre : les états d'un mot cible, un par lettre posée.
   RÈGLE (JF, 2026-11-21, remarque de Virginie sur la voix ; remplace celle du 2026-11-12) : chaque état est lu avec les sons que les
   lettres posées auront DANS LE MOT VISÉ, pas comme si la partie posée était un mot complet. Ainsi le « e » de « petit » reste /ə/ quand on
   pose le « t » (avant : /pɛ/, e devant une consonne finale), le « e » de « avec » est dit /ɛ/ (avant : e final muet), le dernier « p » de
   « papa » est dit (avant : p final muet). Une lettre muette dans le mot reste silencieuse. Seul un graphème pas encore complet (« c » de « ch »)
   se lit par règles. Le mot visé se lit par ManuLemme (et les corrections de JF) s'il y est, sinon par règles.
   Renvoie [{ lettres, cubes, source, aVerifier, ecartAvecRegles }] ; source = 'regles' (état intermédiaire) | 'lexique' | 'correction' | ... pour le dernier.
   ecartAvecRegles : à l'état final, la lecture du lexique diffère de celle des règles (trop, peur, femme...) : l'élève entendra un changement. */
export function etatsDuMot(mot, lexique, options = {}) {
  const lettres = normaliserChaine(mot);
  if (!lettres) return [];
  const finale = segmenterMot(mot, lexique, options);
  const memeMot = finale.cubes.map(c => c.g).join('') === lettres;
  const parRegles = lireRegles(lettres);
  const utiliseLexique = finale.source !== 'auto' && memeMot;
  const cible = utiliseLexique ? finale.cubes : parRegles;
  const etats = [...lettres].map((_, k) => {
    const posees = lettres.slice(0, k + 1);
    return { lettres: posees, cubes: cubesPartiels(cible, posees), source: 'regles', aVerifier: false, ecartAvecRegles: false };
  });
  const dernier = etats[etats.length - 1];
  if (utiliseLexique) {
    dernier.ecartAvecRegles = sonsPlats(finale.cubes) !== sonsPlats(parRegles);
    dernier.cubes = finale.cubes;
    dernier.source = finale.source;
    dernier.aVerifier = finale.aVerifier;
  } else {
    dernier.aVerifier = true; // mot absent du lexique : lecture par règles, à faire valider
  }
  return etats;
}
