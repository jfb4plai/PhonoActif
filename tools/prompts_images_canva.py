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
        "Plain flat {fond}, no ground, no props, no text, no letters{pas_de_personne}.{plus}")
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
# RÈGLE DES NOMBRES (décision de JF, 2026-11-15, qui remplace celle du 2026-11-14 : « des pommes identiques ») : tout nombre est une carte avec le CHIFFRE SEUL, sans pommes ni autre objet.
# Raison : des pommes forcent l'élève à les compter, ce qui n'est pas l'objectif. Le mot écrit n'apparaît pas non plus (c'est lui que l'élève construit). Chiffre d'une seule couleur (orange).
NOMBRES = {"un": ("one", 1), "deux": ("two", 2), "trois": ("three", 3), "quatre": ("four", 4), "cinq": ("five", 5), "six": ("six", 6),
           "sept": ("seven", 7), "huit": ("eight", 8), "neuf": ("nine", 9), "dix": ("ten", 10), "zéro": ("zero", 0)}


def entree_nombre(mot):
    """Entrée de script d'un nombre : le chiffre seul (« 2 » pour deux), sans pommes ni image de référence."""
    en, n = NOMBRES[mot]
    obj = f"the numeral {n}, the number {en}"
    plus = (f" The numeral {n} drawn as one single bold rounded shape cut from one single flat orange paper piece, upright, not mirrored, with the exact correct shape of the digit{'s' if n > 9 else ''} {n}, perfectly legible. "
            "Nothing else on the image: no apples, no dots, no other digits, no letters, no words, no objects.")
    return (mot, mot, obj, DE_FACE, "aucun", "orange #f97316", plus,
            f"UN seul chiffre {n} (orange), lisible, non inversé, forme exacte ; AUCUN autre caractère ni objet ; ni pommes ni mot écrit",
            f"JF 2026-11-15 : un nombre = le chiffre seul, sans pommes (compter n'est pas l'objectif) ({n})")


# Images de référence propres à un mot (retouche d'une image déjà générée) : « fête » v1 (ballons seuls) à laquelle JF demande d'ajouter confettis et notes de musique.
REFERENCES_PAR_MOT = {"fête": ["MAHa5Zs7GdA"], "arbre": ["MAHa5sjOz-w"], "sur": ["MAHa_AOCW34"], "sous": ["MAHa_AOCW34", "MAHa_AZNijw"], "vers": ["MAHa_AOCW34"], "avec": ["MAHa_AOCW34"], "côté": ["MAHa_AOCW34"], "peu": ["MAHbGSrGu-Q"]}   # peu : le panier de « trop » (lot 13, v2)   # arbre : la v1 sans branches (lot4/v1), à laquelle JF demande d'ajouter des branches


