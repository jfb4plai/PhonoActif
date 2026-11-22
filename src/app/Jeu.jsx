import { urlFichier } from './urlFichier.js';
import Icone from './Icones.jsx';
import { urlConsigne, consignesActives } from './consignes.js';
import React, { useState, useEffect, useRef } from 'react';
import { classeCube } from '../core/index.js';
import { demarrerJeu, poser, retirer, vider, verifier, aider, suivant, sonsDuMot } from '../jeu/session.js';
import { REGLAGES_PAR_DEFAUT, VALEURS_VITESSE } from './route.js';
import { estPackLettres, packDeSession, construirePlateauLettres, etatPourChaine, etatFinal, positionsGraphemes, syllabesDeCarte, phraseDeCarte, reperesLettres, lettresMuettes, pieceMuette, boutonSyllabesVisible, REGLAGES_SYLLABES, REGLE_COUPURE } from '../jeu/modeA.js';

const CLASSES = { voyelle: 'v', consonne: 'c', muet: 'm', inconnu: 'm' };
const classeDe = son => CLASSES[classeCube(son)];
// Lettre muette grise : sur le plateau seulement si le réglage « muet » vaut « origine » (défaut) ; une fois posée, toujours (les deux réglages).
const classePlateau = (p, muets, reglage) => pieceMuette(p, muets) && reglage !== 'depot' ? 'm' : classeDe(p.son);

// Bouton de commande : icône + texte (commandes « complètes ») ou icône seule (« épurées », pour les non-lecteurs).
// Le nom accessible reste toujours le texte français (aria-label en mode épuré ou quand un libellé plus long est donné).
// Survol d'une icône (commandes épurées) : le texte s'affiche et, si les consignes vocales sont actives, il est dicté (fichier b_<nom>.mp3).
const CLES_BOUTONS = {
  'Écouter': 'b_ecouter', 'Vérifier': 'b_verifier', 'Suivant': 'b_suivant', 'Retirer': 'b_retirer', 'Besoin d’aide ?': 'b_aide',
  'Voir l’image': 'b_image_voir', 'Cacher l’image': 'b_image_cacher', 'Écouter une phrase': 'b_phrase', 'Écouter par syllabes': 'b_syllabes',
  'Voix lente': 'b_lente', 'Retour à l’accueil': 'b_accueil'
};
function Commande({ icone, texte, label, epure, className = '', parle, ...reste }) {
  const cle = epure && parle ? CLES_BOUTONS[texte] : null;
  return (
    <button type="button" className={`${className}${epure ? ' icone-seule' : ''}`.trim()} aria-label={label || (epure ? texte : undefined)}
      onMouseEnter={cle ? () => parle.demarrer(cle) : undefined} onMouseLeave={cle ? parle.annuler : undefined} onBlur={cle ? parle.annuler : undefined} {...reste}>
      <Icone nom={icone} taille={epure ? 34 : 24} />{!epure && <span>{texte}</span>}
      {epure && <span className="info" aria-hidden="true">{texte}</span>}
    </button>
  );
}

