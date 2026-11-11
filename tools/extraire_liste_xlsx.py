"""Extrait d'un tableur des lignes brutes {mot, niveau, nature, remarque} vers un fichier JSON.

Usage : python tools/extraire_liste_xlsx.py <fichier.xlsx> <sortie.json> --mot-col N
        [--niveau-col N] [--nature-col N] [--remarque-col N] [--feuille NOM] [--premiere-ligne N]
Les colonnes se comptent depuis 0, les lignes comme dans Excel (la première ligne est la ligne 1).
Les espaces de fin sont conservés : le nettoyage et la validation sont faits par le moteur (construire_liste.js).
"""
import argparse
import json
import sys

import openpyxl


def _texte(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)


def extraire(chemin, mot_col, niveau_col=None, nature_col=None, remarque_col=None, feuille=None, premiere_ligne=1):
    wb = openpyxl.load_workbook(chemin, read_only=True, data_only=True)
    ws = wb[feuille] if feuille else wb.worksheets[0]
    lignes = []
    for i, r in enumerate(ws.iter_rows(values_only=True), start=1):
        if i < premiere_ligne:
            continue
        r = list(r)

        def col(n):
            return _texte(r[n]) if n is not None and n < len(r) else ''
        mot = col(mot_col)
        if mot.strip() == '':
            continue
        lignes.append({'mot': mot, 'niveau': col(niveau_col), 'nature': col(nature_col), 'remarque': col(remarque_col)})
    return lignes


def main(argv):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('xlsx')
    p.add_argument('sortie')
    p.add_argument('--mot-col', type=int, required=True)
    p.add_argument('--niveau-col', type=int)
    p.add_argument('--nature-col', type=int)
    p.add_argument('--remarque-col', type=int)
    p.add_argument('--feuille')
    p.add_argument('--premiere-ligne', type=int, default=1)
    a = p.parse_args(argv[1:])
    lignes = extraire(a.xlsx, a.mot_col, a.niveau_col, a.nature_col, a.remarque_col, a.feuille, a.premiere_ligne)
    with open(a.sortie, 'w', encoding='utf-8') as f:
        json.dump(lignes, f, ensure_ascii=False)
    print(f'lignes={len(lignes)}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
