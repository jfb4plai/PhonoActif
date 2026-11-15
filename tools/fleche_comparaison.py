# -*- coding: utf-8 -*-
r"""Ajoute une flèche à une image de base « deux objets de tailles différentes » : grand / petit (et plus tard lourd / léger, gros / mince).
Décision de JF (2026-11-15) : les images d'une paire sont identiques sauf la flèche, qui désigne l'objet du mot. La flèche est donc ajoutée PAR PROGRAMME sur la même image de base
(jamais deux générations différentes), en orange #f97316 avec une ombre douce, comme les pièces de papier découpé.

Image de base attendue : deux disques de même couleur (teal #0f6e56) côte à côte, le plus large à gauche ; la flèche se place au-dessus du disque désigné.
Usage :
  python -I tools/fleche_comparaison.py <image-de-base.png> <dossier-de-sortie> grand petit
Écrit <dossier>/grand.png (flèche sur le plus grand disque) et <dossier>/petit.png (flèche sur le plus petit)."""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ORANGE = (249, 115, 22)
TEAL = (15, 110, 86)
SURECH = 4   # suréchantillonnage pour des bords lisses


def disques(img, couleur=TEAL, tolerance=40):
    """Colonnes (x0, x1, y_haut, y_bas) de chaque disque de la couleur donnée, de gauche à droite."""
    a = np.array(img.convert("RGB")).astype(int)
    m = np.ones(a.shape[:2], bool)
    for k in range(3):
        m &= abs(a[:, :, k] - couleur[k]) < tolerance
    cols = np.where(m.any(axis=0))[0]
    if len(cols) == 0:
        raise ValueError("aucun disque de la couleur attendue")
    runs, debut, prec = [], cols[0], cols[0]
    for c in cols[1:]:
        if c != prec + 1:
            runs.append((debut, prec))
            debut = c
        prec = c
    runs.append((debut, prec))
    res = []
    for x0, x1 in runs:
        ys = np.where(m[:, x0:x1 + 1].any(axis=1))[0]
        res.append((int(x0), int(x1), int(ys.min()), int(ys.max())))
    return res


def fleche(img, disque, ecart=6):
    """Copie de img avec une flèche orange pointant vers le bas, juste au-dessus du disque."""
    x0, x1, haut, _ = disque
    cx = (x0 + x1) / 2
    longueur = 34                                      # même taille de flèche pour les deux images d'une paire : seule sa position change
    tete_l = 24
    tete_h = 15
    fut_l = 10
    pointe = haut - ecart
    base = pointe - longueur
    if base < 2:
        raise ValueError("pas de place au-dessus du disque pour la flèche")
    w, h = img.size
    S = SURECH
    pts = [(cx - fut_l / 2, base), (cx + fut_l / 2, base), (cx + fut_l / 2, pointe - tete_h), (cx + tete_l / 2, pointe - tete_h),
           (cx, pointe), (cx - tete_l / 2, pointe - tete_h), (cx - fut_l / 2, pointe - tete_h)]
    grand = lambda p: (p[0] * S, p[1] * S)
    ombre = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    ImageDraw.Draw(ombre).polygon([(x + 1.5 * S, y + 2.5 * S) for x, y in map(grand, pts)], fill=(40, 30, 20, 90))
    ombre = ombre.filter(ImageFilter.GaussianBlur(1.4 * S))
    piece = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    ImageDraw.Draw(piece).polygon(list(map(grand, pts)), fill=ORANGE + (255,))
    couche = Image.alpha_composite(ombre, piece).resize((w, h), Image.LANCZOS)
    return Image.alpha_composite(img.convert("RGBA"), couche).convert("RGB")


def produire(base, dossier, nom_grand="grand", nom_petit="petit"):
    img = Image.open(base).convert("RGB")
    d = disques(img)
    if len(d) != 2:
        raise ValueError(f"{len(d)} disques trouvés au lieu de 2")
    plus_grand = max(d, key=lambda t: t[1] - t[0])
    plus_petit = min(d, key=lambda t: t[1] - t[0])
    dossier = pathlib.Path(dossier)
    dossier.mkdir(parents=True, exist_ok=True)
    fleche(img, plus_grand).save(dossier / f"{nom_grand}.png")
    fleche(img, plus_petit).save(dossier / f"{nom_petit}.png")
    return dossier / f"{nom_grand}.png", dossier / f"{nom_petit}.png"


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    a, b = produire(sys.argv[1], sys.argv[2], *(sys.argv[3:5] or ["grand", "petit"]))
    print("écrit :", a, "et", b)
