import React from 'react';

export default function Bilan({ nbCartes, onRejouer, onAccueil }) {
  return (
    <main className="bilan">
      <h1>Pack terminé</h1>
      <p>{nbCartes} carte(s) vue(s).</p>
      <div className="actions">
        <button type="button" className="principal" onClick={onRejouer}>Rejouer</button>
        <button type="button" onClick={onAccueil}>Retour à l’accueil</button>
      </div>
    </main>
  );
}
