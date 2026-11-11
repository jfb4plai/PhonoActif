import { sonDepuisCodes } from './codes.js';
import { segmenterAuto, segmenterExplicite } from './segmentation.js';

export function normaliserMot(s) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}

// Lexique = { taille, entrees, chercher(mot), chercherTous(mot) }
// chercher renvoie, parmi les lignes du même mot, la plus fréquente (P1-5) ; null si absent.
export function creerLexique(entrees) {
  const parMot = new Map();
  for (const e of entrees) {
    const cle = normaliserMot(e.ortho);
    if (!parMot.has(cle)) parMot.set(cle, []);
    parMot.get(cle).push(e);
  }
  return {
    taille: entrees.length,
    entrees,
    chercherTous: mot => (parMot.get(normaliserMot(mot)) || []).slice(),
    chercher(mot) {
      const tous = parMot.get(normaliserMot(mot));
      if (!tous) return null;
      return tous.reduce((a, b) => (b.freq.P1_5 > a.freq.P1_5 ? b : a));
    }
  };
}

/* EntreeLexique = { ortho, phono, classe, nbSyllabes, freq: { P1, P2, P1_5 }, graphemes: string[], codes: string[] }
   graphemes[i] et codes[i] sont alignés (bien : ['b','i','en'] et ['b','j','5']). */

// Un cube par graphème. Code inconnu : son null, à faire vérifier.
export function cubesDepuisEntree(entree) {
  return entree.graphemes.map((g, i) => {
    const son = sonDepuisCodes(entree.codes[i]);
    return son === null ? { g, son: null, aVerifier: true } : { g, son };
  });
}

// Plusieurs mots, apostrophe ou trait d'union : toujours à valider par un humain.
export const estMultiMot = mot => /[ '\-]/.test(normaliserMot(mot));

const estSeparateur = t => /^[ '\-]$/.test(t);

/* Segmente un mot. Priorité : correction de JF > graphèmes explicites de la carte > entrée à plusieurs mots
   (découpée, toujours à valider) > lexique (ManuLemme) > heuristique signalée « à vérifier ».
   options = { graphemes?: string, corrections?: Corrections } */
export function segmenterMot(mot, lexique, options = {}) {
  const m = normaliserMot(mot);
  const raisons = [];
  if (m === '') return { cubes: [], source: 'auto', aVerifier: true, raisons: ['mot vide'] };

  const corr = options.corrections ? options.corrections.chercher(m) : null;
  if (corr) {
    return {
      cubes: corr.cubes.map(c => ({ g: c.g, son: c.son })), source: 'correction',
      aVerifier: corr.statut === 'a_valider', raisons: [`correction ${corr.statut} par ${corr.auteur}`]
    };
  }

  if (options.graphemes) {
    const ex = segmenterExplicite(m, options.graphemes);
    if (ex) return { cubes: ex, source: 'explicite', aVerifier: false, raisons: [] };
    raisons.push(`Graphemes « ${options.graphemes} » ne correspond pas à « ${m} »`);
  }

  if (estMultiMot(m)) {
    const cubes = [];
    const parties = m.split(/([ '\-])/).filter(t => t !== '');
    for (const t of parties) {
      if (estSeparateur(t)) { cubes.push({ g: t, son: '' }); continue; }
      cubes.push(...segmenterMot(t, lexique, { corrections: options.corrections }).cubes);
    }
    return { cubes, source: 'multi-mots', aVerifier: true, raisons: [...raisons, 'entrée à plusieurs mots : à valider'] };
  }

  const entree = lexique.chercher(m);
  if (entree) {
    const recompose = normaliserMot(entree.graphemes.join(''));
    if (recompose === m) {
      const cubes = cubesDepuisEntree(entree);
      const inconnus = cubes.filter(c => c.aVerifier).map(c => c.g);
      if (inconnus.length) raisons.push(`son inconnu pour : ${inconnus.join(', ')}`);
      return { cubes, source: 'lexique', aVerifier: inconnus.length > 0, raisons };
    }
    raisons.push('graphèmes du lexique incohérents avec le mot');
  } else {
    raisons.push('absent du lexique');
  }
  return { cubes: segmenterAuto(m), source: 'auto', aVerifier: true, raisons };
}
