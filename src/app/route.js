/* Adresses des tâches et des cartes : un lien ou un QR ouvre un pack avec ses réglages (#/jeu?...) ou une seule carte
   (#/carte/<pack>/<id>?...), sans compte. Les valeurs hors liste sont ignorées champ par champ, jamais corrigées. */

export const REGLAGES_PAR_DEFAUT = { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false, essaisMax: 3 };

function tacheDepuisRequete(requete) {
  const p = new URLSearchParams(requete);
  const tache = {};
  const pack = p.get('pack');
  if (pack) tache.pack = pack;
  const mode = p.get('mode');
  if (mode === 'avec' || mode === 'sans') tache.modeMot = mode;
  const habillage = p.get('habillage');
  if (habillage === 'album' || habillage === 'sobre') tache.habillage = habillage;
  const intrus = p.get('intrus');
  if (intrus !== null && /^\d$/.test(intrus) && Number(intrus) <= 5) tache.nbIntrus = Number(intrus);
  const accents = p.get('accents');
  if (accents === '1') tache.exigerAccents = true;
  if (accents === '0') tache.exigerAccents = false;
  return tache;
}

export function lireAdresse(hash) {
  const h = typeof hash === 'string' ? hash : '';
  if (h === '' || h === '#' || h === '#/') return { ecran: 'accueil' };
  if (!h.startsWith('#/')) return { ecran: 'inconnue' };
  const [chemin, ...reste] = h.slice(2).split('?');
  const requete = reste.join('?');
  const morceaux = chemin.split('/');
  try {
    if (morceaux[0] === 'jeu' && morceaux.length === 1) return { ecran: 'jeu', tache: tacheDepuisRequete(requete) };
    if (morceaux[0] === 'carte' && morceaux.length === 3) {
      const pack = decodeURIComponent(morceaux[1]), carte = decodeURIComponent(morceaux[2]);
      if (pack === '' || carte === '') return { ecran: 'inconnue' };
      return { ecran: 'carte', tache: { ...tacheDepuisRequete(requete), pack }, carte };
    }
  } catch (e) { /* encodage invalide */ }
  return { ecran: 'inconnue' };
}

export function ecrireAdresse(base, ecran, tache, carte) {
  const racine = base.replace(/\/+$/, '') + '/';
  const e = encodeURIComponent;
  const reglages = [`mode=${e(tache.modeMot)}`, `habillage=${e(tache.habillage)}`, `intrus=${e(tache.nbIntrus)}`, `accents=${tache.exigerAccents ? 1 : 0}`];
  if (ecran === 'carte') return `${racine}#/carte/${e(tache.pack)}/${e(carte)}?${reglages.join('&')}`;
  return `${racine}#/jeu?${[`pack=${e(tache.pack)}`, ...reglages].join('&')}`;
}
