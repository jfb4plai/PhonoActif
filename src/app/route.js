/* Adresses des tâches et des cartes : un lien ou un QR ouvre un pack avec ses réglages (#/jeu?...) ou une seule carte
   (#/carte/<pack>/<id>?...), sans compte. Les valeurs hors liste sont ignorées champ par champ, jamais corrigées. */

export const REGLAGES_PAR_DEFAUT = { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false, essaisMax: 3, syllabes: 'toujours', vitesse: 100, vitesseVerrou: false, muet: 'origine', digraphes: [2, 3, 4] }; // blocs : tous par défaut (P1, décision de JF 2026-11-21) ; aucun niveau P2+ n'existe encore dans les packs
export const VALEURS_SYLLABES = ['non', 'toujours', 'aide'];
// Lettre muette grisée dès le plateau (origine, comportement historique) ou seulement une fois posée (depot).
export const VALEURS_MUET = ['origine', 'depot'];
// Casse des lettres affichées (pièces, mot révélé, indice) : « minuscules » = défaut (absent de l'adresse) ; « majuscules » = affichage seulement, les audios ne changent pas. Demande de Virginie, maternelle (2026-11-20).
export const VALEURS_CASSE = ['minuscules', 'majuscules'];
// Niveau : « primaire » (P1 et plus, construction du mot, défaut absent de l'adresse) ou « maternelle » (M1 à M3, exercice « première lettre »). Décision de JF 2026-11-24 : le niveau se fixe en premier, il règle les options proposées.
export const VALEURS_NIVEAU = ['primaire', 'maternelle'];
// Commandes de l'écran élève : « complet » (texte + icône, tout visible, comportement historique) ou « epure » (icônes seules, essentiel visible, lecture automatique du mot ; pour les non-lecteurs P1). Audit 2026-11-21.
export const VALEURS_COMMANDES = ['complet', 'epure'];
// Consignes vocales (voix qui dit quoi faire, « Bravo », « Essayer encore ») : absent = automatique (oui avec les commandes épurées). Audit 2026-11-21.
export const VALEURS_CONSIGNES = ['voix', 'non'];
// Vitesse de la voix en % (mots entiers et sons isolés, pas l'écoute par syllabes). Échelle retenue par JF le 2026-11-14 après écoute.
export const VALEURS_VITESSE = [100, 75, 50];

function tacheDepuisRequete(requete) {
  const p = new URLSearchParams(requete);
  const tache = {};
  const pack = p.get('pack');
  if (pack) tache.pack = pack;
  const jeton = p.get('t');
  if (jeton && /^[a-f0-9]{24}$/.test(jeton)) tache.jeton = jeton;
  // Lien personnel d'un élève : son code (e) et sa clé (k), les deux ou aucun. Sans clé, aucun résultat ne peut être envoyé au serveur.
  const codeEleve = p.get('e'), cle = p.get('k');
  if (codeEleve && /^[A-Za-z0-9-]{1,12}$/.test(codeEleve) && cle && /^[a-f0-9]{20}$/.test(cle)) { tache.codeEleve = codeEleve; tache.cle = cle; }
  // Code seul, sans clé : simple préremplissage du champ (parcours test). Sans clé personnelle, aucun résultat n'est envoyé au serveur.
  else if (codeEleve && !cle && /^[A-Za-z0-9-]{1,12}$/.test(codeEleve)) tache.codePropose = codeEleve;
  const mode = p.get('mode');
  if (mode === 'avec' || mode === 'sans') tache.modeMot = mode;
  const habillage = p.get('habillage');
  if (habillage === 'album' || habillage === 'sobre') tache.habillage = habillage;
  const intrus = p.get('intrus');
  if (intrus !== null && /^\d$/.test(intrus) && Number(intrus) <= 5) tache.nbIntrus = Number(intrus);
  const syllabes = p.get('syllabes');
  if (VALEURS_SYLLABES.includes(syllabes)) tache.syllabes = syllabes;
  // Blocs de lettres (ch, ou, eau, ouil…) : longueurs 2, 3, 4 séparées par un tiret (digraphes=2-3) ; « 0 » ou absent = aucun bloc.
  const dig = p.get('digraphes');
  if (dig !== null) tache.digraphes = [...new Set(dig.split('-').map(Number))].filter(n => n >= 2 && n <= 4).sort();
  const muet = p.get('muet');
  if (VALEURS_MUET.includes(muet)) tache.muet = muet;
  const niveau = p.get('niveau');
  if (VALEURS_NIVEAU.includes(niveau)) tache.niveau = niveau;
  // Mode classe (maternelle, TBI) : « 1 » = toute la classe devant un écran, sans code d'élève ; « 0 » = chaque élève avec son code. Défaut de la maternelle : « 1 » (voir niveau.js).
  const classe = p.get('classe');
  if (classe === '1') tache.classe = true;
  if (classe === '0') tache.classe = false;
  // Série fixée (maternelle) : une graine (entier) donne les mêmes mots, le même ordre et les mêmes lettres au TBI et sur la feuille à imprimer ; nb = nombre de mots.
  if (p.get('corrige') === '1') tache.corrige = true; // feuille : version enseignant
  const graine = p.get('graine');
  if (graine !== null && /^\d{1,9}$/.test(graine)) tache.graine = Number(graine);
  const nb = p.get('nb');
  if (nb !== null && /^\d{1,2}$/.test(nb) && Number(nb) >= 1) tache.nb = Number(nb);
  const casse = p.get('casse');
  if (VALEURS_CASSE.includes(casse)) tache.casse = casse;
  const commandes = p.get('commandes');
  if (VALEURS_COMMANDES.includes(commandes)) tache.commandes = commandes;
  const consignes = p.get('consignes');
  if (VALEURS_CONSIGNES.includes(consignes)) tache.consignes = consignes;
  const vitesse = Number(p.get('vitesse'));
  if (VALEURS_VITESSE.includes(vitesse)) tache.vitesse = vitesse;
  if (p.get('verrou') === '1') tache.vitesseVerrou = true;
  const accents = p.get('accents');
  if (accents === '1') tache.exigerAccents = true;
  if (accents === '0') tache.exigerAccents = false;
  return tache;
}

