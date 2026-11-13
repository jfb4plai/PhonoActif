import React, { useState } from 'react';
import { classeCube } from '../core/index.js';
import { demarrerJeu, poser, retirer, vider, verifier, aider, suivant, sonsDuMot } from '../jeu/session.js';
import { REGLAGES_PAR_DEFAUT } from './route.js';
import { estPackLettres, packDeSession, construirePlateauLettres, etatPourChaine, etatFinal, positionsGraphemes, syllabesDeCarte, REGLAGES_SYLLABES } from '../jeu/modeA.js';

const CLASSES = { voyelle: 'v', consonne: 'c', muet: 'm', inconnu: 'm' };
const classeDe = son => CLASSES[classeCube(son)];

export default function Jeu({ pack, tache, code, stockage, deps, base = '/', onFin, onAccueil, onSignalement }) {
  const lettres = estPackLettres(pack); // mode A : l'élève pose des lettres, l'app lit la chaîne posée
  const [etat, setEtat] = useState(() => demarrerJeu({
    pack: lettres ? packDeSession(pack) : pack, code, jeton: tache.jeton || null, rng: deps.rng, maintenant: deps.maintenant,
    reglages: { ...REGLAGES_PAR_DEFAUT, modeMot: tache.modeMot, habillage: tache.habillage, nbIntrus: tache.nbIntrus, exigerAccents: tache.exigerAccents, ...(lettres ? { construirePlateau: construirePlateauLettres } : {}) }
  }));
  const [message, setMessage] = useState(null);
  const [imagesAbsentes, setImagesAbsentes] = useState({});

  const carte = etat.cartes[etat.index];
  const modeAvec = etat.reglages.modeMot === 'avec';
  const enCours = etat.statut === 'en_cours';

  const [sonAbsent, setSonAbsent] = useState(false);
  const signalerSons = r => {
    const manquants = r && r.manquants ? r.manquants : [];
    manquants.forEach(id => onSignalement('son', id));
    if (manquants.length > 0) setSonAbsent(true);
  };
  const jouer = ids => {
    if (ids.length === 0) return;
    setSonAbsent(false);
    Promise.resolve(deps.jouerSons(ids)).then(signalerSons).catch(() => {});
  };
  // Le mot entier est préféré : enchaîner des sons isolés donne « che-a ». Sans fichier du mot, on retombe sur les sons.
  const jouerEtat = e => {
    if (!e || !e.fichier || !deps.jouerFichier) { setSonAbsent(true); return; }
    setSonAbsent(false);
    Promise.resolve(deps.jouerFichier(`${base}packs/${encodeURIComponent(pack.dossier || pack.nom)}/${e.fichier}`)).then(signalerSons).catch(() => {});
  };
  // Entrée complémentaire : le mot syllabe par syllabe (espace de 500 ms, dernière syllabe à 75 %)
  const jouerSyllabes = c => {
    const syl = syllabesDeCarte(c);
    if (!syl || !deps.jouerSerie) { setSonAbsent(true); return; }
    setSonAbsent(false);
    const urls = syl.map(s => `${base}packs/${encodeURIComponent(pack.dossier || pack.nom)}/${s.fichier}`);
    Promise.resolve(deps.jouerSerie(urls, REGLAGES_SYLLABES)).then(signalerSons).catch(() => {});
  };
  const jouerMot = c => {
    if (lettres) { jouerEtat(etatFinal(c)); return; }
    if (!c.audio_mot || !deps.jouerFichier) { jouer(sonsDuMot(c)); return; }
    setSonAbsent(false);
    Promise.resolve(deps.jouerFichier(`${base}packs/${encodeURIComponent(pack.dossier || pack.nom)}/${c.audio_mot}`)).then(signalerSons).catch(() => {});
  };
  const lettresPosees = e => [...e.poses.map(id => e.plateau.find(p => p.id === id).g).join('')];
  // Mode A : le suivi reste en graphèmes-sons (liaisons), calculé à partir des lettres posées.
  const enregistrer = (avant, apres) => apres.essais.slice(avant.essais.length).forEach(l => stockage.ajouter(
    lettres ? { ...l, positions: positionsGraphemes(avant.cartes[avant.index], lettresPosees(avant), avant.reglages.exigerAccents) } : l));

  const surPiece = piece => {
    const apres = poser(etat, piece.id);
    if (apres === etat) return;
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
    setEtat(apres); setMessage({ type: resultat });
  };
  const surAide = () => {
    const { etat: apres, sons } = aider(etat);
    enregistrer(etat, apres);
    setEtat(apres); setMessage({ type: apres.aide });
    if (apres.aide === 'ecoute') jouerMot(carte); else jouer(sons);
  };
  const surSuivant = () => {
    const apres = suivant(etat);
    setEtat(apres); setMessage(null);
    if (apres.statut === 'fini') onFin(apres);
  };

  const fichierImage = modeAvec ? carte.image_avec_mot : carte.image_sans_mot;
  const sansImage = !fichierImage; // pack sans image (mode A) : le mot s'affiche ou se dit, selon le réglage
  const urlImage = `${base}packs/${encodeURIComponent(etat.pack)}/${String(fichierImage).split("/").map(encodeURIComponent).join("/")}`; // sous-dossier images/ autorisé
  const imageAbsente = sansImage || !!imagesAbsentes[carte.id];
  const posees = etat.poses.map(id => etat.plateau.find(p => p.id === id));
  const surPlateau = etat.plateau.filter(p => !etat.poses.includes(p.id));

  return (
    <main className="jeu">
      <p className="compteur">Carte {etat.index + 1} sur {etat.cartes.length}</p>
      <div className="carte-jeu">
        {imageAbsente
          ? (modeAvec ? <p className="image-absente mot-affiche">{carte.mot}</p> : <p className="image-absente">{sansImage ? 'Écouter le mot, puis le construire.' : 'Image absente'}</p>)
          : <img src={urlImage} alt={modeAvec ? carte.mot : 'Image du mot à écrire'}
              onError={() => { setImagesAbsentes(m => ({ ...m, [carte.id]: true })); onSignalement('image', carte.id); }} />}
      </div>

      <div className="zone" role="group" aria-label="Mot à construire">
        {carte.cubes.map((c, i) => {
          const p = posees[i];
          if (!p) return <span key={`vide-${i}`} className="vide" aria-hidden="true" />;
          const derniere = i === posees.length - 1;
          return (
            <button key={p.id} type="button" className={`cube ${classeDe(p.son)}`} aria-label={`Retirer ${p.g}`}
              disabled={!enCours || !derniere} onClick={() => { setEtat(retirer(etat)); setMessage(null); }}>{p.g}</button>
          );
        })}
      </div>

      <div className="plateau">
        {surPlateau.map(p => (
          <button key={p.id} type="button" className={`cube ${classeDe(p.son)}`} disabled={!enCours} onClick={() => surPiece(p)}>{p.g}</button>
        ))}
      </div>

      <div className="actions" role="toolbar" aria-label="Actions">
        <button type="button" onClick={() => jouerMot(carte)}>Écouter</button>
        {lettres && syllabesDeCarte(carte) && <button type="button" onClick={() => jouerSyllabes(carte)} aria-label="Écouter le mot par syllabes">Écouter par syllabes</button>}
        {sonAbsent && <span role="status" className="son-absent">Pas de son pour le moment.</span>}
        <button type="button" className="principal" disabled={!enCours} onClick={surVerifier}>Vérifier</button>
        <button type="button" disabled={!enCours || etat.poses.length === 0} onClick={() => setEtat(retirer(etat))}>Retirer</button>
        <button type="button" disabled={!enCours || etat.poses.length === 0} onClick={() => setEtat(vider(etat))}>Tout effacer</button>
        <button type="button" disabled={!enCours} onClick={surAide}>Besoin d’aide ?</button>
      </div>

      <div className="retour" aria-live="polite">
        {message && message.type === 'incomplet' && <p>Poser tous les cubes avant de vérifier.</p>}
        {message && message.type === 'juste' && <p className="bravo">Bravo !</p>}
        {message && message.type === 'faux' && <p>Pas tout à fait. Essayer encore.</p>}
        {etat.statut === 'revelation' && <p>Voici le mot : <strong>{carte.mot}</strong></p>}
        {etat.indice && enCours && <p>Commencer par : <strong>{etat.indice.g}</strong></p>}
      </div>

      {(etat.statut === 'juste' || etat.statut === 'revelation') && <button type="button" className="principal" onClick={surSuivant}>Suivant</button>}
      <p><button type="button" className="discret" onClick={onAccueil}>Retour à l’accueil</button></p>
    </main>
  );
}
