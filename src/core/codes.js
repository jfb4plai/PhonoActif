// Codes phonétiques de ManuLemme (sensibles à la casse : S = /ʃ/, s = /s/) vers les ids de sons de Lilémo.
// Table confirmée avec « correspondance code phonétique ManuLemme - caractères IPA.xlsx ».
const CODES = new Map([
  ...['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'm', 'n', 'l', 'w'].map(c => [c, c]),
  ['S', 'ch'], ['Z', 'j'], ['N', 'gn'], ['R', 'r'], ['j', 'yod'],
  ['i', 'i'], ['e', 'e_ferme'], ['E', 'e_ouvert'], ['a', 'a'], ['y', 'u'], ['u', 'ou'],
  ['o', 'o_ferme'], ['O', 'o_ouvert'], ['2', 'eu_ferme'], ['9', 'eu_ouvert'],
  ['@', 'an'], ['§', 'on'], ['5', 'in'], ['1', 'un'],
  ['%', 'e_muet'], ['°', ''], ['#', ''],
  // un graphème, deux phonèmes
  ['wa', 'oi'], ['8i', 'ui'], ['ks', 'ks'], ['ij', 'ij']
]);

// '' = lettre muette ; null = code ou séquence inconnu (A, G, 8 seul, gz...), à faire vérifier.
export function sonDepuisCodes(codes) {
  const son = CODES.get(String(codes));
  return son === undefined ? null : son;
}