// Parcours test : liste et code proposés d'avance, réglages par défaut ci-dessus. Les essais restent sur l'appareil (pas de clé, donc pas d'envoi).
export const PARCOURS_TEST = { pack: 'p1-20-images', titre: '20 mots de P1 avec images (papier découpé)', code: 'E01' };

export function adresseParcoursTest() {
  const complete = ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: PARCOURS_TEST.pack }); // '/#/jeu?pack=…'
  return `${complete.slice(1)}&e=${encodeURIComponent(PARCOURS_TEST.code)}`;
}

export function lireAdresse(hash) {
  const h = typeof hash === 'string' ? hash : '';
  if (h === '' || h === '#' || h === '#/') return { ecran: 'accueil' };
  if (!h.startsWith('#/')) return { ecran: 'inconnue' };
  const [chemin, ...reste] = h.slice(2).split('?');
  const requete = reste.join('?');
  const morceaux = chemin.split('/');
  const PAGES = { eleve: 'eleve', lien: 'lien', feuille: 'feuille', 'mode-d-emploi': 'mode_emploi', donnees: 'donnees', apropos: 'apropos' };
  if (morceaux.length === 1 && Object.hasOwn(PAGES, morceaux[0])) return { ecran: PAGES[morceaux[0]], tache: tacheDepuisRequete(requete) };
  try {
    if (morceaux[0] === 'jeu' && morceaux.length === 1) return { ecran: 'jeu', tache: tacheDepuisRequete(requete) };
    if (morceaux[0] === 'enseignant' && morceaux.length === 1) return { ecran: 'enseignant' };
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
  const reglages = [`mode=${e(tache.modeMot)}`, `habillage=${e(tache.habillage)}`, `intrus=${e(tache.nbIntrus)}`, `accents=${tache.exigerAccents ? 1 : 0}`, `syllabes=${e(tache.syllabes || REGLAGES_PAR_DEFAUT.syllabes)}`,
    `vitesse=${e(tache.vitesse || REGLAGES_PAR_DEFAUT.vitesse)}`, `verrou=${tache.vitesseVerrou ? 1 : 0}`];
  if (Array.isArray(tache.digraphes) && tache.digraphes.join('-') !== REGLAGES_PAR_DEFAUT.digraphes.join('-')) reglages.push(`digraphes=${tache.digraphes.length > 0 ? tache.digraphes.join('-') : '0'}`); // « 0 » = aucun bloc
  if (tache.muet === 'depot') reglages.push('muet=depot'); // « origine » = défaut, absent de l'adresse
  if (tache.niveau === 'maternelle') reglages.push('niveau=maternelle', `classe=${tache.classe === false ? 0 : 1}`); // « primaire » = défaut, absent de l'adresse ; en maternelle le mode classe vaut 1 par défaut, toujours écrit pour que le lien ne dépende pas d'un défaut
  if (tache.niveau === 'maternelle' && Number.isInteger(tache.graine)) reglages.push(`graine=${tache.graine}`);
  if (tache.niveau === 'maternelle' && Number.isInteger(tache.nb) && tache.nb >= 1) reglages.push(`nb=${tache.nb}`);
  if (tache.casse === 'majuscules' || (tache.niveau === 'maternelle' && tache.casse === 'minuscules')) reglages.push(`casse=${tache.casse}`); // « minuscules » = défaut, absent de l'adresse sauf en maternelle (où le départ est « majuscules »)
  if (VALEURS_CONSIGNES.includes(tache.consignes)) reglages.push(`consignes=${tache.consignes}`); // absent = automatique
  if (tache.commandes === 'epure') reglages.push('commandes=epure'); // « complet » = défaut, absent de l'adresse
  if (ecran === 'jeu' && tache.jeton) return `${racine}#/jeu?t=${e(tache.jeton)}${tache.codeEleve && tache.cle ? `&e=${e(tache.codeEleve)}&k=${e(tache.cle)}` : ''}`;
  if (ecran === 'carte') return `${racine}#/carte/${e(tache.pack)}/${e(carte)}?${reglages.join('&')}`;
  return `${racine}#/jeu?${[`pack=${e(tache.pack)}`, ...reglages].join('&')}`;
}
