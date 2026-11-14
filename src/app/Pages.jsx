import React from 'react';
import Cadre from './Cadre.jsx';

// Les adresses du site sont dans le hash (#/…) : un lien « #etape1 » casserait la navigation. Le sommaire fait défiler la page sans toucher à l'adresse.
const Aller = ({ vers, children }) => (
  <a href="#/mode-d-emploi" onClick={e => { e.preventDefault(); const cible = document.getElementById(vers); if (cible && cible.scrollIntoView) cible.scrollIntoView(); }}>{children}</a>
);

/* Pages d'information : mode d'emploi de l'enseignant, gestion des données, à propos.
   Chaque phrase décrit ce que l'application fait aujourd'hui (version d'essai). Ce qui n'est pas décidé est écrit comme tel. */

export function ModeEmploi({ base = '/' }) {
  const modele = `${String(base).replace(/\/+$/, '')}/modeles/modele-pack-plai.xlsx`;
  return (
    <Cadre base={base} actif="mode_emploi">
      <main className="plai-container page">
        <h1 className="page-titre">Mode d’emploi pour l’enseignant</h1>
        <p className="page-chapo">De la création de la classe à la lecture des résultats, en sept étapes.</p>
        <nav aria-label="Sommaire" className="plai-card sommaire">
          <ol>
            <li><Aller vers="etape1">Se connecter</Aller></li>
            <li><Aller vers="etape2">Créer la classe</Aller></li>
            <li><Aller vers="etape3">Créer les codes des élèves</Aller></li>
            <li><Aller vers="etape4">Créer une tâche</Aller></li>
            <li><Aller vers="etape5">Donner à chaque élève son lien ou son QR-code</Aller></li>
            <li><Aller vers="etape6">Ce que fait l’élève</Aller></li>
            <li><Aller vers="etape7">Lire les résultats</Aller></li>
          </ol>
        </nav>

        <section className="plai-section" id="etape1">
          <h2>1. Se connecter</h2>
          <p>Ouvrir <a href="#/enseignant">l’espace enseignant</a> et saisir l’e-mail et le mot de passe du compte PLAI : c’est le même compte que pour les autres outils PLAI. Mot de passe oublié : saisir l’e-mail puis choisir « Mot de passe oublié ».</p>
          <p>Pas encore de compte ? Écrire à l’adresse de contact en bas de page.</p>
        </section>

        <section className="plai-section" id="etape2">
          <h2>2. Créer la classe</h2>
          <p>Dans « Mes classes », saisir le nom de la classe (par exemple « 3P A, école de Fléron »), puis « Créer la classe ». Seuls les enseignants de la classe voient ce nom.</p>
          <p className="important">Ne jamais écrire de nom d’élève, de prénom ou de date de naissance dans l’application.</p>
          <p>Pour partager une classe avec un collègue : dans la classe, « Inviter un enseignant ». Le collègue doit avoir un compte PLAI.</p>
        </section>

        <section className="plai-section" id="etape3">
          <h2>3. Créer les codes des élèves</h2>
          <p>Un élève est repéré par un <strong>code</strong>, jamais par son nom : E01, E02, E03… Dans la classe, « Créer les codes automatiquement » (choisir le début du code et le nombre), ou saisir ses propres codes, séparés par une virgule.</p>
          <p>La correspondance entre le code et l’élève reste <strong>sur papier chez vous</strong> : l’application ne la connaît pas.</p>
        </section>

        <section className="plai-section" id="etape4">
          <h2>4. Créer une tâche</h2>
          <p>Une tâche = un pack de mots et des réglages. Dans la classe :</p>
          <ul>
            <li><strong>Pack de cartes</strong> : la liste des mots proposés. Les packs publiés sont dans la liste ; un pack « personnel » n’apparaît que pour vous.</li>
            <li><strong>Cartes sans le mot</strong> : l’élève trouve le mot à l’oreille et avec l’image. <strong>Avec le mot</strong> : il recopie le modèle.</li>
            <li><strong>Habillage</strong> : « album » (P1 à P3) ou « sobre » (P4 et au-delà). Les mots restent en Arial.</li>
            <li><strong>Nombre de cubes en trop</strong> : 0 est le plus facile.</li>
            <li><strong>Exiger les accents</strong> : si la case est vide, « e » est accepté à la place de « é ».</li>
            <li><strong>Écoute par syllabes</strong> : ce réglage <em>ne lit rien tout seul</em>, il rend disponible le bouton « Écouter par syllabes ». « Pour tous les mots » : le bouton est là dès le départ. « Seulement quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? », donc seulement pour les mots qui posent problème. « Jamais » : pas de bouton.</li>
          </ul>
          <p>Puis « Créer le lien et le QR-code ».</p>
          <p>Pour fabriquer votre propre pack (vos mots, vos images) : <a href={modele} download>télécharger le modèle Excel</a>, le remplir, puis l’envoyer avec vos images à l’adresse de contact. Le pack est fabriqué par l’équipe PLAI : l’application ne choisit jamais les mots à votre place.</p>
        </section>

        <section className="plai-section" id="etape5">
          <h2>5. Donner à chaque élève son lien ou son QR-code</h2>
          <p>Dans la liste « Tâches de la classe », cliquer sur <strong>« Liens et QR-codes personnels »</strong>. Chaque élève a son propre lien et son propre QR-code, qui contiennent son code et une clé secrète. Imprimer (« Imprimer »), découper, remettre à chaque élève uniquement le sien.</p>
          <p><strong>Pourquoi un lien par élève ?</strong> Sans la clé, un élève qui connaît le code d’un camarade ne peut pas enregistrer de résultats à sa place. Le lien général de la tâche ouvre bien le jeu, mais les résultats ne sont <strong>pas</strong> enregistrés : l’élève en est averti à l’écran.</p>
          <p>Un lien perdu, ou donné à quelqu’un d’autre : « Nouvelle clé pour E07 ». L’ancien lien ne fonctionne plus. « Révoquer ce lien » arrête toute une tâche.</p>
        </section>

        <section className="plai-section" id="etape6">
          <h2>6. Ce que fait l’élève</h2>
          <ol>
            <li>Il scanne son QR-code ou ouvre son lien : son code est déjà rempli.</li>
            <li>« Commencer ». Il voit l’image (ou le mot), peut « Écouter » le mot, et pose les lettres une à une. À chaque lettre, la voix lit ce qui est posé.</li>
            <li>« Vérifier ». Après trois essais, le mot est montré. Il n’y a pas de score affiché à l’élève.</li>
            <li>Au bilan, « Envoyer mes résultats ». Ils sont aussi renvoyés automatiquement à l’ouverture suivante ou au retour de la connexion : sans réseau, ils restent sur l’appareil et partent plus tard.</li>
          </ol>
          <p><strong>Écoute par syllabes.</strong> Le bouton « Écouter par syllabes » (à côté de « Écouter ») lit les syllabes phonétiques l’une après l’autre, avec une pause de 500 ms et la dernière syllabe plus lente (75 %). Pendant la lecture, la syllabe dite est entourée dans la zone de construction, un trait marque la coupure et les lettres muettes sont grisées. La règle de coupure s’affiche sous la zone.</p>
          <p><strong>Phrase d’aide.</strong> Pour les mots qui ne se dessinent pas (dans, avec, mais…), un pack peut proposer le bouton « Écouter une phrase » : la voix dit une courte phrase qui contient le mot. Le texte de la phrase n’est jamais affiché, parce qu’il contient le mot à écrire. Ces phrases sont écrites par l’enseignant, jamais par l’application.</p>
          <p>Il n’y a pas de bouton pour un mot d’une seule syllabe, ni dans un pack qui n’a pas encore ses syllabes (les 100 mots de P1 n’en ont que pour une partie des mots), ni si le réglage est sur « Jamais ». Les syllabes sont coupées sur les <em>sons</em> du mot, pas sur les lettres : « maison » se coupe « mè-zon ».</p>
        </section>

        <section className="plai-section" id="etape7">
          <h2>7. Lire les résultats</h2>
          <p>Dans la classe, le tableau « Résultats » donne, par code : le nombre d’essais, la date de la dernière séance et les trois liaisons son-lettre à retravailler (celles qui échouent le plus au premier coup).</p>
          <p>Ce tableau ne décide rien : c’est une aide à votre observation, pas un diagnostic.</p>
        </section>

        <section className="plai-section" id="sans-compte">
          <h2>Sans compte : le lien rapide</h2>
          <p>Pour un essai sans compte, <a href="#/lien">créer un lien rapide</a> : choisir un pack et des réglages, copier le lien ou le QR-code. Dans ce cas rien n’est envoyé : les essais restent sur l’appareil de l’élève et s’exportent en fichier (JSON ou CSV).</p>
        </section>

        <section className="plai-section" id="vos-20">
          <h2>Ce que l’outil ne fait pas, et ce que vous y mettez</h2>
          <ul>
            <li><strong>Avant de proposer un pack, écoutez-en quelques mots.</strong> La voix lit une transcription préparée à l’avance : une erreur de lecture serait entendue par l’élève.</li>
            <li><strong>Choisissez les mots et les images</strong> qui correspondent à votre classe : un même pack ne convient pas à tous les élèves.</li>
            <li><strong>Regardez l’élève jouer</strong> au moins une fois : l’application voit des essais justes ou faux, pas ce qui les explique.</li>
            <li>L’outil n’a pas encore été essayé avec des élèves ni relu par une spécialiste ou un spécialiste de phonologie.</li>
          </ul>
        </section>
      </main>
    </Cadre>
  );
}

