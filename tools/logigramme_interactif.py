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
      ["Limite de débit écrite (migration 20261114000000, APPLIQUÉE à la base réelle le 2026-11-14) : 300 lignes neuves par heure et par élève, 3000 par tâche ; le client réessaie plus tard.", "Lien ou QR personnel par élève (choix de JF) : le lien porte le code et une clé aléatoire ; le serveur refuse l'écriture sans la bonne clé ; l'enseignant imprime les QR et peut changer une clé. Un lien de tâche sans clé laisse jouer mais n'envoie rien.", "Reste ouvert : un élève qui récupère le lien (ou une photo du QR) d'un camarade écrit sous son code."], blocages=["Migration appliquée le 2026-11-14 : fonction à 4 paramètres présente et ancienne fonction absente (constaté par appel API) ; aucune partie complète jouée sur la base réelle."],
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
