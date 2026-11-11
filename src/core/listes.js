import { normaliserMot } from './lexique.js';

/* Une Liste = { id, nom, source, licence, niveaux, entrees: [{ mot, niveau, nature, remarque, motBrut }] }
   Les années, les mots et leur provenance sont des DONNÉES : rien de tout cela n'est écrit dans le code. */

// Ex. « août ou aout » -> deux mots ; « abimer (abîmer) » -> deux mots ; « asseoir (s') » -> un mot et la remarque « (s') ».
export function nettoyerMot(brut) {
  if (typeof brut !== 'string') return { mots: [], remarque: '' };
  const variantes = [], remarques = [];
  const base = brut.replace(/\(([^)]*)\)/g, (_, contenu) => {
    const c = contenu.trim();
    if (/^\p{L}{3,}$/u.test(c)) variantes.push(c); else if (c !== '') remarques.push(`(${c})`);
    return ' ';
  });
  const mots = [];
  for (const m of [...base.split(/\s+ou\s+/), ...variantes]) {
    const n = normaliserMot(m);
    if (n !== '' && !mots.includes(n)) mots.push(n);
  }
  return { mots, remarque: remarques.join(' ') };
}

const vide = v => typeof v !== 'string' || v.trim() === '';
const joindreUnique = (a, b) => [...new Set([a, b].flatMap(x => (x || '').split(', ')).map(x => x.trim()).filter(Boolean))].join(', ');

export function creerListe({ id, nom, source, licence, niveaux, lignes }) {
  for (const [champ, valeur] of [['id', id], ['nom', nom], ['source', source], ['licence', licence]]) {
    if (vide(valeur)) throw new Error(`liste : champ « ${champ} » manquant`);
  }
  if (!Array.isArray(niveaux) || niveaux.length === 0) throw new Error('liste : champ « niveaux » manquant');

  const avertissements = [];
  const rang = n => niveaux.indexOf(n);
  const parMot = new Map(); // mot -> { niveau -> entrée }
  for (const ligne of lignes || []) {
    if (!ligne) continue;
    const { mots, remarque } = nettoyerMot(ligne.mot);
    const niveau = (ligne.niveau || '').trim();
    for (const mot of mots) {
      if (rang(niveau) === -1) { avertissements.push(niveau === '' ? `${mot} : niveau manquant` : `${mot} : niveau inconnu « ${niveau} »`); continue; }
      const entree = {
        mot, niveau, nature: (ligne.nature || '').trim(),
        remarque: joindreUnique(ligne.remarque, remarque).replace(/, /g, ' '), motBrut: String(ligne.mot).trim()
      };
      if (!parMot.has(mot)) parMot.set(mot, new Map());
      const niveauxDuMot = parMot.get(mot);
      const deja = niveauxDuMot.get(niveau);
      if (deja) { deja.nature = joindreUnique(deja.nature, entree.nature); deja.remarque = joindreUnique(deja.remarque, entree.remarque).replace(/, /g, ' '); }
      else niveauxDuMot.set(niveau, entree);
    }
  }

  const entrees = [];
  for (const [mot, niveauxDuMot] of parMot) {
    const presents = [...niveauxDuMot.keys()].sort((a, b) => rang(a) - rang(b));
    if (presents.length > 1) {
      const liste = presents.length === 2 ? presents.join(' et ') : `${presents.slice(0, -1).join(', ')} et ${presents[presents.length - 1]}`;
      avertissements.push(`${mot} : présent en ${liste}, gardé en ${presents[0]}`);
    }
    entrees.push(niveauxDuMot.get(presents[0]));
  }
  entrees.sort((a, b) => rang(a.niveau) - rang(b.niveau) || a.mot.localeCompare(b.mot, 'fr'));
  return { liste: { id: id.trim(), nom: nom.trim(), source: source.trim(), licence: licence.trim(), niveaux: [...niveaux], entrees }, avertissements };
}

export const motsDuNiveau = (liste, niveau) => liste.entrees.filter(e => e.niveau === niveau).map(e => e.mot);

export function motsJusquAuNiveau(liste, niveau) {
  const i = liste.niveaux.indexOf(niveau);
  if (i === -1) return [];
  return liste.entrees.filter(e => liste.niveaux.indexOf(e.niveau) <= i).map(e => e.mot);
}
