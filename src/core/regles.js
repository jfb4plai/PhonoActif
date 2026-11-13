/* Lecture par RÈGLES CONTEXTUELLES : une chaîne de lettres lue comme un mot complet (la fin de la chaîne est la fin du mot).
   Sert aux pseudo-mots et aux états intermédiaires du mode « lettre par lettre » (« mai » -> « mè », « mais » -> « mè »).
   Pour un mot réel, ManuLemme prime toujours (segmenterMot) ; ces règles ne connaissent AUCUNE exception lexicale
   (o/eu ouverts ou fermés dans trop, peur ; femme ; monsieur...) : un mot irrégulier est mal lu, c'est connu et mesuré.
   Un choix instable (e interne, -ent final) porte `ambigu: true` : l'interface doit le signaler à l'enseignant. */

const VOY = 'aàâäeéèêëiîïoôöuûùüyœ';
const estV = c => c !== undefined && c !== '' && VOY.includes(c);
const estVoyelleToken = g => estV(g[0]);

const GRAPHEMES = ['eau', 'oeu', 'ain', 'aim', 'ein', 'eim', 'oin', 'ill', 'où', 'oû', 'œu', 'au', 'eu', 'ou', 'oi', 'oî', 'ai', 'aî', 'ei',
  'an', 'am', 'en', 'em', 'on', 'om', 'in', 'im', 'un', 'um', 'yn', 'ym', 'ch', 'sh', 'ph', 'th', 'gn', 'qu', 'gu', 'ui',
  'ck', 'ss', 'tt', 'll', 'mm', 'nn', 'rr', 'pp', 'ff', 'dd', 'bb', 'gg', 'cc'];
const NASALES = new Set(['ain', 'aim', 'ein', 'eim', 'oin', 'an', 'am', 'en', 'em', 'on', 'om', 'in', 'im', 'un', 'um', 'yn', 'ym']);
const DOUBLES = new Set(['ss', 'tt', 'll', 'mm', 'nn', 'rr', 'pp', 'ff', 'dd', 'bb', 'gg', 'cc']);
const SIMPLE_SON_CONS = new Set(['ch', 'sh', 'ph', 'th', 'gn', 'qu', 'gu']);
const OBSTRUANTES = 'bcdfgkpqtv';

export const normaliserChaine = s => String(s || '').normalize('NFC').toLowerCase().replace(/[^a-zàâäéèêëîïôöûùüçœ]/g, '');

const nbGroupesVoyelles = mot => (mot.match(/[aeiouyàâäéèêëîïôöûùüœ]+/g) || []).length;

function decouper(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const reste = s.slice(i);
    let g, m;
    if (out.length && out[out.length - 1].avantIl) g = 'il'; // « il » final après a, e, eu, ou : yod
    else if ((m = reste.match(/^(eau|au|oeu|œu|eu|ou|a|e|o|u)ill/))) g = m[1]; // voyelle avant « ill » : « ill » est le token suivant
    else if ((m = reste.match(/^(a|e|eu|ou)ils?$/))) { g = m[1]; out.push({ g, i, avantIl: true }); i += g.length; continue; } // ail, eil, euil, ouil finaux
    else if (/^ue(ill|ils?$)/.test(reste) && /[cg]$/.test(s.slice(0, i))) { g = 'ue'; if (/^ueils?$/.test(reste)) { out.push({ g, i, avantIl: true }); i += g.length; continue; } } // cueillir, accueil, cercueil
    else if (/^[aoue]y[aeiouéèêàâ]/.test(reste)) g = reste.slice(0, 2); // ay, oy, uy, ey devant voyelle : voyelle + yod
    else {
      g = GRAPHEMES.find(t => reste.startsWith(t)) || reste[0];
      const suiv = s[i + g.length];
      if (NASALES.has(g)) {
        // n : nasale sauf devant voyelle, n, m. m : nasale SEULEMENT devant b ou p (lampe, ombre) ; en fin de chaîne ou devant autre
        // lettre, le m se prononce (pom, pomt). Coût mesuré : les mots lexicaux nom, prénom, comte (-4 mots par moitié de 6 500).
        const oral = g.endsWith('m') ? !(suiv === 'b' || suiv === 'p') : (estV(suiv) || suiv === 'n' || suiv === 'm');
        if (oral) g = g.length === 3 ? g.slice(0, 2) : g[0];
      }
      if (g === 'gu' && !(suiv && 'eiyéèê'.includes(suiv))) g = 'g';
    }
    out.push({ g, i });
    i += g.length;
  }
  return out;
}

