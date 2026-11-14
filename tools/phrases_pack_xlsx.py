# -*- coding: utf-8 -*-
r"""Tableau Excel des phrases d'aide d'un pack : UNE courte phrase par mot sans image, écrite par l'enseignant (jamais par une IA).
La phrase est seulement ENTENDUE par l'élève (bouton « Écouter une phrase ») : le texte n'est jamais affiché, il contient le mot.

  python -I tools/phrases_pack_xlsx.py creer <pack>
      écrit docs/phrases-<pack>-a-remplir.xlsx : la liste des mots du pack qui n'ont pas d'image, avec une colonne vide « Phrase » à remplir
  python -I tools/phrases_pack_xlsx.py lire <tableau-rempli.xlsx> <pack>
      vérifie les phrases et écrit data/packs-atelier/<pack>/phrases.json ; rien n'est publié
      suite : node tools/ajouter_phrases_pack.js <pack>, puis python -I essai-tts-ipa/generer-bibliotheque.py phrases <pack> (clé Azure, par JF)
Règles vérifiées à la lecture : le mot figure dans la phrase (mot entier), 120 caractères au plus, pas de chiffre, pas de nom propre évident (majuscule au milieu d'une phrase).
"""
import json
import pathlib
import re
import sys

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

RACINE = pathlib.Path(__file__).resolve().parent.parent
TEAL = "0F6E56"
FEUILLE_PHRASES, FEUILLE_NOTICE = "Phrases", "Mode d'emploi"
MAX_CAR = 120


def mots_sans_image(pack, racine=RACINE):
    m = json.loads((racine / "public" / "packs" / pack / "manifest.json").read_text(encoding="utf-8"))
    return [c["mot"] for c in m["cartes"] if not c.get("image_sans_mot")]


def creer(pack, racine=RACINE, sortie=None):
    mots = mots_sans_image(pack, racine)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = FEUILLE_NOTICE
    lignes = [
        f"Phrases d'aide du pack « {pack} » : {len(mots)} mots sans image",
        "",
        "Ce que vous écrivez : UNE courte phrase par mot, avec vos mots, pour vos élèves. L'application ne la propose pas à votre place.",
        "La phrase est seulement ENTENDUE (bouton « Écouter une phrase ») : son texte n'est jamais affiché, parce qu'il contient le mot à écrire.",
        f"Consignes : le mot doit figurer dans la phrase, tel quel ; {MAX_CAR} caractères au plus ; pas de chiffre ; pas de prénom d'élève ni de nom de personne ; une phrase simple, dite à voix haute, qui donne du sens au mot.",
        "Pour un mot-outil (dans, avec, mais…), une phrase où le mot est bien audible. Pour un mot à plusieurs sens, la phrase du sens que vous voulez travailler.",
        "Remplir la colonne « Phrase » de la feuille « Phrases ». Laisser vide un mot pour lequel vous ne voulez pas de phrase.",
        "Ensuite : envoyer le fichier à JF, qui fait lire les phrases par la voix et les ajoute au pack.",
    ]
    for i, t in enumerate(lignes, 1):
        ws.cell(i, 1, t).alignment = Alignment(wrap_text=True, vertical="top")
    ws["A1"].font = Font(bold=True, size=14, color=TEAL)
    ws.column_dimensions["A"].width = 120
    fe = wb.create_sheet(FEUILLE_PHRASES)
    entetes = ["Mot", "Phrase (à écrire par vous)", "Commentaire (facultatif)"]
    for j, t in enumerate(entetes, 1):
        c = fe.cell(1, j, t)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=TEAL)
    for i, mot in enumerate(mots, 2):
        fe.cell(i, 1, mot)
        fe.cell(i, 2).alignment = Alignment(wrap_text=True, vertical="top")
    fe.column_dimensions["A"].width = 14
    fe.column_dimensions["B"].width = 80
    fe.column_dimensions["C"].width = 40
    dv = DataValidation(type="textLength", operator="lessThanOrEqual", formula1=str(MAX_CAR), allow_blank=True,
                        errorTitle="Phrase trop longue", error=f"{MAX_CAR} caractères au plus.", showErrorMessage=True)
    fe.add_data_validation(dv)
    dv.add(f"B2:B{len(mots) + 1}")
    fe.freeze_panes = "A2"
    sortie = pathlib.Path(sortie) if sortie else racine / "docs" / f"phrases-{pack}-a-remplir.xlsx"
    sortie.parent.mkdir(parents=True, exist_ok=True)
    wb.save(sortie)
    return sortie, len(mots)


def mot_present(mot, phrase):
    return re.search(r"(?<![\wàâäçéèêëîïôöùûüÿœæ])" + re.escape(mot) + r"(?![\wàâäçéèêëîïôöùûüÿœæ])", phrase, flags=re.IGNORECASE) is not None


def verifier(mot, phrase):
    """Liste des problèmes d'une phrase (vide = acceptée)."""
    p = []
    if len(phrase) > MAX_CAR:
        p.append(f"{len(phrase)} caractères (au plus {MAX_CAR})")
    if not mot_present(mot, phrase):
        p.append("le mot n'apparaît pas tel quel dans la phrase")
    if re.search(r"\d", phrase):
        p.append("contient un chiffre")
    if re.search(r"[^.!?]\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ][a-zàâäçéèêëîïôöùûüÿœæ]+", phrase.split(None, 1)[1] if len(phrase.split(None, 1)) > 1 else ""):
        p.append("une majuscule au milieu de la phrase : nom de personne ? (à relire)")
    return p


def lire(chemin, pack, racine=RACINE):
    wb = openpyxl.load_workbook(chemin, data_only=True)
    if FEUILLE_PHRASES not in wb.sheetnames:
        sys.exit(f"Feuille « {FEUILLE_PHRASES} » introuvable.")
    attendus = set(mots_sans_image(pack, racine))
    phrases, refuses, ignores = {}, [], []
    for ligne in wb[FEUILLE_PHRASES].iter_rows(min_row=2, values_only=True):
        mot, phrase = (ligne[0] or "").strip(), (ligne[1] or "").strip()
        if not mot or not phrase:
            continue
        if mot not in attendus:
            ignores.append((mot, "mot absent de la liste des mots sans image de ce pack"))
            continue
        pb = verifier(mot, phrase)
        graves = [x for x in pb if not x.startswith("une majuscule")]
        if graves:
            refuses.append((mot, "; ".join(pb)))
        else:
            phrases[mot] = phrase
            if pb:
                ignores.append((mot, "gardée, à relire : " + "; ".join(pb)))
    dossier = racine / "data" / "packs-atelier" / pack
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / "phrases.json").write_text(json.dumps(phrases, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return phrases, refuses, ignores, attendus


def main(argv):
    if len(argv) >= 2 and argv[0] == "creer":
        sortie, n = creer(argv[1])
        print(f"écrit : {sortie} ({n} mots à compléter)")
        return 0
    if len(argv) >= 3 and argv[0] == "lire":
        phrases, refuses, notes, attendus = lire(argv[1], argv[2])
        print(f"{len(phrases)} phrase(s) acceptée(s) sur {len(attendus)} mots sans image ; {len(refuses)} refusée(s).")
        for mot, raison in refuses:
            print(f"  refusée : {mot} : {raison}")
        for mot, note in notes:
            print(f"  note : {mot} : {note}")
        print(f"écrit : data/packs-atelier/{argv[2]}/phrases.json")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
