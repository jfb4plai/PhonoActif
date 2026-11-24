import React from 'react';

export default function Bilan({ titre = 'Pack terminé', nbCartes, arret = null, paliersSautes = [], onRejouer, onAccueil, peutEnvoyer, onEnvoyer, messageEnvoi }) {
  return (
    <main className="bilan">
      {/* Fête du bilan : trois gerbes de feu d'artifice qui éclatent l'une après l'autre, et une étoile dorée qui surgit. Décoratif (fete.css). */}
      <span className="feu" aria-hidden="true">
        {[[16, 120], [84, 100], [62, 190]].map(([x, y], g) => (
          <span key={g} className={`gerbe gerbe${g}`} style={{ left: `${x}%`, top: `${y}px`, '--g': `${g * 0.9}s` }}>
            {Array.from({ length: 20 }, (_, k) => <i key={k} style={{ '--a': `${k * 18}deg`, '--n': k % 2 ? '110px' : '76px' }} />)}
          </span>
        ))}
      </span>
      <svg className="etoile-bilan" viewBox="0 0 100 100" width="72" height="72" aria-hidden="true">
        <polygon points="50,6 62,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 38,38" fill="#f5b700" stroke="#b07d00" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <h1>{titre}</h1>
      <p>{nbCartes} carte(s) vue(s).</p>
      {arret && <p className="bilan-palier">Arrêté après le palier {arret.apres}.</p>}
      {paliersSautes.map(id => <p key={id} className="bilan-palier">Palier {id} passé par l’adulte.</p>)}
      <div className="actions">
        {peutEnvoyer && <button type="button" className="principal" onClick={onEnvoyer}>Envoyer mes résultats</button>}
        <button type="button" className={peutEnvoyer ? '' : 'principal'} onClick={onRejouer}>Rejouer</button>
        <button type="button" onClick={onAccueil}>Retour à l’accueil</button>
      </div>
      <p role="status" className="retour">{messageEnvoi}</p>
    </main>
  );
}
