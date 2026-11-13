# -*- coding: utf-8 -*-
"""Génère docs/logigramme-phonoactif.html : logigramme (SVG) du parcours de l'enseignant et de l'élève, puis tableau des ressources
par étape avec leur provenance. Contenu = état constaté au 2026-11-13 (voir le tableau « état et preuve »).
Usage : python -I tools/logigramme_phonoactif.py"""
import html
import pathlib
import textwrap

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / "docs" / "logigramme-phonoactif.html"

COL_X = [140, 365, 590, 815, 1040, 1265]      # centres des colonnes
ROW_Y0, ROW_DY = 100, 124
BW, LIGNE = 200, 16

# statut : C construit, P partiel, A à construire, X service externe, T départ/fin
STYLES = {
    "C": ("#e8f4ef", "#0f6e56", "", "construit"),
    "P": ("#fff7ed", "#c2410c", "7 4", "partiel"),
    "A": ("#f3f4f6", "#4b5563", "3 3", "à construire"),
    "X": ("#eef2ff", "#4338ca", "", "externe"),
    "T": ("#ffffff", "#0f6e56", "", ""),
}

# (id, col, ligne, forme, statut, numéro, texte)
NOEUDS = [
    ("N1", 0, 1, "pill", "T", "1", "Besoin : voir vite quelles correspondances lettre-son un élève n'a pas acquises"),
    ("N2", 0, 2, "box", "P", "2", "Choisir les mots : liste du référentiel (VOB) ou liste propre"),
    ("N2b", 0, 3, "box", "P", "2b", "Compléter le modèle xlsx : mots et images de l'enseignant"),
    ("N3", 1, 3, "box", "C", "3", "Segmenter les mots, sans IA : lexique, règles, corrections"),
    ("D1", 1, 4, "diamond", "C", "", "Tous les sons connus ?"),
    ("N4", 2, 4, "box", "P", "4", "Revue : JF écoute, corrige, puis on revérifie les mots à codes inconnus"),
    ("N5", 1, 5, "box", "P", "5", "Fabriquer l'audio : états lettre par lettre, syllabes, mots entiers"),
    ("N6", 2, 5, "box", "P", "6", "Images en papier découpé, style commun"),
    ("N7", 2, 6, "box", "P", "7", "Phrases d'aide (option) écrites par JF"),
    ("N6b", 2, 7, "box", "A", "6b", "Centraliser : JF et un autre admin vérifient la cohérence graphique"),
    ("N8", 1, 7, "box", "P", "8", "Publier dans la bibliothèque commune : dépôt, build, déploiement"),
    ("N9", 0, 8, "box", "C", "9", "Créer la classe, les codes anonymes, la tâche : lien et QR"),
    ("N10", 0, 9, "box", "C", "10", "Donner lien ou QR, et codes papier, aux élèves (hors application)"),
    ("N11", 3, 9, "box", "C", "11", "Élève : ouvre le lien, saisit son code"),
    ("N12", 3, 10, "box", "C", "12", "Voit l'image ou le mot, peut Écouter le mot"),
    ("N13", 3, 11, "box", "C", "13", "Pose une lettre"),
    ("D2", 3, 12, "diamond", "C", "", "Lettres posées = début du mot ?"),
    ("N14", 3, 13, "box", "C", "14", "Entend la chaîne posée (fichier pré-généré)"),
    ("N15", 4, 12, "box", "A", "15", "Lecture en direct (Azure) : lettre en trop, ordre autre"),
    ("D3", 3, 14, "diamond", "C", "", "Toutes les lettres posées ?"),
    ("N16", 3, 15, "box", "C", "16", "Vérifier"),
    ("D4", 3, 16, "diamond", "C", "", "Mot juste ?"),
    ("N17", 4, 16, "box", "C", "17", "Bravo ; carte suivante, puis bilan sans score"),
    ("N18", 3, 17, "box", "C", "18", "Zone vidée, essai suivant (3 au plus) ; au 3e échec le mot est révélé"),
    ("N19", 4, 9, "box", "A", "19", "Mode libre : entendre une combinaison de lettres, sans mot cible"),
    ("N20", 4, 10, "box", "P", "20", "Écouter par syllabes : espace 500 ms, dernière syllabe 75 %"),
    ("N21", 4, 11, "box", "C", "21", "Aide graduée : écoute, indice, révélation"),
    ("N22", 4, 18, "box", "C", "22", "Essais gardés sur l'appareil, envoyés avec jeton et code"),
    ("N23", 0, 19, "box", "P", "23", "Lire les résultats par classe et par élève (liste brute)"),
    ("N24", 0, 20, "box", "A", "24", "Tableau de bord : grille élèves par sons, relevé pour un intervenant extérieur"),
    ("N25", 0, 21, "box", "T", "25", "Décider : revoir mots, pack, réglages"),
    ("S1", 5, 3, "box", "X", "", "Bases lexicales : ManuLemme, liste VOB (étapes 2 à 4)"),
    ("S2", 5, 5, "box", "X", "", "Azure Speech, Microsoft, voix fr-BE Charline (étapes 5, 7, 15)"),
    ("S3", 5, 6, "box", "X", "", "Canva, génération d'images (étape 6)"),
    ("S4", 5, 7, "box", "X", "", "GitHub et Vercel (étape 8)"),
    ("S5", 5, 8, "box", "X", "", "Supabase, base partagée PLAI (étapes 9, 22, 23)"),
    ("S6", 5, 12, "box", "X", "", "Lingua Libre, Wikimedia Commons : évalué, non intégré"),
]