export function Donnees({ base = '/' }) {
  return (
    <Cadre base={base} actif="donnees">
      <main className="plai-container page">
        <h1 className="page-titre">Gestion des données</h1>
        <p className="page-chapo">Ce qui est enregistré, où, pour combien de temps, et à qui s’adresser.</p>
        <p className="aide">Cette page décrit le fonctionnement actuel de cette version d’essai. Les informations destinées aux représentants légaux des élèves ne sont pas encore rédigées.</p>

        <section className="plai-section">
          <h2>Pour les élèves</h2>
          <ul>
            <li><strong>Aucun nom, aucun prénom.</strong> L’élève est repéré par un code choisi par l’enseignant (E07, par exemple). La correspondance entre le code et l’élève reste sur papier chez l’enseignant.</li>
            <li><strong>Ce qui est enregistré</strong>, quand l’élève utilise son lien ou son QR-code personnel : son code, le mot joué, le numéro de l’essai, juste ou faux, l’aide demandée, les liaisons son-lettre posées et la date.</li>
            <li><strong>Sans lien personnel</strong> (lien général ou lien rapide), rien n’est envoyé : les essais restent sur l’appareil.</li>
            <li><strong>Sur l’appareil :</strong> une copie des essais est gardée dans le navigateur, jusqu’à ce que le navigateur soit vidé. Elle peut être exportée en fichier (JSON ou CSV).</li>
          </ul>
        </section>

        <section className="plai-section">
          <h2>Pour les enseignants</h2>
          <ul>
            <li>L’e-mail du compte PLAI, le nom de la classe et le rôle dans la classe (responsable ou invité).</li>
            <li>Les résultats d’une classe ne sont lisibles que par les enseignants de cette classe.</li>
          </ul>
        </section>

        <section className="plai-section">
          <h2>Où sont les données</h2>
          <ul>
            <li>Les essais, les classes et les comptes enseignants sont dans une base Supabase partagée par les outils PLAI, située en Europe (Irlande).</li>
            <li>Le site est hébergé par Vercel.</li>
            <li><strong>Aucune IA</strong> ne reçoit de donnée d’élève. La voix est faite de fichiers audio préparés à l’avance : l’application n’envoie rien à Microsoft pendant le jeu.</li>
            <li>Pas de publicité, pas de mesure d’audience, pas de service tiers chargé dans les pages (ni police, ni script externe).</li>
          </ul>
        </section>

        <section className="plai-section">
          <h2>Combien de temps</h2>
          <ul>
            <li>Les essais restent enregistrés tant que l’enseignant ne les supprime pas. Retirer un code, ou supprimer la classe, supprime aussi les essais qui s’y rattachent.</li>
            <li>Une purge annuelle est prévue ; elle n’est pas encore en place.</li>
          </ul>
        </section>

        <section className="plai-section">
          <h2>Vos droits, une question</h2>
          <p>Pour consulter, corriger ou faire effacer des données, s’adresser d’abord à l’enseignant de la classe, qui peut retirer un code. Pour toute question sur les données : <a href="mailto:jeanfrancois.beguin@ens.ecl.be">jeanfrancois.beguin@ens.ecl.be</a>.</p>
        </section>

        <section className="plai-section">
          <h2>Sécurité</h2>
          <ul>
            <li>Chaque élève a une clé personnelle dans son lien : sans elle, personne ne peut enregistrer de résultats sous son code.</li>
            <li>L’envoi de résultats est limité en nombre, pour éviter qu’un élève ne noie les résultats des autres.</li>
          </ul>
        </section>
      </main>
    </Cadre>
  );
}