// e suivi de tokens : ouvert (syllabe fermée), muet (syllabe ouverte) ou cas fini
function sonDeE(ctx) {
  const { mot, suivants, reste, avant, g } = ctx;
  const groupes = nbGroupesVoyelles(mot);
  const grappe = /[bcdfgkpqtv][lr]$/.test(avant); // consonne + l ou r : le e ne peut pas tomber (livre, table, vendredi)
  if (/^mment$/.test(reste)) return { son: 'a' }; // évidemment, prudemment
  if (/^(eff|ess|dess|desc)/.test(mot) && avant.length <= 1 && (avant === '' || avant === 'd') ) return { son: 'e_ferme' }; // effet, essai, dessin, descendre
  if (/^ress/.test(mot) && avant === 'r') return { son: 'schwa' }; // ressembler, ressource
  if (/^ment$/.test(reste)) { // -ement : schwa après deux consonnes distinctes (justement, calmement), muet sinon (brutalement)
    const d = avant.slice(-2);
    const deuxConsonnes = /^[bcdfghjklmnpqrstvwxz]{2}$/.test(d) && d[0] !== d[1] && !['ch', 'gn', 'ph', 'th', 'qu', 'gu'].includes(d);
    return { son: deuxConsonnes ? 'schwa' : '' };
  }
  if (/^voi/.test(reste)) return { son: 'schwa', ambigu: true }; // recevoir, percevoir
  if (suivants.length && (suivants[0].g === 'il' || suivants[0].g === 'ill')) return { son: 'e_ouvert' }; // soleil, oreille
  if (suivants.length === 0) { // e final
    if (mot === 'e' || /^[^aeiouyàâäéèêëîïôöûùüœ]+e$/.test(mot.replace(/(q|g)u(?=e$)/, '$1'))) return { son: 'schwa' }; // e seul, le, de, que
    return { son: grappe ? 'schwa' : '' };
  }
  if (g === 'e' && /[g]$/.test(avant) && /^[aouàâ]/.test(reste)) return { son: '' }; // geo, gea : e muet
  const t1 = suivants[0].g, t2 = suivants[1] ? suivants[1].g : undefined;
  if (suivants.length === 1) {
    if (t1 === 'r') return { son: /^[^aeiouyàâäéèêëîïôöûùüœ]+er$/.test(mot) ? 'e_ouvert' : 'e_ferme' }; // -er : infinitif ; mer, fer, cher
    if (t1 === 'z' || t1 === 'd') return { son: 'e_ferme' }; // ez, ed
    if (t1 === 't') return { son: mot === 'et' ? 'e_ferme' : 'e_ouvert' };
    if (t1 === 's') return { son: groupes === 1 ? 'e_ferme' : '' }; // les, des / -es muet
    if (!estVoyelleToken(t1)) return { son: 'e_ouvert' };
  }
  if (suivants.length === 2 && t1 === 'r' && t2 === 's') return { son: /^[^aeiouyàâäéèêëîïôöûùüœ]+ers$/.test(mot) ? 'e_ouvert' : 'e_ferme' };
  if (t1 === 'x') return { son: 'e_ouvert' };
  if (!estVoyelleToken(t1)) {
    if (DOUBLES.has(t1)) return { son: 'e_ouvert' };
    if (t2 === undefined) return { son: 'e_ouvert' };
    if (estVoyelleToken(t2)) return { son: ctx.premierNoyau || grappe ? 'schwa' : '', ambigu: true }; // syllabe ouverte : e instable
    const groupe = OBSTRUANTES.includes(t1[0]) && !SIMPLE_SON_CONS.has(t1) && (t2[0] === 'l' || t2[0] === 'r');
    if (SIMPLE_SON_CONS.has(t1) || groupe) return { son: ctx.premierNoyau || grappe ? 'schwa' : '', ambigu: true };
    return { son: 'e_ouvert' };
  }
  return { son: '', ambigu: true }; // e devant voyelle
}

