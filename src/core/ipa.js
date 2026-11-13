// Son Lilémo -> IPA envoyé à la synthèse vocale (balise phoneme, alphabet ipa). Valeurs validées à l'oreille avec Charline le 2026-11-12.
const T = '\u0303'; // tilde combinant des nasales
export const SON_VERS_IPA = {
  a: 'a', an: 'ɑ' + T, b: 'b', ch: 'ʃ', d: 'd', e_ferme: 'e', e_ouvert: 'ɛ', schwa: 'ə', eu_ferme: 'ø', eu_ouvert: 'œ', f: 'f',
  g: '\u0261', gn: 'ɲ', i: 'i', in: 'ɛ' + T, j: 'ʒ', k: 'k', ks: 'ks', l: 'l', m: 'm', n: 'n', o_ferme: 'o', o_ouvert: 'ɔ',
  oi: 'wa', on: 'ɔ' + T, ou: 'u', p: 'p', r: 'ʁ', s: 's', t: 't', u: 'y', ui: 'ɥi', un: 'œ' + T, v: 'v', w: 'w', z: 'z', yod: 'j'
};
