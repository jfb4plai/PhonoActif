# -*- coding: utf-8 -*-
"""Prompts d'images « papier découpé » pour Canva : bloc de style commun + exceptions par mot + vérifications après génération.
Source unique du script d'images (version 2, 2026-11-13). Écrit docs/images-canva-20-mots.csv.

  python -I tools/prompts_images_canva.py              # écrit le CSV
  python -I tools/prompts_images_canva.py ours rat     # affiche les prompts de ces mots (à coller dans Canva ou à envoyer au connecteur)

Historique : v2.2 (2026-11-14) = le fond ne peut pas être garanti par le prompt (Canva approche #cde7f7 avec un écart mesuré jusqu'à 26/255) :
le prompt décrit maintenant le fond en valeurs exactes (hex et RVB, plat, sans dégradé), ET chaque image passe ensuite par
`python -I tools/uniformiser_fond.py <dossier>` qui ramène le fond à #cde7f7 sans toucher au dessin (originaux gardés dans originaux-canva).
En une commande (copie + uniformisation + planche) : `python -I tools/traiter_lot2.py <image.png> <nom>`.
Contrôle : `python -I tools/uniformiser_fond.py --mesure <images>` doit donner un écart <= 3/255. La planche (tools/planche_lot2.py) l'affiche.
v2.1 (2026-11-13) = fond bleu ciel pastel #cde7f7 pour toutes les images (décision de JF), à la place du fond crème.
v1 = bloc du 2026-11-10 (essai-images-canva/script-generation-images.md). v2 ajoute : exceptions par mot (palette, précisions),
yeux selon la vue (un point de profil, deux points de face), et vérifications obligatoires après génération."""
import csv
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
PALETTE_STD = "teal #0f6e56, orange #f97316, warm yellow #fbbf24, cream, soft green #86b98f, soft pink #f4a9b0"
DE_PROFIL, DE_FACE = "seen from the side", "seen flat from the front"
YEUX = {
    "aucun": "",
    "profil": " except a single small dark dot for the eye",
    "face": " except two small dark dots for the eyes, one on each side of the face",
}
BLOC = ("Children's picture book illustration in cut-paper collage style. {intro} {obj}, {vue}, centered, filling about 70% of the frame. "
        "Built from a few simple layered paper pieces with clean cut edges, subtle paper grain, soft small drop shadows, no outline. "
        "Each piece is one flat uniform color, no patterns, no decoration, no face{yeux}. "
        "Palette strictly limited to: {palette}. "
        "Plain flat {fond}, no ground, no props, no text, no letters, no people.{plus}")
FOND = "pastel light sky-blue background, exactly the flat solid color #cde7f7 (RGB 205, 231, 247), perfectly uniform, no gradient, no vignette, no lighting variation"   # v2.1 (2026-11-13, JF) : plus universel que le crème ; v2.2 : valeurs exactes + uniformisation après coup

POST_TRAITEMENT = "python -I tools/uniformiser_fond.py <dossier> (ramène le fond à #cde7f7, garde l'original), puis python -I tools/uniformiser_fond.py --mesure <images> : écart <= 3/255"
VERIF_COMMUNES = "un seul sujet (un seul groupe pour la neige) ; aucun texte ni lettre ; aucun motif ni décoration ; aucun visage sauf les yeux prévus ; fond bleu ciel pastel uni ; APRÈS uniformisation (tools/uniformiser_fond.py), fond mesuré à 3/255 ou moins de #cde7f7"
VERIF_YEUX = {"aucun": "", "profil": " ; exactement UN œil (point sombre)", "face": " ; exactement DEUX yeux visibles (point sombre de chaque côté du visage)"}

