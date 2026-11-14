# -*- coding: utf-8 -*-
"""Une seule commande pour toute nouvelle image du lot 2 : copie, uniformisation du fond, planche.
Usage :
  python -I tools/traiter_lot2.py [<image.png> [<nom-de-fichier>]] ...    copie l'image dans docs/images-canva/lot2 (sous <nom-de-fichier>.png, par défaut son nom),
                                                                       uniformise le fond de TOUTES les images du dossier (idempotent, originaux conservés),
                                                                       puis régénère docs/images-canva/lot2/planche-lot2.html
  python -I tools/traiter_lot2.py                                       sans argument : uniformise et régénère la planche (images déjà copiées)
Exemple : python -I tools/traiter_lot2.py C:\...\resultat-canva.png riviere
"""
import pathlib
import shutil
import sys

ICI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
import planche_lot2  # noqa: E402
import uniformiser_fond  # noqa: E402

DOSSIER = ICI.parent / "docs" / "images-canva" / "lot2"


def traiter(source=None, nom=None):
    DOSSIER.mkdir(parents=True, exist_ok=True)
    if source:
        source = pathlib.Path(source)
        if not source.is_file():
            raise SystemExit(f"Introuvable : {source}")
        cible = DOSSIER / ((nom or source.stem).removesuffix(".png") + ".png")
        shutil.copyfile(source, cible)
        print(f"copié : {cible.name}")
    uniformiser_fond.main([str(DOSSIER)])
    planche_lot2.main()


if __name__ == "__main__":
    args = sys.argv[1:]
    traiter(args[0] if args else None, args[1] if len(args) > 1 else None)