def references_de(mot):
    """Identifiants MEDIA Canva à passer en imageReferences pour ce mot (vide si aucun)."""
    if mot in REFERENCES_PAR_MOT:
        return list(REFERENCES_PAR_MOT[mot])
    return []   # les nombres n'ont plus d'image de référence (chiffre seul)


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
# Lot 7 : 20 mots de la liste P1 de JF (rangs 431 à 700, noms communs passant le filtre déterministe de tools/mode_a_mots.js, absents des packs et lots existants) qui se dessinent comme UN objet ou UN animal.
# Choix des mots à illustrer = proposition de Claude (2026-11-15), à valider par JF ; mots eux-mêmes : liste de JF. Chaque prompt répond d'avance à « que voit un enfant de 6 ans ? » : couleurs cohérentes avec l'objet, « not a … » pour la confusion probable, aucun élément annexe.
MOTS_LOT7 = [
    ("zèbre", "zebre", "a zebra standing, with black and white stripes and a short upright mane", DE_PROFIL, "profil", "cream, very dark grey #292524",
     " A zebra, not a horse and not a tiger: a cream body with bold dark grey stripes across the body and legs, a short upright striped mane, a dark muzzle, a thin tail with a dark tuft.",
     "se lit comme un zèbre (rayures noires et blanches), pas un cheval ni un tigre", "choix de Claude : zèbre"),
    ("girafe", "girafe", "a giraffe standing, with a very long neck, two small horns and brown patches", DE_PROFIL, "profil", "warm yellow #fbbf24, warm brown #a16207, cream",
     " A giraffe, not a horse: a very long neck, a warm yellow body covered by large warm brown patches, two small horns with round tips, a thin tail with a small brown tuft.",
     "se lit comme une girafe (cou très long, taches brunes, deux cornes), pas un cheval", "choix de Claude : girafe"),
    ("tigre", "tigre", "a tiger standing, with an orange body and bold black stripes", DE_PROFIL, "profil", "orange #f97316, very dark grey #292524, cream",
     " A tiger, not a lion and not a cat: an orange body with bold black stripes, a cream belly and muzzle, round ears, a long striped tail. No mane.",
     "se lit comme un tigre (orange à rayures noires, pas de crinière), pas un lion ni un chat", "choix de Claude : tigre"),
    ("hibou", "hibou", "an owl sitting upright, seen from the front, with two big round eyes and two small ear tufts", DE_FACE, "face", "warm brown #a16207, cream, warm yellow #fbbf24",
     " An owl, not a plain bird: a round warm brown body with a cream belly, a heart-shaped cream face with two very big round yellow eyes, a small orange-yellow beak, two small pointed ear tufts, two small feet.",
     "se lit comme un hibou (gros yeux ronds de face, petites aigrettes), pas un oiseau ordinaire", "choix de Claude : hibou"),
    ("cochon", "cochon", "a pig standing, with a round pink body, a flat round snout and a curly tail", DE_PROFIL, "profil", "soft pink #f4a9b0, orange #f97316, cream",
     " A pig, not a dog: a round pink body, a big flat round snout with two small nostrils, a small floppy ear, four short legs, a small curly tail.",
     "se lit comme un cochon (corps rose rond, groin plat, queue en tire-bouchon), pas un chien", "choix de Claude : cochon"),
    ("serpent", "serpent", "a snake coiled in an S shape, with a rounded head and a small forked tongue", DE_PROFIL, "profil", "soft green #86b98f, teal #0f6e56, orange #f97316",
     " A snake, not a worm and not a rope: a long soft green body forming a clear S curve with a darker teal belly line, a rounded head with a single small eye, a small orange forked tongue.",
     "se lit comme un serpent (corps en S, tête arrondie, langue fourchue), pas un ver ni une corde", "choix de Claude : serpent"),
    ("baleine", "baleine", "a whale seen from the side, with a big rounded body, a tail fin raised and a small water spout", DE_PROFIL, "profil", "dark blue #3b82f6, light blue #bfdbfe, cream",
     " A whale, not a fish: a big rounded blue body, a pale belly with a few cream lines, a wide tail fin raised at the back, a small blue water spout on the top. No sea, no waves.",
     "se lit comme une baleine (gros corps arrondi, queue relevée, jet d'eau), pas un poisson", "choix de Claude : baleine"),
    ("banane", "banane", "a single ripe banana, gently curved, with a small brown stem", DE_PROFIL, "aucun", "warm yellow #fbbf24, golden ochre #e3a21a, warm brown #a16207",
     " One yellow banana only, with a gentle curve, two or three thin darker ochre edge lines along its length, a small brown stem at the top and a small brown tip at the bottom. A banana, not a moon: no bunch, no peel opened.",
     "UNE banane jaune courbe avec une petite queue brune ; pas un croissant de lune, pas de régime", "choix de Claude : banane seule"),
    ("fraise", "fraise", "a strawberry, red with a green leafy top and tiny seeds", DE_FACE, "aucun", "red #dc2626, soft green #86b98f, warm yellow #fbbf24",
     " One red strawberry, heart-shaped and pointed at the bottom, a small green star-shaped leafy cap with a short stem, about ten tiny warm yellow seed dots. A strawberry, not a tomato and not a heart.",
     "UNE fraise rouge pointue avec chapeau vert et petits grains jaunes ; pas une tomate ni un cœur", "choix de Claude : fraise"),
    ("citron", "citron", "a lemon, an oval yellow fruit with a small pointed tip at both ends and one green leaf", DE_FACE, "aucun", "warm yellow #fbbf24, soft green #86b98f, golden ochre #e3a21a",
     " One yellow lemon with a clearly pointed small nipple at each end, one small green leaf at the top. A lemon, not an egg and not a ball.",
     "UN citron jaune ovale avec une petite pointe à chaque bout et une feuille ; pas un œuf ni une balle", "choix de Claude : citron"),
    ("poire", "poire", "a pear, with a rounded wide bottom, a narrower top, a short brown stem and one green leaf", DE_FACE, "aucun", "pale yellow-green #bef264, soft green #86b98f, warm brown #a16207",
     " One pear whose whole body is ONE single piece in ONE single uniform pale yellow-green color (#bef264): no second color, no half in another color, no highlight piece, no layered halves. Wide and round at the bottom and narrow at the top, a short curved brown stem, one soft green leaf. A pear, not an apple and not a bottle.",
     "UNE poire d'UNE seule couleur jaune-vert (corps d'une seule pièce, aucune moitié d'une autre couleur) avec queue brune et feuille ; pas une pomme ni une bouteille", "JF 2026-11-15 : « pourquoi 2 couleurs ? il n'existe pas de poires comme ça » (v1 : moitié verte et moitié jaune, gardée dans lot7/v1)"),
    ("taxi", "taxi", "a yellow taxi car with a small plain light box on the roof", DE_PROFIL, "aucun", "warm yellow #fbbf24, cream, dark grey #57534e, teal #0f6e56",
     " A warm yellow small car with two cream windows, two dark grey wheels with cream centers, and one small cream rectangular light box on the roof. A taxi, not a bus and not a truck. No text, no letters, no checker pattern, no driver.",
     "UN taxi jaune (petite voiture, boîtier crème sur le toit) ; aucun texte ni damier", "choix de Claude : taxi jaune"),
    ("fusée", "fusee", "a rocket standing upright, with a cream body, a pointed red nose, two fins and a round window", DE_FACE, "aucun", "cream, red #dc2626, light blue #93c5fd, orange #f97316",
     " A cream rocket body, a pointed red nose cone, two red fins at the bottom, one round light blue window, one small orange flame under the tail. A rocket, not a pencil and not a missile with wings: no planet, no stars, no smoke.",
     "UNE fusée (corps crème, nez pointu rouge, deux ailerons, hublot rond, petite flamme) ; pas un crayon", "choix de Claude : fusée"),
    ("valise", "valise", "a suitcase with a flat top handle and two small latches", DE_FACE, "aucun", "warm brown #a16207, golden ochre #e3a21a, cream",
     " A warm brown rectangular suitcase with rounded corners, a golden ochre handle on top, two small cream latches on the front, two golden ochre corner pieces. A suitcase, not a box and not a bag: no stickers, no text.",
     "UNE valise brune rectangulaire avec poignée et deux fermoirs ; pas une boîte ni un sac ; ni autocollant ni texte", "choix de Claude : valise"),
    ("balai", "balai", "a broom standing upright, with a long straight stick and a wide bristle head at the bottom", DE_FACE, "aucun", "warm yellow #fbbf24, warm brown #a16207, teal #0f6e56",
     " A long thin warm brown stick, and at the bottom a wide head of straw bristles all in ONE single warm yellow color (no second yellow), tied with one thin teal band. A broom, not a paintbrush and not a mop.",
     "UN balai (long manche, tête de brins jaunes large en bas) ; pas un pinceau ni une serpillière", "choix de Claude : balai"),
    ("échelle", "echelle", "a ladder with two straight side rails and five equal rungs", DE_FACE, "aucun", "warm yellow #fbbf24",
     " A tall ladder seen from the front, all made of the same wood in ONE single warm yellow color: two long straight rails and five equal rungs, evenly spaced, no second color. A ladder, not a fence and not a staircase: nothing leaning on it, no person, no wall.",
     "UNE échelle (deux montants, cinq barreaux réguliers) ; pas une barrière ni un escalier", "choix de Claude : échelle"),
    ("tulipe", "tulipe", "a tulip with a cup-shaped pink flower on a long green stem with two long leaves", DE_FACE, "aucun", "soft pink #f4a9b0, soft green #86b98f",
     " One tulip: a closed cup-shaped flower made of three overlapping pink petals all in ONE single uniform pink (no redder edge, no second color on the flower), a long straight green stem, two long pointed green leaves at the base. A tulip, not a daisy and not a rose: no round open petals.",
     "UNE tulipe (fleur en coupe fermée, tige longue, deux longues feuilles) ; pas une marguerite ni une rose", "choix de Claude : tulipe"),
    ("jupe", "jupe", "a skirt, flared, with a waistband, hanging by itself", DE_FACE, "aucun", "soft pink #f4a9b0",
     " A pink flared skirt shaped like a trapezoid that is narrow at the top and wide at the bottom, a waistband at the top in the same pink, a soft wavy bottom edge, the whole skirt in ONE single uniform pink (no second color). A skirt, not a dress and not a lampshade: no top, no straps, no body.",
     "UNE jupe rose évasée avec ceinture ; pas une robe ni un abat-jour", "choix de Claude : jupe"),
    ("montre", "montre", "a wristwatch with a round face, two hands and a strap", DE_FACE, "aucun", "teal #0f6e56, cream, warm yellow #fbbf24",
     " A wristwatch laid flat: a round cream face with a warm yellow rim, only two dark teal hands (one short, one long) and four tiny dots at 12, 3, 6, 9, a teal strap above and below with a small buckle. A watch, not a wall clock. No numbers, no letters.",
     "UNE montre-bracelet (cadran rond, deux aiguilles, bracelet) ; pas une horloge murale ; aucun chiffre", "choix de Claude : montre"),
    ("seau", "seau", "a bucket with a curved handle arched over the top", DE_FACE, "aucun", "red #dc2626, warm yellow #fbbf24, cream",
     " A beach bucket entirely in ONE single uniform red (body and rim the same red, no second color on the bucket), wider at the top than at the bottom, with a warm yellow handle arched clearly over the top (the handle may differ). A bucket, not a pot and not a cup: no sand, no water, no spade.",
     "UN seau rouge plus large en haut avec UNE anse arquée ; pas un pot ni un gobelet ; ni sable ni pelle", "choix de Claude : seau de plage"),
]
# Lot 8 : mots du pack p1-100 qui n'ont pas d'image (proposition de Claude, 2026-11-15, à valider par JF image par image). Garçon, père, papa : AVEC VISAGE (décision de JF, 2026-11-15) ;
# maman et ami : même style, proposés par Claude (extension évidente, à confirmer). Les personnages ont deux petits points pour les yeux et un petit sourire, des formes plates en papier découpé.
# PERSONNES : mots dont le prompt n'écrit pas « no people » (le bloc commun l'interdit pour tous les autres mots).
PERSONNES = {"garçon", "père", "papa", "maman", "ami", "manger", "lire", "voir", "peur", "sans"}
PEAU = "peach #f2b48a, dark brown #5b3a29"
MOTS_LOT8 = [
    ("rouge", "rouge", "a single irregular paint-stain blob, a lopsided asymmetric rounded shape with five or six uneven bulges of different sizes and one small narrow lobe, clearly not symmetric, not a clover, not a flower, not a cloud", DE_FACE, "aucun", "red #dc2626",
     " The whole blob is ONE single flat red paper piece: no stacked layer, no second piece underneath, no dark edge, no line, no outline, no vein, no highlight, no texture lines. The same blob shape is meant to be reused for other colors, so keep it a plain stain. Nothing else on the image.",
     "UNE seule tache rouge, d'une seule pièce ; AUCUNE ligne noire, aucun bord sombre, aucune pièce en dessous ; rien d'autre",
     "JF 2026-11-15 : « pourquoi une ligne noire dans le rouge ? » (v1 : rond à deux disques empilés, bord sombre) ; principe retenu : une forme de tache dont la couleur change"),
    ("terre", "terre", "a big tall block of brown soil seen in cross-section that fills almost the whole frame, with one or two small green plants growing out of its top edge and one SMALL pink earthworm crawling inside the lower part of the soil", DE_FACE, "aucun", "warm brown #a16207, soft green #86b98f, pink #f9a8d4",
     " The soil is the main subject: ONE single uniform warm brown flat rectangle, tall and wide, taking about 75% of the frame, with a slightly wavy top edge, cut open so we see inside it. Most of the picture is plain brown soil. One or two small plants grow upward out of the top edge of the soil: each plant has a thin green stem and two or three small green leaves, all ONE single flat soft green, clearly sprouting from the soil. The earthworm is small, about one quarter of the width of the soil, placed low in the bottom left part, NOT in the center. One single plain pink earthworm, a long curved tube of one single pink color with one small dark dot for the eye at its head end, lies inside the brown soil, bending in a gentle S shape. Nothing else: no flower, no tree, no grass blades, no stones, no pot, no hand, not a planet, no text.",
     "Une grande coupe de terre brune (90 % de l'image) avec une ou deux petites plantes vertes qui sortent du dessus et UN petit ver de terre rose en bas à gauche, pas au centre ; la TERRE est le sujet, pas le ver (S doux, un œil) ; rien d'autre ; illustre « Le ver vit dans la terre. »", "JF 2026-11-15 (+ une ou deux petites plantes qui sortent de la terre, brun et vert) : le dessin doit imager la phrase « Le ver vit dans la terre. » ; v1 (tas de terre + pousse, sans ver) archivée"),
    ("rue", "rue", "a street seen from the front, a grey road narrowing toward the top between two simple houses on each side", DE_FACE, "aucun", "dark grey #57534e, cream, orange #f97316, teal #0f6e56, warm yellow #fbbf24",
     " A wide grey road shaped like a trapezoid that narrows toward the top, a thin cream pavement strip on each side, two small simple houses on the left and two on the right (cream walls, orange or teal roofs, one small window each). No cars, no people, no trees, no signs, no text.",
     "UNE rue (route grise qui s'éloigne, deux maisons de chaque côté) ; ni voiture ni personne ni arbre ni panneau", "choix de Claude : rue"),
    ("tête", "tete", "a child's head and neck only, seen from the front, with short brown hair", DE_FACE, "face", f"{PEAU}, orange #f97316",
     " A round peach-colored head with short dark brown hair, two small ears, two small dark dots for the eyes, a tiny nose and a small curved smile, and a short neck. Head and neck only: no shoulders, no body, no hat, no glasses.",
     "UNE tête d'enfant (cheveux, yeux, nez, sourire, cou) ; pas de corps ; aucun texte", "choix de Claude : tête d'enfant"),
    ("nez", "nez", "a natural human nose seen in three-quarter side view, with the nostril, the wing of the nostril and a little of the cheek, softly shaded, realistic and not stylized", DE_FACE, "aucun", f"{PEAU}",
     " A realistic nose, not a cartoon and not a geometric shape: the bridge, the rounded tip, the wing of the nostril and a clearly visible dark nostril opening, with a little cheek and upper lip around it, softly shaded in natural skin tones with gentle volume, like a simple soft illustration of a real nose. Cropped to the nose area only. No eye, no mouth, no ear, no hair, no disc, no text.",
     "UN nez réaliste, peu stylisé (arête, bout, aile, narine visible, un peu de joue), ombré en tons peau", "JF 2026-11-15 : « fais un nez moins stylisé » ; v1 disque, v2 silhouette abstraite refusées"),
    ("yeux", "yeux", "a pair of big open eyes seen from the front, side by side, each with a thin eyebrow above", DE_FACE, "aucun", "cream, warm brown #a16207, very dark grey #292524",
     " Each eye is a cream oval with a large round warm brown iris and a smaller very dark pupil; one thin dark brown eyebrow above each eye. Only the two eyes and their eyebrows floating on the plain background: no face outline, no nose, no mouth, no hair.",
     "DEUX grands yeux ouverts côte à côte avec un sourcil chacun ; ni visage ni nez ni bouche", "choix de Claude : yeux"),
    ("garçon", "garcon", "a boy about seven years old, standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, teal #0f6e56, orange #f97316",
     " A friendly boy: a round peach-colored face with two small dark dots for the eyes and a small curved dark smile, short dark brown hair, a teal t-shirt, orange shorts, two short legs and two arms hanging at his sides. One single boy, simple flat shapes.",
     "UN garçon (visage avec deux yeux et un sourire, cheveux courts, t-shirt, short), de face, en pied ; un seul personnage ; aucun texte", "JF 2026-11-15 : garçon avec visage"),
    ("père", "pere", "an adult man, a father, standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, dark grey #57534e, teal #0f6e56, cream",
     " A friendly man: a round peach-colored face with two small dark dots for the eyes and a small curved dark smile, short dark brown hair, a dark grey sweater, teal trousers, two arms hanging at his sides. One single man, taller than a child would be, simple flat shapes, no beard, no glasses.",
     "UN homme adulte (visage avec deux yeux et un sourire, cheveux courts, pull gris, pantalon), de face, en pied ; un seul personnage", "JF 2026-11-15 : père avec visage"),
    ("papa", "papa", "an adult man, a dad, standing, seen from the front, full body, with one arm raised in a friendly wave", DE_FACE, "face", f"{PEAU}, dark grey #57534e, teal #0f6e56, cream",
     " The same kind of friendly man as a father figure: a round peach-colored face with two small dark dots for the eyes and a big curved dark smile, short dark brown hair, a dark grey sweater, teal trousers, one arm hanging and the other arm raised waving. One single man, simple flat shapes, no beard, no glasses.",
     "UN homme adulte souriant qui salue d'un bras levé ; un seul personnage ; aucun texte", "JF 2026-11-15 : papa avec visage (même personnage que père, bras levé)"),
    ("maman", "maman", "an adult woman, a mother, standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, soft green #86b98f, orange #f97316",
     " A friendly woman: a round peach-colored face with two small dark dots for the eyes and a small curved dark smile, shoulder-length dark brown hair, a soft green dress, two arms hanging at her sides. One single woman, simple flat shapes.",
     "UNE femme adulte (visage avec deux yeux et un sourire, cheveux mi-longs, robe verte), de face, en pied ; un seul personnage", "proposition de Claude : maman (même style que père et papa)"),
    ("ami", "ami", "two boys standing side by side holding hands, seen from the front, full body; the boy on the left is in full color and the boy on the right is entirely in flat grey", DE_FACE, "face", f"{PEAU}, teal #0f6e56, orange #f97316, light grey #a8a29e",
     " Two boys of the same size holding hands in the middle. The boy on the left is in full color: round peach-colored face with two small dark dots for the eyes and a small curved dark smile, short dark brown hair, a teal t-shirt and orange shorts. The boy on the right is the same shape and size but entirely in ONE single flat light grey (face, hair, clothes, arms and legs all the same grey #a8a29e), with only two small darker grey dots for the eyes and a small smile. Exactly two boys, no girl, no dress, simple flat shapes.",
     "DEUX garçons qui se tiennent la main : celui de gauche en couleurs (l'ami), celui de droite entièrement en gris ; exactement deux personnages", "JF 2026-11-15 : « ami » au singulier : un en couleurs, l'autre en gris ; v1 garçon + fille archivée"),
    ("manger", "manger", "a child holding a big sandwich in front of the chest, with a bite taken out of it, smiling and chewing", DE_FACE, "face", f"{PEAU}, teal #0f6e56, warm yellow #fbbf24, cream",
     " A child with a round peach-colored face, TWO clearly visible small dark dots for the eyes high on the face, short dark brown hair, and a small closed smiling mouth (a small curved line, no big dark shape); a teal t-shirt. The child holds with both hands, in front of the chest and well BELOW the face, one big sandwich made of two cream slices with a warm yellow filling, with a round bite clearly missing from one corner. The sandwich never covers the face. No table, no plate, no second person, no mustache, no dark shape on the face.",
     "UN enfant, deux yeux bien visibles, qui tient devant la poitrine un gros sandwich dont un morceau est mordu ; le sandwich ne cache pas le visage ; un seul personnage", "JF 2026-11-15 : go pour manger, lire, voir, peur ; v1 refusée (yeux absents, bouche ouverte lue comme moustache)"),
    ("lire", "lire", "a girl sitting and reading a big open book held in both hands, looking down at the book", DE_FACE, "face", f"{PEAU}, orange #f97316, teal #0f6e56, cream",
     " A girl with a round peach-colored face, two small dark dots for the eyes looking down, two dark brown ponytails, an orange dress, holding a big open book with a teal cover and cream pages that shows no text and no pictures (blank pages). One girl only.",
     "UNE fille qui lit un grand livre ouvert (pages blanches, sans texte) ; un seul personnage", "JF 2026-11-15 : go pour manger, lire, voir, peur"),
    ("voir", "voir", "a girl standing and looking toward a small brown dog sitting on her right, her eyes wide open and turned toward the dog", DE_FACE, "face", f"{PEAU}, teal #0f6e56, warm brown #a16207, cream",
     " A girl with a round peach-colored face, two small dark dots for the eyes wide open and clearly shifted toward her right side (looking at the dog), two dark brown ponytails, a teal dress, both arms down; on her right, a small warm brown dog with floppy ears and one small dark dot for the eye, sitting and facing her. Her head slightly turned toward the dog. Both hands down: no hand near the face, no salute, no binoculars.",
     "UNE fille qui regarde, les yeux écarquillés tournés vers un petit chien assis à sa droite ; mains en bas, aucun salut ; illustre « Je peux voir le chien. »", "JF 2026-11-15 : le geste de la main au-dessus des yeux n'est pas évident (se lit comme un salut) ; v1 archivée ; phrase du pack : « Je peux voir le chien. » (JF)"),
    ("peur", "peur", "a scared girl standing with both hands raised to the cheeks, eyes wide open and mouth open in a round O", DE_FACE, "face", f"{PEAU}, soft pink #f4a9b0, dark brown #5b3a29",
     " A girl with a round peach-colored face, two small dark dots for the eyes with tiny raised eyebrows, a small round open mouth, two dark brown ponytails, a soft pink dress, both hands on the cheeks. One girl only, no monster, no ghost, no dark background.",
     "UNE fille qui a peur (yeux écarquillés, bouche en O, mains aux joues) ; un seul personnage ; ni monstre ni fantôme", "JF 2026-11-15 : go pour manger, lire, voir, peur ; phrase du pack : « La fille a peur. » (JF)"),
]
# Lot 9 : images d'ESSAI demandées par JF le 2026-11-15, pour qu'il évalue le principe avant d'en faire d'autres.
# « dans » : un ballon et une boîte (même couple pour sur, sous, vers, côté, avec, sans plus tard). « grand-petit » : une paire (un grand et un petit objet) ; la flèche est ajoutée par programme
# (tools/fleche_comparaison.py) pour que « grand » et « petit » aient exactement la même image de base et ne diffèrent que par la flèche.
MOTS_LOT9 = [
    # Série des mots de position (décision de JF, 2026-11-15) : UN chat et un décor simple, seule la relation change ; chaque image illustre la phrase du pack
    # (dans : « Le chat dort dans le panier » ; sur : « Le chat dort sur la chaise » ; sous : « Le chat dort sous la chaise » ; vers : « Le chat court vers la porte » ; avec : « Le chat joue avec le chien »).
    # « dans » est l'essai à faire valider ; les autres prendront l'image de « dans » comme référence (REFERENCES_PAR_MOT) pour garder le même chat.
    ("dans", "dans", "a small orange cat sleeping curled up inside a wide round basket", DE_PROFIL, "profil", "orange #f97316, cream, warm yellow #fbbf24",
     " The cat is a small orange tabby with a cream belly, cream paws and a cream muzzle, asleep with its eye shown as one short curved dark line. The basket is wide and shallow with a low rim, made of ONE single warm yellow color. The cat's body is clearly INSIDE the basket: only its head, its back and its tail rise above the rim. A cat in a basket, not a bowl, not a pot, not a hat. Nothing else: no cushion, no toy, no text.",
     "UN chat orange endormi DANS un panier large et bas (le corps dans le panier, seuls la tête, le dos et la queue dépassent) ; panier d'une seule couleur ; rien d'autre", "essai pour JF : « dans » = « Le chat dort dans le panier »"),
    # Images dérivées de la paire de base par tools/fleche_comparaison.py (flèche ajoutée par programme, jamais générée par Canva) : même image, flèche différente.
    ("grand", "grand", "the base pair of two teal balls with an orange arrow above the BIG ball", DE_FACE, "aucun", "teal #0f6e56, orange #f97316", "",
     "flèche orange au-dessus du GRAND rond", "dérivée de grand-petit (flèche ajoutée par programme)"),
    ("petit", "petit", "the base pair of two teal balls with an orange arrow above the SMALL ball", DE_FACE, "aucun", "teal #0f6e56, orange #f97316", "",
     "flèche orange au-dessus du PETIT rond", "dérivée de grand-petit (flèche ajoutée par programme)"),
]
# Mots de position (série du chat) : « dans » validé par JF le 2026-11-15 (« Dans est OK, il faudra continuer ») ; ces mots reprennent son image comme référence (REFERENCES_PAR_MOT, identifiant Canva MAHa_AOCW34)
# pour garder exactement le même chat.
MOTS_SERIE_CHAT = [
    ("sur", "sur", "a small orange cat sleeping curled up on top of the seat of a simple wooden chair", DE_PROFIL, "profil", "orange #f97316, cream, warm yellow #fbbf24",
     " Exactly the same small orange tabby cat as in the reference image (cream belly, cream paws, cream muzzle), asleep with its eye shown as one short curved dark line, lying ON the flat seat of a simple chair seen from the side. The chair is made of ONE single warm yellow color: a flat seat, a straight back and four thin legs. The cat is clearly on the seat, not in front of the chair and not behind it. Nothing else.",
     "LE MÊME chat orange endormi SUR l'assise d'une chaise simple (jaune d'une seule couleur) ; nettement dessus ; rien d'autre", "série des mots de position : « Le chat dort sur la chaise »"),
    ("sous", "sous", "a small orange cat sleeping curled up under a simple wooden chair", DE_PROFIL, "profil", "orange #f97316, cream, warm yellow #fbbf24",
     " Exactly the same small orange tabby cat as in the reference image (cream belly, cream paws, cream muzzle), asleep with its eye shown as one short curved dark line, lying UNDER the seat of the same simple chair seen from the side, between its legs, with the seat clearly above the cat. The chair is made of ONE single warm yellow color: a flat seat, a straight back and four thin legs. Nothing else.",
     "LE MÊME chat orange endormi SOUS la même chaise (entre les pieds, l'assise au-dessus de lui) ; rien d'autre", "série des mots de position : « Le chat dort sous la chaise »"),
    ("vers", "vers", "a small orange cat running to the right toward a closed door", DE_PROFIL, "profil", "orange #f97316, cream, teal #0f6e56, warm yellow #fbbf24",
     " Exactly the same small orange tabby cat as in the reference image (cream belly, cream paws, cream muzzle) with one small dark dot for the eye, in a running pose with legs stretched, moving toward a plain teal door standing at the right of the picture with a small round warm yellow handle. The cat is on the left, the door on the right, with some empty space between them. Nothing else: no wall, no floor, no person.",
     "LE MÊME chat orange qui COURT vers une porte verte (chat à gauche, porte à droite, de l'espace entre les deux) ; rien d'autre", "série des mots de position : « Le chat court vers la porte »"),
    ("avec", "avec", "a small orange cat playing with a small red ball, one front paw on the ball", DE_PROFIL, "profil", "orange #f97316, cream, red #dc2626",
     " Exactly the same small orange tabby cat as in the reference image (cream belly, cream paws, cream muzzle), awake and playful, seen from the side, one front paw resting on one small plain red ball (one single red color) in front of it. One animal only. Nothing else: no dog, no yarn, no toy, no text.",
     "LE MÊME chat orange qui joue avec UNE balle rouge (une patte dessus) ; un seul animal ; rien d'autre", "série des mots de position, un seul personnage (JF) : « Le chat joue avec la balle »"),
]
# Lot 10 : fin du p1-100 (2026-11-16, proposition de Claude, à valider par JF) : côté et sans (suite de la série du chat, même référence que sur/sous), gros (le chien de la phrase du pack).
# Restent SANS image, par décision de JF : mots-outils, pronoms, oui/non ; matin/soir en réflexion.
MOTS_LOT10 = [
    ("côté", "cote", "a small orange cat sitting upright next to a simple wooden chair, beside it and not touching it", DE_PROFIL, "profil", "orange #f97316, cream, warm yellow #fbbf24",
     " Exactly the same small orange tabby cat as in the reference image (cream belly, cream paws, cream muzzle) with one small dark dot for the eye, sitting upright on the ground at the LEFT of a simple chair seen from the side, close beside it, both at the same level and side by side. The chair is made of ONE single warm yellow color: a flat seat, a straight back and four thin legs. The cat is not on the chair and not under it. Nothing else.",
     "LE MÊME chat orange assis À CÔTÉ d'une chaise (gauche, au même niveau, ni dessus ni dessous) ; rien d'autre", "série des mots de position : « Le chat est à côté de la chaise » (phrase du pack : « Je suis assis à côté de toi. »)"),
    ("sans", "sans", "a boy standing, holding in one hand a dog leash whose far end lies on the ground with nothing attached to it, the dog is invisible", DE_FACE, "face", f"{PEAU}, teal #0f6e56, orange #f97316, red #dc2626, warm yellow #fbbf24",
     " A friendly boy: round peach-colored face with two small dark dots for the eyes and a small curved smile, short dark brown hair, teal t-shirt, orange shorts. His right arm is stretched out to the side holding the handle of a red leash; the leash is a plain red line that goes out and down to the ground and simply ends in a clearly visible dog collar lying open on the floor (a wide round warm yellow collar ring with a small round tag, big enough to be recognised as a dog collar, not a stick and not a cane) with NO dog, no animal, no silhouette, no shadow at its end. One boy only.",
     "UN garçon qui tient une laisse rouge dont le bout est vide (pas de chien, ni silhouette ni ombre) ; illustre « Le garçon est sans son chien. »","JF 2026-11-16 : v1 (verre sans paille, paille barrée) pas claire, paille non reconnue ; demande une paire célèbre type Obélix sans Idéfix (personnage protégé : paire générique garçon + chien) ; phrase du pack à adapter"),
    ("gros", "gros", "a very fat, round, chubby dog sleeping, with a huge round body", DE_PROFIL, "profil", "warm brown #a16207, cream, soft pink #f4a9b0",
     " A dog whose body is an enormous round ball, much wider and taller than its small head and short legs, asleep with its eye shown as one short curved dark line. Warm brown body, cream belly and muzzle. One animal only. Nothing else.",
     "UN chien TRÈS gros et rond, endormi ; un seul animal ; rien d'autre", "essai pour JF : « gros » = « Le gros chien dort. »"),
]
# Lot 11 : VOB, année P1 (data/listes/vob.json, niveau P1 ; 52 entrées dont 21 noms ; 2026-11-16). Noms d'objets absents des lots précédents ; mots du pack p1-100 exclus.
# Hors lot, à décider par JF : bébé, fille, femme, homme, fils (personnes, style du lot 8) ; chatte, lapine, lionne (féminins d'animaux : même image que le mâle) ; mal, rive, sud (abstraits).
MOTS_LOT11 = [
    ("branche", "branche", "a single tree branch with five or six leaves", DE_FACE, "aucun", "warm brown #a16207, soft green #86b98f, teal #0f6e56",
     " One slightly curved brown branch with a few short side twigs, each carrying one single flat green leaf. No trunk, no tree, no fruit, no bird.",
     "UNE branche brune avec quelques feuilles vertes ; pas un arbre entier ; rien d'autre", "VOB P1"),
    ("brique", "brique", "a small stack of three terracotta-colored bricks laid like the start of a wall", DE_FACE, "aucun", "terracotta brick color #b9532f, cream",
     " Three rectangular bricks in ONE single flat terracotta brick color #b9532f (an earthy orange-brown clay color, NOT bright red): two side by side on the bottom row and one on top, offset by half a brick like in a real brick wall, separated by thin cream mortar gaps. Each brick is clearly a chunky block, not an envelope and not a box. No wall behind, no ground, no texture lines.",
     "TROIS briques rouges empilées en quinconce, séparées par un joint crème ; se lit comme des briques, pas une enveloppe ni une boîte", "VOB P1 ; v1 (une seule brique, rectangle rouge à bord crème) archivée : se lit comme une enveloppe"),
    ("cheminée", "cheminee", "a small house roof with a brick chimney and a little smoke", DE_FACE, "aucun", "orange #f97316, terracotta brick color #b9532f, cream, light grey #a8a29e",
     " The top part of a house: a triangular orange roof, a tall terracotta brick-colored (#b9532f, not bright red) chimney rising from it, and two or three small round soft grey smoke puffs above the chimney. No walls, no windows, no door.",
     "UN toit avec UNE cheminée rouge qui fume ; pas de maison entière", "VOB P1"),
    ("pipe", "pipe", "a single smoking pipe", DE_PROFIL, "aucun", "warm brown #a16207, dark brown #5b3a29, light grey #a8a29e",
     " One simple tobacco pipe with a round bowl and a curved stem, no smoke, no person, no flame.",
     "UNE pipe (fourneau rond, tuyau courbe) ; sans fumée ni personne", "VOB P1"),
    ("plante", "plante", "a green plant in a terracotta pot", DE_FACE, "aucun", "soft green #86b98f, teal #0f6e56, orange #f97316",
     " One small potted plant: an orange pot with a few flat green leaves of two greens on thin stems. No flower, no saucer, no soil visible.",
     "UNE plante verte en pot orange ; sans fleur", "VOB P1"),
    ("robe", "robe", "a single child's dress", DE_FACE, "aucun", "soft pink #f4a9b0, cream, teal #0f6e56",
     " One simple dress shown alone as if laid flat: two short sleeves, a round neckline, a fitted top and a wide flared skirt, ONE single soft pink with a teal belt. No body, no hanger, no pattern.",
     "UNE robe rose seule, à plat (manches courtes, jupe évasée) ; sans corps ni cintre", "VOB P1"),
    ("route", "route", "a straight road going into the distance across a green field", DE_FACE, "aucun", "dark grey #57534e, soft green #86b98f, cream",
     " A grey road shaped like a trapezoid narrowing toward the top, with a short dashed cream line along its middle, and flat green grass on both sides. No car, no house, no tree, no sign, no person.",
     "UNE route grise qui s'éloigne entre deux bandes d'herbe ; ni voiture ni maison ni arbre ; différente de « rue »", "VOB P1"),
    ("soleil", "soleil", "a sun with a round disc and straight rays", DE_FACE, "aucun", "warm yellow #fbbf24, orange #f97316",
     " A round warm yellow disc with eight short triangular orange rays around it. Face-less: no eyes, no mouth.",
     "UN soleil (disque jaune, rayons orange) ; sans visage", "VOB P1"),
    ("sucre", "sucre", "a small low teal bowl heaped with about nine big white sugar lumps, the lumps are the main subject", DE_PROFIL, "aucun", "teal #0f6e56, pure white #ffffff, off-white #f5f5f4, light grey-white #e7e5e4",
     " A small, low, wide teal bowl filled to overflowing with a pile of about nine BIG white sugar lumps: the pile rises well above the rim and takes about two thirds of the picture, so the white lumps are the main subject and the bowl is secondary. Each lump is a rectangular block (a cuboid) with a SQUARE top and a height clearly smaller than its width, like a real lump of coffee sugar: NOT a cube, NOT a dice, NOT an eraser. Bright white tops, slightly darker off-white side faces, soft shadows between lumps so each lump is distinct, lumps tilted at different angles in the pile. Nothing else: no cup, no coffee, no spoon, no steam, no text.",
     "UN petit sucrier bas, turquoise, débordant d'une dizaine de GROS morceaux de sucre (pavés à base carrée, plus bas que larges, pas des cubes ni des dés) : les morceaux blancs sont le sujet (deux tiers de l'image), le bol est secondaire ; rien d'autre","VOB P1 ; v1 (deux blocs blancs) lue comme des gommes ; v2 (tasse de café, sucres minuscules sous le bord) trop peu en évidence (JF 2026-11-16)"),
]
# Lot 12 : VOB, année P2 (niveau P2 de data/listes/vob.json ; 113 noms de 3 à 9 lettres absents des lots ; 2026-11-16). Les 10 premiers de la liste, dans l'ordre du VOB, qui se dessinent comme UN objet ou UN animal
# (ordre de la liste, pas de tri par l'IA ; écartés : abstraits, personnes, jours, adjectifs). À valider par JF image par image.
PERSONNES |= {"poupée"}
MOTS_LOT12 = [
    ("armoire", "armoire", "a tall wardrobe with two closed doors", DE_FACE, "aucun", "warm brown #a16207, warm yellow #fbbf24, cream",
     " One tall wooden wardrobe seen from the front: a rectangular body in ONE single warm brown, two tall closed doors separated by a thin line, one small round warm yellow knob on each door, two short feet. No clothes, no mirror, no room.",
     "UNE armoire brune à deux portes fermées, deux petits boutons jaunes ; ni vêtements ni miroir", "VOB P2"),
    ("balle", "balle", "a single plain rubber playground ball, the kind children play with at recess or on the sand", DE_FACE, "aucun", "red #dc2626, cream",
     " One solid round rubber ball in ONE single plain red, with no stripes, no segments, no lines and no pattern at all. Roundness is shown only by one soft cream highlight spot on the upper left and a slightly darker red crescent along the lower right edge, plus a small soft oval shadow right under it. It must read as a simple bouncy ball: not a beach ball, not a tennis ball, not a football, not a flat disc, not an apple.",
     "UNE balle de récréation pleine, rouge unie, sans aucune ligne ni quartier, avec un reflet crème et un ombrage ; ni ballon de plage, ni tennis, ni foot, ni disque plat", "VOB P2 ; v1 (yin-yang) et v2 (ballon de plage, non générée) refusées : JF veut la balle de récréation ou de sable"),
    ("cage", "cage", "a birdcage with a small bird inside, perched in the middle", DE_FACE, "profil", "warm yellow #fbbf24, teal #0f6e56, cream, orange #f97316",
     " One birdcage: a round base, thin vertical bars in ONE single warm yellow, a dome-shaped top with a small ring to hang it, a small perch bar across the middle. One small teal bird with a cream belly, a small orange beak and ONE small dark dot for the eye, stands on the perch INSIDE the cage, clearly visible between the bars (the bars never hide the bird). One bird only: no seed, no water, no second bird.",
     "UNE cage à oiseau (barreaux jaunes, dôme, anneau, perchoir) avec UN petit oiseau turquoise DEDANS sur le perchoir, bien visible ; un seul œil", "VOB P2 ; JF 2026-11-16 : mettre un oiseau dedans pour que l'image soit plus explicite (v1 : cage vide)"),
    ("cahier", "cahier", "a school notebook lying closed with a plain colored cover and a wide white label", DE_FACE, "aucun", "orange #f97316, cream, teal #0f6e56",
     " One closed school notebook seen from the front: a rectangle with a plain orange cover, a dark teal spine band on the left side, and a cream blank label in the middle. The label stays completely empty: no text, no lines, no letters.",
     "UN cahier fermé orange, dos turquoise, étiquette crème VIDE ; aucun texte ni ligne", "VOB P2"),
    ("confiture", "confiture", "a glass jam jar with a closed lid and a round red jam-colored content", DE_FACE, "aucun", "red #dc2626, cream, warm yellow #fbbf24",
     " One short jar: a cream glass body filled with deep red jam, a warm yellow metal lid, and one plain cream label in the middle left completely empty (no text). A single jar.",
     "UN pot de confiture rouge fermé (couvercle jaune, étiquette VIDE) ; un seul pot ; aucun texte", "VOB P2"),
    ("œuf", "oeuf", "one single egg standing on its wide end", DE_FACE, "aucun", "cream only",
     " One whole egg: a smooth oval in ONE single cream color (#f5ecd0), slightly pointed at the top. Cream is the ONLY color on the egg: no yellow patch, no pink patch, no spot, no crescent, no colored highlight, no shading in another hue. A whole raw egg: no crack, no yolk, no nest, no chick.",
     "UN œuf entier crème, UNE seule couleur, sans aucune tache ni croissant colorés ; ni fissure ni jaune ni poussin", "VOB P2 ; v1 refusée : tache jaune et croissant rose (règle d'une couleur sur un objet homogène)"),
    ("orange", "orange", "an orange fruit with one green leaf on top", DE_FACE, "aucun", "orange #f97316, soft green #86b98f, teal #0f6e56",
     " One round orange fruit in ONE single orange with a small green stem and one green leaf on top. The fruit is a fruit, not a color swatch: it has a small leaf and a tiny dark stem dot, no slice, no peel strip.",
     "UNE orange (le fruit) avec une petite feuille verte ; entière ; se lit comme un fruit, pas comme une couleur", "VOB P2 ; ambiguïté fruit/couleur : l'image est le fruit"),
    ("plume", "plume", "a single white bird feather", DE_FACE, "aucun", "shades of white only: pure white #ffffff, off-white #f5f5f4, light grey-white #e7e5e4",
     " One long feather entirely in white: a thin curved central shaft in off-white and a leaf-shaped soft vane in pure white, slightly tilted, with soft small drop shadows so it stays visible on the pastel sky-blue background. White is the ONLY color: no teal, no green, no colored tip. Only one feather: no bird, no ink, no pen.",
     "UNE plume d'oiseau toute blanche (nuances de blanc uniquement), ombre douce pour rester lisible sur le fond bleu ; ni oiseau ni stylo", "VOB P2 ; JF 2026-11-16 : une plume est plus souvent blanche (v1 : turquoise)"),
    ("poupée", "poupee", "a floppy rag doll sitting on the ground with its legs stretched out in front and its head tilted to one side", DE_FACE, "face", f"{PEAU}, soft pink #f4a9b0, warm yellow #fbbf24, teal #0f6e56, cream",
     " A handmade stuffed rag doll, clearly a TOY and not a real child: it SITS with its legs stretched out in front, soft and floppy, its big round head tilted to one side and its two short stubby cloth arms hanging loosely. Its face is a round cream cloth circle with TWO BIG ROUND TEAL BUTTONS for the eyes (each button a round disc with two tiny holes) and a small stitched smile drawn as one short curved line of tiny dashes, plus two round pink cheeks. Messy warm yellow yarn hair sticking out in short loops, a soft pink dress with one square teal patch sewn on the skirt. Proportions of a toy: a head almost as big as the whole body. One doll only.",
     "UNE poupée de CHIFFON assise, molle, tête penchée, grosse tête ronde, yeux-boutons turquoise, bouche cousue, cheveux de laine jaune, robe rose avec une pièce ; se lit comme un jouet fait main, pas comme une enfant", "VOB P2 ; JF 2026-11-16 : refaire la poupée (v1 : se lit comme une fillette debout)"),
    ("singe", "singe", "a monkey sitting, with a long curled tail", DE_PROFIL, "profil", "warm brown #a16207, cream, warm yellow #fbbf24",
     " A small monkey sitting upright: a warm brown body, a cream round face patch with one small dark dot for the eye, round brown ears, long arms, a long thin brown tail curling up. Optionally one yellow banana in one hand. One animal only.",
     "UN singe brun assis, queue longue enroulée, un seul œil ; peut tenir une banane ; un seul animal", "VOB P2"),
]
# Lot 13 : fin du p1-100 (2026-11-16, demande de JF) : mots sans objet qu'on peut montrer honnêtement ; la PHRASE du pack est adaptée à l'image (règle de JF). À valider par JF image par image.
# Restent sans image (décisions de JF) : mots-outils, pronoms, oui/non ; matin/soir en réflexion ; temps, fois, encore, tout : trop ambigus, non tentés.
# « trop » et « peu » : le MÊME verre (peu reprend l'image de trop en référence : REFERENCES_PAR_MOT).
PERSONNES |= {"coup", "faire", "voilà"}
MOTS_LOT13 = [
    ("vite", "vite", "a hare running very fast, stretched out in a long leap with its long ears flat back, and three short thin cream speed strokes behind it", DE_PROFIL, "profil", "warm brown #a16207, cream, warm yellow #fbbf24",
     " One brown hare in full gallop, body long and stretched, legs extended front and back, long ears laid back along its neck, one small dark dot for the eye, a small cream tail. Behind it, three short thin horizontal cream strokes show its speed. No ground, no grass, no text.",
     "UN lièvre brun en plein galop, corps étiré, oreilles couchées, trois traits de vitesse crème derrière ; un seul animal", "p1-100 ; phrase adaptée : « Le lièvre court vite. »"),
    ("trop", "trop", "a wide wooden basket piled so high with red apples that many apples are falling over the edge and rolling on the ground", DE_FACE, "aucun", "warm yellow #fbbf24, red #dc2626, soft green #86b98f",
     " One wide shallow warm yellow basket heaped with a big pile of about fifteen plain red apples, the pile rising high above the rim; four apples are tumbling down over the edge and three more lie on the ground in front of the basket. Each apple is one plain red round with one small green leaf. It is clearly TOO full. No table, no text.",
     "UN panier tellement plein de pommes rouges qu'elles tombent par-dessus bord et roulent par terre ; lisible comme « trop plein »", "p1-100 ; phrase adaptée (JF 2026-11-16) : « Le panier est trop plein de pommes. » ; v1 (verre de jus qui déborde) refusée : illisible (JF : « c'est quoi ça ! »)"),
    ("peu", "peu", "the same wide wooden basket almost empty, with only two red apples at the bottom", DE_FACE, "aucun", "warm yellow #fbbf24, red #dc2626, soft green #86b98f",
     " Exactly the same wide shallow warm yellow basket as in the reference image, seen the same way and at the same size, but almost empty: only two plain red apples (each with one small green leaf) lying at the bottom, the rest of the basket empty. No apples on the ground, no table, no text.",
     "LE MÊME panier presque vide : seulement deux pommes ; un seul panier", "p1-100 ; phrase adaptée : « Il y a peu de pommes dans le panier. »"),
    ("plus", "plus", "two small wooden baskets side by side: the left basket holds two red apples and the right basket holds six red apples", DE_FACE, "aucun", "warm yellow #fbbf24, red #dc2626, soft green #86b98f",
     " Two identical shallow warm yellow baskets side by side. Left basket: exactly two plain red apples. Right basket: exactly six plain red apples piled up. Each apple is one plain red round with one small green leaf. The right basket clearly has many more apples than the left one. No table, no text, no numbers.",
     "DEUX paniers identiques : 2 pommes à gauche, 6 pommes à droite ; ni chiffre ni texte", "p1-100 ; phrase adaptée : « Il y a plus de pommes à droite. »"),
    ("beau", "beau", "a beautiful bouquet of five flowers tied with a ribbon", DE_FACE, "aucun", "soft pink #f4a9b0, warm yellow #fbbf24, orange #f97316, soft green #86b98f, teal #0f6e56",
     " One bouquet seen from the front: five simple round-petal flowers (pink, yellow, orange, pink, yellow), each flower with a plain yellow or orange center, thin green stems gathered in the middle and tied with a teal ribbon bow. Nothing else: no vase, no table, no text.",
     "UN beau bouquet de cinq fleurs simples liées par un ruban turquoise ; ni vase ni texte", "p1-100 ; phrase adaptée : « Quel beau bouquet ! »"),
    ("bon", "bon", "a slice of cake with pink icing and one red cherry on top, with a small fork", DE_FACE, "aucun", "soft pink #f4a9b0, cream, warm brown #a16207, red #dc2626",
     " One triangular slice of layered cake seen from the side: cream sponge layers, warm brown chocolate layers between them, a thick soft pink icing on top and one red cherry with a tiny green stem. Next to it a small fork resting on its side. No plate, no table, no text.",
     "UNE part de gâteau (glaçage rose, cerise) avec une petite fourchette ; ni assiette ni texte", "p1-100 ; phrase adaptée : « Le gâteau est bon. »"),
    ("vrai", "vrai", "one big bold green check mark inside a round cream badge", DE_FACE, "aucun", "teal #0f6e56, soft green #86b98f, cream",
     " One large cream round badge with a thick green check mark (a tick) in the middle, made of one single green paper piece with rounded ends. Nothing else: no text, no letters, no cross, no second mark.",
     "UNE grande coche verte dans un rond crème ; aucun texte ni croix", "p1-100 ; phrase adaptée : « Ce que tu dis est vrai. »"),
    ("coup", "coup", "a boy kicking a red ball with his right foot, one leg stretched forward at the ball, the ball just leaving the foot", DE_PROFIL, "face", f"{PEAU}, teal #0f6e56, orange #f97316, red #dc2626",
     " A friendly boy seen from the side kicking a ball: round peach-colored face with ONE small dark dot for the eye and a small smile, short dark brown hair, teal t-shirt, orange shorts, brown shoes. His right leg is swung forward and the foot touches a plain red ball just in front of it; the left leg stands firm. One boy and one ball only. No goal, no grass, no text.",
     "UN garçon qui donne un coup de pied dans une balle rouge (jambe tendue, pied sur la balle) ; un seul personnage", "p1-100 ; phrase adaptée : « Il donne un coup de pied dans la balle. »"),
    ("rien", "rien", "an empty open cardboard box seen from the front, completely empty inside", DE_FACE, "aucun", "warm brown #a16207, cream, warm yellow #fbbf24",
     " One open cardboard box seen from the front and slightly above: warm brown outside, the open flaps folded outward, and a plain cream empty inside with nothing in it at all. No object inside, no tape, no label, no text.",
     "UNE boîte en carton ouverte et COMPLÈTEMENT vide ; ni objet ni étiquette", "p1-100 ; phrase adaptée : « Il n'y a rien dans la boîte. »"),
    ("faire", "faire", "a child drawing a house with a big crayon on a sheet of paper", DE_FACE, "face", f"{PEAU}, orange #f97316, teal #0f6e56, cream, red #dc2626",
     " A child with a round peach-colored face with two small dark dots for the eyes and a small smile, short dark brown hair, an orange t-shirt, holding a big teal crayon above a large cream sheet of paper; on the sheet a very simple drawing of a house made of a red square and a triangle roof. No table, no text.",
     "UN enfant qui dessine une maison simple avec un gros crayon sur une feuille ; un seul personnage ; aucun texte", "p1-100 ; phrase du pack conservée : « Je vais faire un dessin. »"),
    ("même", "meme", "two identical teal mugs standing side by side, exactly the same size, shape and color", DE_FACE, "aucun", "teal #0f6e56, cream",
     " Two mugs side by side, perfectly identical: same size, same shape, same teal color, same cream handle on the right side, same height. Nothing else: no table, no steam, no pattern, no text.",
     "DEUX tasses strictement identiques côte à côte ; ni motif ni texte", "p1-100 ; phrase adaptée : « Les deux tasses ont la même couleur. » (JF 2026-11-16 : le mot cible est « même » au singulier, pas « mêmes »)"),
    ("voilà", "voila", "a child pointing with one index finger toward a small orange cat sitting at the right, the child looking at the viewer with a happy face", DE_FACE, "face", f"{PEAU}, teal #0f6e56, orange #f97316, cream",
     " A child standing at the left, round peach-colored face with two small dark dots for the eyes and a big smile, short dark brown hair, teal t-shirt, the right arm stretched out and ONE index finger pointing at a small orange tabby cat (cream belly, one small dark dot for the eye) sitting upright at the right. One child and one cat only. No text.",
     "UN enfant qui montre du doigt un petit chat orange assis à droite ; un enfant et un chat ; aucun texte", "p1-100 ; phrase adaptée : « Voilà mon chat ! »"),
]
# Lot 14 (2026-11-16) : VOB P1 (personnes, même style que le lot 8) puis les 8 premiers noms dessinables du VOB P2 non illustrés (blé, bouche, café, car, chambre, chemin, cœur, costume).
# Non tentés, décisions de JF : fils, chatte, lapine, lionne, mal, rive, sud, matin. Phrase écrite d'après l'image, mot cible tel quel. À valider par JF image par image.
PERSONNES |= {"bébé", "fille", "femme", "homme", "bouche"}
MOTS_LOT14 = [
    ("bébé", "bebe", "a baby sitting on the floor, seen from the front, smiling, with a big round head and a tiny tuft of hair", DE_FACE, "face", f"{PEAU}, soft pink #f4a9b0, cream",
     " A baby sitting upright with legs stretched in front: an oversized round peach-colored head with two small dark dots for the eyes, a small smile and one tiny curl of dark brown hair on top, a soft pink one-piece suit, short chubby arms and legs, no shoes. One baby only. No toys, no text.",
     "UN bébé assis (grosse tête ronde, deux yeux, sourire, une mèche, combinaison rose) ; un seul personnage", "VOB P1 ; phrase : « Le bébé sourit. »"),
    ("fille", "fille", "a girl standing, seen from the front, full body, with two dark brown braids", DE_FACE, "face", f"{PEAU}, orange #f97316, teal #0f6e56",
     " A friendly girl: a round peach-colored face with two small dark dots for the eyes and a small curved smile, two dark brown braids hanging on each side, an orange dress, teal shoes, two arms hanging at her sides. One girl only, simple flat shapes.",
     "UNE fille (deux yeux, sourire, deux tresses, robe orange), de face, en pied ; un seul personnage", "VOB P1 ; phrase : « La fille a une robe orange. »"),
    ("femme", "femme", "an adult woman carrying a shopping bag, standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, teal #0f6e56, warm yellow #fbbf24, cream",
     " A friendly woman: a round peach-colored face with two small dark dots for the eyes and a small curved smile, a dark brown bun on top of her head, a teal coat down to the knees, one hand holding a big warm yellow shopping bag. One woman only, simple flat shapes.",
     "UNE femme adulte (chignon, manteau turquoise) qui porte un grand sac jaune ; un seul personnage", "VOB P1 ; phrase : « La femme porte un sac. »"),
    ("homme", "homme", "an adult man wearing a round hat, standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, warm brown #a16207, orange #f97316, dark grey #57534e",
     " A friendly man: a round peach-colored face with two small dark dots for the eyes and a small curved smile, a clearly visible round warm brown hat on his head, an orange jacket, dark grey trousers, two arms hanging at his sides. One man only, simple flat shapes, no beard, no glasses.",
     "UN homme adulte avec un chapeau rond bien visible, veste orange ; un seul personnage", "VOB P1 ; phrase : « L'homme porte un chapeau. »"),
    ("blé", "ble", "three golden wheat ears standing together on thin stems", DE_FACE, "aucun", "warm yellow #fbbf24, warm brown #a16207, soft green #86b98f",
     " Three tall wheat stems side by side of slightly different heights, each topped by one elongated ear made of overlapping small warm yellow grain shapes with thin long awns pointing up; thin soft green stems. No field, no sack, no bread, no text.",
     "TROIS épis de blé dorés sur leurs tiges ; ni champ ni pain", "VOB P2 ; phrase : « Le blé est jaune. »"),
    ("bouche", "bouche", "a child's mouth, with red lips slightly open in a smile showing white teeth, cropped close", DE_FACE, "aucun", f"{PEAU}, red #dc2626, cream, soft pink #f4a9b0",
     " Only a mouth with a little skin around it: soft red lips forming a wide open smile, a row of plain white teeth at the top, a small soft pink tongue inside; a little peach skin around the lips. No nose, no eye, no chin line beyond the lips, no text.",
     "UNE bouche souriante (lèvres rouges, dents blanches, langue rose) cadrée de près ; ni nez ni yeux", "VOB P2 ; phrase : « J'ouvre la bouche. »"),
    ("café", "cafe", "a cup of hot coffee on a saucer with a little steam", DE_PROFIL, "aucun", "teal #0f6e56, warm brown #a16207, cream",
     " A teal cup seen from the side, filled to the top with dark brown coffee, with a small handle, on a cream saucer, and two or three small curved cream steam lines above it. No spoon, no sugar, no table, no text.",
     "UNE tasse turquoise de café chaud sur sa soucoupe, avec de la vapeur ; rien d'autre", "VOB P2 ; phrase : « Le café est chaud. »"),
    ("car", "car", "a yellow coach bus seen from the side with a row of windows", DE_PROFIL, "aucun", "warm yellow #fbbf24, teal #0f6e56, dark grey #57534e, cream",
     " A long yellow coach bus: a rounded rectangular body in ONE single warm yellow, a row of seven cream windows, a larger front window at the right end, two dark grey wheels, a thin teal stripe along the body. No people, no road, no text, no number.",
     "UN autocar jaune de profil (rangée de fenêtres, deux roues) ; ni personne ni route ni texte", "VOB P2 ; phrase : « Le car est jaune. »"),
    ("chambre", "chambre", "a small bedroom seen from the front with a bed, a window and a rug", DE_FACE, "aucun", "teal #0f6e56, soft pink #f4a9b0, cream, warm yellow #fbbf24, warm brown #a16207",
     " A simple bedroom wall seen from the front: a single bed with a soft pink blanket and a cream pillow at the left, a square window with a warm yellow curtain on the right wall, a small round teal rug on the floor, a plain cream wall. No people, no toys, no pictures, no text.",
     "UNE chambre simple (un lit rose, une fenêtre, un tapis rond) ; ni personne ni jouet", "VOB P2 ; phrase : « Il y a un lit dans la chambre. »"),
    ("chemin", "chemin", "a narrow winding brown dirt path through green grass", DE_FACE, "aucun", "warm brown #a16207, soft green #86b98f, teal #0f6e56, soft pink #f4a9b0",
     " A narrow brown dirt path that winds in an S curve from the bottom of the picture toward the top, getting thinner, between two flat soft green grass areas, with three small pink flowers in the grass. Narrower and curvier than a road: no lines on it, no cars, no houses, no text.",
     "UN sentier brun étroit qui serpente entre deux zones d'herbe, trois petites fleurs ; différent de « route » ; rien d'autre", "VOB P2 ; phrase : « Le chemin tourne dans l'herbe. »"),
    ("cœur", "coeur", "one big plain red heart shape", DE_FACE, "aucun", "red #dc2626, cream",
     " One large symmetrical heart symbol in ONE single plain red, smooth rounded shape, with one soft small cream highlight on the upper left lobe. Not an anatomical heart: no veins, no valves, no tubes. No text.",
     "UN grand cœur rouge symétrique, une seule couleur ; pas un organe", "VOB P2 ; phrase : « Voici un cœur rouge. »"),
    ("costume", "costume", "a man's suit on a hanger: a dark teal jacket with a red tie and matching trousers hanging below", DE_FACE, "aucun", "teal #0f6e56, red #dc2626, cream, warm brown #a16207",
     " A men's suit hanging on a wooden hanger seen from the front: a dark teal jacket with two lapels and a cream shirt collar, a red tie in the middle, and matching dark teal trousers hanging straight below. No person, no body, no wall, no text.",
     "UN costume (veste turquoise foncé, cravate rouge, pantalon) sur un cintre ; aucune personne", "VOB P2 ; phrase : « Le costume est vert. » (l'image montre un costume vert turquoise : la phrase d'abord prévue, « bleu », ne correspondait pas)"),
]
PERSONNES |= {"mari", "ravi", "mémé"}
# Lot 15 : pack progressif P1, paliers 1 et 2 (plan docs/plan-apport-virginie-pack-progressif.md ; fiche data/base/lots/pack-progressif-p1-lot15-intention.md validée par JF le 2026-11-20)
MOTS_LOT15 = [
    ("sofa", "sofa", "a two-seat sofa with two cushions", DE_FACE, "aucun", "teal-green #2f8f83, cream, warm yellow #fbbf24",
     " A simple sofa seen from the front: the whole body (back, seat and two armrests) in ONE single teal-green #2f8f83, two short feet, one cream cushion and one warm yellow cushion sitting on the seat. No person, no animal, no room, no table, no text.",
     "UN canapé 2 places vert-bleu uni avec 2 coussins (crème et jaune) ; rien d'autre", "Palier 1 ; phrase : « Le sofa est doux. »"),
    ("rôti", "roti", "a tied roast of meat, a thick short cylinder wrapped with string", DE_PROFIL, "aucun", "warm brown #8a4b2a, cream",
     " A roast of meat in ONE single warm brown #8a4b2a: a thick cylinder lying down with a slightly lumpy, irregular outline like a piece of meat (not a straight-edged rectangle, not a loaf of bread, not a gift), seen at a slight angle so that one round end is visible as a lighter cream-brown circle; tied with three thin cream strings that pinch slightly into the meat, and one small cream knot with two short loose ends on top. No ribbon bow, no plate, no vegetables, no knife, no smoke, no text.",
     "UN rôti brun ficelé (cylindre irrégulier, bout rond visible, 3 ficelles, un petit nœud) ; ne doit pas se lire comme un pain ou un cadeau ; ni assiette ni légume", "Palier 2 ; phrase : « Le rôti est brun. » (v1 refusée : lue comme un pain ou un cadeau)"),
    ("télé", "tele", "a classic television set with two antennas on top", DE_FACE, "aucun", "dark grey #57534e, medium blue #3b82f6, cream",
     " A classic children's-book television set seen from the front: a thick rounded dark grey box (a wide chunky frame, not a thin monitor), a plain medium blue #3b82f6 screen with rounded corners and NOTHING drawn on it (no picture, no shape), two short stubby dark grey feet spread apart at the bottom, and two thin dark grey rabbit-ear antennas forming a V on top. Not a computer monitor: no single central stand, no keyboard. No remote control, no room, no text.",
     "UNE télé (boîtier gris foncé épais, écran bleu uni vide, deux pieds écartés, deux antennes en V) ; ne doit pas se lire comme un écran d'ordinateur", "Palier 2 ; phrase : « La télé est allumée. » (v1 refusée : lue comme un écran d'ordinateur)"),
    ("épi", "epi", "one single ear of wheat on a thin stem", DE_FACE, "aucun", "warm yellow #fbbf24, warm brown #a16207, soft green #86b98f",
     " ONE single wheat ear only (not three): an elongated ear made of overlapping small golden warm yellow grain shapes with thin long awns pointing up, on a thin soft green stem with one small leaf. No field, no bread, no text.",
     "UN seul épi de blé doré sur sa tige (pas trois) ; ni champ ni pain", "Palier 2 ; phrase : « L'épi est doré. »"),
    ("midi", "midi", "a round wall clock with two hands both pointing straight up, and a small sun above it", DE_FACE, "aucun", "teal #0f6e56, cream, warm yellow #fbbf24",
     " A round clock with a teal rim and a cream face, twelve small tick marks and NO numbers, two thin dark hands both pointing straight up at twelve; a small warm yellow sun with short rays sitting just above the clock. No text, no digits, no letters.",
     "UNE horloge ronde SANS chiffres, deux aiguilles vers le haut, un petit soleil au-dessus", "Palier 2 ; phrase : « Il est midi. »"),
    ("joli", "joli", "a small bouquet of three flowers in a vase", DE_FACE, "aucun", "soft pink #f4a9b0, warm yellow #fbbf24, soft green #86b98f, cream",
     " Three flowers with round petals (one soft pink, one warm yellow, one soft pink) on thin soft green stems with two leaves, standing in a plain cream vase. No table, no text.",
     "UN petit bouquet de 3 fleurs (rose, jaune, rose) dans un vase crème ; rien d'autre", "Palier 1 ; phrase : « Ce bouquet est joli. »"),
    ("volé", "vole", "a bird flying high with its wings wide open", DE_PROFIL, "profil", "teal #0f6e56, soft green #86b98f, warm yellow #fbbf24, cream",
     " One bird in flight, seen from the side, both wings spread wide open and raised, a teal body and wings with soft green wing tips, a small warm yellow beak, a fanned tail. No branch, no nest, no tree, no ground, no cloud, no text.",
     "UN oiseau en plein vol, ailes grandes ouvertes, un seul œil ; ni arbre ni sol", "Palier 1 ; phrase : « L'oiseau a volé très haut. »"),
    ("fumé", "fume", "a whole ham with a thin brown rind", DE_PROFIL, "aucun", "soft pink #e8a0a0, warm brown #a16207, cream",
     " A whole ham: a big rounded body in ONE single soft pink #e8a0a0 with a thin warm brown rind band along the outer edge, and a small cream bone knob at the narrow end. No smoke, no plate, no knife, no text.",
     "UN jambon entier rose avec une fine croûte brune ; AUCUNE fumée dessinée", "Palier 1 ; phrase : « Le jambon fumé est rose. »"),
    ("mimi", "mimi", "a small kitten sitting, with a big round head", DE_PROFIL, "profil", "orange #f97316, cream, soft pink #f4a9b0",
     " A tiny kitten sitting upright, an oversized round orange head, two small pointed ears with soft pink inside, a small cream muzzle, a short orange body and a curled tail. One kitten only, no ball, no basket, no text.",
     "UN chaton orange assis, grosse tête, un seul œil ; rien d'autre", "Palier 1 ; phrase : « Le mimi est un petit chat. »"),
    ("ravi", "ravi", "a boy standing with both arms raised high and a very big smile, full body", DE_FACE, "face", f"{PEAU}, teal #0f6e56, orange #f97316",
     " A cheerful boy: a round peach-colored face with two small dark dots for the eyes and a very wide curved smile, short dark brown hair, a teal t-shirt, orange shorts, both arms stretched straight up. One boy only, simple flat shapes, no object, no text.",
     "UN garçon, deux yeux, très grand sourire, les deux bras levés ; un seul personnage", "Palier 1 ; phrase : « Tom est ravi. »"),
    ("mémé", "meme", "a smiling grandmother standing, seen from the front, full body", DE_FACE, "face", f"{PEAU}, grey #a8a29e, soft blue #93c5fd, teal #0f6e56",
     " A kind grandmother: a round peach-colored face with two small dark dots for the eyes and a gentle smile, grey hair gathered in a bun, two thin round dark glasses, a soft blue shawl over a teal dress, two arms at her sides. One woman only, simple flat shapes, no stick, no text.",
     "UNE grand-mère (cheveux gris en chignon, lunettes, châle bleu), deux yeux, sourire ; un seul personnage", "Palier 1 ; phrase : « Mémé sourit. »"),
    ("mari", "mari", "two newlyweds standing side by side holding hands: a groom in a dark suit and a bride in a cream dress, full body", DE_FACE, "face", f"{PEAU}, dark grey #57534e, cream, soft pink #f4a9b0",
     " The groom on the left: a round peach-colored face with two small dark dots for the eyes and a smile, short dark hair, a dark grey suit. The bride on the right: a round peach-colored face with two small dark dots for the eyes and a smile, a cream veil, a cream dress, a small soft pink bouquet in her free hand. They hold hands in the middle. Exactly two people, simple flat shapes, no text.",
     "DEUX mariés qui se tiennent la main (costume sombre / robe crème), quatre yeux au total, sourires", "Palier 1 ; phrase : « Le mari donne la main à sa femme. »"),
]
PERSONNES |= {"fée", "momie"}
# Lot 16 : pack progressif P1, paliers 1 à 4 (fiche d'intention data/base/lots/pack-progressif-p1-lot16-intention.md, validée par JF le 2026-11-22).
# 6 images ; poli, vie, vue, série, revue, sol : SANS image (décision de JF 2026-11-22), phrases dans le fichier de lot.
MOTS_LOT16 = [
    ("lama", "lama", "a llama standing, with a long neck and two small pointed ears", DE_PROFIL, "profil", "cream-beige #e3c9a0, darker brown #8a6a4a",
     " A llama standing on four thin legs, seen from the side: the whole body, the long neck and the legs in ONE single cream-beige #e3c9a0 (soft rounded fluffy outline, no spots, no stripes), the muzzle and the tips of the four feet in a darker brown #8a6a4a, two small pointed upright ears, one eye. The long neck is clearly visible and the head is held high. No rider, no saddle, no rope, no grass, no ground, no text.",
     "UN lama beige debout, long cou, deux petites oreilles pointues, un seul œil ; ne doit pas se lire mouton, alpaga ni chameau", "Palier 1 ; phrase : « Le lama a un long cou. »"),
    ("fée", "fee", "a small friendly fairy with two wings and a magic wand with a star, full body", DE_FACE, "face", f"{PEAU}, soft pink #e88fb4, lilac #b79ce0, warm yellow #f2c94c",
     " A small fairy standing, full body: a round peach-colored face with two small dark dots for the eyes and a smile, short brown hair, a soft pink #e88fb4 dress, two large rounded lilac #b79ce0 wings clearly visible on both sides behind her shoulders and spreading wider than her body, a thin warm yellow #f2c94c wand held in one hand with a small star at its tip. Generic fairy, simple flat shapes. No flowers, no sparkles around, no castle, no text.",
     "UNE petite fée de face (deux yeux, sourire), robe rose, deux GRANDES ailes lilas bien visibles (v1 refusée : ailes bleu clair invisibles sur le fond bleu), baguette jaune à étoile ; personnage générique, ni Clochette ni décor", "Palier 3 ; phrase : « La fée agite sa baguette. »"),
    ("fumée", "fumee", "big soft clouds of grey smoke rising up from a small pile of burnt-out logs", DE_FACE, "aucun", "grey #b8bcc2, dark brown #6b4a2f",
     " Three large soft rounded swirls of light grey #b8bcc2 smoke curling upwards, filling about two thirds of the picture, rising from a very small pile of three dark brown #6b4a2f logs at the bottom, no flame, no fire. No chimney, no house, no roof, no ham, no cloud shaped like a sky cloud, no text.",
     "DE LA FUMÉE grise qui monte (3 volutes, 2/3 de l'image) au-dessus de 3 bûches brunes sans flamme ; ni cheminée (voir cheminée) ni jambon fumé ; ne doit pas se lire nuage ni feu", "Palier 3 ; phrase : « La fumée monte vers le ciel. »"),
    ("momie", "momie", "a friendly mummy standing, wrapped in cream bandages, full body", DE_FACE, "face", "cream #efe6d0, dark brown #5b4a3a",
     " A friendly mummy standing upright, full body, completely wrapped in horizontal cream #efe6d0 bandage strips with thin dark brown #5b4a3a lines between the strips, one loose bandage end hanging from one arm; in a narrow gap across the face two small dark dots for the eyes and a soft smile. Gentle and cute, not scary, no blood, no sarcophagus, no pyramid, no desert, no text.",
     "UNE momie debout enroulée de bandelettes crème, deux yeux dans la fente, sourire doux, un bout de bande qui pend ; pas effrayante, ni sarcophage ni pyramide", "Palier 3 ; phrase : « La momie est couverte de bandes. »"),
    ("fil", "fil", "a wooden spool of red thread with a long wavy loose thread end", DE_FACE, "aucun", "thread brick-red #b9532f, light wood #d9b98a",
     " A small light wood #d9b98a spool wound with brick-red #b9532f thread, seen from the front, with one very long wavy loose end of the same brick-red thread unwinding from the spool and curling across the picture (the loose thread is long and clearly visible, about as long as the picture is wide). No needle, no fabric, no scissors, no button, no text.",
     "UNE bobine de fil rouge-brique avec un LONG bout de fil ondulé qui sort ; ni aiguille ni tissu ; le fil libre doit être bien visible (sinon : se lit bobine)", "Palier 4 ; phrase : « Le fil rouge est long. »"),
    ("mur", "mur", "a whole brick wall, six rows of bricks, seen flat from the front", DE_FACE, "aucun", "brick terracotta #b9532f, cream #efe6d0",
     " A whole brick wall filling the picture frame: six horizontal rows of terracotta #b9532f bricks with thin cream #efe6d0 joints, the bricks of each row shifted by half a brick, a flat straight top edge with a thin darker terracotta cap. Not a single brick, not a house, no door, no window, no plant, no ground, no text.",
     "UN mur de briques entier (6 rangées), vu de face, bord supérieur droit ; pas une brique isolée (voir brique), ni maison ni porte", "Palier 4 ; phrase : « Le mur est en briques. »"),
]
# Lot 17 : pack progressif P1, paliers 4, 5 et 6a (fiche d'intention data/base/lots/pack-progressif-p1-lot17-intention.md, validée par JF le 2026-11-22).
# 3 images ; mal, lis, vol, vis, avis, salut, fou, mou, filou : SANS image (décision de JF), phrases dans le fichier de lot.
MOTS_LOT17 = [
    ("jus", "jus", "a tall glass of orange juice with a half orange slice on the rim", DE_FACE, "aucun", "orange #f59e0b, soft cream-white #f4efe4, cream #efe6d0",
     " A tall glass shape made of soft cream-white #f4efe4 paper (not blue, so that it stays visible on the blue background), with bright orange #f59e0b paper filling three quarters of it to show orange juice, and a round half slice of orange (orange #f59e0b with a cream #efe6d0 center) resting on the rim. Nothing else: no bottle, no carton, no whole orange, no table, no text.",
     "UN verre de jus d'orange (jus orange uni, verre crème, demi-rondelle d'orange sur le bord ; paille retirée : 2 refus du filtre de sécurité Canva) ; se lit « verre » ou « orange » (images existantes) : le jus orange doit remplir le verre", "Palier 5 ; phrase : « Le jus est orange. »"),
    ("riz", "riz", "a bowl of white rice, a rounded mound of rice grains", DE_FACE, "aucun", "terracotta #b9532f, white and cream shades #fffaf0 #efe6d0",
     " A round terracotta #b9532f bowl seen from the front, with a smooth rounded mound of white rice heaping above its rim: the mound is an almost uniform white #fffaf0 dome covered with very many tiny thin short rice grains (each grain a very small narrow pointed-oval, much smaller than a fingertip, like real cooked rice), packed tightly, with only slight cream #efe6d0 shading between them, and a soft grey-blue shadow so that the white stays readable on the blue background. Not beans, not almonds, not popcorn, no big grains. No chopsticks, no spoon, no vegetables, no table, no text.",
     "UN bol terracotta avec un monticule de riz blanc fait de petits grains (nuances de blanc, ombre douce) ; ne doit pas se lire neige ni bol vide ni haricots/amandes ; ni baguettes ni légumes ; v1 refusée : grains trop gros et plats (lus haricots/amandes/pop-corn) : grains minuscules et fins", "Palier 5 ; phrase : « Le riz est blanc. » (blanc sur fond bleu : ombre nécessaire)"),
    ("lilas", "lilas", "a branch of lilac flowers, a pyramid-shaped cluster of many tiny mauve florets with two green leaves", DE_FACE, "aucun", "lilac #b79ce0, green #4d8a3a, light brown #8a6a4a",
     " One upright cut lilac flower stem standing straight up, like in a bouquet: a tall pointed cone of about twenty clearly visible star-shaped flowers, each with four distinct petals, all in the same single lilac #b79ce0 (no second flower color), the cone pointing UP, the flowers bigger at the bottom of the cone and smaller at the top; below it a straight light brown #8a6a4a stem, and two simple heart-shaped green #4d8a3a leaves attached at the bottom of the stem. The cluster does NOT hang down. No vase, no butterfly, no grapes, no vine, no round berries, no text.",
     "UNE grappe de lilas (pyramide de petites fleurs mauves unies) avec 2 feuilles vertes ; ne doit pas se lire raisin ni glycine ; v1 refusée : grappe pendante avec feuilles en haut lue RAISIN : épi dressé, fleurs à 4 pétales visibles, feuilles au pied", "Palier 5 ; phrase : « Le lilas sent bon. »"),
]
PERSONNES |= {"marin", "roi", "main"}
# Lot 18 : pack progressif P1, paliers 6b à 7 (fiche d'intention data/base/lots/pack-progressif-p1-lot18-intention.md, décisions de JF du 2026-11-22 :
# image pour salon (pièce à vivre) et pour vin (bouteille, « montrer une bouteille n'est pas inciter à boire »), nain écarté et remplacé par pain).
# 8 images ; an, fin, foi, jeu : SANS image (décision de JF), phrases dans le fichier de lot.
MOTS_LOT18 = [
    ("savon", "savon", "a pink bar of soap on a small soap dish, covered with a heap of white foam and soap bubbles", DE_FACE, "aucun", "pink #f4a9b0, cream #efe6d0, cream-white #fffaf0, light grey-blue #b8c4d0",
     " A bar of pink #f4a9b0 soap resting on a small flat oval cream #efe6d0 soap dish, with a big heap of white foam on top of the soap: the foam is a fluffy cloud made of many overlapping round cream-white #fffaf0 bubbles of different sizes, each with a soft grey-blue shadow so that the white stays readable on the blue background, and four or five small separate bubbles floating around the heap. The soap bar is seen slightly from the side so that its thickness shows. No water, no hands, no sink, no tap, no towel, no text.",
     "UN savon rose posé sur une petite savonnière crème, coiffé d'un gros tas de mousse blanche (bulles qui se chevauchent) + quelques bulles autour ; v1 refusée par JF : rectangle rose + 3 ronds blancs = illisible (gomme, boutons) : la mousse et la savonnière font lire « savon »", "Palier 6b ; phrase : « Le savon est rose. »"),
    ("melon", "melon", "half a cantaloupe melon cut open, showing orange flesh and a few seeds", DE_FACE, "aucun", "pale green #9fc07a, orange #f4a259, cream #efe6d0",
     " Half a melon cut open, seen from the front: a rounded half-circle shape with a thick pale green #9fc07a rind along the curved bottom, the flat cut face filled with orange #f4a259 flesh, and a small cluster of cream #efe6d0 seeds in the middle. No whole melon, no knife, no plate, no table, no text.",
     "UN demi-melon : écorce vert pâle, chair orange, pépins crème au centre ; ne doit pas se lire orange, pastèque (chair rouge) ni bol", "Palier 6b ; phrase : « Je mange une part de melon. »"),
    ("marin", "marin", "a friendly sailor standing, wearing a white cap and a blue and white striped shirt, full body", DE_FACE, "face", f"{PEAU}, navy blue #1f3a5f, cream #efe6d0",
     " A sailor standing, full body: a round peach-colored face with two small dark dots for the eyes and a smile, a cream #efe6d0 round sailor cap, a horizontally striped shirt alternating navy blue #1f3a5f and cream #efe6d0, plain navy blue trousers. No anchor, no boat, no pipe, no eye patch, no hat with skull, no text.",
     "UN marin debout (casquette crème, marinière rayée bleu marine et crème, pantalon bleu), deux yeux, sourire ; ne doit pas se lire pirate ; ni ancre ni bateau", "Palier 6d ; phrase : « Le marin porte une casquette. »"),
    ("roi", "roi", "a friendly king standing, wearing a golden crown and a long purple cloak, full body", DE_FACE, "face", f"{PEAU}, golden yellow #f2c94c, purple #7b4ea3, grey #b8bcc2",
     " A king standing, full body: a round peach-colored face with two small dark dots for the eyes and a smile, a grey #b8bcc2 beard and moustache, a golden yellow #f2c94c crown with three points, a long purple #7b4ea3 cloak down to his feet, a small golden sceptre in one hand. NOT red, NOT white fur, no throne, no castle, no text.",
     "UN roi debout (couronne dorée, manteau violet, barbe grise, sceptre), deux yeux, sourire ; ni rouge ni barbe blanche (se lirait Père Noël) ; personnage générique", "Palier 6e ; phrase : « Le roi porte une couronne. »"),
    ("main", "main", "an open hand held up, palm facing us, five fingers spread", DE_FACE, "aucun", "peach #f2b48a",
     " One open hand and a short piece of wrist, palm facing the viewer, five fingers spread apart (a thumb and four fingers), cut as ONE single connected paper shape in ONE single flat peach #f2b48a, with NO separate piece on the palm, no circle, no lighter patch, no lines, no creases (the palm and the fingers are the same flat color, the hand is one silhouette). No glove, no ring, no nail polish, no arm, no sleeve, no face, no text.",
     "UNE main ouverte, paume face à nous, 5 doigts écartés (pouce + 4 doigts), poignet court, UNE seule silhouette pêche unie sans pièce sur la paume (v1 refusée par JF : grand rond clair sur la paume, perturbant) ; ne doit pas se lire gant ni étoile", "Palier 7 ; phrase : « Je lève la main. »"),
    ("pain", "pain", "a round loaf of bread with two slices cut off it", DE_FACE, "aucun", "golden brown #c58b4a, cream #efe6d0, pale cream #f3deb0",
     " One round loaf of bread in ONE single golden brown #c58b4a, a bulging dome shape slightly wider than tall, with three short diagonal cream #efe6d0 cuts across the top, standing on the left; and in front of it, to its right, two slices of the same bread already cut off the loaf, lying side by side and slightly overlapping, each slice a rounded shape with a thin golden brown #c58b4a crust edge all around and a soft pale cream #f3deb0 soft inside that is clearly visible. No knife, no board, no butter, no basket, no table, no text.",
     "UN pain rond brun doré avec 3 entailles crème + DEUX tranches coupées devant (croûte dorée, mie crème visible) pour mieux comprendre (demande de JF) ; v1 sans tranches : lisible mais jugée à compléter ; ne doit pas se lire gâteau ni coquillage ; ni couteau ni planche", "Palier 7 ; remplace « nain » (décision de JF 2026-11-22) ; phrase : « Je mange du pain. »"),
    ("salon", "salon", "a cosy living room seen from the front with a sofa, a small round table and a floor lamp", DE_FACE, "aucun", "teal-green #2f8f83, cream #efe6d0, wood #c58b4a, warm yellow #f2c94c, light brown #8a6a4a",
     " A living room as a cut-paper stage set seen straight from the front: a rectangular cream #efe6d0 back wall with a strip of wood #c58b4a floor along the bottom; on the floor a two-seat sofa in teal-green #2f8f83 on the left, a small round light brown #8a6a4a table in the middle, and a tall floor lamp with a warm yellow #f2c94c shade on the right. Exactly these three pieces of furniture, nothing on the wall, no people, no animals, no TV, no plant, no window, no text.",
     "UNE pièce à vivre vue de face (mur crème, sol en bois) avec 3 meubles : canapé vert-bleu, petite table ronde, lampadaire jaune ; ne doit pas se lire canapé seul (voir sofa) ni chambre : exactement 3 meubles", "Palier 6b ; décision de JF 2026-11-22 : image de la pièce à vivre ; phrase : « Papa lit dans le salon. »"),
    ("vin", "vin", "a bottle of red wine and a glass half filled with red wine", DE_FACE, "aucun", "dark green #2f5d3a, cream #efe6d0, dark red #7a1f3d, soft cream-white #f4efe4",
     " A dark green #2f5d3a bottle with a long neck standing on the left, with a plain blank cream #efe6d0 label (no writing, no drawing on the label) and a dark red #7a1f3d cork-less top, and next to it on the right a short glass of soft cream-white #f4efe4 paper half filled with dark red #7a1f3d wine. Exactly one bottle and one glass, no grapes, no people, no table, no text.",
     "UNE bouteille de vin (verte, étiquette crème VIDE) et un verre à moitié rempli de vin rouge sombre ; ni raisin ni texte ; décision de JF 2026-11-22 : « montrer une bouteille de vin n'est pas inciter à boire »", "Palier 6d ; phrase : « Papa verse du vin dans un verre. »"),
]
# Lot 19 : pack progressif P1, paliers 7 à 10 (fiche d'intention data/base/lots/pack-progressif-p1-lot19-intention.md ; veau et zéro : images validées par JF le 2026-11-23).
# Les autres mots du lot sont proposés SANS image (décision de JF en attente) ; ceux-ci seuls sont générés.
PERSONNES |= {"zéro"}
_zero = list(entree_nombre("zéro"))
_zero[1] = "zero"   # nom de fichier sans accent
_zero[6] += " The zero is a tall narrow oval ring (clearly taller than wide, thick even stroke, empty hole in the middle), like the digit 0 on a keyboard, not a perfect circle, not a donut, not the letter O."
MOTS_LOT19 = [
    ("veau", "veau", "a calf standing, small body with long thin legs, two small ears and a pink muzzle", DE_PROFIL, "profil", "light brown #c89b6d, pink #f2b8a8, dark brown #6b4a2f",
     " A young calf standing on four long thin legs, seen from the side: a small light brown #c89b6d body (soft rounded outline, no spots, no patches), a pink #f2b8a8 muzzle, two small rounded ears, dark brown #6b4a2f hooves and a short thin tail, one eye. Small and slim, clearly a baby animal. No udder, no horns, no mother cow, no grass, no ground, no text.",
     "UN veau brun clair debout, petit corps, pattes longues et fines, museau rose, un seul œil ; ne doit pas se lire vache (pas de taches, pas de pis, pas de cornes), chien ni agneau", "Palier 7 ; phrase : « Le veau court dans le pré. »"),
    tuple(_zero),
    ("bain", "bain", "a white bathtub with blue water, a little low foam and a yellow rubber duck floating on the water", DE_PROFIL, "aucun", "white-cream #fffaf0, light grey-blue #b8c4d0, light blue #9fd0ea, yellow #f2c94c, orange #f97316",
     " A white-cream #fffaf0 bathtub seen from the side with four small feet, filled almost to the rim with light blue #9fd0ea water, with only a thin low layer of white foam on the water made of about eight round bubbles of different sizes (soft grey-blue #b8c4d0 shadows so that the white stays readable) and three or four small bubbles floating above: the foam stays low, well below the top of the bathtub rim and much smaller than the duck; one small yellow #f2c94c rubber duck with an orange #f97316 beak floats on the blue water (the duck has one small dark dot eye). No person, no tap, no towel, no soap, no tiles, no text.",
     "UNE baignoire blanche pleine d'eau bleue avec un peu de mousse (v1 refusée par JF : trop de mousse, exagéré) et UN canard jaune ; la mousse reste basse et petite", "Palier 7 ; phrase : « Je prends un bain chaud. »"),
    ("jouet", "jouet", "an open wooden toy box with three toys visible inside: a red cube, a blue ball and a small brown teddy bear", DE_FACE, "aucun", "wood #d9b98a, red #dc2626, blue #2f6db5, brown #8a6a4a, cream #efe6d0",
     " An open low wooden toy box #d9b98a seen from the front, three simple toys sticking out above the rim: a plain red #dc2626 cube, a plain blue #2f6db5 ball and a small brown #8a6a4a teddy bear with two round ears and cream #efe6d0 round muzzle. No letters on the cube, no stripes on the ball, no text, no other toys, no room, no floor.",
     "UN coffre à jouets en bois ouvert, trois jouets simples (cube rouge, balle bleue, ours brun) ; risque : lu « coffre » ou « ours » ; v1 à juger par JF", "Palier 9 ; phrase : « Je range mon jouet. »"),
    ("chou", "chou", "a whole cauliflower: a round white head made of many small rounded florets, surrounded by green leaves", DE_FACE, "aucun", "cream-white #f3ead2, shadow beige #d9cfae, green #7fb069, dark green #4d8a3a",
     " One whole cauliflower seen from the front: a big round head made of many small rounded bumps (florets) in cream-white #f3ead2, each group of bumps with a soft beige #d9cfae shadow so that the white head stays readable on the blue background, surrounded at the bottom and the sides by four or five large curved green #7fb069 leaves with darker green #4d8a3a veins hugging the head, and a short cut stem at the bottom. A cauliflower, not a cloud and not a sheep: the cream-white bumpy head must be clearly visible and the green leaves around it. No knife, no plate, no table, no text.",
     "UN chou-fleur : tête ronde blanc crème en petites bosses, feuilles vertes autour ; JF 2026-11-23 : « un chou-fleur (le plus connu des choux) » ; v1 chou vert refusée, v2 chou vert en boule refusée ; risque : lu « nuage » ou « mouton » si les feuilles sont absentes", "Palier 8 ; phrase : « Le chou est blanc. » (la phrase suit l'image du chou-fleur ; l'ancienne « Le chou est vert. » ne convient plus)"),
    ("robinet", "robinet", "a metal water tap with a curved spout and a round handle, with one blue water drop falling", DE_PROFIL, "aucun", "light grey #b8c4d0, grey #8b95a1, blue #4aa8d8",
     " A water tap seen from the side, attached to nothing: a grey #8b95a1 horizontal pipe at the top, a curved light grey #b8c4d0 spout bending down, a small round grey #8b95a1 handle on top, and one single blue #4aa8d8 water drop falling from the spout. No sink, no wall, no hands, no water stream, no text.",
     "UN robinet (bec courbé, poignée ronde) + UNE goutte bleue ; risque : lu « tuyau » ; la poignée et la goutte font lire « robinet »", "Palier 9 ; phrase : « Le robinet fait couler l'eau. »"),
    ("poulet", "poulet", "a whole roasted chicken, golden brown, seen from the side with two small drumsticks pointing up", DE_PROFIL, "aucun", "golden brown #c8863a, dark brown #8a5a2b, cream #efe6d0",
     " A whole roasted chicken seen from the side, plump rounded golden brown #c8863a body with a few darker brown #8a5a2b roasted patches as flat paper pieces, two small drumsticks with cream #efe6d0 bone ends pointing up. No plate, no table, no vegetables, no parsley, no face, no feathers, no live bird, no text.",
     "UN poulet rôti doré, deux pilons vers le haut ; risque : lu « dinde » ou « canard » ; aucun visage ni plume pour ne pas lire « poule »", "Palier 9 ; phrase : « Papa mange du poulet. »"),
]
LOTS = {2: MOTS_LOT2, 3: MOTS_LOT3, 4: MOTS_LOT4, 5: MOTS_LOT5, 6: MOTS_LOT6, 7: MOTS_LOT7, 8: MOTS_LOT8, 9: MOTS_LOT9 + MOTS_SERIE_CHAT, 10: MOTS_LOT10, 11: MOTS_LOT11, 12: MOTS_LOT12, 13: MOTS_LOT13, 14: MOTS_LOT14, 15: MOTS_LOT15, 16: MOTS_LOT16, 17: MOTS_LOT17, 18: MOTS_LOT18, 19: MOTS_LOT19}
TOUS = MOTS + MOTS_LOT2 + MOTS_LOT3 + MOTS_LOT4 + MOTS_LOT5 + MOTS_LOT6 + MOTS_LOT7 + MOTS_LOT8 + MOTS_LOT9 + MOTS_SERIE_CHAT + MOTS_LOT10 + MOTS_LOT11 + MOTS_LOT12 + MOTS_LOT13 + MOTS_LOT14 + MOTS_LOT15 + MOTS_LOT16 + MOTS_LOT17 + MOTS_LOT18 + MOTS_LOT19  # le CSV reste celui des 20 mots du pack illustré ; la ligne de commande connaît aussi le lot 2


def prompt(m):
    mot, _, obj, vue, yeux, palette, plus, _, _ = m
    intro = "A group of" if obj.startswith(("several",) + tuple(en + " " for en, n in NOMBRES.values() if n > 1)) else "One single"   # un seul sujet, sauf un groupe voulu (neige)
    pas_de_personne = "" if mot in PERSONNES else ", no people"
    return BLOC.format(fond=FOND, intro=intro, obj=obj, vue=vue, yeux=YEUX[yeux], palette=palette or PALETTE_STD, plus=plus, pas_de_personne=pas_de_personne)


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
