import React from 'react';

export default function Bilan({ nbCartes, onRejouer, onAccueil, peutEnvoyer, onEnvoyer, messageEnvoi }) {
  return (
    <main className="bilan">
      <h1>Pack terminé</h1>
      <p>{nbCartes} carte(s) vue(s).</p>
      <div className="actions">
        {peutEnvoyer && <button type="button" className="principal" onClick={onEnvoyer}>Envoyer mes résultats</button>}
        <button type="button" className={peutEnvoyer ? '' : 'principal'} onClick={onRejouer}>Rejouer</button>
        <button type="button" onClick={onAccueil}>Retour à l’accueil</button>
      </div>
      <p role="status" className="retour">{messageEnvoi}</p>
    </main>
  );
}