# mot, fichier, objet, vue, yeux, palette, précisions (ajoutées en fin de prompt), vérification propre au mot, motif de l'exception
MOTS = [
    ("chat", "chat", "a cat", DE_PROFIL, "profil", None, "", "", ""),
    ("maison", "maison", "a house", DE_FACE, "aucun", None, "", "", ""),
    ("chien", "chien", "a dog", DE_PROFIL, "profil", None, "", "", ""),
    ("voiture", "voiture", "a car", DE_PROFIL, "aucun", None, "", "", ""),
    ("poisson", "poisson", "a fish", DE_PROFIL, "profil", None, "", "", ""),
    ("vélo", "velo", "a bicycle", DE_PROFIL, "aucun", None, "", "", ""),
    ("porte", "porte", "a door", DE_FACE, "aucun", None, "", "", ""),
    ("neige", "neige", "several snowflakes falling", DE_FACE, "aucun", "shades of white only: pure white #ffffff, off-white #f5f5f4, light grey-white #e7e5e4",
     " Five to seven simple snowflakes of different sizes, scattered as if falling, each with six arms and no colored accent; the group fills about 70% of the frame. "
     "The flakes are white paper pieces with soft drop shadows so they stay visible on the pastel sky-blue background.",
     "PLUSIEURS flocons (5 à 7), de tailles différentes, qui tombent ; uniquement des nuances de blanc ; flocons blancs bien lisibles sur le fond bleu ciel",
     "JF 2026-11-13 : plusieurs flocons qui tombent, en nuances de blanc (v1 : un seul flocon coloré, lisible comme une fleur)"),
    ("loup", "loup", "a wolf", DE_PROFIL, "profil", "teal #0f6e56, soft green #86b98f, cream, soft pink #f4a9b0",
     " No orange anywhere: the tail is in the same color family as the body (teal or soft green), thick and hanging down. A wolf, not a fox: long muzzle, pointed ears.",
     "AUCUNE couleur orange ; queue de la même famille de couleur que le corps ; se lit comme un loup, pas un renard",
     "JF 2026-11-13 : pas de queue orange (v1 : queue orange, lecture renard)"),
    ("tortue", "tortue", "a turtle", DE_PROFIL, "profil", None, "", "", ""),
    ("forêt", "foret", "three tall trees side by side", DE_FACE, "aucun", None, "", "", ""),
    ("souris", "souris", "a small mouse (the animal)", DE_PROFIL, "profil", None, "", "", ""),
    ("sac", "sac", "a school backpack", DE_FACE, "aucun", None, "", "", ""),
    ("table", "table", "a wooden table", DE_PROFIL, "aucun", None, "", "", ""),
    ("lune", "lune", "a crescent moon", DE_FACE, "aucun", "warm yellow #fbbf24 only",
     " Every piece is the same warm yellow; no other color on the moon, no leaf, no colored tips.",
     "UNIQUEMENT du jaune ; aucune autre couleur (ni vert, ni rose, ni orange)",
     "JF 2026-11-13 : lune uniquement en jaune (v1 : pointes vertes et roses)"),
    ("pomme", "pomme", "an apple", DE_FACE, "aucun", None, "", "", ""),
    ("ours", "ours", "a brown bear standing", DE_FACE, "face", None,
     " Both eyes must be visible: exactly two small dark dots.",
     "", "JF 2026-11-13 : l'ours n'avait qu'un œil (v1) : deux yeux de face"),
    ("livre", "livre", "a closed book", DE_FACE, "aucun", None, "", "", ""),
    ("rat", "rat", "a lean, elongated rat with a long pointed snout and a long thin tail", DE_PROFIL, "profil", "teal #0f6e56, soft green #86b98f, cream, soft pink #f4a9b0",
     " Slender low body, much longer than tall, narrow pointed head, small thin ears, long thin tail; sleek and slightly sinister rather than cute; no big round ears, no cheerful look.",
     "corps ALLONGÉ (bien plus long que haut) ; museau pointu ; queue longue et fine ; pas d'air sympathique ; ne doit pas ressembler à la souris",
     "JF 2026-11-13 : rat plus allongé et moins sympathique (v1 : presque identique à la souris)"),
    ("eau", "eau", "a large water drop made of layered blue paper pieces", DE_FACE, "aucun", "shades of blue only: light blue #93c5fd, medium blue #3b82f6, deep blue #1d4ed8, plus cream",
     " No green, orange, yellow or pink in the drop. The drop must clearly stand out from the pastel sky-blue background: its outer layer is deep blue, no pastel blue on its outer edge.",
     "UNIQUEMENT des nuances de bleu ; aucune autre couleur dans la goutte ; contour de la goutte en bleu profond, nettement distinct du fond bleu ciel",
     "JF 2026-11-13 : eau dans des nuances de bleu (v1 : goutte verte, orange, jaune)"),
]

