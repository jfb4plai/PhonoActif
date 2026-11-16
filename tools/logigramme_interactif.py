# -*- coding: utf-8 -*-
"""Génère docs/logigramme-interactif-phonoactif.html : le logigramme de tools/logigramme_phonoactif.py, rendu cliquable.
Un clic (ou Entrée) sur une case ouvre un panneau « état de la situation » : code, contenus, validation, ce qui existe, ce qui manque,
ce qui est à créer à la demande, blocages, prochaine action, décision attendue, ressources et provenance.
Les chiffres de fichiers et de Git sont relevés à la génération. Les faits non relevés sont datés du 2026-11-13 (session de travail).
Usage : python -I tools/logigramme_interactif.py"""
import datetime
import html
import importlib.util
import json
import pathlib
import subprocess

RACINE = pathlib.Path(__file__).resolve().parent.parent
_s = importlib.util.spec_from_file_location("logi", RACINE / "tools" / "logigramme_phonoactif.py")
L = importlib.util.module_from_spec(_s)
_s.loader.exec_module(L)
SORTIE = RACINE / "docs" / "logigramme-interactif-phonoactif.html"


def nb(motif):
    return len(list(RACINE.glob(motif)))


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=RACINE, capture_output=True, text=True, encoding="utf-8", timeout=30).stdout.strip()
    except Exception:
        return ""


def chiffres():
    etat = git("status", "--porcelain").splitlines()
    return {
        "audio_pack": nb("public/packs/p1-100/audio/*.mp3"),
        "brut": nb("essai-tts-ipa/sortie/bibliotheque/brut/*.mp3"),
        "norm": nb("essai-tts-ipa/sortie/bibliotheque/norm/*.mp3"),
        "ll": nb("essai-tts-ipa/sortie/comparaison/ll/*.wav"),
        "modifies": sum(1 for l in etat if not l.startswith("??")),
        "non_suivis": sum(1 for l in etat if l.startswith("??")),
        "dernier_commit": git("log", "-1", "--format=%cd", "--date=short") or "inconnu",
        "dernier_hash": git("log", "-1", "--format=%h") or "inconnu",
        "non_pousses": git("rev-list", "--count", "origin/main..HEAD") or "?",
        "date": datetime.date.today().isoformat(),
    }


