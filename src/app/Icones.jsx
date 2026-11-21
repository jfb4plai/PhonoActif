import React from 'react';

/* Icônes des commandes de l'écran élève : traits simples, couleur du texte (currentColor), décoratives (aria-hidden).
   Le nom accessible du bouton reste le texte français, porté par le bouton (voir Commande dans Jeu.jsx). */
const TRACES = {
  hautparleur: <><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /></>,
  coche: <path d="M4 12.5l5 5L20 6.5" />,
  fleche: <path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
  retour: <path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -4)" />,
  poubelle: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
  ampoule: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  oeil: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" fill="currentColor" /></>,
  bulle: <path d="M4 5h16v11H11l-5 4v-4H4z" />,
  syllabes: <><rect x="2.5" y="8" width="8" height="8" rx="2" /><rect x="13.5" y="8" width="8" height="8" rx="2" /></>,
  tortue: <><path d="M5 16a7 7 0 0 1 14 0z" fill="currentColor" /><path d="M19 13.5l3-1.5M7 16v3M16 16v3" /></>,
  maison: <path d="M3 11l9-7 9 7M6 10v10h12V10" />
};

export default function Icone({ nom, taille = 28 }) {
  return (
    <svg className="icone" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRACES[nom]}
    </svg>
  );
}
