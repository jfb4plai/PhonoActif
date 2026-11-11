const sansAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function reponseJuste(construit, attendu, exigerAccents) {
  const a = construit.join(''), b = attendu.join('');
  return exigerAccents ? a === b : sansAccents(a) === sansAccents(b);
}
