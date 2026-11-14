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
VERIF_COMMUNES = "QUESTION À SE POSER POUR CHAQUE IMAGE (JF 2026-11-14) : que voit un enfant de 6 ans ? (le mot attendu, ou autre chose : pot, pizza, soleil, liquide vert…) ; un seul sujet (un seul groupe pour la neige) ; aucun texte ni lettre ; aucun motif ni décoration ; aucun visage sauf les yeux prévus ; fond bleu ciel pastel uni ; APRÈS uniformisation (tools/uniformiser_fond.py), fond mesuré à 3/255 ou moins de #cde7f7"
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


# Images de référence propres à un mot (retouche d'une image déjà générée) : « fête » v1 (ballons seuls) à laquelle JF demande d'ajouter confettis et notes de musique.
REFERENCES_PAR_MOT = {"fête": ["MAHa5Zs7GdA"], "arbre": ["MAHa5sjOz-w"]}   # arbre : la v1 sans branches (lot4/v1), à laquelle JF demande d'ajouter des branches


def references_de(mot):
    """Identifiants MEDIA Canva à passer en imageReferences pour ce mot (vide si aucun)."""
    if mot in REFERENCES_PAR_MOT:
        return list(REFERENCES_PAR_MOT[mot])
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
    ("jour", "jour", "a single page torn from a wall calendar, tilted and falling", DE_FACE, "aucun", "red-orange #f97316, warm yellow #fbbf24, cream, teal #0f6e56",
     " A cream paper page with a thick orange header strip and two small round ring holes at the top, a grid of four rows of five small plain cream squares, exactly one square filled in warm yellow, the page slightly tilted with one corner curled as if it was falling. No numbers, no digits, no letters, no text anywhere on the page.",
     "UNE seule page de calendrier ; bandeau orange et deux trous ; grille de petites cases vides, UNE case jaune ; AUCUN chiffre, AUCUNE lettre ; se lit comme une page de calendrier, pas comme un soleil",
     "JF 2026-11-14 : « jour » en soleil refusé (se lit « soleil ») ; v2 : page de calendrier qui tombe (idée de JF)"),
    ("fête", "fete", "a bunch of three party balloons tied together with strings, with confetti and musical notes floating around", DE_FACE, "aucun", None,
     " Keep the three balloons, their strings and the small pink bow exactly as in the reference image. Add around them about eight small confetti pieces (small circles and short strips in palette colors) and exactly three simple cut-paper musical notes (two eighth notes and one quarter note) floating in the air. No letters, no text.",
     "UN bouquet de TROIS ballons identique à la référence ; une dizaine de confettis ; EXACTEMENT trois notes de musique ; aucune lettre, aucun texte",
     "JF 2026-11-14 : « fête » avec des confettis et des notes de musique (v1 : ballons seuls, gardée dans lot3/v1 comme référence)"),
]
# Lot 4 : mots de la liste P1 de JF (rangs 133 à 257, noms communs passant le filtre déterministe de tools/mode_a_mots.js, absents du pack de 100) qui se dessinent comme UN objet
# ou UN animal, sans personne ni visage. Choix des mots à illustrer = proposition de Claude (2026-11-14), à valider par JF image par image ; mots eux-mêmes : liste de JF.
MOTS_LOT4 = [
    ("oiseau", "oiseau", "a small bird perched, with a round body and a short beak", DE_PROFIL, "profil", None, "", "", ""),
    ("renard", "renard", "a fox sitting with a bushy tail", DE_PROFIL, "profil", "orange #f97316, cream, teal #0f6e56, warm yellow #fbbf24",
     " Orange fur, a bushy tail with a cream tip, pointed ears. A fox, not a wolf and not a dog.",
     "se lit comme un renard (queue touffue à bout crème, oreilles pointues), pas un chien ni un loup", "choix de Claude : renard roux"),
    ("arbre", "arbre", "a tree with a yellow trunk and a big round green crown showing a few branches among the leaves", DE_FACE, "aucun", "soft green #86b98f, teal #0f6e56, warm yellow #fbbf24, cream",
     " Keep the tree, its trunk and its round green crown with the teal edge exactly as in the reference image. Add four to five thin branches in warm yellow, drawn as cut-paper strips that fork out of the trunk into the crown, partly hidden behind the leaves so they show through the foliage. No fruit, no birds, no flowers.",
     "UN arbre identique à la référence ; QUATRE à CINQ branches visibles dans le feuillage, partant du tronc ; ni fruit ni oiseau ni fleur",
     "JF 2026-11-14 : ajouter quelques branches dans le feuillage (v1 : couronne verte sans branches, gardée dans lot4/v1)"),
    ("lapin", "lapin", "a rabbit sitting, with two long upright ears", DE_PROFIL, "profil", None, "", "", ""),
    ("fenêtre", "fenetre", "a closed window with a frame and four panes", DE_FACE, "aucun", "teal #0f6e56, cream, light blue #93c5fd, warm yellow #fbbf24",
     " A wooden-style frame in teal, four equal light blue panes, one small cream sill under it. No curtains, no view, no people.",
     "UNE fenêtre fermée à quatre carreaux ; ni rideau ni personne", "choix de Claude : fenêtre simple"),
    ("train", "train", "a small toy steam train with a chimney and three round wheels", DE_PROFIL, "aucun", None,
     " Locomotive only, with one small wagon. No track, no smoke, no people.",
     "UN petit train (locomotive et un wagon) ; ni rails ni fumée ni personne", "choix de Claude : train jouet"),
    ("chapeau", "chapeau", "a hat with a wide brim and a band", DE_PROFIL, "aucun", None, "", "", ""),
    ("château", "chateau", "a castle with two towers, a gate and a small flag", DE_FACE, "aucun", None,
     " Simple castle walls in cream, two round towers with orange cone roofs, a flag on one tower. No people, no trees.",
     "UN château à deux tours et un drapeau ; ni personne ni arbre", "choix de Claude : château simple"),
    ("cheval", "cheval", "a horse standing, with a mane and a tail", DE_PROFIL, "profil", "warm yellow #fbbf24, orange #f97316, cream, teal #0f6e56",
     " A horse, not a dog: long legs, long neck, flowing mane and tail.",
     "se lit comme un cheval (longues pattes, crinière), pas un chien", "choix de Claude : cheval"),
    ("fromage", "fromage", "a classic wedge of Swiss cheese with holes", DE_PROFIL, "aucun", "warm yellow #fbbf24, pale butter yellow, soft golden ochre #e3a21a",
     " A thick wedge of cheese as a three-dimensional triangular block seen from a slight angle: pale butter-yellow top face, warm yellow front face and a narrow darker side face. Three round holes in golden ochre on the front face and one round bite cut out of the edge. No orange, no pizza, no mouse, no plate.",
     "UN morceau de fromage épais en volume (dessus clair, face jaune, trous ocre), pas une part de pizza ; ni souris ni assiette", "choix de Claude : fromage à trous"),
    ("gâteau", "gateau", "a round cake with two layers, pink icing and one candle", DE_PROFIL, "aucun", None,
     " Pink icing dripping on the sides, one small candle with a yellow flame. No text, no people.",
     "UN gâteau à deux étages et une bougie ; aucun texte", "choix de Claude : gâteau d'anniversaire"),
    ("avion", "avion", "an airplane seen from the side with two wings", DE_PROFIL, "aucun", "teal #0f6e56, cream, orange #f97316, light blue #93c5fd",
     " A simple passenger plane, cream body, orange tail, small round windows. No clouds, no people, no text.",
     "UN avion ; ni nuage ni personne ni texte", "choix de Claude : avion de ligne simple"),
]
# Lot 5 : mots de la liste P1 de JF (rangs 259 à 325, noms communs passant le filtre déterministe de tools/mode_a_mots.js, absents des packs existants) qui se dessinent comme UN objet ou UN animal.
# Choix des mots à illustrer = proposition de Claude (2026-11-14), à valider par JF image par image ; mots eux-mêmes : liste de JF. Écartés : boîte (se confond avec cadeau), musique, ciel, bleu (pas un objet).
MOTS_LOT5 = [
    ("verre", "verre", "a tall drinking glass, half full of water", DE_FACE, "aucun", "pale light blue #bfdbfe, medium blue #3b82f6, cream",
     " Straight-sided glass in very pale light blue paper with a cream rim, filled to half height with water in a clear medium blue (#3b82f6), the water must be blue, never green. No straw, no bottle, no cup handle.",
     "UN verre droit à moitié plein d'EAU BLEUE (jamais verte) ; ni paille ni anse ni bouteille", "JF 2026-11-14 : eau bleue (v1 : eau vert foncé, refusée, gardée dans lot5/v1)"),
    ("nid", "nid", "a natural bird's nest made of loose, irregular twigs, low and shallow, holding three small eggs", DE_FACE, "aucun", "warm brown #a16207, golden ochre #e3a21a, cream, soft green #86b98f",
     " The nest is a shallow, uneven tangle of thin twig strips in brown and ochre, crossing in all directions, with a few twig ends sticking out of the edge; the outline is irregular and slightly flattened, not a round pot, not a basket, not a bowl. Three small plain cream eggs rest in the shallow hollow, visible from slightly above. No bird, no branch, no leaves, no handle.",
     "UN nid NATUREL (brindilles croisées, irrégulier, peu profond, bouts de brindilles qui dépassent), trois œufs ; PAS un pot, un panier ni un bol ; ni oiseau ni branche",
     "JF 2026-11-14 : « on dirait un pot de cuisine contenant des œufs » (v1 : bol rond tressé orange, gardé dans lot5/v1)"),
    ("sapin", "sapin", "a fir tree made of three stacked triangular tiers on a short trunk", DE_FACE, "aucun", "teal #0f6e56, soft green #86b98f, warm yellow #fbbf24",
     " Teal and soft green tiers, a short warm yellow trunk. No star, no balls, no lights, no gifts, no snow.",
     "UN sapin à trois étages ; ni étoile ni boules ni cadeaux ni neige", "choix de Claude : sapin nu"),
    ("ballon", "ballon", "a classic football (soccer ball), a round sphere with soft three-dimensional roundness", DE_FACE, "aucun", "cream, teal #0f6e56",
     " A cream sphere with one dark teal pentagon at the center and five dark teal half-pentagons around the edge, as on a real football, thin cream seams between them. It must clearly look round like a ball, not like a flat disc or a plate. A football, not a balloon and not a planet: no string, no knot, no stripes, no bounce lines.",
     "UN ballon de football (sphère crème, pentagone sombre au centre et cinq autres sur le pourtour) ; PAS un disque plat, une assiette ni une planète ; ni ficelle ni rayures",
     "JF 2026-11-14 : « je ne vois pas un ballon logique » (v1 : disque plat à trois bandes orange, crème et vert, lu comme une assiette ; gardé dans lot5/v1)"),
    ("fleur", "fleur", "a single flower with a round yellow center, five rounded pink petals and a green stem with two leaves", DE_FACE, "aucun", None,
     " One flower only, upright. No bee, no pot, no ground.",
     "UNE fleur à cinq pétales roses, cœur jaune, tige et deux feuilles ; ni abeille ni pot", "choix de Claude : fleur simple"),
    ("lion", "lion", "a lion standing, with a big round mane and a tail with a tuft", DE_PROFIL, "profil", "warm yellow #fbbf24, orange #f97316, cream, teal #0f6e56",
     " A lion, not a cat: a big round orange mane around the face, a warm yellow body, a long tail ending in an orange tuft.",
     "se lit comme un lion (grande crinière ronde, queue à touffe), pas un chat", "choix de Claude : lion"),
    ("panier", "panier", "an empty wicker basket with one tall arched handle", DE_FACE, "aucun", "warm yellow #fbbf24, golden ochre #e3a21a, cream",
     " A shallow basket that is wider at the top than at the bottom, made of thin straw-colored strips woven crosswise in warm yellow and golden ochre, with one tall arched handle clearly rising above the rim like a shopping or picnic basket. Not a pot, not a bowl, not a bucket, not a vase. Empty: no fruit, no flowers, no cloth.",
     "UN panier d'osier vide, plus large en haut qu'en bas, avec UNE grande anse arquée bien visible ; PAS un pot, un bol, un seau ni un vase ; ni fruit ni fleur ni tissu", "choix de Claude : panier d'osier (prompt renforcé d'emblée après le « pot de cuisine » du nid, JF 2026-11-14)"),
    ("bateau", "bateau", "a small sailing boat with a hull and one triangular sail on a mast", DE_PROFIL, "aucun", "teal #0f6e56, cream, orange #f97316, warm yellow #fbbf24",
     " A teal hull, a cream triangular sail, an orange small flag at the top of the mast. No sea, no waves, no people.",
     "UN petit voilier (coque, un mât, une voile triangulaire) ; ni mer ni vagues ni personne", "choix de Claude : voilier simple"),
    ("guitare", "guitare", "an acoustic guitar standing upright, with a round body, a sound hole and a long neck", DE_FACE, "aucun", "orange #f97316, warm yellow #fbbf24, cream, teal #0f6e56",
     " An orange guitar body with the classic figure-eight shape (a larger lower lobe, a smaller upper lobe and a narrow waist between them), a dark teal round sound hole in the middle, a long cream neck going straight up with a warm yellow head with small round tuners. A guitar, not a racket, not a banjo, not a violin. No strings drawn, no pick, no person.",
     "UNE guitare droite (corps rond, rosace, long manche) ; ni cordes dessinées ni personne", "choix de Claude : guitare"),
    ("cadeau", "cadeau", "a gift box with a flat lid and a ribbon tied in a bow on top", DE_FACE, "aucun", "soft pink #f4a9b0, warm yellow #fbbf24, cream",
     " A pink box with a slightly wider pink lid, a warm yellow ribbon band going straight down the front of the box and one warm yellow bow on top. Only three colors: pink, warm yellow and cream. The ribbon is one plain continuous yellow band: no square, no patch, no knot piece and no orange anywhere, nothing where the ribbon meets the lid except the bow. No text, no tag, no wrapping pattern.",
     "UN paquet cadeau rose, ruban jaune et nœud ; AUCUN carré ni pièce d'une autre couleur, AUCUN orange ; ni texte ni étiquette ni motif",
     "JF 2026-11-14 : « c'est quoi le carré orange ? » (v1 : rectangle orange au croisement des rubans, gardé dans lot5/v1)"),
    ("âne", "ane", "a donkey standing, with two very long upright ears and a short mane", DE_PROFIL, "profil", "soft grey #a8a29e, dark grey #57534e, cream, soft pink #f4a9b0",
     " A grey donkey, not a horse: a small sturdy grey body, a cream muzzle and belly, a short dark grey mane, very long upright ears with a soft pink inside, a thin tail with a small dark grey tuft. No saddle, no cart.",
     "se lit comme un âne GRIS (oreilles très longues, petit et trapu, museau crème), pas un cheval ni un animal vert", "choix de Claude : âne gris (prompt corrigé d'emblée : couleur cohérente avec l'animal)"),
    ("poule", "poule", "a hen standing, with a round body, a small orange comb and a short yellow beak", DE_PROFIL, "profil", "cream, orange #f97316, warm yellow #fbbf24, warm brown #a16207",
     " A cream hen with a warm brown wing and warm brown tail feathers (no green, no blue), a small orange comb on the head, one small orange wattle, a short warm yellow beak, thin yellow legs. A hen, not a duck. No eggs, no chicks.",
     "UNE poule (crête et barbillon orange, bec court) ; pas un canard ; ni œuf ni poussin", "choix de Claude : poule"),
]
# Lot 6 : mots de la liste P1 de JF (rangs 333 à 430, noms communs passant le filtre déterministe de tools/mode_a_mots.js, absents des packs existants) qui se dessinent comme UN objet ou UN animal.
# Choix des mots à illustrer = proposition de Claude (2026-11-14), à valider par JF image par image ; mots eux-mêmes : liste de JF. Prompts écrits avec la question « que voit un enfant de 6 ans ? » : couleurs cohérentes, « not a … » pour chaque confusion probable.
MOTS_LOT6 = [
    ("corbeau", "corbeau", "a crow standing, with a glossy black body, a thick strong beak and long folded wings", DE_PROFIL, "profil", "very dark grey #292524, dark grey #57534e, cream",
     " A black crow, not a duck and not a hen: a very dark grey body, a thick pointed dark grey beak, long wings folded over the back, one small cream dot for the eye, thin dark grey legs.",
     "se lit comme un corbeau NOIR (gros bec, ailes repliées), pas un canard ni une poule", "choix de Claude : corbeau noir"),
    ("vache", "vache", "a cow standing, with two small horns, a pink udder and large patches", DE_PROFIL, "profil", "cream, dark grey #57534e, soft pink #f4a9b0, warm yellow #fbbf24",
     " A white-cream cow with three large dark grey patches, a pink muzzle and a pink udder, two small warm yellow horns, a thin tail ending in a dark tuft. A cow, not a horse and not a dog.",
     "se lit comme une vache (taches, pis rose, petites cornes), pas un cheval ni un chien", "choix de Claude : vache à taches"),
    ("chemise", "chemise", "a shirt with a collar, two long sleeves and a row of three round buttons down the front", DE_FACE, "aucun", "teal #0f6e56, cream, warm yellow #fbbf24",
     " A teal shirt laid flat (clearly darker than the pale sky-blue background), a pointed cream collar, two long sleeves hanging at the sides, a straight row of three small cream round buttons. A shirt with a collar and buttons, not a T-shirt, not a jacket, not a dress. No pocket, no text, no tie.",
     "UNE chemise à col, manches longues et trois boutons, bien contrastée sur le fond ; PAS un tee-shirt ni une veste", "choix de Claude : chemise verte (bleu clair écarté : trop proche du fond bleu ciel)"),
    ("étoile", "etoile", "a five-pointed star", DE_FACE, "aucun", "warm yellow #fbbf24, cream",
     " A flat five-pointed star with equal pointed arms, warm yellow with a slightly paler cream star on top of it at the center. A star, not a flower and not a sun: no face, no rays, no sparkle.",
     "UNE étoile à cinq branches ; PAS une fleur ni un soleil", "choix de Claude : étoile jaune"),
    ("mouton", "mouton", "a sheep standing, with a round fluffy cloud-like woolly body", DE_PROFIL, "profil", "cream, dark grey #57534e, soft pink #f4a9b0",
     " A sheep, not a cloud: a big round woolly cream body made of overlapping round cream pieces, a small dark grey head with a small ear, four thin dark grey legs.",
     "se lit comme un mouton (corps de laine bouclé, tête et pattes sombres), pas un nuage", "choix de Claude : mouton"),
    ("camion", "camion", "a delivery truck with a cab and a large rectangular cargo box on wheels", DE_PROFIL, "aucun", "orange #f97316, cream, teal #0f6e56, dark grey #57534e",
     " An orange cab with one window, a big cream rectangular cargo box behind it, three dark grey round wheels with cream centers. A truck, not a bus and not a train. No text, no logo, no driver.",
     "UN camion (cabine orange, grande caisse crème, roues) ; PAS un bus ni un train ; aucun texte", "choix de Claude : camion de livraison"),
    ("coq", "coq", "a rooster standing, with a large comb, a wattle and tall curved tail feathers", DE_PROFIL, "profil", "warm yellow #fbbf24, orange #f97316, teal #0f6e56, cream",
     " A rooster, not a hen: a large orange comb, a small orange wattle, a golden yellow body, a tall arched tail made of long curved teal and orange feathers, thin yellow legs.",
     "se lit comme un coq (grande crête, queue haute en plumes arquées), pas une poule", "choix de Claude : coq"),
    ("canard", "canard", "a duck standing, with a round body and a flat wide bill", DE_PROFIL, "profil", "warm yellow #fbbf24, orange #f97316, cream",
     " A duck, not a hen: a round warm yellow body, a short tail, a flat wide orange bill, two orange webbed feet. No water, no ducklings.",
     "se lit comme un canard (bec plat large, pattes palmées orange), pas une poule", "choix de Claude : canard jaune"),
    ("chaise", "chaise", "a simple wooden chair with four legs, a flat seat and a straight back", DE_PROFIL, "aucun", "warm yellow #fbbf24, golden ochre #e3a21a, cream",
     " A kitchen chair in profile: a straight back with two bars, a flat seat, four thin straight legs. A chair, not a stool, not an armchair, not a bench. Empty: no cushion, no person.",
     "UNE chaise de profil (dossier droit, assise plate, quatre pieds) ; PAS un tabouret ni un fauteuil", "choix de Claude : chaise simple"),
    ("lampe", "lampe", "a table lamp with a round base, a thin stem and a wide cone-shaped lampshade", DE_FACE, "aucun", "teal #0f6e56, cream, warm yellow #fbbf24",
     " A teal round base, a thin straight teal stem, a wide cream cone lampshade that is narrow at the top and wide at the bottom, one small warm yellow bulb tip visible under the shade. A lamp, not an ice cream cone and not a lantern. No light rays, no cord.",
     "UNE lampe de table (pied rond, tige, grand abat-jour conique évasé vers le bas) ; PAS une glace ni une lanterne", "choix de Claude : lampe de chevet"),
    ("tambour", "tambour", "a drum, a short cylinder with a cream top and two crossed drumsticks on top", DE_PROFIL, "aucun", "orange #f97316, cream, warm yellow #fbbf24",
     " A drum seen from a slight angle: a plain orange side, a cream oval top skin, cream rims at the top and the bottom, two warm yellow drumsticks crossed on top. A drum, not a cake and not a pot.",
     "UN tambour (cylindre orange, peau crème, deux baguettes croisées) ; PAS un gâteau ni un pot", "choix de Claude : tambour"),
    ("pull", "pull", "a knitted sweater with a round neck and two long sleeves", DE_FACE, "aucun", "orange #f97316, cream",
     " An orange sweater laid flat: a round neck with a thick cream ribbed collar, two long sleeves with thick cream cuffs, a thick cream ribbed hem. A sweater, not a shirt: no collar points, no buttons, no zipper, no pocket.",
     "UN pull à col rond (côtes crème au col, aux poignets et en bas) ; PAS une chemise (ni boutons ni col pointu)", "choix de Claude : pull orange"),
]
LOTS = {2: MOTS_LOT2, 3: MOTS_LOT3, 4: MOTS_LOT4, 5: MOTS_LOT5, 6: MOTS_LOT6}
TOUS = MOTS + MOTS_LOT2 + MOTS_LOT3 + MOTS_LOT4 + MOTS_LOT5 + MOTS_LOT6   # le CSV reste celui des 20 mots du pack illustré ; la ligne de commande connaît aussi le lot 2


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