# arêtes : (de, vers, libellé, style) ; style : "" plein, "p" pointillé ; routes spéciales plus bas
ARETES = [
    ("N1", "N2", "", ""), ("N2", "N2b", "", ""), ("N2b", "N3", "", ""), ("N3", "D1", "", ""), ("D1", "N4", "non", ""),
    ("D1", "N5", "oui", ""), ("N5", "N8", "", ""), ("N6", "N7", "", ""), ("N7", "N6b", "", ""), ("N6b", "N8", "", ""),
    ("N8", "N9", "", ""), ("N9", "N10", "", ""), ("N10", "N11", "lien, codes", ""),
    ("N11", "N12", "", ""), ("N12", "N13", "", ""), ("N13", "D2", "", ""), ("D2", "N14", "oui", ""),
    ("D2", "N15", "non", ""), ("N14", "D3", "", ""), ("D3", "N13", "non", "retourG"), ("D3", "N16", "oui", ""),
    ("N16", "D4", "", ""), ("D4", "N17", "oui", ""), ("D4", "N18", "non", ""), ("N18", "N13", "essai suivant", "retourG2"),
    ("N17", "N22", "", ""), ("N22", "N23", "envoi, base, lecture", ""), ("N23", "N24", "", ""), ("N24", "N25", "", ""),
    ("N25", "N2", "boucle", "retourM"),
    ("N11", "N19", "", "p"), ("N12", "N20", "", "p"), ("N13", "N21", "", "p"),
]


def pos(n):
    _, c, r, forme, st, num, txt = n
    lignes = textwrap.wrap(txt, 27)
    nb = len(lignes) + (1 if STYLES[st][3] else 0) + (1 if num else 0)
    h = max(50, 12 + nb * LIGNE) if forme != "diamond" else 96
    return COL_X[c], ROW_Y0 + (r - 1) * ROW_DY, h, lignes


