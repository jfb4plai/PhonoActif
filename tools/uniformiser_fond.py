# -*- coding: utf-8 -*-
"""Ramène le fond d'une image Canva à la couleur EXACTE demandée (#cde7f7), sans toucher au dessin.

Pourquoi : Canva approche la teinte demandée sans l'atteindre (écart mesuré jusqu'à 26/255 sur le lot 2 : lit #b3d4ee au lieu de #cde7f7).
Principe : le fond est la région proche de la couleur de bordure ET connectée au bord de l'image. Chaque pixel de cette région est décalé de
(cible - couleur du fond) avec un poids qui décroît avec l'écart au fond : le fond plat devient la cible (grain conservé), l'ombre portée reste
plus sombre que le fond, les pixels du dessin (loin de la couleur du fond) ne bougent pas. Un trou du dessin qui n'est pas relié au bord reste intact.

Usage :
  python -I tools/uniformiser_fond.py <dossier> [--originaux <dossier>] [--cible cde7f7]
    Les images .png du dossier sont remplacées ; l'original de chacune est d'abord copié dans le dossier d'originaux (par défaut <dossier>/originaux-canva).
  python -I tools/uniformiser_fond.py --mesure <fichier.png ...>        # affiche seulement le fond mesuré, ne modifie rien
Limite connue : les pixels de bord du dessin mêlés au fond (anti-crénelage) gardent une légère teinte de l'ancien fond (1 pixel).
"""
import argparse
import pathlib
import shutil
import sys

import numpy as np
from PIL import Image

CIBLE_DEFAUT = (0xCD, 0xE7, 0xF7)
T_PLAT = 12      # écart (max par canal) en dessous duquel le pixel est du fond plat : décalage complet
T_OMBRE = 40     # écart au-delà duquel le pixel n'est plus du fond : aucun décalage ; entre les deux, décalage dégressif (ombre)


def fond_de_bordure(a):
    """Couleur du fond : médiane des pixels de l'anneau extérieur (2 px)."""
    h, w, _ = a.shape
    anneau = np.concatenate([a[:2].reshape(-1, 3), a[-2:].reshape(-1, 3), a[:, :2].reshape(-1, 3), a[:, -2:].reshape(-1, 3)])
    return tuple(int(x) for x in np.median(anneau, axis=0))


def region_de_fond(candidat):
    """Pixels candidats reliés au bord de l'image (propagation par dilatation 4-connexe)."""
    h, w = candidat.shape
    reg = np.zeros_like(candidat)
    reg[0, :] = candidat[0, :]; reg[-1, :] = candidat[-1, :]; reg[:, 0] = candidat[:, 0]; reg[:, -1] = candidat[:, -1]
    while True:
        voisins = reg.copy()
        voisins[1:, :] |= reg[:-1, :]; voisins[:-1, :] |= reg[1:, :]
        voisins[:, 1:] |= reg[:, :-1]; voisins[:, :-1] |= reg[:, 1:]
        nouveau = voisins & candidat
        if (nouveau == reg).all():
            return reg
        reg = nouveau


def uniformiser(im, cible=CIBLE_DEFAUT):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    b0 = np.array(fond_de_bordure(a), dtype=np.int16)
    ecart = np.abs(a - b0).max(axis=2)
    reg = region_de_fond(ecart <= T_OMBRE)
    poids = np.clip((T_OMBRE - ecart) / float(T_OMBRE - T_PLAT), 0.0, 1.0) * reg
    delta = (np.array(cible, dtype=np.float32) - b0.astype(np.float32))
    sortie = np.clip(a.astype(np.float32) + poids[:, :, None] * delta, 0, 255).round().astype(np.uint8)
    return Image.fromarray(sortie, "RGB")


def mesure(im):
    """Fond mesuré après coup : médiane de l'anneau extérieur."""
    return fond_de_bordure(np.asarray(im.convert("RGB")).astype(np.int16))


def hexa(c):
    return "#%02x%02x%02x" % tuple(c)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("chemins", nargs="+")
    p.add_argument("--originaux")
    p.add_argument("--cible", default="cde7f7")
    p.add_argument("--mesure", action="store_true")
    a = p.parse_args(argv)
    cible = tuple(int(a.cible[i:i + 2], 16) for i in (0, 2, 4))
    fichiers = []
    for c in a.chemins:
        c = pathlib.Path(c)
        fichiers += sorted(c.glob("*.png")) if c.is_dir() else [c]
    if a.mesure:
        for f in fichiers:
            m = mesure(Image.open(f))
            print(f"{f.name}: fond {hexa(m)}, écart avec #{a.cible} : {max(abs(m[i] - cible[i]) for i in range(3))}/255")
        return 0
    dossier_orig = pathlib.Path(a.originaux) if a.originaux else fichiers[0].parent / "originaux-canva"
    dossier_orig.mkdir(parents=True, exist_ok=True)
    for f in fichiers:
        copie = dossier_orig / f.name
        if not copie.exists():   # le premier original est conservé : relancer ne perd rien
            shutil.copyfile(f, copie)
        avant = mesure(Image.open(copie))
        uniformiser(Image.open(copie), cible).save(f)
        apres = mesure(Image.open(f))
        print(f"{f.name}: {hexa(avant)} -> {hexa(apres)} (cible #{a.cible})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
