import React from 'react';
import Cadre from './Cadre.jsx';

/* Page d'accueil du site : deux portes (élève, enseignant), le principe en trois gestes, et l'accès aux informations
   (mode d'emploi, données, crédits). Rien ici ne demande de compte. */
export default function Landing({ base = '/' }) {
  return (
    <Cadre base={base}>
      <div className="accueil-scene" aria-hidden="true">
        <div className="accueil-scene-int">
          <div className="accueil-disque"><span className="accueil-lettres">ma</span></div>
          <div className="accueil-accroche">
            <p>Poser les lettres, écouter le mot.</p>
            <p>Un cube après l’autre, la voix lit ce qui est posé.</p>
          </div>
        </div>
      </div>
      <main className="plai-container page">
        <h1 className="page-titre">PhonoActif</h1>
        <p className="page-chapo">Relier les sons et les lettres, un cube après l’autre, avec une voix belge qui lit ce que l’élève pose.</p>
        <p>Pour les élèves qui apprennent à lire et à écrire (P1 à P3), et pour ceux qui ont besoin de reprendre le lien entre les sons et les lettres. Les mots sont choisis par l’enseignant, jamais par une IA.</p>

        <div className="portes">
          <a className="porte porte-eleve" href="#/eleve">
            <strong>Je suis élève</strong>
            <span>Entrer mon code et jouer.</span>
          </a>
          <a className="porte porte-enseignant" href="#/enseignant">
            <strong>Je suis enseignant</strong>
            <span>Classes, liens, QR-codes et résultats. Il faut un compte PLAI.</span>
          </a>
        </div>

        <section className="plai-section" aria-labelledby="principe">
          <h2 id="principe">Comment ça marche</h2>
          <ol className="etapes">
            <li><strong>Écouter ou voir.</strong> L’élève voit l’image du mot, ou lit le mot à recopier.</li>
            <li><strong>Poser les lettres.</strong> À chaque lettre posée, la voix lit tout ce qui est posé jusque-là.</li>
            <li><strong>Vérifier.</strong> L’application dit si le mot est juste. L’enseignant voit ensuite quelles liaisons son-lettre sont à retravailler.</li>
          </ol>
        </section>

        <section className="plai-section" aria-labelledby="infos">
          <h2 id="infos">Pour en savoir plus</h2>
          <ul className="liens-infos">
            <li><a href="#/mode-d-emploi">Mode d’emploi pour l’enseignant</a> : créer une classe, donner à chaque élève son lien ou son QR-code, lire les résultats.</li>
            <li><a href="#/donnees">Gestion des données</a> : ce qui est enregistré, où, pour combien de temps.</li>
            <li><a href="#/apropos">À propos, licences et crédits</a> : voix, images, lexique, licence du code.</li>
          </ul>
        </section>

        <section className="plai-section" aria-labelledby="limites">
          <h2 id="limites">Ce que l’outil ne fait pas encore bien</h2>
          <ul>
            <li>La voix lit des chaînes de lettres préparées à l’avance : une chaîne qui n’est pas dans le mot donne « Pas de son pour le moment ».</li>
            <li>La justesse de la lecture est mesurée sur des mots du lexique, pas sur des mots inventés. Les états intermédiaires (« m », « ma », « mè »…) n’ont pas de mesure de justesse.</li>
            <li>Il n’a pas été essayé avec des élèves ni relu par une spécialiste ou un spécialiste de phonologie : c’est une version d’essai.</li>
          </ul>
        </section>
      </main>
    </Cadre>
  );
}