def noeud_svg(n):
    nid, c, r, forme, st, num, txt = n
    x, y, h, lignes = pos(n)
    fond, trait, tirets, etiquette = STYLES[st]
    dash = f' stroke-dasharray="{tirets}"' if tirets else ""
    w = BW
    if forme == "diamond":
        pts = f"{x},{y - h // 2} {x + w // 2 + 6},{y} {x},{y + h // 2} {x - w // 2 - 6},{y}"
        forme_svg = f'<polygon points="{pts}" fill="{fond}" stroke="{trait}" stroke-width="2"{dash}/>'
    elif forme == "pill":
        forme_svg = f'<rect x="{x - w // 2}" y="{y - h // 2}" width="{w}" height="{h}" rx="{h // 2}" fill="{fond}" stroke="{trait}" stroke-width="2.5"/>'
    else:
        forme_svg = f'<rect x="{x - w // 2}" y="{y - h // 2}" width="{w}" height="{h}" rx="8" fill="{fond}" stroke="{trait}" stroke-width="2"{dash}/>'
    corps = []
    total = len(lignes) + (1 if etiquette else 0) + (1 if num else 0)
    y0 = y - (total * LIGNE) // 2 + 12
    k = 0
    if num:
        corps.append(f'<text x="{x}" y="{y0}" text-anchor="middle" font-weight="bold" fill="{trait}">Étape {num}</text>')
        k += 1
    for l in lignes:
        corps.append(f'<text x="{x}" y="{y0 + k * LIGNE}" text-anchor="middle">{html.escape(l)}</text>')
        k += 1
    if etiquette:
        corps.append(f'<text x="{x}" y="{y0 + k * LIGNE}" text-anchor="middle" font-style="italic" fill="{trait}">[{etiquette}]</text>')
    return forme_svg + "".join(corps)