function sonDe(ctx) {
  const { g, mot, reste, avant, prec, suivants, estFin } = ctx;
  const precLettre = avant.slice(-1), suivLettre = reste[0];
  switch (g) {
    case 'eau': return { son: 'o_ferme' };
    case 'au': return { son: /^r/.test(reste) ? 'o_ouvert' : 'o_ferme' };
    case 'ou': return { son: estV(suivLettre) && !/^e(s|nt)?$/.test(reste) && !/^ill/.test(reste) ? 'w' : 'ou' };
    case 'où': case 'oû': return { son: 'ou' };
    case 'oi': case 'oî': return { son: 'oi' };
    case 'oy': return { son: 'oi+yod' };
    case 'ay': case 'ey': return { son: 'e_ouvert+yod' };
    case 'uy': return { son: 'ui+yod' };
    case 'oin': return { son: 'w+in' };
    case 'oeu': case 'œu': return { son: /^(d|x|ds)?$/.test(reste) ? 'eu_ferme' : 'eu_ouvert' };
    case 'eu': {
      const ferme = reste === '' || /^(x|s|z|t|e|es)$/.test(reste) || /^s[aeiouyéèê]/.test(reste);
      return { son: ferme ? 'eu_ferme' : 'eu_ouvert' };
    }
    case 'ai': case 'aî': case 'ei': return { son: 'e_ouvert' };
    case 'ain': case 'aim': case 'ein': case 'eim': case 'in': case 'im': case 'yn': case 'ym': return { son: 'in' };
    case 'un': case 'um': return { son: 'un' };
    case 'an': case 'am': case 'em': return { son: 'an' };
    case 'en': return { son: (/[ié]$|y$/.test(avant) && !(/^t[aeiouyéèêâôîû]/.test(reste) && !/b[i]$/.test(avant))) ? 'in' : 'an', ambigu: (reste === 't' && !/m$/.test(avant) && nbGroupesVoyelles(mot) >= 2) || undefined }; // -ent final : verbe muet ou nom ?
    case 'on': case 'om': return { son: 'on' };
    case 'sh': return { son: 'ch' }; // anglicisme : short, shampoing
    case 'ch': return { son: /^[rln]/.test(reste) ? 'k' : 'ch' };
    case 'ph': return { son: 'f' };
    case 'th': return { son: 't' };
    case 'gn': return { son: 'gn' };
    case 'qu': return { son: 'k' };
    case 'gu': return { son: 'g' };
    case 'ui': return { son: 'ui' };
    case 'ill': {
      if (/^(vill|mill|tranquill)/.test(mot)) return { son: 'i+l' };
      return { son: prec && estVoyelleToken(prec.g) ? 'yod' : 'ij' };
    }
    case 'il': return { son: 'yod' }; // ail, eil... finaux
    case 'ck': return { son: 'k' };
    case 'ue': return { son: 'eu_ouvert' };
    case 'cc': return { son: suivLettre && 'eiyéèê'.includes(suivLettre) ? 'ks' : 'k' };
    case 'ss': case 'tt': case 'll': case 'mm': case 'nn': case 'rr': case 'pp': case 'ff': case 'dd': case 'bb': case 'gg':
      return { son: g[0] };
    case 'a': case 'à': case 'â': case 'ä': return { son: 'a' };
    case 'b': return { son: /^[st]/.test(reste) ? 'p' : 'b' }; // obscur, absence, obtenir
    case 'c': {
      if (precLettre === 's' && suivLettre && 'eiyéèê'.includes(suivLettre)) return { son: '' }; // sc devant e, i
      if (suivLettre && 'eiyéèê'.includes(suivLettre)) return { son: 's' };
      if (estFin && prec && NASALES.has(prec.g)) return { son: '' }; // blanc
      return { son: 'k' };
    }
    case 'ç': return { son: 's' };
    case 'd': return { son: estFin ? '' : 'd' };
    case 'e': return sonDeE(ctx);
    case 'é': return { son: 'e_ferme' };
    case 'è': case 'ê': case 'ë': return { son: 'e_ouvert' };
    case 'f': return { son: 'f' };
    case 'g': {
      if (estFin && prec && NASALES.has(prec.g)) return { son: '' }; // long, poing
      if (reste === 't') return { son: '' }; // doigt
      return { son: suivLettre && 'eiyéèê'.includes(suivLettre) ? 'j' : 'g' };
    }
    case 'h': return { son: '' };
    case 'i': case 'î': {
      if (estV(suivLettre) && !/^e(s|nt)?$/.test(reste)) {
        if (/[bcdfgkpqtv][lr]$/.test(avant)) return { son: 'i+yod' }; // crier, client
        return { son: 'yod' };
      }
      return { son: 'i' };
    }
    case 'ï': return { son: 'i' };
    case 'j': return { son: 'j' };
    case 'k': return { son: 'k' };
    case 'l': return { son: 'l' };
    case 'm': return { son: 'm' };
    case 'n': return { son: 'n' };
    case 'ô': return { son: 'o_ferme' };
    case 'o': case 'ö': {
      if (reste === '' || /^[stdpx]$/.test(reste) || /^s(e|es)?$/.test(reste) || /^s[aeiouyéèê]/.test(reste)) return { son: 'o_ferme' };
      return { son: 'o_ouvert' };
    }
    case 'p': return { son: (reste === '' || reste === 's') && (estV(precLettre) || precLettre === 'm') ? '' : 'p' };
    case 'q': return { son: 'k' };
    case 'r': return { son: estFin && prec && prec.g === 'e' && prec.son === 'e_ferme' ? '' : 'r' };
    case 's': {
      if (estFin) return { son: prec && prec.g === 'u' ? 's' : '' }; // bonus, cactus ; dans, alors
      if (/tran$/.test(avant) && estV(suivLettre)) return { son: 'z' }; // transition
      if (estV(precLettre) && estV(suivLettre)) return { son: 'z' };
      return { son: 's' };
    }
    case 't': {
      if (estFin) return { son: '' };
      if (/^i(on|al|el|eux|euse|ence|ance|ane)/.test(reste) && !/s$/.test(avant) && avant !== '') return { son: 's' }; // -tion, patience, initial
      return { son: 't' };
    }
    case 'u': case 'û': case 'ù': case 'ü': return { son: 'u' };
    case 'v': return { son: 'v' };
    case 'w': return { son: 'w' };
    case 'x': {
      if (estFin) return { son: prec && prec.g === 'e' ? 'ks' : '' }; // index, silex ; deux, voix
      if (avant === 'e' && estV(suivLettre)) return { son: 'g+z' }; // exact, exemple
      return { son: 'ks' };
    }
    case 'y': {
      if ((avant === '' || !estV(precLettre)) && estV(suivLettre)) return { son: 'yod' };
      return { son: 'i' };
    }
    case 'z': return { son: estFin && precLettre === 'e' ? '' : 'z' };
    default: return { son: '', inconnu: true };
  }
}