# Lot 2 : mots du pack p1-100 qui se dessinent comme UN objet (proposition de Claude, à valider par JF mot par mot ; images non publiées avant son accord).
# Écartés faute de pouvoir respecter « un seul objet, sans visage » : rue, tête, nez, yeux (visage), terre (sol ou planète ?), mots-outils, verbes, adjectifs.
MOTS_LOT2 = [
    ("jardin", "jardin", "a small garden bed with three tall simple flowers with round heads and straight green stems", DE_FACE, "aucun", None, "", "", ""),
    ("école", "ecole", "a small school building with a little bell on the roof", DE_FACE, "aucun", None, "", "", ""),
    ("lit", "lit", "a bed with a pillow and a folded blanket", DE_PROFIL, "aucun", None, "", "", ""),
    ("feu", "feu", "a flame made of layered paper pieces", DE_FACE, "aucun", "orange #f97316, warm yellow #fbbf24, cream only",
     " No other color in the flame: orange outer pieces, yellow inner pieces, cream center. No wood, no sparks, no smoke.",
     "UNE seule flamme ; uniquement orange, jaune et crème ; ni bois, ni étincelles, ni fumée", "choix de Claude : flamme seule (sinon lecture « feu rouge »)"),
    ("rivière", "riviere", "a rounded-rectangle green paper landscape tile with one wide winding river crossing it", "seen from above", "aucun", "light blue #93c5fd, deep blue #1d4ed8, soft green #86b98f, cream",
     " The river is made of exactly two layered blue paper strips (deep blue outer, light blue inner), one smooth gentle S curve running from the top edge of the green tile to its bottom edge, wider than a thin line. No stripes, no white lines, no extra shapes, no bridge, no boat, no trees, no houses.",
     "UNE seule rivière, large, en S doux, de haut en bas de la tuile verte ; deux bandes de papier bleu seulement ; ni rayures, ni lignes blanches, ni pont, ni bateau, ni arbre",
     "v2 de Claude 2026-11-14 : la v1 (ruban vert en S rayé de bleu) ne se lisait pas comme une rivière"),
]
# RÈGLE DES NOMBRES (décision de JF, 2026-11-14) : tout nombre est représenté par des pommes rouges IDENTIQUES à celles de « deux », côte à côte, une pomme par unité,
# sans chiffre ni texte. Les nombres suivants (trois, quatre…) sont générés AVEC l'image de « deux » comme référence (imageReferences du connecteur Canva) pour que la pomme
# soit exactement la même. Référence = identifiant MEDIA Canva de l'image « deux » du lot 3 (MAHa5AjV92w, générée le 2026-11-14).
NOMBRES = {"un": ("one", 1), "deux": ("two", 2), "trois": ("three", 3), "quatre": ("four", 4), "cinq": ("five", 5), "six": ("six", 6),
           "sept": ("seven", 7), "huit": ("eight", 8), "neuf": ("nine", 9), "dix": ("ten", 10)}
NOMBRE_DE_REFERENCE = "deux"
MEDIA_NOMBRE_DE_REFERENCE = "MAHa5AjV92w"
PHRASE_REFERENCE = " The apples must be exactly the same apple as in the reference image (same shape, size, colors, leaf and highlight): only the number of apples changes."


def entree_nombre(mot):
    """Entrée de script d'un nombre : n pommes identiques ; sauf « deux » (la référence), la consigne renvoie à l'image de référence."""
    en, n = NOMBRES[mot]
    plus = f" Exactly {en} apples, the same size, each with one small green leaf. No numbers, no text."
    if mot != NOMBRE_DE_REFERENCE:
        plus += PHRASE_REFERENCE
    pluriel = en if n > 1 else "one"
    obj = f"{pluriel} identical red apple{'s side by side' if n > 1 else ''}"
    return (mot, mot, obj, DE_FACE, "aucun", "red-orange #f97316, soft green #86b98f, cream", plus,
            f"EXACTEMENT {n} pomme{'s identiques, côte à côte' if n > 1 else ''} ; aucun chiffre ; même pomme que « deux »",
            f"JF 2026-11-14 : tout nombre = pommes identiques à celles de « deux » ({n})")


