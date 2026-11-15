# -*- coding: utf-8 -*-
r"""Liste de TOUS les mots disponibles (packs publics de public/packs/index.json) avec leurs informations liées.
Lit les manifestes (source unique) et, pour l'IPA du mot, data/packs-atelier/<pack>/phrases-a-generer.json quand il existe.
Écrit docs/liste-des-mots.xlsx (2 feuilles : Mots, Packs) et docs/liste-des-mots.csv (UTF-8 avec BOM, séparateur point-virgule).
Usage : python -I tools/liste_mots.py"""
import csv
import json
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
COLONNES = ["mot", "pack", "titre du pack", "nb lettres", "lettres → sons", "IPA du mot", "syllabes (IPA)", "nb syllabes",
            "phrase d'aide", "audio du mot", "audio de la phrase", "image", "source de l'image", "licence de l'image",
            "écart avec les règles de lecture", "niveau", "à vérifier"]


def lire(chemin):
    return json.loads(pathlib.Path(chemin).read_text(encoding="utf-8"))


def ipa_depuis_fichier(pack):
    ch = RACINE / "data" / "packs-atelier" / pack / "phrases-a-generer.json"
    if not ch.exists():
        return {}
    return {p["mot"]: p.get("ipa", "") for p in lire(ch).get("phrases", [])}


def lignes():
    index = lire(RACINE / "public" / "packs" / "index.json")
    sortie, packs = [], []
    for entree in index:
        pid = entree["id"]
        m = lire(RACINE / "public" / "packs" / pid / "manifest.json")
        ipas = ipa_depuis_fichier(pid)
        titre = m.get("titre") or entree.get("label", pid)
        cartes = m["cartes"]
        avec_image = 0
        for c in cartes:
            sons = " | ".join(f"{x['g']}→{x['son'] or '(muet)'}" for x in c.get("cubes", []))
            syll = c.get("syllabes") or []
            ipa_syll = "-".join(s.get("ipa", "") for s in syll)
            ipa = ipas.get(c["mot"]) or ("".join(s.get("ipa", "") for s in syll))
            etats = c.get("etats") or []
            ecart = any(e.get("ecartAvecRegles") for e in etats)
            image = c.get("image_sans_mot") or c.get("image_avec_mot") or ""
            avec_image += 1 if image else 0
            audio_mot = c.get("audio_mot") or (etats[-1]["fichier"] if etats else "")
            sortie.append([c["mot"], pid, titre, len(c.get("lettres", [])), sons, ipa, ipa_syll, len(syll) or "",
                           c.get("phrase", ""), audio_mot, c.get("phraseAudio", ""), image,
                           c.get("source", "") if image else "", c.get("licence", "") if image else "",
                           "oui" if ecart else "non", c.get("niveau", ""), "oui" if c.get("aVerifier") else ""])
        packs.append([pid, titre, len(cartes), avec_image, sum(1 for c in cartes if c.get("phrase")),
                      sum(1 for c in cartes if c.get("phraseAudio")), sum(1 for c in cartes if c.get("syllabes"))])
    return sortie, packs


def main():
    sortie, packs = lignes()
    docs = RACINE / "docs"
    with open(docs / "liste-des-mots.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(COLONNES)
        w.writerows(sortie)
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    wb = Workbook()
    ws = wb.active
    ws.title = "Mots"
    ws.append(COLONNES)
    for r in sortie:
        ws.append(r)
    ent = PatternFill("solid", fgColor="0F6E56")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = ent
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    largeurs = [14, 16, 34, 8, 34, 14, 18, 8, 40, 26, 28, 20, 30, 30, 12, 8, 10]
    for i, l in enumerate(largeurs):
        ws.column_dimensions[chr(65 + i)].width = l
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = ws.dimensions
    wp = wb.create_sheet("Packs")
    wp.append(["pack", "titre", "cartes", "avec image", "avec phrase", "avec audio de phrase", "avec syllabes"])
    for r in packs:
        wp.append(r)
    for cell in wp[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = ent
    for i, l in enumerate([16, 60, 8, 11, 11, 20, 14]):
        wp.column_dimensions[chr(65 + i)].width = l
    wb.save(docs / "liste-des-mots.xlsx")
    distincts = len({r[0] for r in sortie})
    print(f"{len(sortie)} lignes (pack, mot) ; {distincts} mots distincts ; {len(packs)} packs")
    for p in packs:
        print(p)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
