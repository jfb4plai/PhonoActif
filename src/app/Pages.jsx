import React from 'react';
import Cadre from './Cadre.jsx';

// Les adresses du site sont dans le hash (#/…) : un lien « #etape1 » casserait la navigation. Le sommaire fait défiler la page sans toucher à l'adresse.
// La cible est un bloc repliable : on le déplie avant de faire défiler.
const Aller = ({ vers, children }) => (
  <a href="#/mode-d-emploi" onClick={e => { e.preventDefault(); const cible = document.getElementById(vers); if (!cible) return; if (cible.tagName === 'DETAILS') cible.open = true; if (cible.scrollIntoView) cible.scrollIntoView(); }}>{children}</a>
);

// Bloc repliable (flèche noire native du navigateur). Replié au départ : la page est longue.
const Bloc = ({ id, titre, children }) => (
  <details className="plai-section bloc" id={id}>
    <summary><h2>{titre}</h2></summary>
    {children}
  </details>
);
const basculerTout = ouvrir => document.querySelectorAll('.page details.bloc').forEach(d => { d.open = ouvrir; });

/* Pages d'information : mode d'emploi de l'enseignant, gestion des données, à propos.
   Chaque phrase décrit ce que l'application fait aujourd'hui (version d'essai). Ce qui n'est pas décidé est écrit comme tel. */

