# -*- coding: utf-8 -*-
"""Prompts d'images « papier découpé » pour Canva : bloc de style commun + exceptions par mot + vérifications après génération.
Source unique du script d'images (version 2, 2026-11-13). Écrit docs/images-canva-20-mots.csv.

  python -I tools/prompts_images_canva.py              # écrit le CSV
  python -I tools/prompts_images_canva.py ours rat     # affiche les prompts de ces mots (à coller dans Canva ou à envoyer au connecteur)

Historique : v2.1 (2026-11-13) = fond bleu ciel pastel #cde7f7 pour toutes les images (décision de JF), à la place du fond crème.
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
FOND = "pastel light sky-blue background #cde7f7"   # v2.1 (2026-11-13, JF) : plus universel que le crème (ancien fond : cream #faf3e3)

VERIF_COMMUNES = "un seul sujet (un seul groupe pour la neige) ; aucun texte ni lettre ; aucun motif ni décoration ; aucun visage sauf les yeux prévus ; fond bleu ciel pastel uni (#cde7f7)"
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


def prompt(m):
    mot, _, obj, vue, yeux, palette, plus, _, _ = m
    intro = "A group of" if obj.startswith("several") else "One single"   # un seul sujet, sauf un groupe voulu (neige)
    return BLOC.format(fond=FOND, intro=intro, obj=obj, vue=vue, yeux=YEUX[yeux], palette=palette or PALETTE_STD, plus=plus)


def verification(m):
    return VERIF_COMMUNES + VERIF_YEUX[m[4]] + ((" ; " + m[7]) if m[7] else "")


def ecrire_csv():
    chemin = RACINE / "docs" / "images-canva-20-mots.csv"
    with chemin.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["mot", "fichier", "exception (décision de JF)", "à vérifier après génération", "prompt (bloc v2, tools/prompts_images_canva.py)"])
        for m in MOTS:
            w.writerow([m[0], m[1] + ".png", m[8], verification(m), prompt(m)])
    return chemin


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for mot in sys.argv[1:]:
            m = next((x for x in MOTS if x[0] == mot or x[1] == mot), None)
            if not m:
                sys.exit(f"mot inconnu : {mot}")
            print(f"--- {m[0]} ---\n{prompt(m)}\nA VERIFIER : {verification(m)}\n")
    else:
        print("écrit :", ecrire_csv(), f"({len(MOTS)} mots, {sum(1 for m in MOTS if m[8])} avec exception)")