def references_de(mot):
    """Identifiants MEDIA Canva à passer en imageReferences pour ce mot (vide si aucun)."""
    return [MEDIA_NOMBRE_DE_REFERENCE] if mot in NOMBRES and mot != NOMBRE_DE_REFERENCE else []


# Lot 3 : autres mots du pack p1-100 qui se dessinent comme UN objet ou UN petit groupe, sans visage ni personne (proposition de Claude, 2026-11-14,
# à valider par JF image par image ; rien n'entre dans un pack avant son accord). Écartés : tête, nez, yeux (visage), maman, papa, ami, garçon, père (personnes),
# mots-outils, verbes, adjectifs de comparaison, notions de temps abstraites.
MOTS_LOT3 = [
    ("monde", "monde", "a globe of the Earth on a small stand", DE_PROFIL, "aucun", "teal #0f6e56, soft green #86b98f, light blue #93c5fd, deep blue #1d4ed8, cream",
     " Blue oceans and a few simple green continents on a round globe, a small cream stand. No text, no lines of latitude, no stars.",
     "UN globe ; océans bleus et quelques continents verts ; ni texte ni quadrillage", "choix de Claude : « monde » = le globe"),
    entree_nombre("deux"),
    entree_nombre("trois"),
    ("jour", "jour", "a bright round sun with short straight rays", DE_FACE, "aucun", "warm yellow #fbbf24, orange #f97316, cream",
     " One round yellow sun with eight short straight rays around it, no face, no clouds.",
     "UN soleil rond avec des rayons courts ; ni visage ni nuage", "choix de Claude : « jour » = le soleil"),
    ("fête", "fete", "a bunch of three party balloons tied together with strings", DE_FACE, "aucun", None,
     " Three round balloons of three different palette colors, one string each gathered at the bottom. No confetti, no text.",
     "UN bouquet de TROIS ballons ; ni confettis ni texte", "choix de Claude : « fête » = des ballons"),
]
LOTS = {2: MOTS_LOT2, 3: MOTS_LOT3}
TOUS = MOTS + MOTS_LOT2 + MOTS_LOT3   # le CSV reste celui des 20 mots du pack illustré ; la ligne de commande connaît aussi le lot 2


def prompt(m):
    mot, _, obj, vue, yeux, palette, plus, _, _ = m
    intro = "A group of" if obj.startswith(("several",) + tuple(en + " " for en, n in NOMBRES.values() if n > 1)) else "One single"   # un seul sujet, sauf un groupe voulu (neige)
    return BLOC.format(fond=FOND, intro=intro, obj=obj, vue=vue, yeux=YEUX[yeux], palette=palette or PALETTE_STD, plus=plus)


def verification(m):
    return VERIF_COMMUNES + VERIF_YEUX[m[4]] + ((" ; " + m[7]) if m[7] else "")


def ecrire_csv():
    chemin = RACINE / "docs" / "images-canva-20-mots.csv"
    with chemin.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["mot", "fichier", "exception (décision de JF)", "à vérifier après génération", "prompt (bloc v2.2, tools/prompts_images_canva.py)", "après génération"])
        for m in MOTS:
            w.writerow([m[0], m[1] + ".png", m[8], verification(m), prompt(m), POST_TRAITEMENT])
    return chemin


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for mot in sys.argv[1:]:
            m = next((x for x in TOUS if x[0] == mot or x[1] == mot), None)
            if not m:
                sys.exit(f"mot inconnu : {mot}")
            print(f"--- {m[0]} ---\n{prompt(m)}\nA VERIFIER : {verification(m)}\n")
    else:
        print("écrit :", ecrire_csv(), f"({len(MOTS)} mots, {sum(1 for m in MOTS if m[8])} avec exception)")
