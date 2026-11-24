import React, { useEffect, useMemo, useRef, useState } from 'react';
import { urlFichier } from './urlFichier.js';
import Icone from './Icones.jsx';
import { lettreInitiale, voyellesProposees, VOYELLES_INITIALE } from '../core/voyellesInitiale.js';
import { etatFinal } from '../jeu/modeA.js';
import { VALEURS_VITESSE } from './route.js';

/* Maternelle (M1 à M3), exercice « première lettre » : l'élève voit l'image d'un mot qui commence par une voyelle et choisit cette voyelle parmi trois.
   Une fois la bonne lettre posée, il entend le son de la lettre, puis le mot entier. Pas de lecture demandée : image et voix seulement.
   Une mauvaise lettre se grise et joue son propre son (l'élève entend la différence) ; après deux erreurs, la bonne lettre est montrée.
   Les essais sont enregistrés dans le même format que le jeu de construction (une position : la première lettre). Décisions de JF 2026-11-20 et 2026-11-24. */

const ESSAIS_MAX = 2;
const PAUSE_MS = 500;

function melanger(liste, rng) {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

// Cartes utilisables : première lettre = voyelle seule connue, et une image (le mot n'est jamais écrit à l'élève).
export const cartesInitiale = pack => (pack.cartes || []).filter(c => lettreInitiale(c) && c.image_sans_mot);

function Bouton({ icone, texte, className = '', ...reste }) {
  return (
    <button type="button" className={`${className} icone-seule`.trim()} aria-label={texte} {...reste}>
      <Icone nom={icone} taille={34} /><span className="info" aria-hidden="true">{texte}</span>
    </button>
  );
}

export default function Initiale({ pack, tache, code, stockage, deps, base = '/', onFin, onAccueil, onSignalement }) {
  const rng = deps.rng || Math.random;
  const maintenant = deps.maintenant || (() => new Date().toISOString());
  const cartes = useMemo(() => melanger(cartesInitiale(pack), rng), []); // eslint-disable-line react-hooks/exhaustive-deps
  const session = useRef(`s-${maintenant().replace(/\D/g, '').slice(0, 14)}-${Math.floor(rng() * 36 ** 4).toString(36).padStart(4, '0')}`).current;
  const [index, setIndex] = useState(0);
  const [ecartees, setEcartees] = useState([]); // lettres déjà essayées et fausses sur cette carte
  const [statut, setStatut] = useState('en_cours'); // en_cours | juste | revelation
  const [sonAbsent, setSonAbsent] = useState(false);
  const [vitesse, setVitesse] = useState(VALEURS_VITESSE.includes(tache.vitesse) ? tache.vitesse : 100);
  const sequence = useRef(0); // un nouveau geste coupe la suite d'une lecture en cours (lettre puis mot)

  const carte = cartes[index];
  const cible = lettreInitiale(carte);
  const choix = useMemo(() => voyellesProposees(cible, rng) || [cible], [carte.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const enCours = statut === 'en_cours';
  const optsVitesse = vitesse === 100 ? [] : [{ vitesse: vitesse / 100 }];

  const lire = fichier => {
    if (!fichier || !deps.jouerFichier) { setSonAbsent(true); return Promise.resolve(); }
    setSonAbsent(false);
    return Promise.resolve(deps.jouerFichier(urlFichier(base, pack, fichier), ...optsVitesse))
      .then(r => { const m = (r && r.manquants) || []; m.forEach(x => onSignalement('son', x)); if (m.length > 0) setSonAbsent(true); })
      .catch(() => {});
  };
  const lireMot = () => lire((etatFinal(carte) || {}).fichier);
  const lireLettre = v => lire(VOYELLES_INITIALE[v].fichier);
  // Lettre, courte pause, puis le mot : un geste de l'élève entre-temps coupe la suite.
  const lireLettrePuisMot = v => {
    const n = ++sequence.current;
    return lireLettre(v).then(() => new Promise(res => setTimeout(res, PAUSE_MS))).then(() => { if (sequence.current === n) return lireMot(); return null; });
  };

  // À l'arrivée d'une carte : la voix dit le mot (le navigateur peut bloquer le son : le bouton « Écouter » reste là).
  useEffect(() => { sequence.current++; setEcartees([]); setStatut('en_cours'); lireMot(); }, [carte.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const enregistrer = (pose, juste, tentative, aide) => {
    const c0 = carte.cubes[0];
    stockage.ajouter({
      id: (deps.nouvelId || (() => globalThis.crypto.randomUUID()))(), jeton: tache.jeton || null, ...(tache.cle ? { cle: tache.cle } : {}),
      session, code, pack: pack.nom, carte: carte.id, mot: carte.mot, modeMot: 'sans', exercice: 'initiale',
      tentative, juste, aide: aide || 'aucune', positions: [{ liaison: `${c0.g}=${c0.son}`, pose, juste }], image: 'sans', date: maintenant()
    });
  };

  const surChoix = v => {
    if (!enCours || ecartees.includes(v)) return;
    const tentative = ecartees.length + 1;
    if (v === cible) {
      enregistrer(v, true, tentative);
      setStatut('juste');
      lireLettrePuisMot(v);
      return;
    }
    enregistrer(v, false, tentative);
    const reste = [...ecartees, v];
    setEcartees(reste);
    if (reste.length >= ESSAIS_MAX) { setStatut('revelation'); lireLettre(v).then(() => lireLettrePuisMot(cible)); return; } // la bonne lettre est montrée
    sequence.current++;
    lireLettre(v);
  };

  const surSuivant = () => {
    sequence.current++;
    if (index + 1 >= cartes.length) { onFin({ index }); return; }
    setIndex(index + 1);
  };
  const quitter = () => { let ok = true; try { ok = window.confirm('Quitter la liste de mots ?'); } catch (e) { ok = true; } if (ok) onAccueil(); };

  const classeZone = statut === 'juste' ? ' zone-juste' : (ecartees.length > 0 && enCours ? ' zone-faux' : '');
  const lettreMontree = v => statut === 'revelation' && v === cible;

  return (
    <main className={`jeu jeu-epure jeu-initiale${tache.casse === 'majuscules' ? ' jeu-maj' : ''}`}>
      <div className="barre-haut">
        <Bouton icone="maison" texte="Retour à l’accueil" className="discret" onClick={quitter} />
        <div className="points" role="img" aria-label={`Carte ${index + 1} sur ${cartes.length}`}>
          {cartes.slice(0, 30).map((c, k) => <span key={c.id} className={`point${k < index ? ' fait' : ''}${k === index ? ' courant' : ''}`} />)}
        </div>
      </div>

      <div className={`carte-jeu${classeZone}`}>
        <img src={urlFichier(base, pack, String(carte.image_sans_mot))} alt="Image du mot à trouver" onError={() => onSignalement('image', carte.id)} />
        <Bouton icone="hautparleur" texte="Écouter" className="principal ecouter-image" onClick={() => { sequence.current++; lireMot(); }} />
      </div>

      <div className="retour" aria-live="polite">
        {statut === 'juste' && <p className="bravo"><span aria-hidden="true">✓ </span>Bravo !</p>}
        {enCours && ecartees.length > 0 && <p><span aria-hidden="true">✗ </span>Pas celle-là. Essayer encore.</p>}
        {statut === 'revelation' && <p>C’est cette lettre.</p>}
      </div>

      <div className="plateau choix-initiale" role="group" aria-label="Choisir la première lettre du mot">
        {choix.map(v => (
          <button key={v} type="button" lang="fr"
            className={`cube v${ecartees.includes(v) ? ' ecartee' : ''}${statut === 'juste' && v === cible ? ' choisie' : ''}${lettreMontree(v) ? ' choisie' : ''}`}
            aria-label={`Lettre ${v}`} disabled={!enCours || ecartees.includes(v)} aria-pressed={statut !== 'en_cours' && v === cible} onClick={() => surChoix(v)}>
            {v}
          </button>
        ))}
      </div>

      <div className="actions actions-principales actions-epure" role="group" aria-label="Actions principales">
        <Bouton icone="fleche" texte="Suivant" className={`principal${statut === 'en_cours' ? ' attente' : ' guide'}`} disabled={statut === 'en_cours'} onClick={surSuivant} />
      </div>
      <div className="actions actions-aides" role="group" aria-label="Aides">
        <Bouton icone="tortue" texte="Voix lente" aria-pressed={vitesse !== 100} className={vitesse !== 100 ? 'principal' : ''} onClick={() => setVitesse(v => (v === 100 ? 75 : 100))} />
        {sonAbsent && <span role="status" className="son-absent">Pas de son pour le moment.</span>}
      </div>
    </main>
  );
}