/* lireRegles('mai') -> [{ g: 'm', son: 'm' }, { g: 'ai', son: 'e_ouvert' }]
   Chaque cube : { g, son, ambigu? }. Son '' = lettre muette. */
export function lireRegles(entree) {
  const mot = normaliserChaine(entree);
  const jetons = decouper(mot);
  const cubes = [];
  for (let k = 0; k < jetons.length; k++) {
    const { g, i } = jetons[k];
    const reste = mot.slice(i + g.length);
    const ctx = {
      g, mot, reste, avant: mot.slice(0, i), prec: cubes[k - 1], suivants: jetons.slice(k + 1),
      estFin: reste === '' && mot.length > 1, // une lettre seule se lit comme elle se dit, jamais muette
      premierNoyau: !jetons.slice(0, k).some(t => estVoyelleToken(t.g) && !/^(h)$/.test(t.g)) // aucune voyelle avant : première syllabe
    };
    const r = sonDe(ctx);
    const cube = { g, son: r.son };
    // lettre finale muette par règle (lup, sot, mais) : en pseudo-mot rien ne l'impose, l'enseignant doit le voir
    if (r.ambigu || (r.son === '' && /^[dtsxzpgcrl]$/.test(g))) cube.ambigu = true;
    cubes.push(cube);
  }
  return cubes;
}

// États intermédiaires du mode lettre par lettre : « maison » -> lectures de m, ma, mai, mais, maiso, maison.
export function etatsLettreParLettre(mot) {
  const m = normaliserChaine(mot);
  return [...m].map((_, k) => ({ lettres: m.slice(0, k + 1), cubes: lireRegles(m.slice(0, k + 1)) }));
}
