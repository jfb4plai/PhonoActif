import React from 'react';

export default function Bilan({ nbCartes, onRejouer, onAccueil, peutEnvoyer, onEnvoyer, messageEnvoi }) {
  return (
    <main className="bilan">
      <span className="confettis" aria-hidden="true">
        {Array.from({ length: 30 }, (_, k) => <i key={k} style={{ '--x': `${3 + k * 3.2}%`, '--d': `${(k % 7) * 0.12}s`, '--r': `${(k % 2 ? 1 : -1) * (200 + k * 20)}deg` }} className={`conf conf${k % 4}`} />)}
      </span>
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