def details(c):
    """id -> champs. code : code | partiel | pas_code | sans_objet ; contenu : cree | partiel | pas_cree | demande | sans_objet."""
    D = {}

    def d(i, titre, code, contenu, existe, manque=(), demande=(), blocages=(), suite=(), decision=(), valid=(), fichiers=(), tableau=None):
        D[i] = dict(titre=titre, code=code, contenu=contenu, existe=list(existe), manque=list(manque), demande=list(demande), blocages=list(blocages),
                    suite=list(suite), decision=list(decision), valid=list(valid), fichiers=list(fichiers), tableau=tableau)

    d("N1", "Besoin de l'enseignant", "sans_objet", "cree",
      ["Document de conception du 2026-11-11 (section 1) : voir vite quelles correspondances graphème-son sont déficitaires, lesquelles reviennent chez un élève, et pouvoir transmettre ces observations à un intervenant extérieur.",
       "Principes PLAI : inclusion, IA amplificateur, RISS, contexte FWB."],
      ["Aucun essai avec des élèves ni avec d'autres enseignants.", "Usage réel du jeu physique Lilémø en classe : question ouverte du document de conception."],
      suite=["Choisir 3 à 5 élèves et un enseignant pour un premier essai."], decision=["Quel enseignant et quels élèves pour le premier essai ?"],
      valid=["Formulé par JF ; non confronté au terrain."], fichiers=["docs/superpowers/specs/2026-11-11-lilemo-numerique-design.md"], tableau="1")
    d("N2", "Choisir les mots", "partiel", "cree",
      ["Liste du référentiel (VOB par année, P1 à P6) : source validée par JF (elle fait partie du référentiel).", "Liste P1 de JF (941 mots, dans l'ordre de fréquence).",
       "Outils en ligne de commande : analyser_liste.js, preparer_pack.js, construire_liste.js, importer."],
      ["Aucun écran où l'enseignant choisit ou dépose sa liste dans l'application.", "Le modèle xlsx de l'enseignant n'existe pas encore (étape 2b).", "La sélection finale des mots reste à JF ou à l'enseignant (filtre déterministe, sans IA)."],
      demande=["Nouvelle liste : fichier avec source et licence, puis import."], suite=["Créer le modèle xlsx (étape 2b)."],
      decision=["Qui déclenche la fabrication du pack à partir du modèle rempli : l'enseignant dans l'application, ou JF ou un admin ?"],
      valid=["Tests unitaires des listes ; droits de VOB déclarés par JF (fait partie du référentiel), non vérifiés par Claude."],
      fichiers=["tools/analyser_liste.js", "tools/preparer_pack.js", "data/p1-mots.json", "data/listes/ (non commité)"], tableau="2")
    d("N2b", "Modèle xlsx pour l'enseignant", "code", "cree",
      ["Décision de JF du 2026-11-13 : l'enseignant peut fabriquer ses packs, surtout pour les images ; option (a) : JF ou un admin fabrique le pack à partir du tableau reçu.",
       "Modèle Excel créé (public/modeles/modele-pack-plai.xlsx) : feuilles Mode d'emploi, Pack, Mots ; exemple, aide sous chaque champ, listes de choix.",
       "Lecteur du tableau rempli (vérifie mots, niveaux, images, source et licence) ; constructeur du pack (états lettre par lettre, manifeste) ; génération audio par pack ; mode d'emploi administrateur (docs/fabriquer-un-pack.md).",
       "Pack « pour mon usage » : visible seulement dans l'espace enseignant du propriétaire ; l'adresse n'est publiée que sous forme d'empreinte.",
       "Tests : 11 (lecteur xlsx), 9 (construction du pack, empreinte, visibilité), 3 (espace enseignant et image en sous-dossier).",
       "Premier usage réel (2026-11-13) : le modèle rempli par Claude avec 20 mots, leurs images, source et licence (docs/pack-20-mots-images.xlsx) a produit le pack p1-20-images : 20 cartes, 96 états, 69 fichiers audio, 20 images ; contrôlé dans le jeu réel (image affichée, lettres, fichiers audio demandés en HTTP 200, « Bravo ! » sur chat)."],
      ["Jamais essayé par un enseignant réel ; le modèle n'a pas été ouvert dans Excel (structure contrôlée avec openpyxl).", "La licence des images est un texte d'attente (« Canva : conditions d'usage à vérifier ») : la question des droits n'est pas levée.", "Aucun dépôt dans l'application : le chemin est l'envoi à JF ou à un admin.",
       "Un mot absent du lexique (pluriel, conjugaison, nom propre) est écarté ; il reste à JF de le traiter.", "L'audio du pack n'est généré que par JF (clé Azure).",
       "« Pour mon usage » n'est pas un coffre-fort : le dossier reste lisible par qui connaît l'adresse exacte du pack."],
      demande=["Chaque pack d'enseignant : lecture, construction, génération audio et publication par JF ou un admin, à la réception du tableau."],
      blocages=["Chemin d'envoi à confirmer avec les enseignants (courriel à JF, d'après la notice du modèle)."],
      suite=["Faire essayer le modèle à un enseignant ; décider d'un dépôt dans l'application plus tard (option b)."],
      decision=["Un enseignant volontaire pour le premier essai ?"], valid=["Testé automatiquement ; essai de bout en bout par script le 2026-11-13."],
      fichiers=["public/modeles/modele-pack-plai.xlsx", "tools/modele_pack_xlsx.py", "src/core/packAtelier.js", "tools/construire_pack_atelier.js", "docs/fabriquer-un-pack.md"], tableau="2b")
    d("N3", "Segmenter les mots, sans IA", "code", "cree",
      ["Règles contextuelles de lecture, états lettre par lettre, table IPA, syllabation (src/core).",
       "347 tests du moteur : 346 réussis, 1 ignoré (relancés le 2026-11-13).",
       "Accord avec ManuLemme : 96,3 % sur P1 (881 mots, qui ont servi à écrire les règles) ; 93,3 % sur 6 575 mots jamais regardés.",
       "Lexique ManuLemme : 16 004 entrées (non commité)."],
      ["Aucune mesure de justesse pour les pseudo-mots, qui forment l'essentiel des états intermédiaires.", "Environ 45 % des erreurs ne sont pas signalées par l'application.", "Pas de pluriel ni de conjugaison (ManuLemme contient des lemmes)."],
      blocages=[f"Moteur commité en local ({c['dernier_hash']}), pas poussé : {c['non_pousses']} commit(s) d'avance sur origin/main."],
      suite=["Pousser après décision sur l'audio.", "Mesurer la lecture des pseudo-mots avec des juges."], valid=["Testé automatiquement ; comparé à ManuLemme, pas à l'oreille."],
      fichiers=["src/core/regles.js", "src/core/etats.js", "src/core/ipa.js", "src/core/syllabes.js", "tools/mesurer_regles.js"], tableau="3")
    d("D1", "Décision : tous les sons sont-ils connus ?", "code", "sans_objet",
      ["Un cube dont le code ManuLemme est inconnu a un son nul et passe en revue (aVerifier)."],
      ["Quatre mots de P1 (ville, nuit, soleil, crayon) restent hors pack pour cette raison ; leur IPA a dû être écrit à la main pour un essai."],
      suite=["Étendre le moteur aux codes « il », « 8 », « Ej »."], valid=["Testé automatiquement."], fichiers=["src/core/lexique.js", "src/core/revue.js"], tableau="3")
    d("N4", "Revue des mots à codes inconnus", "code", "demande",
      ["Page de revue autonome (revue.html), import des corrections, dictionnaire corrections.json avec statuts (a_valider, valide, corrige).",
       "File de revue : 823 mots à code inconnu (note du 2026-11-11, non recalculée ce jour)."],
      ["Recette de JF : 0 case cochée sur 10 (docs/recette-revue.md).", "Sauvegarde automatique et téléchargement dans Chrome non vérifiés."],
      demande=["Chaque correction est créée par JF, mot par mot, au fil des écoutes."], suite=["Faire la recette ; trancher le code « 8 » seul."],
      valid=["Testé automatiquement (revue, corrections) ; recette réelle non faite."], fichiers=["revue/revue.html", "tools/construire_revue.js", "data/corrections.json"], tableau="4")
    d("N5", "Fabriquer l'audio du pack", "code", "partiel",
      [f"Pack p1-100 : 100 mots, 430 états, {c['audio_pack']} fichiers audio copiés dans le pack.",
       "Syllabes des 100 mots : 112 fichiers ; 5 mots de 3 syllabes : 20 fichiers.",
       f"Bibliothèque de travail : {c['brut']} fichiers générés, {c['norm']} normalisés (états, syllabes et essais confondus).",
       "Scripts : mode_a_mots.js, generer-bibliotheque.py (etats, syllabes-mots, mots-3, pack), normaliser_audio.py.",
       "Le pack p1-20-images réutilise 69 fichiers déjà générés pour p1-100 : aucun nouvel appel Azure."],
      ["Bibliothèque complète de 2 780 fichiers : non générée.", "Aucune écoute rapportée des 220 états du pack ni des fichiers de syllabes ajoutés le 2026-11-13.", "L'audio du pack n'est pas dans le commit (non suivi par Git)."],
      demande=["Tout nouveau mot : états, syllabes et mot entier à générer avec la clé Azure, lancée par JF."],
      blocages=["La clé Azure n'est lisible que par JF.", "Conditions Microsoft pour la redistribution de l'audio : non vérifiées.", "Quota gratuit Azure : non vérifié."],
      suite=["Écouter un échantillon des 220 états du pack."], decision=["Faut-il générer toute la bibliothèque (2 780 fichiers) ou rester au pack par pack ?"],
      valid=["Voix écoutée par JF sur échantillons (37 sons, 20 syllabes, 20 pseudo-mots, 16 états) ; les fichiers récents ne sont pas écoutés."],
      fichiers=["tools/mode_a_mots.js", "essai-tts-ipa/generer-bibliotheque.py", "public/packs/p1-100/audio/"], tableau="5")
    d("N6", "Images en papier découpé", "sans_objet", "partiel",
      ["Script de style papier découpé (essai-images-canva/script-generation-images.md).", "3 essais anciens (chat, maison, poisson), 200 px.", "20 prompts prêts (docs/images-canva-20-mots.csv).",
       "Connecteur Canva rétabli le 2026-11-13 : 20 images générées en style papier découpé (pomme validée par JF, 19 autres reçues le même jour), aperçus de 200 px rangés dans docs/images-canva/ avec une planche de validation (planche.html).",
       "Corrections de JF du 2026-11-13 appliquées : ours (deux yeux), rat (allongé, moins sympathique), lune (jaune seul), eau (bleus), loup (sans orange), neige (plusieurs flocons blancs) ; 6 images refaites (v2), anciennes versions dans docs/images-canva/v1.",
       "Le script d'images est devenu du code (tools/prompts_images_canva.py) avec exceptions par mot et vérifications obligatoires après génération (yeux, palette, sujet, lisibilité).",
       "Fond bleu ciel pastel #cde7f7 décidé par JF pour toutes les images (plus universel que le crème) : script mis à jour (v2.1) ; les 20 images sont éditées en fond bleu dans Canva (dossier docs/images-canva/fond-bleu/, planche docs/images-canva/planche-fond-bleu.html), sujet inchangé sur chacune ; les versions sur fond crème sont conservées.",
       "Remarques de Claude sur la v2 : rat peut se lire fourmilier ou musaraigne ; loup proche d'un grand chien. La neige, trop pâle sur crème, devient lisible sur le fond bleu."],
      ["Les 20 images (aperçus de 200 px, fond bleu) sont reliées au pack p1-20-images ; le pack p1-100 n'a toujours aucune image.", "JF a validé le style, demandé 6 corrections (faites) et le fond bleu ; les 20 images ne sont pas encore validées une à une.", "Environ 60 mots sur 100 ne se dessinent pas (mots-outils) : estimation à vue, non comptée."],
      demande=["Chaque image est créée à la demande, par l'enseignant ou par JF, puis vérifiée pour le style commun."],
      blocages=["La page web de Canva ne respecte pas le style (motifs en spirale) : passer par le connecteur.", "Limite de crédit Canva (quota_cooldown) : l'édition du fond a été refusée par moments, même avec le compte Pro de JF (une édition acceptée toutes les 5 à 10 minutes) : le lot de 20 a pris environ deux heures.", "Vérifications du script (yeux, palette) faites à l'œil sur des aperçus de 200 px, pas automatiquement ; pleine résolution jugée non nécessaire par JF (2026-11-13) : le pack utilise les aperçus de 200 px ; fond exact non vérifié ; conditions d'usage non vérifiées."],
      suite=["Valider les 20 images en fond bleu sur la planche (OK, à refaire, à remplacer ; le pack les utilise déjà) ; refaire les images refusées."], decision=["Valeurs des bleus de l'eau (choisies par Claude) ?", "Teinte exacte du fond (#cde7f7, choisie par Claude) ?", "Image centralisée (JF) ou faite par l'enseignant avec le script de style commun ?", "Quels mots abstraits portent une phrase d'aide plutôt qu'une image ?"],
      valid=["Aucune."], fichiers=["essai-images-canva/script-generation-images.md", "docs/images-canva-20-mots.csv"], tableau="6")
    d("N7", "Phrases d'aide (option)", "code", "pas_cree",
      ["Script essai-phrases.py : 10 phrases proposées, 4 versions par mot, page d'écoute prête (ecoute-phrases.html)."],
      ["Audio non généré, rien écouté.", "Phrases à réécrire par JF.", "Effet pédagogique non établi ; aucune recherche RISS faite."],
      demande=["40 appels Azure, lancés par JF (essai-phrases.py azure)."], blocages=["Attente de la génération par JF."],
      suite=["Générer, écouter, décider."], decision=["Phrase pour tous les mots, pour les mots sans image, ou abandon ?"],
      valid=["Non testé."], fichiers=["essai-tts-ipa/essai-phrases.py", "essai-tts-ipa/ecoute-phrases.html"], tableau="7")
    d("N6b", "Centraliser et vérifier la cohérence graphique", "pas_code", "pas_cree",
      ["Principe suggéré par JF le 2026-11-13 : centraliser ce qui peut être mis à disposition de tous les enseignants ; JF et un autre admin veillent à la cohérence graphique, pour un seul coût pour tous les enseignants.",
       "Un style commun existe déjà : le script papier découpé (essai-images-canva)."],
      ["Aucun rôle d'administrateur dans la base : les droits actuels sont par classe (maître ou invité).", "Aucune bibliothèque commune, aucun circuit de validation.", "L'autre admin n'est pas désigné."],
      demande=["Chaque pack déposé par un enseignant est relu avant publication."], blocages=["Comptes centraux (Azure, Canva) : propriétaire et budget à confirmer."],
      suite=["Définir le rôle admin, la liste de contrôle graphique et la bibliothèque commune."],
      decision=["Qui est l'autre admin ? Quel budget Azure et Canva ? Un pack d'enseignant est-il privé ou partagé par défaut ?"], valid=["Aucune."], fichiers=["(à créer)"], tableau="6b")
    d("N8", "Publier dans la bibliothèque commune", "partiel", "partiel",
      ["Dépôt GitHub jfb4plai/PhonoActif ; projet Vercel phonoactif ; le site répond (HTTP 200, 2026-11-13).", "Licence PolyForm Noncommercial 1.0.0.",
       f"Dernier commit : {c['dernier_hash']} du {c['dernier_commit']}, local ; {c['non_pousses']} commit(s) non poussé(s) ; {c['modifies']} fichiers modifiés et {c['non_suivis']} non suivis (relevé du {c['date']}).",
       "Le commit contient le mode A, le moteur, le manifeste du pack p1-100, le modèle xlsx et les outils."],
      ["Rien n'est poussé : le mode A, le pack et le modèle ne sont donc pas en ligne.", "L'audio du pack (220 fichiers) n'est pas commité : poussé tel quel, le pack serait en ligne sans son.", "Le pack p1-20-images (20 mots avec images, 69 fichiers audio, 1,5 Mo) n'est pas commité non plus.", "Version en ligne non comparée au code local.", "La bibliothèque commune est une décision de principe (2026-11-13) : rien n'est construit pour recevoir les packs des enseignants."],
      demande=["Un déploiement à chaque push sur main."], blocages=["Conditions Microsoft sur la redistribution de l'audio : non vérifiées.", "Build réussi le 2026-11-13 avant le commit ; à refaire juste avant le push."],
      suite=["Vérifier les conditions Microsoft sur l'audio généré ; commiter l'audio si c'est permis ; build ; push."], decision=["Autoriser le push ; décider si l'audio Azure peut figurer dans le dépôt."],
      valid=["Site répond ; contenu en ligne non vérifié."], fichiers=[".gitignore", "vite.config.js", "LICENSE"], tableau="8")
    d("N9", "Créer la classe, les codes, la tâche", "code", "demande",
      ["Espace enseignant : connexion, classes, codes, tâches, lien et QR, résultats, invitation.", "5 tables phono_*, droits par ligne, 3 migrations.", "32 tests SQL réussis (PostgreSQL simulé) ; 12 tests d'interface enseignant réussis."],
      ["Migrations non vérifiées sur la base réelle ce jour.", "Défauts relevés par lecture du SQL (audit) : test d'existence d'e-mail à l'invitation, colonne created_by modifiable, jeton sans expiration."],
      demande=["Classes, codes et tâches sont créés par l'enseignant, à l'usage."], blocages=["Registre RGPD : responsable, base légale, durées non tranchés."],
      suite=["Corriger les défauts relevés par l'audit ; tester sur la base réelle."], decision=["Responsable du traitement et base légale."],
      valid=["Testé automatiquement sur base simulée ; jamais sur la base réelle."], fichiers=["supabase/migrations/", "src/enseignant/", "docs/registre-traitement-phonoactif.md"], tableau="9")
    d("N10", "Donner lien et codes aux élèves", "sans_objet", "demande",
      ["Lien et QR générés par l'application ; codes anonymes choisis par l'enseignant ; correspondance code-élève sur papier."],
      ["Recette sur tablette non faite (0 case cochée sur 3)."], demande=["Liens, QR et codes : créés par l'enseignant pour chaque classe."],
      suite=["Faire la recette sur une tablette."], valid=["Non testé en situation réelle."], fichiers=["docs/recette-eleve.md"], tableau="10")
    d("N11", "L'élève ouvre le lien et saisit son code", "code", "sans_objet",
      ["Écran d'accueil, validation du code (1 à 12 caractères, sans nom), chargement du pack et de la tâche."], ["Recette sur tablette non faite."],
      valid=["64 tests d'interface réussis (Vitest, jsdom)."], fichiers=["src/app/Accueil.jsx", "src/app/App.jsx", "src/app/code.js"], tableau="11 à 14")
    d("N12", "Voit l'image ou le mot, peut écouter le mot", "code", "partiel",
      ["Affichage de l'image ou du mot selon le réglage ; bouton Écouter (lit le mot entier)."],
      ["Aucune image dans le pack p1-100 : en mode « sans mot », consigne écrite ; en mode « avec mot », le mot est affiché."],
      valid=["Testé automatiquement ; son non écouté."], fichiers=["src/app/Jeu.jsx"], tableau="11 à 14")
    d("N13", "Pose une lettre", "code", "cree",
      ["Mode A branché : lettres posées une à une, lettres en trop proposées (dont « ch » et « ou »), retrait, tout effacer."],
      ["Mode A non défini comme mode par défaut : il se déclenche par le type du pack."],
      valid=["6 tests dédiés (tests/app/mode-a.test.jsx) ; recette tablette non faite."], fichiers=["src/jeu/modeA.js", "src/app/Jeu.jsx", "tests/app/mode-a.test.jsx"], tableau="11 à 14")
    d("D2", "Décision : lettres posées = début du mot ?", "code", "sans_objet",
      ["Si oui, le fichier pré-généré de cette chaîne est lu ; sinon, aucun fichier (lecture en direct non construite)."], ["Chaîne hors du mot : pas de son, message « Pas de son pour le moment »."],
      valid=["Testé automatiquement."], fichiers=["src/jeu/modeA.js"], tableau="11 à 14")
    d("N14", "Entend la chaîne posée", "code", "cree",
      [f"{c['audio_pack']} fichiers d'états pour les 100 mots du pack."], ["Seulement les chaînes qui sont le début d'un mot du pack.", "Aucune écoute rapportée de ces fichiers."],
      valid=["Lecture testée avec des faux fichiers ; son réel non écouté."], fichiers=["public/packs/p1-100/manifest.json", "public/packs/p1-100/audio/"], tableau="11 à 14")
    d("N15", "Lecture en direct", "pas_code", "pas_cree",
      ["Décision de JF du 2026-11-12 : une lettre fausse posée est lue en direct (exception assumée à « jamais en direct »)."],
      ["Aucun dossier api/, aucune fonction serveur, aucune clé côté serveur, aucune limite de débit."],
      demande=["Chaque lecture de chaîne inconnue appelle Azure et est facturée."], blocages=["Connexion Internet nécessaire.", "Plafond de coût et contrôle d'accès à concevoir."],
      suite=["Écrire le cahier des charges (accès, débit, coût)."], decision=["Plafond de coût mensuel acceptable ?"], valid=["Aucune."], fichiers=["(à créer) api/lire.js"], tableau="15")
    d("D3", "Décision : toutes les lettres posées ?", "code", "sans_objet", ["Tant que non, l'élève continue à poser ; sinon, Vérifier."], valid=["Testé automatiquement."], fichiers=["src/jeu/session.js"], tableau="16 à 18")
    d("N16", "Vérifier", "code", "sans_objet", ["Le mot est juste si les lettres sont dans l'ordre (accents selon la tâche) ; le suivi par graphème-son est calculé à partir des lettres."],
      valid=["Testé automatiquement (mot juste, mot faux)."], fichiers=["src/jeu/session.js", "src/jeu/modeA.js"], tableau="16 à 18")
    d("D4", "Décision : mot juste ?", "code", "sans_objet", ["Oui : bravo ; non : essai suivant, jusqu'à 3."], valid=["Testé automatiquement."], fichiers=["src/jeu/session.js"], tableau="16 à 18")
    d("N17", "Bravo, carte suivante, bilan", "code", "sans_objet", ["Message d'encouragement sans score ; bilan de fin de pack avec export JSON et CSV."], valid=["Testé automatiquement."], fichiers=["src/app/Bilan.jsx"], tableau="16 à 18")
    d("N18", "Essai suivant, révélation au 3e échec", "code", "sans_objet", ["Zone vidée, 3 essais au plus ; au 3e échec le mot est révélé et la carte n'est pas acquise."], valid=["Testé automatiquement."], fichiers=["src/jeu/session.js"], tableau="16 à 18")
    d("N19", "Mode libre sans mot cible", "pas_code", "pas_cree",
      ["Décidé par JF le 2026-11-12 : entendre la lecture d'une combinaison de lettres quelconque, comme le Lilémø physique."],
      ["Aucun code.", "Question ouverte : un mot connu en mode libre est-il lu par les règles ou par le lexique ?"], demande=["Chaînes hors pack : lecture en direct (voir l'étape 15)."],
      blocages=["Dépend de la lecture en direct."], suite=["Écrire la spécification après l'étape 15."], decision=["Règles ou lexique pour un mot connu ?"], valid=["Aucune."], tableau="19")
    d("N20", "Écouter par syllabes (500 ms, dernière syllabe à 75 %)", "code", "partiel",
      ["Bouton « Écouter par syllabes » construit dans le jeu (mode A) : les syllabes du mot sont lues l'une après l'autre, espace de 500 ms, dernière syllabe à 75 % de la vitesse avec la hauteur conservée (valeurs choisies à l'oreille par JF).",
       "Proposé seulement pour un mot de deux syllabes ou plus : 9 mots sur 20 dans le pack p1-20-images (maison, voiture, poisson, vélo, tortue, forêt, souris, table, livre).",
       "Le manifeste du pack porte les syllabes de chaque mot ; 78 fichiers audio dans le pack (états et syllabes).",
       "Contrôlé dans le jeu réel : carte « chat » sans bouton, carte « maison » avec bouton ; premier fichier à vitesse normale, pause mesurée d'environ 0,5 s, second fichier à 0,75 avec hauteur conservée.",
       "Tests : 5 (lecture en série), 1 (syllabes du pack), 3 (bouton dans le jeu).",
       "Césures pendant l'écoute (2026-11-14) : la syllabe lue est entourée et soulevée, un trait marque la coupure, la lettre muette est grisée ; rien de tout cela hors écoute. Nombre de cubes par syllabe dans le manifeste. Règle de coupure énoncée sous la zone pendant l écoute (taxi = tak-si, comme Lexique 4.1).",
       "Contrôlé dans le jeu réel : mot « maison », syllabe 1 puis syllabe 2 surlignées, trait entre les deux, tout s'efface à la fin."],
      ["Le pack p1-100 n'a pas de syllabes dans son manifeste : le bouton n'y apparaît pas.", "Rien n'a été écouté par Claude : le rendu sonore (rythme, hauteur de la voix au ralenti) reste à juger à l'oreille.", "Relecture par un·e spécialiste de phonologie en attente : valeurs non validées par un pro."],
      demande=["Les syllabes d'un nouveau mot : à générer avec la clé Azure (déjà faites pour les mots du pack de 100)."],
      blocages=["Relecture d'une spécialiste ou d'un spécialiste de phonologie en attente (paquet prêt, non envoyé à ma connaissance).", "Maintien de la hauteur de voix au ralenti : demandé au navigateur, jamais écouté."],
      suite=["Écouter le bouton sur quelques mots ; envoyer le paquet de relecture ; ajuster 500 ms et 75 % si besoin (src/jeu/modeA.js)."],
      decision=["Garder le bouton seulement pour les mots de 2 syllabes ou plus (choix de Claude) ?"], valid=["Testé automatiquement et contrôlé dans le navigateur ; réglages choisis par JF seul, sans élève."],
      fichiers=["src/app/audio.js (jouerSerie)", "src/app/Jeu.jsx", "src/jeu/modeA.js (REGLAGES_SYLLABES)", "src/core/packAtelier.js", "tests/app/audio-serie.test.js"], tableau="20")
    d("N21", "Aide graduée", "code", "sans_objet", ["Écoute du mot, indice (première lettre à corriger), révélation."],
      ["Les niveaux d'aide sont figés dans la base (4 valeurs) : en ajouter un demande une migration."], valid=["Testé automatiquement."], fichiers=["src/jeu/session.js"], tableau="21")
    d("N22", "Essais gardés sur l'appareil, puis envoyés", "code", "sans_objet",
      ["Journal local ; envoi avec jeton de tâche et code d'élève ; envoi différé si hors ligne ; idempotent."],
      ["Limite de débit écrite (migration 20261114000000, APPLIQUÉE à la base réelle le 2026-11-14) : 300 lignes neuves par heure et par élève, 3000 par tâche ; le client réessaie plus tard.", "Lien ou QR personnel par élève (choix de JF) : le lien porte le code et une clé aléatoire ; le serveur refuse l'écriture sans la bonne clé ; l'enseignant imprime les QR et peut changer une clé. Un lien de tâche sans clé laisse jouer mais n'envoie rien.", "Reste ouvert : un élève qui récupère le lien (ou une photo du QR) d'un camarade écrit sous son code."], blocages=["Migration appliquée le 2026-11-14 ; essai de bout en bout sur la base réelle le 2026-11-14 : envoi avec clé accepté, sans clé refusé, ancienne fonction absente ; partie complète de 20 cartes non jouée."],
      valid=["Testé automatiquement (envoi, lots invalides, doublons)."], fichiers=["src/sync/envoi.js", "src/jeu/essais.js"], tableau="22")
    d("N23", "Lire les résultats", "partiel", "demande",
      ["Liste brute des essais par classe, avec droits (maître ou invité)."], ["Aucune synthèse par liaison graphème-son."],
      demande=["Les résultats se créent quand les élèves jouent."], valid=["Testé automatiquement ; jamais testé avec de vrais élèves."], fichiers=["src/enseignant/Classe.jsx"], tableau="23")
    d("N24", "Tableau de bord et relevé", "pas_code", "partiel",
      ["Maquette retenue (v4) ; règles de lecture du tableau décidées avec JF ; résumé par liaison prêt côté jeu (journal local)."],
      ["Grille élèves par sons, jauges, comparaison élève et groupe, relevé PDF : non codés.", "Seuils (60 % et 80 %, gris sous 5 essais) : choix provisoires de Claude, sans source."],
      demande=["Un relevé pour un intervenant extérieur : à produire à la demande, avec accord des représentants légaux."],
      blocages=["Base légale, information des familles, durée de conservation : non tranchées.", "Assignation (HubActif) mise en réserve par JF."],
      suite=["Trancher le registre RGPD, puis coder la grille."], decision=["Seuils ; partage avec un intervenant extérieur ; AIPD."], valid=["Aucune."],
      fichiers=[".superpowers/brainstorm/ (maquettes, non commité)", "docs/registre-traitement-phonoactif.md"], tableau="24")
    d("N25", "Décider et boucler", "sans_objet", "sans_objet", ["Étape humaine : revoir les mots, le pack ou les réglages, puis retour à l'étape 2."], suite=["Définir avec l'enseignant testeur ce qui déclenche une révision."], tableau="25")
    # Services externes
    d("S1", "Bases lexicales", "sans_objet", "cree",
      ["ManuLemme 2.4 (utilisé), liste VOB (utilisée ; fait partie du référentiel selon JF), Lexique 4.1 (téléchargé pour comparaison, non utilisé dans l'application)."],
      ["Licences non levées : ManuLemme (« OK » selon JF, non vérifié), Lexique 4.1 (BY-SA ou BY-NC : ambigu). VOB : validé par JF."], blocages=["Pas de redistribution tant que les licences ne sont pas tranchées."],
      suite=["Écrire aux auteurs de Lexique ; confirmer par écrit les droits de ManuLemme."], fichiers=["docs/rapport-lexique-org.md"])
    d("S2", "Azure Speech (Microsoft)", "sans_objet", "cree",
      ["Voix fr-BE-CharlineNeural pilotée par l'IPA : fonctionnelle (essais écoutés par JF)."],
      ["Quota gratuit et règle de facturation du SSML : non vérifiés.", "Conditions de redistribution de l'audio généré : non lues."], blocages=["Clé lisible seulement par JF."],
      suite=["Lire les conditions Microsoft avant tout commit public d'audio."], fichiers=["essai-tts-ipa/essai-charline.py"])
    d("S3", "Canva (images)", "sans_objet", "partiel",
      ["Connecteur rétabli le 2026-11-13 après plusieurs jours d'échecs : 20 générations réussies (style papier découpé).", "Deux lectures de résultat ont échoué (erreur du connecteur) puis réussi au second essai.", "Compte Canva de JF : adresse PLAI/école, connexion par Microsoft, intégration « Canva AI Connector » active (lu sur la page de profil le 2026-11-13) ; compte Pro, confirmé par JF.", "La page web de Canva ne reproduit pas le style."],
      ["Cause de la panne non établie (réparée sans action identifiée de notre côté).", "Récupération en pleine résolution et conditions d'usage non vérifiées."],
      demande=["Chaque image : génération à la demande, une par mot ; chaque génération consomme probablement le quota de JF (non vérifié)."], blocages=["Risque de retour de la panne : prévoir le repli (prompts à coller dans Canva).", "Limite de débit et de crédit : \"quota_cooldown\" après 1 à 2 travaux rapprochés ; l'édition de 15 images est en attente.", "Chaque génération ou édition consomme du crédit Canva ; solde et durée de la limite inconnus."],
      suite=["Refaire les images refusées par lots avec le même bloc de prompt."], fichiers=["docs/images-canva-20-mots.csv", "docs/images-canva/planche.html", "docs/images-canva/"])
    d("S4", "GitHub et Vercel", "sans_objet", "cree",
      ["Dépôt jfb4plai/PhonoActif ; projet Vercel phonoactif ; site qui répond (HTTP 200)."], ["Visibilité du dépôt non vérifiée ; version déployée non comparée au code local."],
      suite=["Vérifier la visibilité du dépôt avant d'y mettre des données sous licence."], fichiers=[".vercel/project.json (non commité)"])
    d("S5", "Supabase (base partagée PLAI)", "sans_objet", "cree",
      ["Projet partagé de toutes les apps PLAI ; tables phono_* écrites et testées sur base simulée."], ["Région d'hébergement non vérifiée ; migrations non vérifiées sur la base réelle."],
      blocages=["Base d'authentification partagée : l'invitation d'un enseignant permet de tester l'existence d'une adresse e-mail (audit, déduit)."],
      suite=["Corriger la fonction d'invitation ; vérifier la région."], fichiers=["supabase/migrations/"])
    d("S6", "Lingua Libre (Wikimedia Commons)", "sans_objet", "cree",
      [f"Index de 440 651 fichiers français ; {c['ll']} fichiers téléchargés pour la comparaison ; couverture de P1 : 99,9 % (au moins un enregistrement).",
       "Licences relevées : CC0, CC BY, CC BY-SA selon le locuteur."],
      ["Non intégré à l'application.", "Pays des locuteurs absent de Commons."], blocages=["Compatibilité CC BY-SA avec la licence du projet : non vérifiée."],
      suite=["Écouter la comparaison ; soumettre le paquet à l'aveugle."], decision=["Intégrer des enregistrements humains pour certains mots ?"], fichiers=["docs/couverture-lingualibre.md", "essai-tts-ipa/ecoute-comparaison.html"])
    return D