export function ModeEmploi({ base = '/' }) {
  const modele = `${String(base).replace(/\/+$/, '')}/modeles/modele-pack-plai.xlsx`;
  return (
    <Cadre base={base} actif="mode_emploi">
      <main className="plai-container page">
        <h1 className="page-titre">Mode d’emploi pour l’enseignant</h1>
        <p className="page-chapo">De la création de la classe à la lecture des résultats, en sept étapes.</p>
        <p>En maternelle (M1 à M3) : <Aller vers="maternelle">première lettre au tableau et feuille à imprimer</Aller>.</p>
        <p className="bloc-outils">
          <button type="button" className="plai-btn" onClick={() => basculerTout(true)}>Tout déplier</button>{' '}
          <button type="button" className="plai-btn" onClick={() => basculerTout(false)}>Tout replier</button>
        </p>
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

        <Bloc id="etape1" titre="1. Se connecter">
          <p>Ouvrir <a href="#/enseignant">l’espace enseignant</a> et saisir l’e-mail et le mot de passe du compte PLAI : c’est le même compte que pour les autres outils PLAI. Mot de passe oublié : saisir l’e-mail puis choisir « Mot de passe oublié ».</p>
          <p>Pas encore de compte ? Écrire à l’adresse de contact en bas de page.</p>
        </Bloc>

        <Bloc id="etape2" titre="2. Créer la classe">
          <p>Dans « Mes classes », saisir le nom de la classe (par exemple « 3P A, école de Fléron »), puis « Créer la classe ». Seuls les enseignants de la classe voient ce nom.</p>
          <p className="important">Ne jamais écrire de nom d’élève, de prénom ou de date de naissance dans l’application.</p>
          <p>Pour partager une classe avec un collègue : dans la classe, « Inviter un enseignant ». Le collègue doit avoir un compte PLAI.</p>
        </Bloc>

        <Bloc id="etape3" titre="3. Créer les codes des élèves">
          <p>Un élève est repéré par un <strong>code</strong>, jamais par son nom : E01, E02, E03… Dans la classe, « Créer les codes automatiquement » (choisir le début du code et le nombre), ou saisir ses propres codes, séparés par une virgule.</p>
          <p>La correspondance entre le code et l’élève reste <strong>sur papier chez vous</strong> : l’application ne la connaît pas.</p>
        </Bloc>

        <Bloc id="etape4" titre="4. Créer une tâche">
          <p>Une tâche = une ou plusieurs listes de mots et des réglages. Dans la classe :</p>
          <ul>
            <li><strong>Mots de la tâche</strong> : cochez une de vos listes ou un modèle prêt. Cochez-en plusieurs pour une révision : les mots en double sont retirés. Pour fabriquer une liste, « Composer une liste » : on cherche dans le catalogue (par morceau de mot, par son, par nombre de syllabes, avec ou sans image), on écoute chaque mot avant de l’ajouter, on choisit l’ordre. Une liste contient de 1 à 50 mots, une tâche au plus 200 mots. Les mots sont copiés dans la tâche à sa création : modifier la liste ensuite ne change pas les tâches déjà données.</li>
            <li><strong>Cartes sans le mot</strong> : l’élève trouve le mot à l’oreille et avec l’image. <strong>Avec le mot</strong> : il recopie le modèle.</li>
            <li><strong>Habillage</strong> : « album » (P1 à P3) ou « sobre » (P4 et au-delà). Les mots restent en Arial.</li>
            <li><strong>Nombre de cubes en trop</strong> : 0 est le plus facile.</li>
            <li><strong>Exiger les accents</strong> : si la case est vide, « e » est accepté à la place de « é ».</li>
            <li><strong>Écoute par syllabes</strong> : ce réglage <em>ne lit rien tout seul</em>, il rend disponible le bouton « Écouter par syllabes ». « Pour tous les mots » : le bouton est là dès le départ. « Seulement quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? », donc seulement pour les mots qui posent problème. « Jamais » : pas de bouton.</li>
            <li><strong>Vitesse de la voix</strong> : normale (100 %), lente (75 %) ou très lente (50 %), pour les mots et les sons lus. C’est la vitesse de départ. Case « Verrouiller » vide : l’élève voit trois boutons et peut changer. Case cochée : pas de boutons, tout le monde entend la vitesse choisie. L’écoute par syllabes garde ses réglages propres.</li>
          </ul>
          <p className="important">Les images ont été conçues pour centrer l’attention sur le mot et enlever tout autre distracteur.</p>
          <p>Puis « Créer la tâche et les liens des élèves » : la tâche est créée et le lien et le QR-code de <strong>chaque élève</strong> s’affichent aussitôt en dessous.</p>
          <p>Pour fabriquer vos propres cartes (vos mots, vos images) : <a href={modele} download>télécharger le modèle Excel</a>, le remplir, puis l’envoyer avec vos images à l’adresse de contact. Dans cette première version, les cartes sont fabriquées et publiées par l’auteur de l’outil, et seulement après sa validation des mots, des images et des sons : l’application ne choisit jamais les mots à votre place.</p>
        </Bloc>

        <Bloc id="etape5" titre="5. Donner à chaque élève son lien ou son QR-code">
          <p>Les liens des élèves s’affichent juste après la création de la tâche ; plus tard, dans la liste « Tâches de la classe », le bouton <strong>« Liens et QR-codes personnels »</strong> les rouvre. Chaque élève a son propre lien et son propre QR-code, qui contiennent son code et une clé secrète. Imprimer (« Imprimer »), découper, remettre à chaque élève uniquement le sien.</p>
          <p><strong>Pourquoi un lien par élève ?</strong> Sans la clé, un élève qui connaît le code d’un camarade ne peut pas enregistrer de résultats à sa place. Le lien général de la tâche (replié sous les liens des élèves) ouvre bien le jeu, mais les résultats ne sont <strong>pas</strong> enregistrés : l’élève en est averti à l’écran.</p>
          <p>Un lien perdu, ou donné à quelqu’un d’autre : « Nouvelle clé pour E07 ». L’ancien lien ne fonctionne plus. « Révoquer ce lien » arrête toute une tâche.</p>
        </Bloc>

        <Bloc id="etape6" titre="6. Ce que fait l’élève">
          <ol>
            <li>Il scanne son QR-code ou ouvre son lien : son code est déjà rempli.</li>
            <li>« Commencer ». Il entend le mot avec « Écouter » (et « Écouter une phrase » quand le mot en a une), peut appuyer sur « Voir l’image » si le mot en a une, et pose les lettres une à une. À chaque lettre, la voix lit ce qui est posé.</li>
            <li>« Vérifier ». Après trois essais, le mot est montré. Il n’y a pas de score affiché à l’élève.</li>
            <li>Au bilan, « Envoyer mes résultats ». Ils sont aussi renvoyés automatiquement à l’ouverture suivante ou au retour de la connexion : sans réseau, ils restent sur l’appareil et partent plus tard.</li>
          </ol>
          <p><strong>Écoute par syllabes.</strong> Le bouton « Écouter par syllabes » (à côté de « Écouter ») lit les syllabes phonétiques l’une après l’autre, avec une pause de 500 ms et la dernière syllabe plus lente (75 %). Pendant la lecture, la syllabe dite est entourée dans la zone de construction, un trait marque la coupure et les lettres muettes sont grisées. La règle de coupure s’affiche sous la zone. À la fin de la lecture, les césures et la règle restent affichées jusqu’au bouton « Masquer les césures ».</p>
          <p><strong>Phrase d’aide.</strong> Pour les mots qui ne se dessinent pas (dans, avec, mais…), un mot peut avoir le bouton « Écouter une phrase » : la voix dit une courte phrase qui contient le mot. Le texte de la phrase n’est jamais affiché, parce qu’il contient le mot à écrire. Ces phrases sont écrites par l’enseignant, jamais par l’application.</p>
          <p>Il n’y a pas de bouton pour un mot d’une seule syllabe, ni pour un mot dont les syllabes ne sont pas encore préparées (c’est le cas d’une partie des mots du modèle « 101 mots de P1 »), ni si le réglage est sur « Jamais ». Les syllabes sont coupées sur les <em>sons</em> du mot, pas sur les lettres : « maison » se coupe « mè-zon ».</p>
        </Bloc>

        <Bloc id="etape7" titre="7. Lire les résultats">
          <p>Dans la classe, le tableau « Résultats » donne, par code : le nombre d’essais, la date de la dernière séance et les trois liaisons son-lettre à retravailler (celles qui échouent le plus au premier coup).</p>
          <p>Les essais d’un élève arrivent dans ce tableau après son « Envoyer mes résultats » au bilan de fin de liste, ou quand il rouvre son lien : juste après une carte jouée, le tableau peut encore afficher 0 essai. Rouvrir la classe pour actualiser.</p>
          <p>Ce tableau ne décide rien : c’est une aide à votre observation, pas un diagnostic.</p>
        </Bloc>

        <Bloc id="maternelle" titre="Maternelle (M1 à M3) : première lettre, au tableau et sur feuille">
          <p>Le <strong>niveau se choisit en premier</strong> (grandes cases « Maternelle » et « Primaire »), à l’accueil, dans le lien rapide et à la création d’une tâche : l’application ne propose ensuite que les listes et les options qui conviennent. En maternelle, il n’y a pas de mot à construire. L’exercice est « première lettre ».</p>
          <ul>
            <li><strong>Ce que voit l’enfant</strong> : l’image d’un mot qui commence par une voyelle et trois grandes majuscules. Il entend le mot dès l’arrivée de l’image. Il touche la première lettre. Une mauvaise lettre se grise et dit son propre son. Après deux erreurs, il ne reste que la bonne lettre : la réponse n’est jamais donnée, l’enfant la choisit lui-même. Le mot n’est jamais écrit.</li>
            <li><strong>Quand c’est juste</strong> : « Bravo » dit à voix haute (cinq variantes, jamais la même deux fois de suite), puis le son de la lettre, puis le mot. À l’écran : grand « Bravo ! », étoiles, confettis. Pour couper la voix du Bravo, ajouter <code>&amp;consignes=non</code> à la fin du lien.</li>
            <li><strong>Mode classe (tableau interactif)</strong> : choisi par défaut en maternelle, parce que la plupart des classes n’ont pas de tablettes individuelles. Aucun code d’élève : l’enseignant ouvre le lien, un enfant vient répondre au tableau, rien n’est envoyé sur Internet.</li>
            <li><strong>Feuille à imprimer</strong> : pour que tous les enfants soient actifs, pas seulement celui qui est au tableau. Dans le <a href="#/lien">lien rapide</a>, en maternelle, choisir la liste, le nombre de mots (de 4 à 20, 8 par défaut), puis « Imprimer la feuille ». Chaque mot : l’image et trois lettres à entourer, avec les lignes Prénom et Date à remplir à la main. « Voir le corrigé » montre la bonne lettre cerclée et le mot écrit.</li>
            <li><strong>Même série au tableau et sur la feuille</strong> : le lien contient une série (mêmes mots, même ordre, mêmes trois lettres). Les enfants entourent sur leur feuille pendant que l’un répond au tableau, puis on corrige ensemble. « Nouvelle série » change les mots et leur ordre : relire alors les deux liens.</li>
          <li><strong>Dans l’espace enseignant</strong> (étape 4, niveau Maternelle) : à l’étape 2, cocher « Au tableau (TBI) », « Sur une feuille à imprimer » et/ou « Sur tablette, un lien par élève », puis choisir le nombre de mots. Tableau et feuille sont cochés au départ ; aucun code d’élève n’est alors nécessaire. La tâche garde sa série : dans la liste des tâches, les boutons « Ouvrir au tableau (TBI) », « Imprimer la feuille », « Voir le corrigé » et « Nouvelle série » la retrouvent à tout moment. Après « Nouvelle série », les anciens liens montrent l’ancienne série : imprimer de nouveau la feuille.</li>
          </ul>
          <p className="important">La feuille est prévue pour 8 mots par page A4 (calcul de mise en page, pas encore mesuré à l’impression) : avec plus de mots, elle passe sur plusieurs pages. Regarder l’aperçu avant d’imprimer.</p>
          <p>Cet exercice n’a pas encore été essayé avec des enfants. Les mots viennent d’une liste prête ; pour une liste adaptée à votre classe, voir l’étape 4.</p>
        </Bloc>

        <Bloc id="sans-compte" titre="Sans compte : le lien rapide">
          <p>Pour un essai sans compte, <a href="#/lien">créer un lien rapide</a> : choisir une liste et des réglages, copier le lien ou le QR-code. Dans ce cas rien n’est envoyé : les essais restent sur l’appareil de l’élève et s’exportent en fichier (JSON ou CSV).</p>
        </Bloc>

        <Bloc id="vos-20" titre="Ce que l’outil ne fait pas, et ce que vous y mettez">
          <ul>
            <li><strong>Avant de proposer une liste, écoutez-en quelques mots.</strong> La voix lit une transcription préparée à l’avance : une erreur de lecture serait entendue par l’élève.</li>
            <li><strong>Choisissez les mots et les images</strong> qui correspondent à votre classe : une même liste ne convient pas à tous les élèves.</li>
            <li><strong>Regardez l’élève jouer</strong> au moins une fois : l’application voit des essais justes ou faux, pas ce qui les explique.</li>
            <li>L’outil n’a pas encore été essayé avec des élèves ni relu par une spécialiste ou un spécialiste de phonologie.</li>
          </ul>
        </Bloc>
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
    <Cadre base={base} actif="apropos">
      <main className="plai-container page">
        <h1 className="page-titre">À propos, licences et crédits</h1>
        <section className="plai-section">
          <h2>Qui</h2>
          <p>PhonoActif est un outil du Pôle Liégeois d’Accompagnement vers une École Inclusive (PLAI), conçu par Jean-François Beguin.</p>
          <p>Pour une version physique, le jeu Lilémo est recommandé, quoique légèrement différent de PhonoActif.</p>
        </section>
        <section className="plai-section">
          <h2>Remerciements</h2>
          <p>Un chaleureux merci à <strong>Virginie</strong> et à <strong>Benoît</strong>, sans lesquels PhonoActif n’existerait tout simplement pas. Le temps qu’ils y ont consacré et leurs remarques pertinentes ont largement contribué à la création de cet outil.</p>
        </section>
        <section className="plai-section">
          <h2>Voix</h2>
          <p>La voix est une <strong>voix de synthèse</strong> (Microsoft Azure, voix Charline, français de Belgique). Les fichiers audio sont préparés à l’avance à partir d’une transcription phonétique.</p>
        </section>
        <section className="plai-section">
          <h2>Images</h2>
          <p>Les images des mots illustrés sont <strong>créées par une IA</strong> (Canva), dans un style papier découpé, puis relues par l’auteur. Les conditions de Canva s’appliquent à leur usage ; l’usage de cet outil est scolaire et non commercial.</p>
        </section>
        <section className="plai-section">
          <h2>Lexique</h2>
          <p>La lecture des mots s’appuie sur le lexique ManuLemme 2.4, converti en sons. La coupure en syllabes est recoupée avec Lexique 4.1.</p>
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
