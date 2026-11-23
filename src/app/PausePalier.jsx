import React, { useEffect, useRef } from 'react';
import './palier.css';

// Ce que voit l'élève à la fin d'un palier : un message neutre, aucune commande, aucune décision.
export function MessageEleve() {
  return <p className="pause-eleve" role="status">On fait une pause.</p>;
}

// Panneau de l'adulte : il annonce le palier suivant et lui laisse le choix (arrêter, continuer, passer).
export default function PausePalier({ palierTermine, palierSuivant, existeApres, onContinuer, onPasser, onArreter }) {
  const continuer = useRef(null);
  useEffect(() => { if (continuer.current) continuer.current.focus(); }, []);
  return (
    <div className="pause-adulte" role="group" aria-label="Fin de palier">
      <p className="pause-titre"><strong>Palier terminé.</strong> <span className="pause-id">(palier {palierTermine.id})</span></p>
      <p className="pause-annonce" aria-live="polite">Palier suivant ({palierSuivant.id}) : {palierSuivant.annonce || palierSuivant.difficulte}</p>
      <div className="pause-boutons">
        <button type="button" ref={continuer} className="principal" onClick={onContinuer}>Continuer avec le palier suivant</button>
        {existeApres && <button type="button" onClick={onPasser}>Passer le palier suivant</button>}
        <button type="button" onClick={onArreter}>Arrêter ici</button>
      </div>
    </div>
  );
}