export default function Jeu({ pack, tache, code, stockage, deps, base = '/', onFin, onAccueil, onSignalement }) {
  const lettres = estPackLettres(pack); // mode A : l'élève pose des lettres, l'app lit la chaîne posée
  const [etat, setEtat] = useState(() => demarrerJeu({
    pack: lettres ? packDeSession(pack) : pack, code, jeton: tache.jeton || null, cle: tache.cle || null, rng: deps.rng, maintenant: deps.maintenant,
    reglages: { ...REGLAGES_PAR_DEFAUT, modeMot: tache.modeMot, habillage: tache.habillage, nbIntrus: tache.nbIntrus, exigerAccents: tache.exigerAccents, ...(lettres ? { construirePlateau: construirePlateauLettres, parLettres: true, digraphes: tache.digraphes || [] } : {}) }
  }));
  const [message, setMessage] = useState(null);
  const [imagesAbsentes, setImagesAbsentes] = useState({});

  const carte = etat.cartes[etat.index];
  const modeAvec = etat.reglages.modeMot === 'avec';
  const enCours = etat.statut === 'en_cours';
  const epure = tache.commandes === 'epure';

  const [sonAbsent, setSonAbsent] = useState(false);
  const [syllabeActive, setSyllabeActive] = useState(null); // index de la syllabe lue pendant « Écouter par syllabes » (césures visibles seulement alors)
  const [cesures, setCesures] = useState(false); // césures laissées à l'écran après l'écoute, jusqu'au bouton « Masquer les césures »
  const [imageVue, setImageVue] = useState(false); // mode A : l'image existe mais reste cachée tant que l'élève n'appuie pas sur « Voir l'image » (décision de JF 2026-11-14)
  useEffect(() => { setSyllabeActive(null); setCesures(false); setImageVue(false); }, [carte.id]);
  const signalerSons = r => {
    const manquants = r && r.manquants ? r.manquants : [];
    manquants.forEach(id => onSignalement('son', id));
    if (manquants.length > 0) setSonAbsent(true);
  };
  // Vitesse de la voix (mots entiers et sons isolés, pas l'écoute par syllabes) : départ = réglage de la tâche ; boutons chez l'élève sauf si l'enseignant a verrouillé.
  const [vitesse, setVitesse] = useState(VALEURS_VITESSE.includes(tache.vitesse) ? tache.vitesse : 100);
  const optsVitesse = vitesse === 100 ? [] : [{ vitesse: vitesse / 100 }]; // rien d'ajouté à vitesse normale : appels identiques à avant
  const jouer = ids => {
    if (ids.length === 0) return;
    setSonAbsent(false);
    Promise.resolve(deps.jouerSons(ids, ...optsVitesse)).then(signalerSons).catch(() => {});
  };
  // Le mot entier est préféré : enchaîner des sons isolés donne « che-a ». Sans fichier du mot, on retombe sur les sons.
  const jouerEtat = e => {
    if (!e || !e.fichier || !deps.jouerFichier) { setSonAbsent(true); return; }
    setSonAbsent(false);
    Promise.resolve(deps.jouerFichier(urlFichier(base, pack, e.fichier), ...optsVitesse)).then(signalerSons).catch(() => {});
  };
  // Entrée complémentaire : le mot syllabe par syllabe (espace de 500 ms, dernière syllabe à 75 %)
  const jouerSyllabes = c => {
    const syl = syllabesDeCarte(c);
    if (!syl || !deps.jouerSerie) { setSonAbsent(true); return; }
    setSonAbsent(false);
    const urls = syl.map(s => urlFichier(base, pack, s.fichier));
    const surligner = !!reperesLettres(c);
    if (surligner) setCesures(true);
    Promise.resolve(deps.jouerSerie(urls, { ...REGLAGES_SYLLABES, onDebut: i => setSyllabeActive(i === null || !surligner ? null : i) })).then(signalerSons).catch(() => {}).finally(() => setSyllabeActive(null));
  };
  // Phrase audio qui contient le mot (aide pour les mots sans image) : le texte n'est pas affiché, seulement lu
  const jouerPhrase = c => {
    const f = phraseDeCarte(c);
    if (!f || !deps.jouerFichier) { setSonAbsent(true); return; }
    setSonAbsent(false);
    Promise.resolve(deps.jouerFichier(urlFichier(base, pack, f))).then(signalerSons).catch(() => {});
  };
  const jouerMot = c => {
    if (lettres) { jouerEtat(etatFinal(c)); return; }
    if (!c.audio_mot || !deps.jouerFichier) { jouer(sonsDuMot(c)); return; }
    setSonAbsent(false);
    Promise.resolve(deps.jouerFichier(urlFichier(base, pack, c.audio_mot), ...optsVitesse)).then(signalerSons).catch(() => {});
  };
  // Consignes vocales (P1 à P3) : courts fichiers partagés (public/consignes/). Un fichier absent ne signale rien : l'élève n'a pas à le savoir.
  const voix = consignesActives(tache);
  const geste = useRef(0); // compte les gestes de l'élève : une consigne qui se termine après un geste ne relance pas le mot
  const jouerConsigne = id => (voix && deps.jouerFichier
    ? Promise.resolve(deps.jouerFichier(urlConsigne(base, id))).catch(() => {})
    : Promise.resolve());
  // Survol d'une icône : la consigne du bouton est dictée après 0,4 s de survol (pas en passant), et coupée si la souris part.
  const minuteur = useRef(null);
  const parle = useRef({ demarrer: id => { geste.current++; clearTimeout(minuteur.current); if (voix) minuteur.current = setTimeout(() => jouerConsigne(id), 400); }, annuler: () => clearTimeout(minuteur.current) }).current;
  parle.demarrer = id => { geste.current++; clearTimeout(minuteur.current); if (voix) minuteur.current = setTimeout(() => jouerConsigne(id), 400); };
  // À l'arrivée d'une carte : consigne de départ (première carte seulement), puis, en commandes épurées, lecture du mot.
  // Le navigateur peut bloquer le son : le bouton haut-parleur sur l'image reste là.
  useEffect(() => {
    if (!enCours) return;
    const g = geste.current;
    // Silence de 1,5 s entre la consigne et le mot : sinon le mot semble faire partie de la phrase.
    if (voix && etat.index === 0) jouerConsigne('debut').then(() => new Promise(r => setTimeout(r, 1500))).then(() => { if (epure && geste.current === g) jouerMot(carte); });
    else if (epure) jouerMot(carte);
  }, [carte.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const lettresPosees = e => [...e.poses.map(id => e.plateau.find(p => p.id === id).g).join('')];
  // Mode A : le suivi reste en graphèmes-sons (liaisons), calculé à partir des lettres posées.
  const enregistrer = (avant, apres) => apres.essais.slice(avant.essais.length).forEach(l => stockage.ajouter(
    lettres ? { ...l, positions: positionsGraphemes(avant.cartes[avant.index], lettresPosees(avant), avant.reglages.exigerAccents) } : l));

  const surPiece = piece => {
    const apres = poser(etat, piece.id);
    if (apres === etat) return;
    geste.current++;
    setEtat(apres); setMessage(null);
    if (lettres) {
      // Mode A : lecture de ce qui est posé. Chaîne hors du mot (lettre en trop, ordre autre) : lecture en direct, non construite.
      const chaine = apres.poses.map(id => apres.plateau.find(x => x.id === id).g).join('');
      jouerEtat(etatPourChaine(carte, chaine));
    }
    // Mode graphèmes : aucun son au dépôt (les sons isolés enchaînés donnent « che-a »).
  };
  const surVerifier = () => {
    const { etat: apres, resultat } = verifier(etat);
    enregistrer(etat, apres);
    geste.current++;
    setEtat(apres); setMessage({ type: resultat });
    jouerConsigne(resultat);
  };
  const surAide = () => {
    const { etat: apres, sons } = aider(etat);
    enregistrer(etat, apres);
    setEtat(apres); setMessage({ type: apres.aide });
    geste.current++;
    if (apres.aide === 'ecoute') jouerMot(carte); else if (apres.aide === 'revelation') jouerConsigne('revelation'); else jouer(sons);
  };
  const surSuivant = () => {
    const apres = suivant(etat);
    setEtat(apres); setMessage(null);
    geste.current++;
    if (apres.statut === 'fini') { jouerConsigne('fin'); onFin(apres); }
  };

  const fichierImage = modeAvec ? carte.image_avec_mot : carte.image_sans_mot;
  const sansImage = !fichierImage; // pack sans image (mode A) : le mot s'affiche ou se dit, selon le réglage
  const urlImage = urlFichier(base, pack, String(fichierImage)); // sous-dossier images/ autorisé
  const imageDisponible = !sansImage && !imagesAbsentes[carte.id];
  const imageCachee = lettres && imageDisponible && !imageVue && !(epure && etat.statut === 'juste'); // commandes épurées : l'image apparaît en récompense quand le mot est juste ; image non montrée : le fichier n'est pas chargé tant que le bouton n'est pas pressé
  const imageAbsente = !imageDisponible || imageCachee;
  const muets = lettres ? lettresMuettes(carte) : null; // mode lettres : quelle lettre est muette (t de chat)
  const reperes = reperesLettres(carte); // null si le manifeste n'a pas le nombre de cubes par syllabe : pas de surlignage
  const posees = etat.poses.map(id => etat.plateau.find(p => p.id === id));

  const toutesCases = posees.reduce((n, p) => n + [...p.g].length, 0) >= carte.cubes.length; // toutes les cases sont remplies
  const suivantPret = etat.statut === 'juste' || etat.statut === 'revelation';
  const classeZone = etat.statut === 'juste' ? ' zone-juste' : (message && message.type === 'faux' ? ' zone-faux' : '');
  const quitter = () => { let ok = true; try { ok = window.confirm('Quitter la liste de mots ?'); } catch (e) { ok = true; } if (ok) onAccueil(); };
  const aideSyllabes = lettres && boutonSyllabesVisible(carte, tache.syllabes || 'toujours', etat);
  const btnImage = lettres && imageDisponible && <Commande parle={parle} icone="oeil" texte={imageVue ? 'Cacher l’image' : 'Voir l’image'} epure={epure} aria-pressed={imageVue} onClick={() => setImageVue(v => !v)} />;
  const btnPhrase = lettres && phraseDeCarte(carte) && <Commande parle={parle} icone="bulle" texte="Écouter une phrase" label="Écouter le mot dans une phrase" epure={epure} onClick={() => jouerPhrase(carte)} />;
  const btnSyllabes = aideSyllabes && <Commande parle={parle} icone="syllabes" texte="Écouter par syllabes" label="Écouter le mot par syllabes" epure={epure} onClick={() => jouerSyllabes(carte)} />;

  return (
    <main className={`jeu${epure ? ' jeu-epure' : ''}`}>
      {epure
        ? (
          <div className="barre-haut">
            <Commande parle={parle} icone="maison" texte="Retour à l’accueil" epure className="discret" onClick={quitter} />
            <div className="points" role="img" aria-label={`Carte ${etat.index + 1} sur ${etat.cartes.length}`}>
              {etat.cartes.slice(0, 30).map((c, k) => <span key={c.id} className={`point${k < etat.index ? ' fait' : ''}${k === etat.index ? ' courant' : ''}`} />)}
            </div>
          </div>
        )
        : <p className="compteur">Carte {etat.index + 1} sur {etat.cartes.length}</p>}
      <div className="carte-jeu">
        {imageAbsente
          ? (modeAvec ? <p className="image-absente mot-affiche">{carte.mot}</p> : <p className="image-absente">{sansImage || imageCachee ? (epure ? '' : 'Écouter le mot, puis le construire.') : 'Image absente'}</p>)
          : <img src={urlImage} alt={modeAvec ? carte.mot : 'Image du mot à écrire'}
              onError={() => { setImagesAbsentes(m => ({ ...m, [carte.id]: true })); onSignalement('image', carte.id); }} />}
        {epure && <Commande parle={parle} icone="hautparleur" texte="Écouter" epure className="principal ecouter-image" onClick={() => jouerMot(carte)} />}
      </div>

      <div className={`zone${classeZone}`} role="group" aria-label="Mot à construire">
        {(() => {
          // Une pièce posée occupe autant de cases que de lettres (un bloc « ch » = 2) ; les cases restantes sont vides.
          const elements = [];
          let i = 0;
          posees.forEach((p, k) => {
            const n = [...p.g].length;
            const r = (syllabeActive === null && !cesures) || !reperes ? null : reperes[i];
            const s = r ? r.syl : null;
            const coupure = r !== null && i > 0 && reperes[i - 1].syl !== s; // trait de césure entre deux syllabes
            const actif = r !== null && syllabeActive !== null && s === syllabeActive ? ' syl-active' : '';
            const derniere = k === posees.length - 1;
            elements.push(
              <React.Fragment key={p.id}>{coupure ? <span key={`cesure-${i}`} className="cesure" aria-hidden="true" /> : null}
                <button type="button" className={`cube ${(muets ? pieceMuette({ ...p, debut: i }, muets) : r && r.muet) ? 'm' : classeDe(p.son)}${actif}`} aria-label={`Retirer ${p.g}`}
                  disabled={!enCours || !derniere} onClick={() => { setEtat(retirer(etat)); setMessage(null); }}>{p.g}</button>
              </React.Fragment>);
            i += n;
          });
          for (; i < carte.cubes.length; i++) {
            const r = (syllabeActive === null && !cesures) || !reperes ? null : reperes[i];
            const coupure = r !== null && i > 0 && reperes[i - 1].syl !== r.syl;
            const actif = r !== null && syllabeActive !== null && r.syl === syllabeActive ? ' syl-active' : '';
            elements.push(<React.Fragment key={`vide-${i}`}>{coupure ? <span key={`cesure-${i}`} className="cesure" aria-hidden="true" /> : null}<span className={`vide${actif}`} aria-hidden="true" /></React.Fragment>);
          }
          return elements;
        })()}
        {/* Fête de réussite : confettis qui montent et retombent (1,6 s, une seule fois), lettres qui sautent en vague (fete.css). Décoratif, coupé si l'élève réduit les animations. */}
        {etat.statut === 'juste' && (
          <span className="confettis" aria-hidden="true">
            {Array.from({ length: 16 }, (_, k) => <i key={k} style={{ '--x': `${(k - 7.5) * 6.5}%`, '--d': `${(k % 5) * 0.06}s`, '--h': `${50 + (k * 37) % 40}px`, '--r': `${(k % 2 ? 1 : -1) * (120 + k * 25)}deg` }} className={`conf conf${k % 4}`} />)}
          </span>
        )}
      </div>

      {/* Retour d'état juste sous les cases : visible sans défiler (audit 2026-11-21). */}
      <div className="retour" aria-live="polite">
        {message && message.type === 'incomplet' && <p>Poser tous les cubes avant de vérifier.</p>}
        {message && message.type === 'juste' && <p className="bravo"><span aria-hidden="true">✓ </span>Bravo !</p>}
        {message && message.type === 'faux' && <p><span aria-hidden="true">✗ </span>Pas tout à fait. Essayer encore.</p>}
        {etat.statut === 'revelation' && <p>Voici le mot : <strong>{carte.mot}</strong></p>}
        {etat.indice && enCours && <p>Commencer par : <strong>{etat.indice.g}</strong></p>}
      </div>

      {(syllabeActive !== null || cesures) && reperes && <p className="regle-coupure" style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>{REGLE_COUPURE}</p>}

      <div className="plateau">
        {/* Chaque pièce garde sa place : une pièce posée laisse un emplacement vide, les autres ne glissent pas (audit 2026-11-21). */}
        {etat.plateau.map(p => (etat.poses.includes(p.id)
          ? <span key={p.id} className="cube cube-place" data-g={p.g} aria-hidden="true" />
          : <button key={p.id} type="button" className={`cube ${classePlateau(p, muets, tache.muet)}`} disabled={!enCours} onClick={() => surPiece(p)}>{p.g}</button>))}
      </div>

      {epure ? (
        <>
          <div className="actions actions-principales actions-epure" role="group" aria-label="Actions principales">
            <Commande parle={parle} icone="retour" texte="Retirer" epure disabled={!enCours || etat.poses.length === 0} onClick={() => setEtat(retirer(etat))} />
            {suivantPret
              ? <Commande parle={parle} icone="fleche" texte="Suivant" epure className="principal" onClick={surSuivant} />
              : <Commande parle={parle} icone="coche" texte="Vérifier" epure className={`principal${toutesCases ? '' : ' attente'}`} disabled={!enCours} onClick={surVerifier} />}
          </div>
          <div className="actions actions-aides" role="group" aria-label="Aides">
            <Commande parle={parle} icone="ampoule" texte="Besoin d’aide ?" epure disabled={!enCours} onClick={surAide} />
            {btnImage}{btnPhrase}{btnSyllabes}
            {lettres && cesures && <button type="button" onClick={() => setCesures(false)}>Masquer les césures</button>}
            {!tache.vitesseVerrou && <Commande parle={parle} icone="tortue" texte="Voix lente" epure aria-pressed={vitesse !== 100} className={vitesse !== 100 ? 'principal' : ''} onClick={() => setVitesse(v => (v === 100 ? 75 : 100))} />}
            {sonAbsent && <span role="status" className="son-absent">Pas de son pour le moment.</span>}
          </div>
        </>
      ) : (
        <>
          <div className="actions actions-principales" role="group" aria-label="Actions principales">
            <Commande parle={parle} icone="hautparleur" texte="Écouter" onClick={() => jouerMot(carte)} />
            <Commande parle={parle} icone="coche" texte="Vérifier" className={`principal${toutesCases ? '' : ' attente'}`} disabled={!enCours} onClick={surVerifier} />
            <Commande parle={parle} icone="fleche" texte="Suivant" className="principal" disabled={!suivantPret} onClick={surSuivant} />
          </div>

          <div className="actions actions-aides" role="group" aria-label="Aides et corrections">
            <Commande parle={parle} icone="retour" texte="Retirer" disabled={!enCours || etat.poses.length === 0} onClick={() => setEtat(retirer(etat))} />
            <Commande parle={parle} icone="poubelle" texte="Tout effacer" disabled={!enCours || etat.poses.length === 0} onClick={() => setEtat(vider(etat))} />
            <Commande parle={parle} icone="ampoule" texte="Besoin d’aide ?" disabled={!enCours} onClick={surAide} />
            {btnImage}{btnPhrase}{btnSyllabes}
            {lettres && cesures && <button type="button" onClick={() => setCesures(false)}>Masquer les césures</button>}
            {sonAbsent && <span role="status" className="son-absent">Pas de son pour le moment.</span>}
          </div>

          {!tache.vitesseVerrou && (
            <div className="vitesse" role="group" aria-label="Vitesse de la voix">
              <span>Voix :</span>
              {[[100, 'Normale'], [75, 'Lente'], [50, 'Très lente']].map(([v, nom]) => (
                <button key={v} type="button" aria-pressed={vitesse === v} className={vitesse === v ? 'principal' : ''} onClick={() => setVitesse(v)}>{nom}</button>
              ))}
            </div>
          )}

          {lettres && (tache.syllabes || 'toujours') !== 'non' && (
            aideSyllabes
              ? <p className="aide aide-syllabes">Écouter par syllabes : la voix dit une syllabe après l’autre, la syllabe dite est entourée.</p>
              : (Array.isArray(carte.syllabes) && carte.syllabes.length === 1 ? <p className="aide aide-syllabes">Ce mot n’a qu’une syllabe : pas d’écoute par syllabes.</p> : null)
          )}
        </>
      )}

      {(!imageAbsente && /\bIA\b/.test(carte.licence || '')) || lettres
        ? <p className="mention-ia" style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
            {!imageAbsente && /\bIA\b/.test(carte.licence || '') ? 'Image créée par une IA. ' : ''}{lettres ? 'Voix de synthèse (Microsoft Azure).' : ''}
          </p> : null}

      {!epure && <p><button type="button" className="discret" onClick={onAccueil}>Retour à l’accueil</button></p>}
    </main>
  );
}
