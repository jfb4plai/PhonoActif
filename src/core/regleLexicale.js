/* Deux règles de lecture décidées par JF le 2026-11-27, après les remarques de Virginie et ses écoutes (voix Charline). Elles s'ajoutent à ManuLemme :
   1. « ien » final (bien, chien, rien, gardien, musicien : 84 mots du lexique, tous lus i + en = /jɛ̃/) est UN graphème de trois lettres, un seul son /jɛ̃/ ;
      « iens » aussi (le s reste muet). « ient » n'en fait pas partie (vient, patient : lectures différentes), ni « ience » (science).
   2. e final après consonne + r ou l (arbre, livre, table, tigre, ogre, zèbre, chambre, fenêtre, montre, sucre) : muet, pas de schwa, dans un mot d'au moins deux voyelles
      (le, de, que gardent leur schwa). Écoute de JF : sans schwa = bon, avec schwa = faux, sur arbre, livre, table, tigre, ogre, zèbre, chambre. */
const GROUPES_VOYELLES = /[aeiouyàâäéèêëîïôöûùüœ]+/g;
const GRAPPE = /[bcdfgkpqtv][lr]$/;

export function appliquerReglesLexicales(mot, cubes) {
  let c = cubes.map(x => ({ ...x }));
  // 1. i + en en fin de mot (ou suivis d'un s muet) -> « ien »
  const k = c.findIndex((x, i) => x.g === 'i' && x.son === 'yod' && c[i + 1] && c[i + 1].g === 'en' && c[i + 1].son === 'in'
    && (i + 2 === c.length || (i + 3 === c.length && c[i + 2].g === 's' && c[i + 2].son === '')));
  if (k >= 0) c = [...c.slice(0, k), { g: 'ien', son: 'yod+in' }, ...c.slice(k + 2)];
  // 2. e final muet après consonne + r ou l
  const dernier = c[c.length - 1];
  if (dernier && dernier.g === 'e' && dernier.son === 'schwa' && (mot.match(GROUPES_VOYELLES) || []).length >= 2 && GRAPPE.test(mot.slice(0, -1))) {
    c[c.length - 1] = { ...dernier, son: '' };
  }
  return c;
}
