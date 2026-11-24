import React from 'react';

/* Choix par grandes cases à cocher (toute la tuile se clique, la case cochée est bien visible).
   Demande de JF 2026-11-24 : les petits ronds d'un bouton radio ne se trouvaient pas. L'élément reste un vrai bouton radio (clavier, lecteur d'écran).
   options = [[valeur, titre, texte]] ; servi pour le niveau et pour « qui joue » (classe entière ou chaque élève). */
export function ChoixTuiles({ options, valeur, onChoisir, nom, idPrefixe, libelle }) {
  return (
    <div className="choix-niveau" role="radiogroup" aria-label={libelle}>
      {options.map(([id, titre, texte]) => (
        <label key={id} htmlFor={`${idPrefixe}-${id}`} className={`tuile-niveau${valeur === id ? ' choisie' : ''}`}>
          <input id={`${idPrefixe}-${id}`} type="radio" name={nom} checked={valeur === id} onChange={() => onChoisir(id)} />
          <span className="tuile-case" aria-hidden="true">{valeur === id ? '✓' : ''}</span>
          <span className="tuile-texte"><strong>{titre}</strong><span>{texte}</span></span>
        </label>
      ))}
    </div>
  );
}

const NIVEAUX = [
  ['maternelle', 'Maternelle (M1 à M3)', 'Trouver la première lettre d’un mot'],
  ['primaire', 'Primaire (P1 et plus)', 'Construire le mot lettre par lettre']
];

export default function ChoixNiveau({ niveau, onChoisir, nom = 'niveau', idPrefixe = 'niveau' }) {
  return <ChoixTuiles options={NIVEAUX} valeur={niveau} onChoisir={onChoisir} nom={nom} idPrefixe={idPrefixe} libelle="Niveau" />;
}

// Maternelle : toute la classe devant un seul écran (TBI, sans code) ou chaque élève sur son appareil, avec son code.
const QUI = [
  ['classe', 'Toute la classe, au tableau (TBI)', 'Un seul écran, pas de code : un élève vient choisir la lettre, les autres répondent sur leur feuille.'],
  ['eleves', 'Chaque élève sur son appareil', 'Chaque élève entre son code ; ses essais sont gardés sur l’appareil.']
];

export function ChoixQui({ classe, onChoisir }) {
  return <ChoixTuiles options={QUI} valeur={classe ? 'classe' : 'eleves'} onChoisir={v => onChoisir(v === 'classe')} nom="qui" idPrefixe="qui" libelle="Qui joue ?" />;
}
