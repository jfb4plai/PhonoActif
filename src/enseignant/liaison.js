import { SON_VERS_IPA } from '../core/ipa.js';

/* Libellé lisible d'une liaison « lettres=son » (format interne, ex. « ch=ch », « t= »).
   « ch=ch » -> « ch → [ʃ] » ; « t= » (son vide dans les fiches) -> « t → muet ». Un son inconnu du tableau IPA est affiché tel quel. */
export function libelleLiaison(liaison) {
  const texte = String(liaison);
  const i = texte.indexOf('=');
  if (i < 0) return texte;
  const lettres = texte.slice(0, i), son = texte.slice(i + 1);
  if (son === '') return `${lettres} → muet`;
  return `${lettres} → [${Object.hasOwn(SON_VERS_IPA, son) ? SON_VERS_IPA[son] : son}]`;
}