def bord(n, cote):
    x, y, h, _ = pos(n)
    hw = BW // 2 + (6 if n[3] == "diamond" else 0)
    return {"haut": (x, y - h // 2), "bas": (x, y + h // 2), "gauche": (x - hw, y), "droite": (x + hw, y)}[cote]


def fleche(a, b, lib, style, bas_ligne):
    A = {n[0]: n for n in NOEUDS}
    na, nb = A[a], A[b]
    dash = ' stroke-dasharray="2 4"' if style == "p" else (' stroke-dasharray="6 4"' if style.startswith("retour") else "")
    if style == "retourG":      # boucle par la gauche (D3 -> N13)
        p0, p1, xm = bord(na, "gauche"), bord(nb, "gauche"), COL_X[3] - 150
        pts = [p0, (xm, p0[1]), (xm, p1[1]), p1]
    elif style == "retourG2":   # N18 -> N13, plus à gauche
        p0, p1, xm = bord(na, "gauche"), bord(nb, "gauche"), COL_X[3] - 168
        pts = [p0, (xm, p0[1]), (xm, p1[1]), p1]
    elif style == "retourM":    # N25 -> N2 par la marge gauche
        p0, p1, xm = bord(na, "gauche"), bord(nb, "gauche"), 18
        pts = [p0, (xm, p0[1]), (xm, p1[1]), p1]
    elif style == "retour":     # N4 -> D1 : retour court, sous la flèche aller
        p0, p1 = bord(na, "bas"), bord(nb, "bas")
        ym = max(p0[1], p1[1]) + 16
        pts = [p0, (p0[0], ym), (p1[0], ym), p1]
    elif na[1] == nb[1] and nb[2] > na[2]:
        pts = [bord(na, "bas"), bord(nb, "haut")]
    elif na[2] == nb[2]:
        if COL_X[nb[1]] > COL_X[na[1]]:
            pts = [bord(na, "droite"), bord(nb, "gauche")]
        else:
            pts = [bord(na, "gauche"), bord(nb, "droite")]
    elif nb[2] > na[2]:
        p0, p1 = bord(na, "bas"), bord(nb, "haut")
        ym = min(bas_ligne.get(na[2], p0[1]) + 14, p1[1] - 14)
        if ym <= p0[1] + 4:
            ym = (p0[1] + p1[1]) // 2
        pts = [p0, (p0[0], ym), (p1[0], ym), p1]
    else:
        p0, p1 = bord(na, "haut"), bord(nb, "bas")
        ym = (p0[1] + p1[1]) // 2
        pts = [p0, (p0[0], ym), (p1[0], ym), p1]
    d = " ".join(("M" if i == 0 else "L") + f"{px},{py}" for i, (px, py) in enumerate(pts))
    svg = f'<path d="{d}" fill="none" stroke="#374151" stroke-width="1.8"{dash} marker-end="url(#fl)"/>'
    if lib:
        lx, ly = (pts[0][0] + pts[1][0]) // 2, (pts[0][1] + pts[1][1]) // 2
        if style.startswith("retour") or len(pts) > 2:
            lx, ly = pts[1][0], pts[1][1]
        svg += f'<text x="{lx + 6}" y="{ly - 5}" font-size="12" font-style="italic" fill="#374151">{html.escape(lib)}</text>'
    return svg


# ---- Tableau : ressources par étape. Chaque ligne : (n°, titre, [ressources], [provenances], état et preuve) ----
INT, EXT = "INT", "EXT"
TABLEAU = [
    ("1", "Besoin de l'enseignant", [
        "Observation de classe : élèves en apprentissage tardif ou en remédiation de la lecture.",
        "Formulation du besoin : voir vite quelles correspondances graphème-son sont déficitaires, lesquelles reviennent chez un élève, et pouvoir transmettre ces observations à un intervenant extérieur.",
    ], [(INT, "l'enseignant et JF (Pôle Territorial de la Ville de Liège)"), (INT, "texte du document de conception, section 1")],
     "constaté : document de conception 2026-11-11"),
    ("2", "Choisir les mots", [
        "Liste P1 de JF (941 mots, dans l'ordre de fréquence).",
        "Liste VOB par année (3 435 mots, année suggérée P1 à P6).",
        "Liste propre à l'enseignant, déposée dans le modèle xlsx (étape 2b, à créer).",
    ], [(INT, "JF : liste P1"), (INT, "VOB : fait partie du référentiel, selon JF (droits non vérifiés par Claude)"), (INT, "enseignant")],
     "partiel : outils en ligne de commande (analyser_liste, preparer_pack) ; l'enseignant ne peut pas le faire seul dans l'application"),
    ("2b", "Modèle xlsx de l'enseignant", [
        "Fichier Excel : une ligne par mot (mot, niveau, nom du fichier image, source et licence de l'image, phrase d'aide facultative).",
        "Notice et exemple dans le fichier.",
        "Images de l'enseignant, ou fournies par la bibliothèque commune.",
    ], [(INT, "JF et Claude : modèle, notice et outils, créés le 2026-11-13"), (INT, "enseignant : contenu"), (EXT, "droits des images : responsabilité de la personne qui les fournit")],
     "partiel : modèle xlsx, lecteur et constructeur de pack créés et testés (docs/fabriquer-un-pack.md) ; jamais essayé par un enseignant ; envoi par courriel à JF, pas de dépôt dans l'application"),
    ("3", "Segmenter les mots, sans IA", [
        "Lexique ManuLemme 2.4 (16 004 entrées) pour la lecture finale d'un mot.",
        "Règles contextuelles de lecture (états intermédiaires et mots absents).",
        "Corrections de JF (priorité sur ManuLemme).",
    ], [(EXT, "ManuLemme : auteurs et licence non vérifiés par Claude ; licence « OK » selon JF"), (INT, "règles : écrites avec Claude, 93,3 % d'accord avec ManuLemme sur 6 575 mots jamais regardés"), (INT, "JF : data/corrections.json")],
     "construit : 356 tests du moteur (355 réussis, 1 ignoré) ; justesse mesurée contre ManuLemme, pas à l'oreille ; commité en local le 2026-11-13, pas poussé"),
    ("4", "Revue des mots à codes inconnus", [
        "Page de revue autonome (revue.html) : écoute, proposition, validation.",
        "Oreille et décision de JF.",
        "Sons isolés historiques du Lilémo numérique (voix ElevenLabs découpée), retirés du site.",
    ], [(INT, "JF : revue ; outil écrit avec Claude"), (EXT, "ElevenLabs (voix) : provenance et droits à confirmer")],
     "construit, recette non faite : 0 case cochée sur 10 dans docs/recette-revue.md ; file de revue de 823 mots selon la note du 2026-11-11"),
    ("5", "Fabriquer l'audio du pack", [
        "Transcription phonétique (IPA) de chaque état lettre par lettre.",
        "Voix de synthèse belge, appelée avec l'IPA : un fichier par état, par syllabe et par mot entier, à -30 % de vitesse au-delà d'un son.",
        "Clé Azure, lue seulement quand JF lance la commande.",
        "ffmpeg (local) : rognage des silences, volume commun.",
    ], [(INT, "table son vers IPA et syllabation : code du projet (accord de 99,7 % avec Lexique, en partie ajusté sur le même jeu)"), (EXT, "Microsoft : Azure Speech, voix fr-BE-CharlineNeural, compte de JF"), (INT, "JF : lance les générations"), (EXT, "ffmpeg : outil libre")],
     "partiel : 220 fichiers d'états du pack de 100 mots, 112 syllabes + 20 fichiers de mots de 3 syllabes ; bibliothèque complète de 2 780 fichiers non générée ; conditions Microsoft pour la redistribution de l'audio non vérifiées ; quota gratuit non vérifié"),
    ("6", "Images en papier découpé", [
        "Script de style papier découpé (bloc de prompt, 6 couleurs, fond crème).",
        "Génération d'images, une par mot concret.",
        "Validation de chaque image par JF ou un autre admin (règle : images choisies par l'enseignant, pas par l'IA).",
    ], [(INT, "essai-images-canva/script-generation-images.md : JF et Claude"), (EXT, "Canva : compte Pro de JF (adresse PLAI/école), génération d'images ; conditions d'usage dans une app publique non vérifiées"), (INT, "JF : validation")],
     "partiel : connecteur Canva rétabli le 2026-11-13, 20 images générées en papier découpé (aperçus de 200 px, planche de validation dans docs/images-canva/) ; style validé par JF, images pas validées une à une ; aucune image dans le pack"),
    ("7", "Phrases d'aide (option)", [
        "Une courte phrase par mot, avec le mot cible un peu plus fort, puis le mot seul.",
        "Réécriture par JF (ses élèves, son vocabulaire).",
        "Voix de synthèse : mot cible forcé en IPA dans la phrase.",
    ], [(INT, "proposition de Claude, réécriture et écoute par JF"), (EXT, "Microsoft : Azure Speech")],
     "partiel : essai de 10 phrases écrit (essai-phrases.py), audio non généré, rien écouté ; effet pédagogique non établi"),
    ("6b", "Centralisation et cohérence graphique", [
        "Rôle d'administrateur (JF et un autre admin).",
        "Style commun (script papier découpé) et liste de contrôle graphique.",
        "Comptes centraux pour la voix et les images : un seul coût pour tous les enseignants.",
        "Bibliothèque commune de packs.",
    ], [(INT, "JF et un autre admin à désigner"), (EXT, "Microsoft (Azure) et Canva : comptes et budget à confirmer")],
     "à créer : suggestion de JF du 2026-11-13 ; rien construit"),
    ("8", "Publier dans la bibliothèque commune", [
        "Dossier du pack (manifeste, audio, images) et liste des packs.",
        "Dépôt GitHub, build Vite, déploiement Vercel.",
        "Licence du projet : PolyForm Noncommercial 1.0.0.",
    ], [(INT, "JF : dépôt jfb4plai/PhonoActif, licence"), (EXT, "GitHub (Microsoft) et Vercel : hébergement")],
     "partiel : projet Vercel existant et site qui répond ; mode A et manifeste du pack commités en local, rien poussé ; audio du pack non commité ; version en ligne non comparée au code local"),
    ("9", "Créer classe, codes, tâche (lien et QR)", [
        "Compte enseignant PLAI.",
        "Base : classes, codes d'élèves, tâches, essais (5 tables phono_*, droits par ligne).",
        "Liste des packs et réglages : mode du mot, habillage, nombre de lettres en trop, accents.",
        "Bibliothèque de QR-codes.",
    ], [(EXT, "Supabase : projet partagé de toutes les apps PLAI ; région non vérifiée"), (INT, "schéma et règles d'accès : code du projet"), (EXT, "qrcode : bibliothèque libre")],
     "construit : 32 tests SQL réussis sur PostgreSQL simulé, jamais sur la base réelle ; défauts de sécurité relevés par lecture (voir l'audit)"),
    ("10", "Donner lien et codes aux élèves", [
        "Codes anonymes choisis par l'enseignant ; la correspondance code-élève reste sur papier.",
        "Lien ou QR affiché, imprimé ou envoyé.",
        "Appareil de l'élève : tablette ou ordinateur avec navigateur récent.",
    ], [(INT, "enseignant et école"), (INT, "matériel de l'école")],
     "hors application ; recette sur tablette non faite (0 case cochée sur 3)"),
    ("11 à 14", "Parcours de l'élève : mot, lettres, lecture de la chaîne", [
        "Application élève (React) servie par Vercel ; habillages A1 « Cahier colorié » (P1 à P3) et M1 « Sobre clair » (P4 et plus), texte en Arial 18 px.",
        "Pack : manifeste, états audio pré-générés, images ou mot affiché.",
        "Lecture du fichier correspondant à la chaîne posée ; aucun son si la chaîne n'est pas le début du mot.",
    ], [(INT, "code du projet, charte PLAI"), (INT, "habillages : choix de JF"), (EXT, "Vercel : hébergement des fichiers statiques")],
     "construit : mode A branché, 64 tests d'interface réussis (6 sur le mode A) ; sons non écoutés ; mode A non défini comme mode par défaut (réglé par le type du pack)"),
    ("15", "Lecture en direct", [
        "Fonction serveur qui appelle Azure avec une clé côté serveur.",
        "Contrôle d'accès, limite de débit, plafond de coût.",
    ], [(INT, "à écrire (aucun dossier api/)"), (EXT, "Microsoft : Azure Speech, à facturer")],
     "à construire ; décision de JF du 2026-11-12 ; connexion Internet nécessaire"),
    ("16 à 18", "Vérifier, bravo, essais suivants, révélation", [
        "Règle : mot juste = lettres posées dans l'ordre ; accents exigés ou non selon la tâche ; 3 essais au plus.",
        "Suivi graphème-son calculé à partir des lettres posées.",
    ], [(INT, "code du projet")],
     "construit et testé (mode A : mot juste, mot faux avec suivi des liaisons)"),
    ("19", "Mode libre sans mot cible", [
        "Lecture d'une chaîne quelconque : bibliothèque pré-générée si disponible, sinon lecture en direct.",
        "Limite de 8 lettres (hypothèse tirée des 8 cases du jeu physique).",
    ], [(INT, "JF : décision ; à écrire"), (EXT, "Microsoft : Azure Speech")],
     "à construire"),
    ("20", "Écouter par syllabes : espace 500 ms, dernière syllabe 75 %", [
        "Fichiers de syllabes (112 pour les 100 mots, plus 20 pour 5 mots de 3 syllabes), coupés sur les sons du mot entier.",
        "Lecture en série dans le navigateur : espace de 500 ms entre les syllabes, dernière syllabe ralentie à 75 %.",
        "Relecture par une spécialiste ou un spécialiste de phonologie.",
    ], [(INT, "valeurs choisies à l'oreille par JF seul"), (INT, "code de la page d'essai"), (EXT, "logopède, professeure ou professeur de phonologie : relecture en attente"), (EXT, "Microsoft : Azure Speech")],
     "partiel : bouton construit et testé dans le jeu (mots de 2 syllabes ou plus, pack p1-20-images) ; rendu sonore non écouté, relecture par un pro en attente"),
    ("21", "Aide graduée", [
        "Écoute du mot, indice (première lettre à corriger), révélation du mot.",
    ], [(INT, "code du projet")],
     "construit ; niveaux d'aide figés dans la base (4 valeurs : ajouter un niveau demande une migration)"),
    ("22", "Envoyer les essais", [
        "Journal local dans le navigateur, puis envoi avec jeton de tâche et code d'élève.",
        "Réseau ; fonction d'envoi réservée aux lots valides (200 lignes au plus).",
    ], [(INT, "code du projet"), (EXT, "Supabase : réception")],
     "construit ; pas de limite de débit sur l'envoi (relevé de l'audit) ; envoi différé si hors ligne"),
    ("23", "Lire les résultats", [
        "Compte enseignant ; droits de lecture par classe (maître ou invité).",
    ], [(EXT, "Supabase"), (INT, "règles d'accès du projet")],
     "partiel : liste brute des essais ; pas de synthèse"),
    ("24", "Tableau de bord et relevé", [
        "Grille élèves par sons avec symbole (jamais la couleur seule), jauges, comparaison élève et groupe.",
        "Seuils rouge, orange, vert : 60 % et 80 %, gris sous 5 essais.",
        "Relevé pour la logopède ou le logopède, avec accord des représentants légaux.",
        "Base légale, information des familles, durée de conservation : non tranchées.",
    ], [(INT, "maquette retenue (v4) ; seuils : choix provisoires de Claude, sans source"), (EXT, "logopède : destinataire ; accord des familles"), (INT, "JF, DPO du Pôle : registre de traitement (brouillon)")],
     "à construire"),
    ("25", "Décider et boucler", [
        "Jugement de l'enseignant ; retour aux étapes 2, 5, 6.",
    ], [(INT, "enseignant")],
     "hors application"),
    ("Garde-fous", "Transversaux", [
        "Corpus RISS (plus de 520 000 articles) : toute référence vérifiée avant publication.",
        "Registre de traitement (JF est DPO) ; analyse d'impact à décider.",
        "Licences : ManuLemme, VOB, Lexique 4.1, Lingua Libre, Azure.",
        "Relectures par des pros : paquets prêts (syllabes ; comparaison de voix à l'aveugle).",
        "Affichage des limites (93 %, pas de pluriel…).",
    ], [(INT, "Pôle PLAI : RISS et JF"), (EXT, "auteurs et titulaires des licences"), (EXT, "relecteurs externes à identifier")],
     "partiel : limites rédigées (brouillon docs/limites-a-afficher.md), non affichées dans l'application"),
]


def tableau_html():
    lignes = []
    for num, titre, ress, prov, etat in TABLEAU:
        r = "".join(f"<li>{html.escape(x)}</li>" for x in ress)
        p = "".join(f'<li><span class="{"i" if k == INT else "e"}">{k}</span> {html.escape(t)}</li>' for k, t in prov)
        lignes.append(f"<tr><td class='n'>{html.escape(num)}</td><th scope='row'>{html.escape(titre)}</th><td><ul>{r}</ul></td><td><ul>{p}</ul></td><td>{html.escape(etat)}</td></tr>")
    return "\n".join(lignes)


def main():
    A = {n[0]: n for n in NOEUDS}
    # bas des lignes (pour router les flèches sous les boîtes de la même ligne)
    bas = {}
    for n in NOEUDS:
        x, y, h, _ = pos(n)
        bas[n[2]] = max(bas.get(n[2], 0), y + h // 2)
    larg = COL_X[-1] + 140
    haut = ROW_Y0 + 20 * ROW_DY + 90
    couloirs = [("Enseignant", 0, 0), ("Fabrication du pack (JF, Claude Code, services)", 1, 2), ("Élève", 3, 4), ("Services externes", 5, 5)]
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {larg} {haut}" width="{larg}" role="img" aria-label="Logigramme de PhonoActif" font-family="Arial, Helvetica, sans-serif" font-size="13">',
           '<defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#374151"/></marker></defs>']
    for nom, c0, c1 in couloirs:
        x0, x1 = COL_X[c0] - 112, COL_X[c1] + 112
        svg.append(f'<rect x="{x0}" y="8" width="{x1 - x0}" height="{haut - 16}" fill="none" stroke="#9ca3af" stroke-dasharray="4 6"/>')
        svg.append(f'<rect x="{x0}" y="8" width="{x1 - x0}" height="34" fill="#0f6e56"/><text x="{(x0 + x1) // 2}" y="31" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">{html.escape(nom)}</text>')
    for a, b, lib, style in ARETES:
        svg.append(fleche(a, b, lib, style, bas))
    for n in NOEUDS:
        svg.append(noeud_svg(n))
    svg.append("</svg>")
    page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logigramme PhonoActif</title>
<style>
body{{font-family:Arial,Helvetica,sans-serif;font-size:16px;margin:0;background:#faf9f7;color:#222}}
main{{max-width:1500px;margin:0 auto;padding:16px}}
h1{{color:#0f6e56;margin:8px 0}}h2{{color:#0f6e56;margin-top:32px}}
.defil{{overflow-x:auto;border:1px solid #ccc;background:#fff;padding:8px}}
.legende{{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0}}.legende span{{border:2px solid;border-radius:6px;padding:4px 10px;font-size:15px}}
table{{border-collapse:collapse;width:100%;background:#fff}}th,td{{border:1px solid #ccc;padding:8px;vertical-align:top;text-align:left}}
thead th{{background:#0f6e56;color:#fff}}td.n{{font-weight:bold;white-space:nowrap}}ul{{margin:0;padding-left:18px}}li{{margin-bottom:4px}}
.i,.e{{display:inline-block;font-size:12px;font-weight:bold;border-radius:4px;padding:1px 6px;color:#fff}}.i{{background:#0f6e56}}.e{{background:#4338ca}}
.note{{background:#fff;border-left:6px solid #f97316;padding:6px 14px;margin:12px 0}}
@media print{{.defil{{overflow:visible}}svg{{width:100%;height:auto}}}}
</style></head><body><main>
<h1>PhonoActif : logigramme et ressources par étape</h1>
<p>État constaté au 2026-11-13. Le schéma part du besoin de l'enseignant et suit le parcours jusqu'au retour d'information. Les valeurs de l'écoute par syllabes sont celles choisies par JF : espace de 500 ms entre les syllabes, dernière syllabe à 75 % de la vitesse.</p>
<div class="legende" aria-label="Légende">
<span style="border-color:#0f6e56;background:#e8f4ef">construit</span>
<span style="border-color:#c2410c;background:#fff7ed;border-style:dashed">partiel</span>
<span style="border-color:#4b5563;background:#f3f4f6;border-style:dotted">à construire</span>
<span style="border-color:#4338ca;background:#eef2ff">service externe</span>
<span style="border-color:#374151">flèche pleine : parcours ; pointillée : option ou retour</span>
</div>
<div class="defil">{''.join(svg)}</div>
<h2>Ressources par étape et provenance</h2>
<p class="note"><b>INT</b> : interne (JF, Pôle Territorial, code écrit dans le projet). <b>EXT</b> : externe, avec le nom du fournisseur ou de l'auteur. « Non vérifié » signifie que Claude n'a pas pu le confirmer.</p>
<table><thead><tr><th>N°</th><th>Étape</th><th>Ressources nécessaires</th><th>Provenance</th><th>État et preuve</th></tr></thead><tbody>
{tableau_html()}
</tbody></table>
<p class="note">Liens utiles : docs/audit-phonoactif-2026-11-13.md (défauts relevés), docs/limites-a-afficher.md, docs/registre-traitement-phonoactif.md, docs/comparatif-voix-et-ressources.md.</p>
</main></body></html>"""
    SORTIE.write_text(page, encoding="utf-8")
    print("Écrit :", SORTIE, f"({len(NOEUDS)} noeuds, {len(ARETES)} flèches)")


if __name__ == "__main__":
    main()
