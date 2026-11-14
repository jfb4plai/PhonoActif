# -*- coding: utf-8 -*-
"""Tableau de relecture : propositions de phrases de l'IA (data/phrases-propositions-ia.json) pour tous les mots d'un pack.
Usage : python -I tools/propositions_phrases_xlsx.py <pack>   -> docs/phrases-<pack>-propositions-ia.xlsx
Brouillon à relire par l'enseignant ; ensuite : phrases_pack_xlsx.py lire ... (même circuit que le tableau vide)."""
import json, pathlib, sys
import openpyxl
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import phrases_pack_xlsx as P

pack = sys.argv[1]
racine = P.RACINE
PH = json.loads((racine / "data" / "phrases-propositions-ia.json").read_text(encoding="utf-8"))
sortie, n = P.creer(pack, racine, racine / "docs" / f"phrases-{pack}-propositions-ia.xlsx")
wb = openpyxl.load_workbook(sortie)
ws = wb[P.FEUILLE_PHRASES]
ws["B1"] = "Phrase (proposition de l'IA : à relire, corriger ou effacer)"
sans, refus = [], []
for r in range(2, ws.max_row + 1):
    m = ws.cell(r, 1).value
    if m not in PH:
        sans.append(m); continue
    ws.cell(r, 2).value = PH[m]
    pb = P.verifier(m, PH[m])
    if pb: refus.append((m, pb))
wb[P.FEUILLE_NOTICE]["A1"] = f"PROPOSITION IA (brouillon) pour « {pack} » : {n} mots. Rien n'est publié avant votre accord."
wb.save(sortie)
print(sortie.name, n, "mots | sans proposition:", sans, "| refusés:", refus)
