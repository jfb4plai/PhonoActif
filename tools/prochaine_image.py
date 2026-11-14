# -*- coding: utf-8 -*-
r"""File d'attente d'un lot d'images : dit quelle image générer ensuite et garde la trace d'une génération en cours.
Pensé pour être appelé toutes les 5 minutes (le plafond de Canva impose une pause entre deux images).
Usage :
  python -I tools/prochaine_image.py --lot 3                          # JSON : en_cours, prochain (mot, fichier, prompt), restants, termine
  python -I tools/prochaine_image.py --lot 3 --en-cours <mot> <idTravail>   # note qu'une génération est lancée (docs/images-canva/lot3/en-cours.json)
  python -I tools/prochaine_image.py --lot 3 --effacer-en-cours       # efface la note (image reçue ou abandon)
Une image est « faite » quand docs/images-canva/lot<N>/<fichier>.png existe.
"""
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
import planche_lot  # noqa: E402
import prompts_images_canva as P  # noqa: E402

PEREMPTION_S = 45 * 60   # une génération « en cours » depuis plus de 45 min est considérée abandonnée


def etat(lot, dossier=None):
    dossier = pathlib.Path(dossier) if dossier else planche_lot.dossier_du_lot(lot)
    mots = P.LOTS[lot]
    restants = [m for m in mots if not (dossier / (m[1] + ".png")).exists()]
    note = dossier / "en-cours.json"
    en_cours = None
    if note.exists():
        try:
            d = json.loads(note.read_text(encoding="utf-8"))
            if time.time() - d.get("heure", 0) <= PEREMPTION_S and any(m[1] == d.get("fichier") for m in restants):
                en_cours = d
        except ValueError:
            pass
    prochain = None
    if not en_cours and restants:
        m = restants[0]
        prochain = {"mot": m[0], "fichier": m[1], "prompt": P.prompt(m), "a_verifier": P.verification(m)}
    return {"lot": lot, "termine": not restants, "restants": [m[0] for m in restants], "en_cours": en_cours, "prochain": prochain}


def main(argv):
    lot = int(argv[argv.index("--lot") + 1]) if "--lot" in argv else 3
    dossier = planche_lot.dossier_du_lot(lot)
    if "--en-cours" in argv:
        i = argv.index("--en-cours")
        mot, travail = argv[i + 1], argv[i + 2]
        m = next(x for x in P.LOTS[lot] if x[0] == mot or x[1] == mot)
        dossier.mkdir(parents=True, exist_ok=True)
        (dossier / "en-cours.json").write_text(json.dumps({"mot": m[0], "fichier": m[1], "travail": travail, "heure": time.time()}), encoding="utf-8")
        print("noté")
        return 0
    if "--effacer-en-cours" in argv:
        (dossier / "en-cours.json").unlink(missing_ok=True)
        print("effacé")
        return 0
    print(json.dumps(etat(lot), ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
