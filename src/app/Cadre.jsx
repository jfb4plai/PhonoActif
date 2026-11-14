import React from 'react';

/* Cadre commun à toutes les pages hors jeu : barre de navigation (accueil, élève, enseignant, mode d'emploi, données)
   et pied de page habituel des applications PLAI (logo, pôle, contact, données, crédits).
   Le contact est celui des modes d'emploi PLAI (jeanfrancois.beguin@ens.ecl.be). */
const LIENS = [
  { id: 'eleve', href: '#/eleve', texte: 'Élève' },
  { id: 'enseignant', href: '#/enseignant', texte: 'Enseignant' },
  { id: 'mode_emploi', href: '#/mode-d-emploi', texte: 'Mode d’emploi' },
  { id: 'donnees', href: '#/donnees', texte: 'Données' }
];

export default function Cadre({ base = '/', actif = '', children }) {
  return (
    <div className="accueil-page">
      <nav className="plai-nav" aria-label="Navigation principale">
        <a href="#/" className="plai-nav-logo" aria-label="PhonoActif, retour à l’accueil">
          <img className="logo-nav" src={`${base}plai-logo.jpg`} alt="" /> PhonoActif
        </a>
        <div className="plai-nav-actions">
          {LIENS.map(l => (
            <a key={l.id} href={l.href} className={`plai-nav-link${actif === l.id ? ' actif' : ''}`} aria-current={actif === l.id ? 'page' : undefined}>{l.texte}</a>
          ))}
        </div>
      </nav>
      {children}
      <footer className="plai-footer">
        <p><img className="logo-pied" src={`${base}plai-logo.jpg`} alt="PLAI" /></p>
        <p>Pôle Liégeois d’Accompagnement vers une École Inclusive</p>
        <p>Un souci, une question, une idée ? Contact : <a href="mailto:jeanfrancois.beguin@ens.ecl.be">jeanfrancois.beguin@ens.ecl.be</a></p>
        <p>
          <a href="#/mode-d-emploi">Mode d’emploi</a> · <a href="#/donnees">Gestion des données</a> · <a href="#/apropos">À propos, licences et crédits</a>
        </p>
      </footer>
    </div>
  );
}