export function APropos({ base = '/' }) {
  return (
    <Cadre base={base}>
      <main className="plai-container page">
        <h1 className="page-titre">À propos, licences et crédits</h1>
        <section className="plai-section">
          <h2>Qui</h2>
          <p>PhonoActif est un outil du Pôle Liégeois d’Accompagnement vers une École Inclusive (PLAI), conçu par Jean-François Beguin. Il s’inspire du jeu physique Lilémo.</p>
        </section>
        <section className="plai-section">
          <h2>Voix</h2>
          <p>La voix est une <strong>voix de synthèse</strong> (Microsoft Azure, voix Charline, français de Belgique). Les fichiers audio sont préparés à l’avance à partir d’une transcription phonétique.</p>
        </section>
        <section className="plai-section">
          <h2>Images</h2>
          <p>Les images des packs illustrés sont <strong>créées par une IA</strong> (Canva), dans un style papier découpé, puis relues par l’auteur. Les conditions de Canva s’appliquent à leur usage ; l’usage de cet outil est scolaire et non commercial.</p>
        </section>
        <section className="plai-section">
          <h2>Lexique</h2>
          <p>La lecture des mots s’appuie sur le lexique ManuLemme 2.4, converti en sons du Lilémo. La coupure en syllabes est recoupée avec Lexique 4.1.</p>
          <p className="aide">Aucune référence scientifique n’est citée dans cette version.</p>
        </section>
        <section className="plai-section">
          <h2>Licence du code</h2>
          <p>Le code est publié sous licence PolyForm Noncommercial 1.0.0 : usage non commercial. Copyright 2025-2026 Jean-François Beguin.</p>
        </section>
        <section className="plai-section">
          <h2>Un souci, une idée ?</h2>
          <p>Écrire à <a href="mailto:jeanfrancois.beguin@ens.ecl.be">jeanfrancois.beguin@ens.ecl.be</a>.</p>
        </section>
      </main>
    </Cadre>
  );
}
