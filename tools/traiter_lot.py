# -*- coding: utf-8 -*-
r"""Une seule commande pour toute nouvelle image d'un lot : copie, uniformisation du fond, planche.
Usage :
  python -I tools/traiter_lot.py [--lot 3] [<image.png> [<nom-de-fichier>]]
    copie l'image dans docs/images-canva/lot<N> (sous <nom-de-fichier>.png, par défaut son nom), uniformise le fond des images ATTENDUES du lot
    (MOTS_LOT<N> ; idempotent, originaux conservés dans originaux-canva), puis régénère la planche. Lot 2 par défaut. Sans image : uniformise et régénère seulement.
Exemple : python -I tools/traiter_lot.py --lot 3 C:\...\resultat-canva.png monde
"""
import pathlib
import shutil
import sys

ICI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
import planche_lot  # noqa: E402
import uniformiser_fond  # noqa: E402


def traiter(source=None, nom=None, lot=2, dossier=None):
    dossier = pathlib.Path(dossier) if dossier else planche_lot.dossier_du_lot(lot)
    dossier.mkdir(parents=True, exist_ok=True)
    if source:
        source = pathlib.Path(source)
        if not source.is_file():
            raise SystemExit(f"Introuvable : {source}")
        cible = dossier / ((nom or source.stem).removesuffix(".png") + ".png")
        shutil.copyfile(source, cible)
        print(f"copié : {cible.name}")
    # seulement les images attendues du lot : pas les planches-contact ni les autres PNG du dossier
    fichiers = [str(dossier / (f + ".png")) for _, f in planche_lot.charger_mots(lot) if (dossier / (f + ".png")).exists()]
    if fichiers:
        uniformiser_fond.main(fichiers + ["--originaux", str(dossier / "originaux-canva")])
    planche_lot.main(lot, dossier)


if __name__ == "__main__":
    args = sys.argv[1:]
    lot = 2
    if "--lot" in args:
        i = args.index("--lot")
        lot = int(args[i + 1])
        args = args[:i] + args[i + 2:]
    traiter(args[0] if args else None, args[1] if len(args) > 1 else None, lot)
