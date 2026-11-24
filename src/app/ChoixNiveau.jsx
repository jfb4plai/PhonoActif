import React from 'react';

/* Choix du niveau : deux grandes cases à cocher (toute la tuile se clique, la case cochée est bien visible).
   Demande de JF 2026-11-24 : les petits ronds d'un bouton radio ne se trouvaient pas. L'élément reste un vrai bouton radio (clavier, lecteur d'écran). */
const OPTIONS = [
  ['maternelle', 'Maternelle (M1 à M3)', 'Trouver la première lettre d’un mot'],
  ['primaire', 'Primaire (P1 et plus)', 'Construire le mot lettre par lettre']
];

export default function ChoixNiveau({ niveau, onChoisir, nom = 'niveau', idPrefixe = 'niveau' }) {
  return (
    <div className="choix-niveau" role="radiogroup" aria-label="Niveau">
      {OPTIONS.map(([id, titre, texte]) => (
        <label key={id} htmlFor={`${idPrefixe}-${id}`} className={`tuile-niveau${niveau === id ? ' choisie' : ''}`}>
          <input id={`${idPrefixe}-${id}`} type="radio" name={nom} checked={niveau === id} onChange={() => onChoisir(id)} />
          <span className="tuile-case" aria-hidden="true">{niveau === id ? '✓' : ''}</span>
          <span className="tuile-texte"><strong>{titre}</strong><span>{texte}</span></span>
        </label>
      ))}
    </div>
  );
}