# Journal des mises à jour du logigramme (consigne de JF, 2026-11-13 : mettre à jour à chaque action). Ajouter une ligne à chaque action qui change l'état du projet.
JOURNAL = [
    ("2026-11-15", "Niveau d'amorce APPLIQUÉ aux 5 packs sur demande de JF (« Applique »), sans appel Azure : 156 fichiers de phrases réécrits (mêmes noms) ; contrôlé : 0 vide ou absent, 156 phraseAudio existent, durées 2,5 à 4,6 s, pic mp3 -3,6 à -2,9 dB, écart de niveau amorce / mot cible de -0,3 à +1,6 dB (médiane 0,1 ; un seul hors ±1 dB) sur les 136 phrases distinctes. NON écouté en entier (JF a écouté 3 mots d'essai avant : voiture, poisson, rivière), NON commité, NON poussé : le site en ligne garde les anciens audios", "N8, N20"),
    ("2026-11-15", "Écoute de JF des phrases C2 : le mot cité d'abord (amorce) est peu audible, sauf « rivière » ; le reste est OK. Cause mesurée : l'amorce a le niveau du reste de la phrase (-18 à -23 dB) alors que le mot de la phrase est monté de 10 dB (-10 à -14 dB) ; « rivière » en fin de phrase (intonation descendante) n'atteint que -14,5 dB, écart de 4,5 dB seulement. Option 1 choisie par JF : amorce montée au niveau du mot cible (RMS de parole), sans appel Azure (generer-c2-packs.py, AMORCE_AU_NIVEAU_DU_MOT). Essai sur 3 mots (voiture, poisson, rivière) dans sortie/amorce-niveau/p1-100/audio : amorce et mot cible au même niveau à 0,3 dB près ; atténuation globale voiture -5,5 dB (avant -3,4) ; packs publiés NON modifiés (anciennes phrases C2), NON écouté", "N8, N20"),
    ("2026-11-15", "C2 +10 dB APPLIQUÉ aux 5 packs sur demande de JF (lancé par Claude avec la clé Azure de JF) : 132 phrases demandées à Azure, 0 erreur (264 appels), 156 fichiers de phrases réécrits dans public/packs/*/audio sous les mêmes noms ; contrôlé : 0 fichier vide ou absent, 156 phraseAudio des manifestes existent, durées 2,5 à 4,6 s (moyenne 3,4), pic mp3 -3,7 à -2,9 dB, gain mesuré sur le mot de 8,0 à 10,0 dB (médiane 9,9 ; 17 mots courts sous 9,5 dB, le plus bas « qui » 8,0), atténuation globale de -6,5 à médiane -2,6 dB. NON écouté, NON commité, NON poussé : le site en ligne garde les anciens audios. Réponses de JF : demande de pack par mail, délai 2 semaines max, 24 mots max, JF modérateur, image possible fournie par l'enseignant pour mots singuliers ; création de 20 mots = 3 h en arrière-plan ; partage non par défaut (facile)", "N8, N20, N9"),
    ("2026-11-15", "C2 +10 dB validé par JF (« go ») pour tous les packs. Script essai-tts-ipa/generer-c2-packs.py écrit : génération PAR MOT dans un cache (136 phrases distinctes sur 156 de packs ; 4 déjà en cache issues de l'essai, donc 264 appels Azure à lancer par JF), amorce + 0,35 s + phrase, mot à +10 dB exact (atténuation globale au lieu du plafonnement), normalisation à -3 dB, copie sous les mêmes noms de fichiers (manifestes inchangés). Contrôlé en local sur voiture, poisson, rivière, tambour (écrits dans un dossier d'essai, PAS dans public/packs) : rapport mot / reste 10,0 / 9,9 / 10,0 / 10,0 dB, reste à 1,00, pic mp3 -3,5 dB, durées 3,5 à 4,4 s ; atténuation globale jusqu'à 6 dB (poisson : le reste de la phrase sera plus faible que les mots isolés). NON lancé sur les packs, NON écouté, rien commité ni poussé. JF demande une analyse de faisabilité : accès aux packs, demande de pack à mots inexistants, sélection par l'enseignant dans la base, demande par gabarit Excel, partage des packs demandés (réponse en attente d'accord)", "N8, N20, N9"),
    ("2026-11-15", "Écoute de JF sur l'essai 5b : amorce C avec mot à +10 dB jugée a priori OK ; défaut signalé : « Papa a une voiture rouge » s'entend « Apa » (consonne initiale perdue après l'amorce). Mesure : dans la prise C, l'attaque de « Papa » passe de 14 à 1957 en 10 ms, contre une montée progressive (292, 2434, 6330) dans la phrase seule. Version C2 préparée (python essai-limites-mot.py azure-longs-c2) : amorce seule + silence de 0,35 s + phrase seule déjà générée, deux prises distinctes ; 4 appels Azure ; contrôlé en local avec une amorce simulée : début de phrase identique à la phrase seule ; NON lancé, NON écouté ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Vitesse des phrases vérifiée à la demande de JF (« pas à 75 % ? ») : 136 phrases, ancienne version 2,93 s contre nouvelle 3,89 s (rapport 1,33 = 1/0,75, 8 paires examinées) ; parole du SDK identique à celle de l'API REST à 75 % (dans 1,62 s contre 1,61 s). Essai 5b complété : amorce C (« mot, comme dans : » + phrase) ajoutée, gain sur le dernier événement du mot ; 8 appels Azure (4 mots longs x 2 formes) à lancer par JF ; SSML bien formés ; rien lancé, rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Essai 5 lancé par JF (SDK installé) : limites de mot Azure obtenues et repérées de façon unique pour dans, qui, tout, même avec la balise IPA ; gain local +6 dB mesuré (rapport 1,79 à 1,88 dans la fenêtre du mot, 1,00 avant) ; +10 dB limité à 6,3 dB pour « dans » par la saturation ; mots de 0,10 à 0,13 s, audibilité NON écoutée. Demande de JF : essayer des mots plus longs. Essai 5b préparé (python essai-limites-mot.py azure-longs : voiture, poisson, rivière, tambour, phrases et IPA réels des packs, 4 appels Azure) ; non lancé ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Essai 4 généré par JF (9 fichiers, 0 erreur) : rapport de volume 1,00 partout, y compris reste à -50 % et x-loud ; la voix Charline ignore l'attribut volume du SSML (constaté). Option retenue par JF : monter le son du mot après coup avec du code local. Essai 5 préparé (essai-tts-ipa/essai-limites-mot.py) : limites de mot via le SDK Azure sur 3 mots, gains +6 / +10 dB avec rampes ; fonction de gain contrôlée en local sur un vrai fichier ; SDK NON installé, script NON essayé avec Azure ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Mesure ffmpeg sur l'essai 3 (dans, qui, tout) : volume +30 % sans aucun effet (rapport 1,00 sur tout le fichier, durées identiques) ; +10 % de l'essai 2 également ; cause probable non vérifiée : volume Azure déjà au maximum. Correction : l'essai 1 (4 versions) n'a jamais été généré (dossier sortie/phrases absent). Essai 4 préparé (essai-tts-ipa/essai-phrases-75c.py, 9 appels) : reste de la phrase à -30 % / -50 %, ou mot en x-loud, avec mesure automatique du rapport au neutre ; AUCUN appel Azure fait ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Essai 2 généré par JF (30 fichiers, 0 erreur) : pauses jugées rompre la phrase ; volume +10 % jugé insuffisant (décisions de JF). Essai 3 préparé (essai-tts-ipa/essai-phrases-75b.py) : phrase seule à +30 %, B « mot. » + phrase, C « mot, comme dans : » + phrase, mot à +30 % dans la phrase ; 30 SSML bien formés ; AUCUN appel Azure fait, page vide jusqu'à la génération par JF ; aucune source RISS ne teste cette formule (Alazard tel-00944968 : progression son isolé, mot, phrase en FLE ; extraits seulement) ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Page d'écoute « mot cible en relief, phrases à 75 % » préparée (essai-tts-ipa/essai-phrases-75.py, 10 phrases x 3 versions : neutre / pauses de 250 ms / pauses + volume +10 %) ; 30 SSML contrôlés bien formés ; AUCUN appel Azure fait, aucun audio, page vide jusqu'à la génération par JF ; le paramètre volume +10 % n'est pas vérifié côté Azure ; rien appliqué aux packs", "N8, N20"),
    ("2026-11-15", "Phrases d'aide lues trop vite par Charline : débit réglé à 75 % (balise prosody rate=0.75 autour de la phrase, tools/phrases_ssml.py, constante DEBIT) ; empreinte du fichier brut modifiée, donc toute phrase sera régénérée par Azure ; test unitaire ajouté (5 tests OK) ; AUCUN audio régénéré, NON écouté : les phrases déjà publiées restent à l'ancienne vitesse tant que JF ne relance pas la génération de chaque pack", "N8, N20"),
    ("2026-11-14", "Galerie unique de toutes les images (docs/images-canva/galerie-images.html, tools/galerie_images.py) : 20 du pack + lots 2, 3, 4, fond mesuré, packs qui les utilisent, emplacements « à générer » et « en cours » ; rechargement automatique chaque minute et mise à jour à chaque génération via tools/traiter_lot.py ; 4 tests ; non commité", "N6"),
    ("2026-11-15", "Commit cda2cec (p1-100 : lot 3, phrases sur/avec, prompts) ; réponses de JF : grand/petit sans flèche = défaut de ma part (la paire de base n'avait pas encore sa flèche) : outil tools/fleche_comparaison.py écrit (flèche orange ajoutée par programme sur la MÊME image de base, même taille de flèche, 2 tests OK) : grand.png et petit.png produits dans lot9 ; « dans » (chat dans un panier) VALIDÉ par JF : la série du chat continue (sur, sous, vers, avec) avec l'image de « dans » en référence (MAHa_AOCW34) ; « sur » lancé", "N6, N8"),
    ("2026-11-15", "Série du chat : « sous » reçu (chat sous la chaise) ; « vers » reçu (chat qui bondit vers une porte verte) ; JF : « pour vers, il y a déplacement, donc flèche » : flèche orange horizontale ajoutée par programme au-dessus du chat (image sans flèche conservée dans lot9/v1/vers-sans-fleche.png) ; reste « avec » ; rien commité", "N6, N8"),
    ("2026-11-15", "JF : « élimine grand-petit sans flèche » : la paire de base sans flèche retirée du lot 9, de la planche et de la galerie (archivée dans lot9/v1/grand-petit-base-sans-fleche.png, qui reste la source de grand.png et petit.png) ; entrée supprimée de MOTS_LOT9 ; tests OK", "N6, N8"),
    ("2026-11-15", "JF : « avec » = un seul personnage, « Le chat joue avec la balle » : phrase changée (phrases.json + manifeste p1-100, audio C2 à régénérer par JF), prompt réécrit (chat + balle rouge, sans chien), ancien essai chat+chien abandonné", "N6, N8"),
    ("2026-11-15", "JF : chaise de « sous » ajustée à la taille de celle de « sur » : image réduite à 87 % (largeur de chaise 118 px comme « sur », pied de chaise aligné sur 180 px) ; version d'origine dans lot9/v1/sous-avant-ajustement.png ; hauteur de chaise 136 px au lieu de 162 px (la chaise générée est plus large et plus basse)", "N6, N8"),
    ("2026-11-15", "Lot 9 COMPLET (7 images : dans, sur, sous, vers+flèche, avec = chat et balle, grand, petit) ; lot 8 démarré : « rouge » (tache d'une seule pièce) lancé", "N6, N8"),
    ("2026-11-15", "Lot 8 : rouge refait plus difforme (accepté) ; rue reçue ; JF : « terre » doit imager la phrase « Le ver vit dans la terre. » : v1 (tas + pousse) archivée, nouveau prompt = coupe de terre brune avec un ver rose ; tête lancée", "N6, N8"),
    ("2026-11-15", "Lot 8 presque complet (13/15) : terre (ver + plantes), nez réaliste, yeux, garçon, père, papa, maman, ami (un en couleurs, un en gris), manger, lire reçus ; voir : geste de la main refusé (salut), nouveau prompt fille + chien ; phrase de « voir » changée par JF : « Je peux voir le chien. » (phrases.json + manifeste ; audio C2 à régénérer par JF, comme avec et terre)", "N6, N8"),
    ("2026-11-15", "Lots 8 (15/15) et 9 (7/7) COMPLETS, planches envoyées à JF ; tâche récurrente supprimée ; JF : phrase de « peur » = « La fille a peur. » (phrases.json + manifeste ; audio C2 à régénérer par JF : 1 phrase à demander à Azure, avec et voir déjà faits)", "N6, N8"),
    ("2026-11-15", "Commit 27870f2 poussé (lots 8 et 9, phrases avec/voir/peur, audios C2 régénérés par JF) ; JF valide les 22 images et les 3 audios ; règle : quand le mot est ambigu, l'image colle à la phrase (terre a plusieurs sens)", "N6, N8"),
    ("2026-11-15", "Pack p1-100 : 22 images intégrées (lots 8 et 9 : dans, sur, sous, vers, avec, grand, petit, rouge, terre, rue, tête, nez, yeux, garçon, père, papa, maman, ami, manger, lire, voir, peur) : 52 images sur 100 ; 78 mots sans image (dont les mots-outils, sans image par décision de JF)", "N6, N8"),
    ("2026-11-15", "Tous les packs publics (décision de JF) : p1-illustre-2, 3, 4, 5 ajoutés à public/packs/index.json (6 packs publics ; le pack d'essai « demo » reste hors liste) ; NON déployé tant que non poussé", "N6, N8"),
    ("2026-11-15", "Liste de tous les mots avec leurs informations : tools/liste_mots.py, docs/liste-des-mots.xlsx et .csv (176 lignes pack-mot, 156 mots distincts : lettres→sons, IPA, syllabes, phrase, audios, image, source, licence)", "N6, N8"),
    ("2026-11-15", "Rattrapage depuis les autres sessions des 4 derniers jours (lues, non refaites ici) : revue pédagogique d'après le cours de Virginie Huskin (11 écarts, 8 extensions, aucune construite) ; chiffrage du mode « Écoute » sans lettres et du comptage de syllabes orales ; base de mots A (compilation statique, recommandée) / B / C proposée, non tranchée ; prédicteur phonétique en prototype (95 239 formes, licence de Lexique ambiguë) ; 654 pseudo-mots dont beaucoup de fragments", "N6, N8"),
    ("2026-11-15", "Base de mots : JF choisit les DEUX temps (base unique A puis listes composées par l'enseignant chargées par identifiant) ; décisions : liste de 1 à 50 mots, plusieurs listes chargeables ensemble (révisions), liens existants supprimables ; spécification docs/superpowers/specs/2026-11-15-base-de-mots-et-listes-design.md et plan en 10 tâches docs/superpowers/plans/2026-11-15-base-de-mots-et-listes-plan.md écrits, RIEN construit ; constat : 156 mots, 20 en double dont 11 différant seulement par les syllabes, aucune collision de fichier audio ; hypothèses H1 à H5 à confirmer par JF", "N6, N8"),
    ("2026-11-15", "Base de mots et listes CONSTRUITES (plan natif, TDD, tâches 1 à 9 ; la 10 attend le GO de JF) : base data/base (156 fiches), packs recompilés identiques (preuve), public/mots publié ; listes de 1 à 50 mots, plusieurs listes fusionnées pour les révisions, mots copiés dans la tâche ; interface « Mots de la tâche » + « Composer une liste » (catalogue filtrable, écoute) ; côté élève chargement par identifiant ; migration SQL 20261115000000 ÉCRITE ET TESTÉE, NON APPLIQUÉE (elle supprime les anciennes tâches) ; tests Node 436, interface 120, SQL 52, build OK ; non vérifié en navigateur réel ; rien commité ; journal docs/superpowers/plans/2026-11-15-base-de-mots-et-listes-plan-journal.md", "N4, N6, N8"),
    ("2026-11-15", "Revue indépendante des listes (aucun Critique, 3 Important corrigés) : noms de listes plus copiés dans `pack` renvoyé aux élèves (RGPD), identifiants en double refusés (là/la), ordre de mise en ligne noté (migration AVANT le push) ; mineurs corrigés (confirmation de suppression, émojis, catalogue en panne, styles) ; tests Node 438, interface 124, SQL 52, build OK ; mineurs restants dans le journal du plan", "N4, N6, N8"),
    ("2026-11-15", "Commit 9eb1869 (base de mots et listes). JF : migration OK, commit OK, retire les anciens packs : public/packs supprimé (6 packs + essai + index), accueil élève et liens rapides lisent mots/modeles.json et jouent par identifiants, vocabulaire « liste de mots », Enseignant.jsx sans plomberie de packs, compilateur de preuve retiré, liste des mots lue depuis data/base ; chargerPack conservé en repli ; essai en NAVIGATEUR RÉEL (aperçu local) : modèle choisi, fiches.json, image et audio servis depuis /mots/ ; tests Node 431, interface 125 ; migration SQL non appliquée (CLI Supabase bloqué par l'historique d'autres applications) ; retrait des packs non commité", "N4, N6, N8"),
    ("2026-11-15", "MIGRATION 20261115000000 APPLIQUÉE par JF dans l'éditeur SQL (« Success. No rows returned ») ; constaté par le CLI : table public.phono_listes présente, phono_tasks vidée ; historique distant marqué appliqué (migration repair, seule cette version) ; le code peut maintenant être poussé", "N4, N6, N8"),
    ("2026-11-15", "EN LIGNE : commit 7f5e249 (retrait des anciens packs) poussé sur main après le commit 9eb1869 ; constaté sur https://phonoactif.vercel.app : /mots/modeles.json, /mots/fiches.json, /mots/catalogue.json, images et audio en 200, /packs/index.json en 404 (retiré) ; parcours élève réel sur l'adresse publique : liste « 12 mots de P1 avec images, suite » → Carte 1 sur 12, image /mots/images/oiseau.png chargée ; reste à essayer l'espace enseignant (listes, tâche, QR-codes) avec le compte de JF", "N4, N6, N8"),
    ("2026-11-15", "ESSAI DE L'ESPACE ENSEIGNANT EN LIGNE (Chrome de JF, vraie base) : liste de test composée (modèle, retrait, recherche, enregistrement), tâche à 2 listes = 32 mots et 7 liens élèves, lien de E01 ouvert = Carte 1 sur 32 depuis mots/fiches.json, puis lien révoqué et liste supprimée ; défaut relevé et corrigé : le mot « pack » restait dans l'aide de l'écoute par syllabes, le mode d'emploi et l'accueil (vocabulaire remplacé par liste de mots / cartes) ; deux tests gardent désormais le texte visible sans « pack » ; tests interface 127, Node 431 ; non commité", "N4, N6, N8"),
    ("2026-11-16", "SOLEIL ET ŒUF ÉCOUTÉS PAR JF (12 états lettre par lettre, tous « bon ») : corrections VALIDÉES enregistrées dans data/corrections.json (soleil : eil = e_ouvert+yod /ɛj/ ; œuf : œu = eu_ouvert /œ/) ; fiches soleil et oeuf (mot « œuf ») ajoutées ; AUDIO GÉNÉRÉ ET FINALISÉ PAR JF pour les 19 mots du lot 11-12 (81 fichiers d'états/syllabes, 19 phrases C2) ; 175 fiches servies (public/mots), 0 fichier absent, tests 435 (434 OK), build OK ; réserves : état « œ » seul sans son (le jeu affiche « son absent »), phrase de « brique » : mot cible non repéré pour le gain +10 dB (pluriel « briques »), phrases des 19 mots non validées explicitement par JF ; commité et poussé", "N4, N6, N8"),
    ("2026-11-16", "LOT 12 (VOB P2, 10 noms) généré et poussé (dd32940) ; MOTS AJOUTÉS À LA BASE : nouvel outil tools/base/ajouter_mots.js (lot data/base/lots/vob-lots-11-12.json) = 17 fiches « brouillon » (9 du lot 11 sauf soleil, 9 du lot 12 sauf œuf) avec lettres, cubes, états, syllabes, image, phrase proposée d'après l'image (à valider par JF) ; images de côté, sans, gros rattachées aux fiches existantes et publiées (public/mots) ; ÉCARTÉS : soleil (code de lecture « Ej » non traité par le moteur) et œuf (absent du lexique de lecture sous la forme « œuf », présent sous « oeuf ») : décisions de JF ; AUDIO À GÉNÉRER par JF (clé Azure) : 46 fichiers d'états/syllabes + 17 phrases C2 ; les fiches restent « brouillon » (non servies) tant que `ajouter_mots.js finaliser` n'a pas copié l'audio ; test de cohérence de la base adapté (brouillons admis, fichiers des fiches valides vérifiés) ; tests Node 435 (434 OK), build OK", "N4, N6, N8"),
    ("2026-11-16", "IMAGES VALIDÉES par JF (lots 10 et 11, 12 images, « sucre » v3 = sucrier de morceaux en pavés). PHRASES ADAPTÉES à l'image pour les mots sans objet (demande de JF) : sans « Le garçon est sans son chien. », côté « Le chat est à côté de la chaise. », grand « Le rond avec la flèche est grand. », petit « Le rond avec la flèche est petit. », rouge « La tache est rouge. » ; écrit dans data/base/fiches.json (5 lignes), data/packs-atelier/p1-100/phrases.json (ancienne version gardée : phrases.avant-2026-11-16.json) et phrases-a-generer.json ; constaté : generer-c2-packs.py compter = 5 phrases à demander à Azure, 95 en cache ; AUDIO C2 À REFAIRE par JF (clé Azure) pour ces 5 ; images sans, côté, gros pas encore intégrées à la base (image_sans_mot vide)", "N4, N6, N8"),
    ("2026-11-16", "IMAGES : lot 10 (fin du p1-100 : côté, sans, gros) et lot 11 (VOB P1 : branche, brique, cheminée, pipe, plante, robe, route, soleil, sucre) générés dans Canva, 12 images, À VALIDER par JF, aucune intégrée aux packs ; p1-100 = 52 mots sur 100 avec image, les 48 autres sans image par décision de JF (mots-outils, pronoms, oui/non, matin/soir en réflexion) ; « sans » = garçon + laisse vide + collier (v1 paille et v2 sans collier refusées), brique = terracotta après 3 essais ; bug corrigé dans tools/traiter_lot.py (l'ancien original restauré écrasait la nouvelle image) ; PHRASES À ADAPTER (non faites, audio C2 à refaire) : sans « Le garçon est sans son chien. », côté « Le chat est à côté de la chaise. » ; VOB P1 hors lot : bébé, fille, femme, homme, fils, chatte, lapine, lionne, mal, rive, sud ; VOB P2 à P6 non traités", "—"),
    ("2026-11-15", "Commit et push 44e7407 (mot « pack » retiré des textes visibles). Déroulé de relecture pour la logopède ADAPTÉ (docs/deroule-relecture-logopedie.html, version du 15 novembre 2026, envoi prévu le 16 par JF) : plus de « pack », partie D bis devenue publique (liste « 12 mots de P1 avec images, suite »), images masquées au départ, NOUVELLE partie D ter (8 phrases d'aide : dans, sur, sous, vers, avec, voir, peur, terre, avis claire/ambiguë/à revoir), bilan copié « parties C, D, D ter, E » ; constaté : les 37 liens de carte pointent vers un mot existant du modèle, 2 liens essayés en ligne (maison, avec : Carte 1 sur 1, phrase-avec.mp3 chargée), document ouvert en file:// avec ses tableaux (8 phrases, 45 lignes C) ; parties A et B (paquets zip joints) NON revues ; non commité", "N6, N8"),
    ("2026-11-15", "p1-100 : lot 3 intégré (deux, trois en chiffre seul sans pommes, fête, jour, monde : 30 images sur 100) ; phrases « sur » et « avec » adaptées à la série du chat ; ERREUR de Claude : la commande donnée à JF (generer-bibliotheque.py phrases) a écrasé par erreur les 100 audios de phrases C2 (amorce, 75 %, mot +10 dB) par une version simple ; corrigée par JF avec generer-c2-packs.py azure p1-100 (2 phrases demandées, 0 erreur, 100 C2 recopiées) ; contrôle : seuls phrase-sur.mp3 et phrase-avec.mp3 diffèrent du commit précédent, 371 fichiers référencés présents, aucun vide ; NON écoutés ; NON COMMITÉ (en attente de la demande de JF)", "N8, N20"),
    ("2026-11-15", "Mots de position : JF propose que l'image reprenne la phrase-contexte (accord après mon avis) ; série = UN chat et un décor simple, seule la relation change (dans : chat dans un panier ; sur / sous : chat sur / sous la même chaise ; vers : chat qui court vers une porte ; avec : chat et chien avec une même balle) ; phrases du p1-100 adaptées (sur : « Le chat dort sur la chaise », avant « Le livre est sur la table » ; avec : « Le chat joue avec le chien », avant « Je joue avec mon ami » ; sauvegarde data/packs-atelier/p1-100/phrases.avant-2026-11-15.json) ; manifeste mis à jour, AUDIO À REGÉNÉRER par JF (2 appels Azure) avant tout push ; essai « dans » v1 (ballon et boîte) refusé : se lisait comme un coucher de soleil ; « dans » v2 (chat dans panier) lancé", "N6, N8, N20"),
    ("2026-11-15", "Réponses de JF : « deux » validé en principe (chiffre seul) ; intégration du lot 3 au p1-100 APRÈS génération de « deux » et « trois » (« deux » reçu : chiffre 2 orange, d'une pièce) ; garçon, père, papa AVEC VISAGE ; mots-outils : JF demande des solutions si utiles (proposées) ; lot 8 écrit (11 mots : rouge, terre, rue, tête, nez, yeux, garçon, père, papa + maman et ami proposés par Claude) ; le bloc commun n'écrit plus « no people » pour les mots de PERSONNES ; tâche récurrente unique : trois, puis intégration du lot 3 au p1-100 (non commitée), puis lot 8", "N6, N8, S3"),
    ("2026-11-15", "Objectif de JF : un pack p1-100 complet (audit : 100 mots, 100 phrases avec audio, 341 audios de mots, 27 boutons syllabes, 25 images sur 100) ; consigne sur les nombres : carte = chiffre seul, sans pommes (compter n'est pas l'objectif) ; règle des pommes remplacée dans tools/prompts_images_canva.py (entree_nombre : chiffre orange seul, plus d'image de référence, 13 tests OK) ; les 2 images à pommes (deux, trois) archivées dans lot3/v1 et à régénérer en chiffre seul (deux lancée sur Canva, trois ensuite) ; RESTE : validation des chiffres par JF, puis intégration au p1-100 ; en attente de JF : mots-outils sans image (environ 40) et personnages sans visage (garçon, père, papa, ami)", "N6, N8, S3"),
    ("2026-11-15", "Phrases d'aide du pack p1-illustre-5 : 20 propositions de l'IA validées par JF (« GO », sans correction constatée), lues par Azure (20 nouvelles, 0 erreur, générées par JF) et ajoutées au manifeste (phrase + phraseAudio) ; contrôlé par Claude : 20 fichiers présents, aucun vide, aucune référence manquante ; NON écoutées ; texte jamais affiché à l'élève", "N8, N20"),
    ("2026-11-15", "Audio du pack p1-illustre-5 généré par JF avec Azure (64 nouveaux fichiers, 0 erreur, 99 sur 99 copiés) ; contrôlé par Claude : les 119 fichiers référencés (99 audio, 20 images) existent, aucun vide ; NON écouté ; phrases (20 propositions) toujours à relire par JF ; pack hors index.json", "N8, N20"),
    ("2026-11-15", "Lot 7 complet (20 images Canva) validé par JF (« Go, je valide ces images ») et intégré au pack p1-illustre-5 : 20 cartes sur 20 avec image, source et licence ; une poire refusée (bicolore) refaite en une seule couleur ; règle de JF notée : deux couleurs seulement si les parties diffèrent vraiment ; pack construit avec ses syllabes, hors index.json ; RESTE À JF : audio Azure (99 fichiers référencés, 35 déjà en bibliothèque), relecture des 20 phrases proposées (docs/phrases-p1-illustre-5-propositions-ia.xlsx, non intégrées) ; pack non jouable tant que l'audio manque", "N6, N8, N20"),
    ("2026-11-15", "Consigne de JF : toute image doit se retrouver dans la Galerie des images PhonoActif ; audit (66 images retenues, 231 fichiers png sur disque) : toutes les images retenues y sont (pack des 20, lots 2 à 6) ; les images du lot 7 s'y ajoutent seules, chaque image traitée régénère la galerie ; JF précise : PAS les versions refusées (v1) ni les copies avant uniformisation : ma première modification pour les montrer a été annulée (git checkout), rien commité", "N6, S3"),
    ("2026-11-15", "Lot 7 lancé avec Canva : 20 mots de la liste P1 (rangs 431 à 700 : zèbre, girafe, tigre, hibou, cochon, serpent, baleine, banane, fraise, citron, poire, taxi, fusée, valise, balai, échelle, tulipe, jupe, montre, seau), prompts écrits avec la grille « que voit un enfant de 6 ans ? » ; pack p1-illustre-5 construit (manifeste sans image, 99 audios distincts dont 35 déjà en bibliothèque donc 64 à demander à Azure) ; 20 propositions de phrases de l'IA ajoutées (niveau Manulex contrôlé, une phrase refaite : « remplis » rare en P1 d'après Manulex) dans docs/phrases-p1-illustre-5-propositions-ia.xlsx : À RELIRE PAR JF ; rien commité ni poussé", "N6, N8, N20"),
    ("2026-11-14", "Lot 6 complet (12 images Canva : corbeau, vache, chemise, étoile, mouton, camion, coq, canard, chaise, lampe, tambour, pull ; contrôle « que voit un enfant de 6 ans ? », une seule image douteuse signalée : la chemise, petit triangle jaune au col) intégré au pack p1-illustre-4 sur demande de JF : 12 cartes sur 12 avec image, phrase et phraseAudio ; les 83 fichiers référencés existent, aucun vide ; pack toujours hors index.json (lien seulement) ; NON écouté, jeu en ligne non testé avec ce pack", "N6, N8, N20"),
    ("2026-11-14", "Phrases d'aide des packs p1-illustre-3 et p1-illustre-4 : propositions de l'IA validées par JF (« GO », sans correction constatée) ; 24 phrases lues par Azure (12 nouvelles par pack, 0 erreur, générées par JF) et ajoutées aux manifestes (phrase + phraseAudio) ; contrôlé par Claude : 24 fichiers présents, aucun vide ; NON écoutées ; texte jamais affiché à l'élève", "N8, N20"),
    ("2026-11-14", "Audio du pack p1-illustre-4 généré par JF avec Azure (29 nouveaux fichiers, 0 erreur, 59 sur 59) ; contrôlé par Claude : les 59 fichiers référencés existent, aucun vide, 415 Ko ; NON écouté ; manifeste sans image (lot 6 en cours de génération) ; pack hors index.json", "N8, N20"),
    ("2026-11-14", "Lot 6 lancé avec Canva (12 mots de la liste P1, rangs 333 à 430 : corbeau, vache, chemise, étoile, mouton, camion, coq, canard, chaise, lampe, tambour, pull ; prompts écrits avec la question « que voit un enfant de 6 ans ? ») ; pack p1-illustre-4 construit (manifeste sans image, 59 audios distincts dont 20 déjà en bibliothèque, donc 39 à demander à Azure) ; propositions de phrases de l'IA ajoutées pour p1-illustre-3 et p1-illustre-4 (24 phrases, niveau Manulex contrôlé : aucun mot signalé) dans deux tableaux de relecture docs/phrases-<pack>-propositions-ia.xlsx : À RELIRE PAR JF, rien n'est intégré ni lu par la voix", "N6, N8, N20"),
    ("2026-11-14", "Audio du pack p1-illustre-3 généré par JF avec Azure (29 nouveaux fichiers, 0 erreur, 52 sur 52 copiés, 334 Ko) ; contrôlé par Claude : les 64 fichiers référencés (52 audio, 12 images) existent, aucun vide ; NON écouté ; pack toujours hors index.json (lien seulement)", "N8, N20"),
    ("2026-11-14", "Lot 5 complet (12 images : verre, nid, sapin, ballon, fleur, lion, panier, bateau, guitare, cadeau, âne, poule) ; 5 refus de JF ou de ma grille « que voit un enfant de 6 ans ? » (verre à eau verte, nid « pot de cuisine », ballon disque plat, cadeau au carré orange, fromage du lot 4) archivés dans lot5/v1 ; pack p1-illustre-3 créé (12 cartes avec image, 52 fichiers audio À GÉNÉRER par JF avec Azure, donc pack non jouable et non listé dans index.json) ; rien poussé", "N6, N8, N20"),
    ("2026-11-14", "Correctif poussé (93d1c0c) : un pack ouvert par lien mais absent de index.json reste affiché dans la liste (« pack ouvert par lien ») ; essai sur le site public après déploiement : lien carte p1-illustre-2/oiseau ouvert, liste = pack retenu, image chargée, 6 lettres posées, « Bravo ! », aucune erreur console ; NON vérifié : le son entendu, les 11 autres cartes, tablette", "N8, N20"),
    ("2026-11-14", "Lot 4 complet (12 images, « fromage » en 3e version après deux refus de JF) et images intégrées au pack p1-illustre-2 (12 cartes sur 12, 71 fichiers audio présents, aucun fichier référencé manquant) ; décision de JF : V1 = lui seul publie, option légère : pack hors public/packs/index.json tant que non validé (ouvrable seulement par lien), exception .gitignore ajoutée ; mode d'emploi (Pages.jsx) et guide fabriquer-un-pack.md adaptés ; partie « D bis » ajoutée au déroulé de relecture (12 liens) ; rien commité ni poussé, donc liens inopérants en ligne", "N6, N8, N20"),
    ("2026-11-14", "Pack p1-illustre-2 : audio généré par JF avec Azure (47 nouveaux fichiers, 71 sur 71 copiés, 0 erreur, 688 Ko) ; 11 mots sur 12 ont l'écoute par syllabes (train : une syllabe) ; non écouté ; images du lot 4 en cours", "N8, N20"),
    ("2026-11-14", "Images lot 3 poussées (5 images) ; lot 4 lancé : 12 mots de la liste P1 de JF (rangs 133 à 257, noms communs, filtre déterministe) à illustrer, génération toutes les 5 minutes ; pack « p1-illustre-2 » fabriqué (manifeste, 71 fichiers audio à produire dont 21 déjà présents, 50 au plus avec Azure), non listé publiquement, images à ajouter après validation ; commande Azure à lancer par JF", "N6, N8"),
    ("2026-11-14", "Liste des classes : bouton « Supprimer » en face de chaque classe (responsable seulement) ; avertissement chiffré (codes, essais, tâches, invités, définitif) puis confirmation explicite ou annulation ; 2 tests ; vérification visuelle sur une copie de la mise en page ; non commité", "N9"),
    ("2026-11-14", "Retours de JF sur l'interface : (1) case « Exiger les accents » alignée sur son libellé (CSS espace enseignant) ; (2) liens : « Créer la tâche et les liens des élèves » affiche aussitôt les liens et QR personnels sous le bouton, lien général replié, plus de lien brut dans la liste des tâches ; (3) écoute par syllabes : les césures et la règle restent après la lecture, bouton « Masquer les césures » ; contrôlé dans le navigateur local pour (1) et (3), (2) par tests seulement ; non commité", "N9, N10, N20"),
    ("2026-11-14", "« fête » : v1 (trois ballons, nœud rose) reçue et gardée dans lot3/v1 ; JF demande confettis et notes de musique : v2 = retouche de la v1 (image de référence) avec ~8 confettis et exactement 3 notes ; relancée par la tâche récurrente", "N6"),
    ("2026-11-14", "« jour » v1 (soleil) refusée par JF (se lit « soleil ») : archivée dans lot3/v1 ; v2 = page de calendrier qui tombe (idée de JF), sans chiffre ni lettre ; relancée par la tâche récurrente", "N6"),
    ("2026-11-14", "Règle des nombres (JF) : tout nombre = pommes identiques à celles de « deux » ; trois, quatre… générés avec l'image de « deux » en référence ; ajouté au script (NOMBRES, entree_nombre, references_de) et à la file d'attente ; non commité", "N6"),
    ("2026-11-14", "Phrases audio d'aide construites (bouton « Écouter une phrase », texte jamais affiché, tableau Excel vide à remplir par JF, outils de lecture/ajout, commande de voix à lancer par JF avec sa clé Azure ; non essayée avec Azure) ; lot 3 d'images (monde, deux, trois, jour, fête) en génération automatique toutes les 5 minutes, à valider par JF", "N8, N12, N6"),
    ("2026-11-14", "Pack de 100 mots : 25 images intégrées (les 5 du lot 2 + les 20 du pack illustré) par tools/ajouter_images_pack.js ; bilan sur 100 : image 25, états audio 100, écoute par syllabes 27 sur 27 mots de 2 syllabes ou plus ; 75 mots sans image (mots-outils, verbes, adjectifs, noms abstraits ou de personnes) ; images du lot 2 à fond #cde7f7, celles du pack des 20 non uniformisées ; non commité", "N6, N8, N20"),
    ("2026-11-14", "« rivière » v2 générée (tuile verte, une rivière en S à deux bandes bleues) : fond obtenu #cae7f7 (écart 4), ramené à #cde7f7 ; lot 2 complet (5 sur 5), à valider par JF", "N6"),
    ("2026-11-14", "« rivière » v1 refusée par JF (illisible) : archivée dans lot2/v1 ; consigne v2 écrite dans le script (tuile verte, une rivière en S, deux bandes bleues) ; génération en attente du plafond Canva", "N6"),
    ("2026-11-14", "Image « rivière » générée avec le prompt v2.2 : fond obtenu #94c1fc (écart 57), ramené à #cde7f7 par l'outil ; lot 2 complet (5 images), à valider par JF ; rivière lisible comme un ruban ondulé plutôt qu'une rivière ; défaut de traiter_lot2 corrigé (ne touche plus aux planches-contact)", "N6"),
    ("2026-11-14", "Fonds du lot 2 uniformisés à #cde7f7 par tools/uniformiser_fond.py (écart 5 à 26 -> 1 sur 255, dessin inchangé, originaux conservés) ; script de génération v2.2 (fond en valeurs exactes + étape d'uniformisation + contrôle) ; planche du lot 2 générée par tools/planche_lot2.py (4 images sur 5) ; une seule commande tools/traiter_lot2.py pour toute nouvelle image ; les 20 images du pack non touchées", "N6"),
    ("2026-11-14", "Brouillon d'information aux représentants légaux (8 décisions DPO à trancher, non diffusable) ; déroulé de relecture pour la logopède (HTML à remplir, 17 liens de cartes vérifiés, 45 états + 8 découpes à noter) ; image « école » du lot 2 générée, « lit » en cours, non publiées", "N25, N6, N20"),
    ("2026-11-14", "Essai de bout en bout sur la base réelle (Chrome, compte de JF, classe « essai ») : code de test, tâche « syllabes sur difficulté », lien personnel, 4 essais envoyés et lus côté enseignant ; clé fausse/absente/d'un autre élève refusée ; ancienne fonction absente ; code et tâche de test retirés/révoquée. Son non écouté", "N22, N10, S5, N20"),
    ("2026-11-14", "Pack de 100 mots : les 27 mots de deux syllabes ou plus ont leurs syllabes (21 fichiers audio ajoutés, 0 généré par Azure : tous déjà dans la bibliothèque) ; rendu sonore non écouté", "N20, N8"),
    ("2026-11-14", "Écoute par syllabes : réglage de tâche (jamais / toujours / seulement quand l'élève a du mal) dans l'espace enseignant et le lien rapide, phrase explicative sous le bouton, mode d'emploi ; outil d'ajout des syllabes au pack de 100 mots (7 mots sur 27 faits, 20 attendent 21 fichiers audio) ; migration APPLIQUÉE sur la base réelle (sans erreur, non essayée sur une tâche réelle) ; poussé", "N20, N8, N10"),
    ("2026-11-14", "Vraie page d'accueil du site (deux portes élève/enseignant), barre de navigation, mode d'emploi enseignant en 7 étapes, page Gestion des données, page À propos, pied de page PLAI avec contact ; lien rapide sans compte déplacé sur #/lien ; non poussé", "N10, N11, N25"),
    ("2026-11-14", "Lot 2 d'images du pack de 100 mots : 1 image générée (jardin, à valider par JF, non publiée) ; 4 autres bloquées par le plafond Canva (quota_cooldown) ; QR-code automatique sur l'accueil", "N6, N11"),
    ("2026-11-14", "Pack de 100 mots : 220 fichiers audio publiés (2 Mo) ; pack d'essai retiré de la liste publique (sons isolés retirés du site, pas de remplacement)", "N8, N11"),
    ("2026-11-14", "Accueil élève : liste de packs au lieu d'un nom à taper ; style des lettres IA PLAI (papier crème, rayons, disque turquoise, cartes à ombre dure, sans police externe) ; non poussé", "N11"),
    ("2026-11-14", "Audit S1 : limite de débit + lien/QR personnel par élève (clé) écrits et testés en base simulée, migration APPLIQUÉE sur la base réelle (historique des 3 migrations précédentes régularisé) ; écran enseignant « Liens et QR-codes personnels »", "N22, N9, S5"),
    ("2026-11-13", "Création du logigramme statique puis interactif (25 étapes, 4 couloirs, fiches d'état)", "toutes"),
    ("2026-11-13", "Étape 2 : VOB validé par JF ; modèle xlsx pour l'enseignant ; principe de centralisation (JF et un autre admin)", "N2, N2b, N6, N6b, N8, S1"),
    ("2026-11-13", "Modèle xlsx, lecteur, constructeur de pack, audio par pack, packs « pour mon usage » (adresse remplacée par une empreinte) : créés et testés", "N2b, N9"),
    ("2026-11-13", "Commit local 051c58e : moteur, mode A, manifeste du pack, modèle xlsx, outils ; rien poussé ; audio du pack non commité", "N3, N5, N8"),
    ("2026-11-13", "Ajout du journal des mises à jour", "—"),
    ("2026-11-13", "Connecteur Canva rétabli : 1 image d'essai (pomme) générée en style papier découpé ; 19 mots restants, aucun téléchargé", "N6, S3"),
    ("2026-11-13", "Compte Canva Pro : la limite de débit persiste ; une édition de plus passée (chien) : 6 images sur 20 en fond bleu, 14 restantes", "N6, S3"),
    ("2026-11-14", "Écoute par syllabes : surlignage de la syllabe lue, trait de césure, lettres muettes grisées (pendant l'écoute seulement) ; taxi coupé tak-si (comme Lexique 4.1) ; mentions « image créée par une IA » et « voix de synthèse » ; licences du pack corrigées (ces deux derniers points poussés, 8cb0aaa ; la césure : non commitée)", "N20, N8"),
    ("2026-11-13", "Bouton « Écouter par syllabes » construit (500 ms, dernière syllabe à 75 %) : 9 mots sur 20 du pack p1-20-images ; contrôlé dans le jeu ; rendu sonore non écouté", "N20, N8"),
    ("2026-11-13", "Pack p1-20-images fabriqué avec le modèle Excel rempli (20 mots, images, source et licence) : 20 cartes, 96 états, 69 audio réutilisés, 20 images ; contrôlé dans le jeu ; non commité", "N2b, N5, N6, N8"),
    ("2026-11-13", "Fond bleu ciel pastel terminé : 20 images sur 20 éditées dans Canva (sujet inchangé), planche docs/images-canva/planche-fond-bleu.html ; reste à valider une à une, à récupérer en pleine résolution et à relier au pack", "N6, S3"),
    ("2026-11-13", "Compte Canva identifié (adresse PLAI/école, connexion Microsoft) et confirmé Pro par JF ; voiture éditée : 7 images sur 20 en fond bleu", "N6, S3"),
    ("2026-11-13", "Fond bleu ciel pastel pour toutes les images (décision de JF) : script v2.1 ; 5 images sur 20 éditées dans Canva ; édition des 15 autres bloquée par la limite de crédit Canva", "N6, S3"),
    ("2026-11-13", "Corrections de JF sur 6 images (ours, rat, lune, eau, loup, neige) : script d'images réécrit en code avec exceptions et vérifications ; 6 images v2 générées", "N6, S3"),
    ("2026-11-13", "Style validé par JF : 19 images générées (20 avec la pomme), aperçus de 200 px et planche de validation dans docs/images-canva/ ; pas encore dans le pack", "N6, S3"),
]


LIBELLES_CODE = {"code": "codé", "partiel": "codé en partie", "pas_code": "pas codé", "sans_objet": "sans objet"}
LIBELLES_CONTENU = {"cree": "créé", "partiel": "créé en partie", "pas_cree": "pas créé", "demande": "à créer à la demande", "sans_objet": "sans objet"}


def main():
    c = chiffres()
    D = details(c)
    tab = {num: (ress, prov, etat) for num, titre, ress, prov, etat in L.TABLEAU}
    for i, x in D.items():
        t = tab.get(x["tableau"]) if x["tableau"] else None
        x["ressources"] = t[0] if t else []
        x["provenance"] = [{"type": k, "texte": v} for k, v in t[1]] if t else []
        x["titre_complet"] = x["titre"]
    noeuds = {n[0]: n for n in L.NOEUDS}
    bas = {}
    for n in L.NOEUDS:
        x, y, h, _ = L.pos(n)
        bas[n[2]] = max(bas.get(n[2], 0), y + h // 2)
    larg = L.COL_X[-1] + 140
    haut = L.ROW_Y0 + 20 * L.ROW_DY + 90
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {larg} {haut}" width="{larg}" role="group" aria-label="Logigramme de PhonoActif" font-family="Arial, Helvetica, sans-serif" font-size="13">',
           '<defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#374151"/></marker></defs>']
    for nom, c0, c1 in [("Enseignant", 0, 0), ("Fabrication du pack (JF, Claude Code, services)", 1, 2), ("Élève", 3, 4), ("Services externes", 5, 5)]:
        x0, x1 = L.COL_X[c0] - 112, L.COL_X[c1] + 112
        svg.append(f'<rect x="{x0}" y="8" width="{x1 - x0}" height="{haut - 16}" fill="none" stroke="#9ca3af" stroke-dasharray="4 6"/>')
        svg.append(f'<rect x="{x0}" y="8" width="{x1 - x0}" height="34" fill="#0f6e56"/><text x="{(x0 + x1) // 2}" y="31" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">{html.escape(nom)}</text>')
    for a, b, lib, style in L.ARETES:
        svg.append(L.fleche(a, b, lib, style, bas))
    for n in L.NOEUDS:
        nid = n[0]
        titre = D[nid]["titre"]
        svg.append(f'<g class="noeud" data-id="{nid}" tabindex="0" role="button" aria-label="{html.escape(titre)} : afficher l\'état de la situation">{L.noeud_svg(n)}</g>')
    svg.append("</svg>")
    donnees = {i: {k: v for k, v in x.items() if k != "tableau"} for i, x in D.items()}
    page = MODELE.replace("@@SVG@@", "".join(svg)).replace("@@DATA@@", json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/")) \
        .replace("@@LC@@", json.dumps(LIBELLES_CODE, ensure_ascii=False)).replace("@@LK@@", json.dumps(LIBELLES_CONTENU, ensure_ascii=False)).replace("@@DATE@@", c["date"]).replace("@@JOURNAL@@", json.dumps([{"date": d, "action": a, "cases": k} for d, a, k in JOURNAL], ensure_ascii=False))
    SORTIE.write_text(page, encoding="utf-8")
    print("Écrit :", SORTIE, f"({len(D)} fiches)", c)


MODELE = r"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logigramme interactif PhonoActif</title>
<style>
:root{--teal:#0f6e56;--orange:#c2410c;--gris:#4b5563;--ind:#4338ca;--bg:#faf9f7}
body{font-family:Arial,Helvetica,sans-serif;font-size:16px;margin:0;background:var(--bg);color:#222}
main{max-width:1500px;margin:0 auto;padding:16px}
h1{color:var(--teal);margin:8px 0}
.defil{overflow-x:auto;border:1px solid #ccc;background:#fff;padding:8px}
.noeud{cursor:pointer}.noeud:focus{outline:none}.noeud:focus-visible rect,.noeud:focus-visible polygon{stroke-width:5}
.noeud:hover rect,.noeud:hover polygon{stroke-width:4}
.noeud.sel rect,.noeud.sel polygon{stroke:#000;stroke-width:5}
.noeud.dim{opacity:.22}
.filtres{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;align-items:center}
.filtres button{font-size:15px;min-height:40px;padding:4px 12px;border:2px solid var(--teal);background:#fff;border-radius:8px;cursor:pointer}
.filtres button[aria-pressed=true]{background:var(--teal);color:#fff}
#journal table{border-collapse:collapse;width:100%;background:#fff}#journal th,#journal td{border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top}#journal th{background:var(--teal);color:#fff}
.note{background:#fff;border-left:6px solid #f97316;padding:6px 14px;margin:12px 0}
#panneau{position:fixed;top:0;right:0;height:100%;width:min(460px,100%);background:#fff;border-left:4px solid var(--teal);box-shadow:-4px 0 14px rgba(0,0,0,.18);
 overflow-y:auto;padding:14px 18px 40px;transform:translateX(105%);transition:transform .18s;z-index:10;box-sizing:border-box}
#panneau.ouvert{transform:none}
@media (prefers-reduced-motion:reduce){#panneau{transition:none}}
#panneau h2{margin:4px 40px 8px 0;color:var(--teal);font-size:20px}
#panneau h3{margin:16px 0 4px;font-size:16px;color:#111;border-bottom:1px solid #ddd}
#fermer{position:absolute;top:8px;right:10px;font-size:20px;min-width:44px;min-height:44px;border:2px solid var(--teal);background:#fff;border-radius:8px;cursor:pointer}
.etat{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;align-items:start;margin:8px 0}
.pill{display:inline-block;border:2px solid;border-radius:14px;padding:1px 10px;font-weight:bold;font-size:14px}
.p-code{border-color:var(--teal);background:#e8f4ef;color:#064e3b}.p-partiel{border-color:var(--orange);background:#fff7ed;color:#7c2d12;border-style:dashed}
.p-pas{border-color:var(--gris);background:#f3f4f6;color:#111;border-style:dotted}.p-demande{border-color:var(--ind);background:#eef2ff;color:#312e81;border-style:double;border-width:4px}
.p-so{border-color:#9ca3af;background:#fff;color:#4b5563}
#panneau ul{margin:4px 0;padding-left:20px}#panneau li{margin-bottom:4px}
.i,.e{display:inline-block;font-size:12px;font-weight:bold;border-radius:4px;padding:1px 6px;color:#fff}.i{background:var(--teal)}.e{background:var(--ind)}
.bloc{background:#fef2f2;border-left:5px solid #b91c1c;padding:2px 10px}.suite{background:#f0fdf4;border-left:5px solid var(--teal);padding:2px 10px}.dec{background:#fffbeb;border-left:5px solid #d97706;padding:2px 10px}
code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:14px;word-break:break-all}
.vide{color:#6b7280;font-style:italic}
@media print{#panneau{display:none}.defil{overflow:visible}svg{width:100%;height:auto}}
</style></head><body><main>
<h1>PhonoActif : logigramme interactif</h1>
<p>Cliquer sur une case (ou la choisir au clavier puis Entrée) pour voir l'état de la situation : ce qui est codé, ce qui est créé, ce qui est à créer à la demande, ce qui bloque. Relevé du @@DATE@@ ; les chiffres de fichiers et de Git sont lus à la génération.</p>
<div class="filtres" role="group" aria-label="Filtrer les cases par état">
<span>Montrer seulement :</span>
<button type="button" data-f="code:code" aria-pressed="false">codé</button>
<button type="button" data-f="code:partiel" aria-pressed="false">codé en partie</button>
<button type="button" data-f="code:pas_code" aria-pressed="false">pas codé</button>
<button type="button" data-f="contenu:cree" aria-pressed="false">contenu créé</button>
<button type="button" data-f="contenu:partiel" aria-pressed="false">contenu en partie</button>
<button type="button" data-f="contenu:pas_cree" aria-pressed="false">contenu pas créé</button>
<button type="button" data-f="contenu:demande" aria-pressed="false">à créer à la demande</button>
<button type="button" data-f="bloque" aria-pressed="false">avec blocage</button>
<button type="button" id="tout" aria-pressed="false">tout afficher</button>
<span id="compte" role="status"></span>
</div>
<div class="defil">@@SVG@@</div>
<p class="note">Bordure pleine : construit ; tiretée : partiel ; pointillée : à construire ; bleue : service externe. Chaque case dit aussi son état par écrit. Dans le panneau : INT = interne (JF, Pôle, code du projet), EXT = externe avec le nom du fournisseur. « Non vérifié » = Claude n'a pas pu le confirmer.</p>
<h2>Journal des mises à jour</h2>
<div id="journal"></div>
</main>
<aside id="panneau" role="dialog" aria-modal="false" aria-labelledby="pt" tabindex="-1" hidden>
<button type="button" id="fermer" aria-label="Fermer le panneau">×</button>
<h2 id="pt"></h2><div id="pc"></div>
</aside>
<script>
var JOURNAL = @@JOURNAL@@, DATA = @@DATA@@, LC = @@LC@@, LK = @@LK@@;
var panneau = document.getElementById("panneau"), pc = document.getElementById("pc"), pt = document.getElementById("pt"), actif = null, retour = null;
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
function pill(texte, cle) {
  var map = { code: "p-code", partiel: "p-partiel", pas_code: "p-pas", pas_cree: "p-pas", cree: "p-code", demande: "p-demande", sans_objet: "p-so" };
  var glyphe = { code: "● ", cree: "● ", partiel: "◐ ", pas_code: "○ ", pas_cree: "○ ", demande: "▷ ", sans_objet: "– " }[cle] || "";
  return el("span", "pill " + map[cle], glyphe + texte);
}
function liste(titre, items, cls) {
  if (!items || !items.length) return;
  var h = el("h3", null, titre); pc.appendChild(h);
  var ul = el("ul", cls); items.forEach(function (t) { ul.appendChild(el("li", null, t)); }); pc.appendChild(ul);
}
function ouvrir(id, declencheur) {
  var d = DATA[id]; if (!d) return;
  if (actif) document.querySelector('.noeud[data-id="' + actif + '"]').classList.remove("sel");
  actif = id; retour = declencheur;
  document.querySelector('.noeud[data-id="' + id + '"]').classList.add("sel");
  pt.textContent = d.titre; pc.textContent = "";
  var g = el("div", "etat");
  g.appendChild(el("strong", null, "Code")); g.appendChild(pill(LC[d.code], d.code));
  g.appendChild(el("strong", null, "Contenus")); g.appendChild(pill(LK[d.contenu], d.contenu));
  g.appendChild(el("strong", null, "Validation"));
  var v = el("div"); (d.valid && d.valid.length ? d.valid : ["Aucune validation relevée."]).forEach(function (t) { v.appendChild(el("div", null, t)); }); g.appendChild(v);
  pc.appendChild(g);
  liste("Ce qui existe", d.existe); liste("Ce qui manque", d.manque);
  liste("À créer à la demande", d.demande);
  if (d.blocages && d.blocages.length) { pc.appendChild(el("h3", null, "Blocages")); var u = el("ul", "bloc"); d.blocages.forEach(function (t) { u.appendChild(el("li", null, t)); }); pc.appendChild(u); }
  if (d.suite && d.suite.length) { pc.appendChild(el("h3", null, "Prochaine action")); var u2 = el("ul", "suite"); d.suite.forEach(function (t) { u2.appendChild(el("li", null, t)); }); pc.appendChild(u2); }
  if (d.decision && d.decision.length) { pc.appendChild(el("h3", null, "Décision attendue de JF")); var u3 = el("ul", "dec"); d.decision.forEach(function (t) { u3.appendChild(el("li", null, t)); }); pc.appendChild(u3); }
  liste("Ressources nécessaires", d.ressources);
  if (d.provenance && d.provenance.length) {
    pc.appendChild(el("h3", null, "Provenance")); var u4 = el("ul");
    d.provenance.forEach(function (p) { var li = el("li"); li.appendChild(el("span", p.type === "INT" ? "i" : "e", p.type)); li.appendChild(document.createTextNode(" " + p.texte)); u4.appendChild(li); }); pc.appendChild(u4);
  }
  if (d.fichiers && d.fichiers.length) { pc.appendChild(el("h3", null, "Fichiers")); var u5 = el("ul"); d.fichiers.forEach(function (f) { var li = el("li"); li.appendChild(el("code", null, f)); u5.appendChild(li); }); pc.appendChild(u5); }
  panneau.hidden = false; panneau.classList.add("ouvert"); panneau.scrollTop = 0; panneau.focus();
}
function fermer() {
  panneau.classList.remove("ouvert"); panneau.hidden = true;
  if (actif) document.querySelector('.noeud[data-id="' + actif + '"]').classList.remove("sel");
  actif = null; if (retour) retour.focus();
}
document.querySelectorAll(".noeud").forEach(function (n) {
  n.addEventListener("click", function () { ouvrir(n.getAttribute("data-id"), n); });
  n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(n.getAttribute("data-id"), n); } });
});
document.getElementById("fermer").addEventListener("click", fermer);
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && actif) fermer(); });
var filtreActif = null;
function appliquer(f) {
  filtreActif = f; var n = 0, tot = 0;
  document.querySelectorAll(".noeud").forEach(function (g) {
    var d = DATA[g.getAttribute("data-id")]; tot++;
    var ok = !f || (f === "bloque" ? (d.blocages && d.blocages.length > 0) : (f.split(":")[0] === "code" ? d.code === f.split(":")[1] : d.contenu === f.split(":")[1]));
    g.classList.toggle("dim", !ok); if (ok) n++;
  });
  document.querySelectorAll(".filtres button").forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-f") === f && !!f) || (b.id === "tout" && !f))); });
  document.getElementById("compte").textContent = f ? n + " case(s) sur " + tot : "";
}
document.querySelectorAll(".filtres button[data-f]").forEach(function (b) { b.addEventListener("click", function () { appliquer(filtreActif === b.getAttribute("data-f") ? null : b.getAttribute("data-f")); }); });
document.getElementById("tout").addEventListener("click", function () { appliquer(null); });
appliquer(null);
(function () {
  var t = el("table"); var th = el("thead"), tr = el("tr");
  ["Date", "Action", "Cases touchées"].forEach(function (x) { tr.appendChild(el("th", null, x)); }); th.appendChild(tr); t.appendChild(th);
  var tb = el("tbody"); JOURNAL.slice().reverse().forEach(function (j) { var r = el("tr"); [j.date, j.action, j.cases].forEach(function (x) { r.appendChild(el("td", null, x)); }); tb.appendChild(r); });
  t.appendChild(tb); document.getElementById("journal").appendChild(t);
})();
</script></body></html>"""


if __name__ == "__main__":
    main()
