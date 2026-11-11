"""Convertit ManuLemme (xlsx) en lexique.json pour le moteur de PhonoActif.

Usage : python tools/construire_lexique.py <ManuLemme.xlsx> <sortie.json>
Écrit aussi lexique-rejets.json à côté de la sortie. Ne rien publier ni commiter : licence de ManuLemme non vérifiée.

Colonnes de la feuille « manulemme-ver2.4 » (index depuis 0) :
0 ortho, 1 phono, 2 classe, 7 nombre de syllabes, 8 fréquence P1, 9 fréquence P2, 10 fréquence P1-5,
12 segmentation en graphèmes (.ch.a.t), 13 segmentation en codes phonétiques (.S.a.#).
"""
import json
import os
import re
import sys
import unicodedata

import openpyxl

NOM_FEUILLE = 'manulemme-ver2.4'


def _norm(s):
    return unicodedata.normalize('NFC', str(s)).lower()


def _texte(v):
    """Cellule en chaîne ; un nombre entier (code 5, 1...) devient '5', '1'."""
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)


def _nombre(v):
    return v if isinstance(v, (int, float)) else 0


def _morceaux(v):
    # ManuLemme annote les graphèmes de « [CC] » (voyelle suivie d'une consonne double) : sans valeur ici.
    texte = re.sub(r'\[[^\]]*\]', '', _texte(v))
    return [x for x in texte.split('.') if x]


def lire_feuille(chemin):
    """Retourne (entrees, rejets)."""
    wb = openpyxl.load_workbook(chemin, read_only=True, data_only=True)
    ws = wb[NOM_FEUILLE]
    entrees, rejets = [], []
    for r in ws.iter_rows(values_only=True):
        r = list(r) + [None] * (14 - len(r))
        ortho = r[0]
        if ortho is None or str(ortho).strip() == '' or str(ortho).strip() == 'ortho':
            continue
        if r[1] is None and r[12] is None and r[13] is None:
            continue  # ligne de titre ou de commentaire, pas un mot
        ortho = str(ortho).strip()
        graphemes, codes = _morceaux(r[12]), _morceaux(r[13])
        if not graphemes or not codes:
            rejets.append({'ortho': ortho, 'raison': 'segmentation absente'})
        elif len(graphemes) != len(codes):
            rejets.append({'ortho': ortho, 'raison': 'nombre de graphèmes différent du nombre de codes'})
        elif _norm(''.join(graphemes)) != _norm(ortho):
            rejets.append({'ortho': ortho, 'raison': 'la segmentation ne recompose pas le mot'})
        else:
            entrees.append({
                'ortho': ortho,
                'phono': _texte(r[1]),
                'classe': _texte(r[2]),
                'nbSyllabes': _nombre(r[7]),
                'freq': {'P1': _nombre(r[8]), 'P2': _nombre(r[9]), 'P1_5': _nombre(r[10])},
                'graphemes': graphemes,
                'codes': codes,
            })
    return entrees, rejets


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    source, sortie = argv[1], argv[2]
    entrees, rejets = lire_feuille(source)
    dossier = os.path.dirname(os.path.abspath(sortie))
    os.makedirs(dossier, exist_ok=True)
    with open(sortie, 'w', encoding='utf-8') as f:
        json.dump(entrees, f, ensure_ascii=False)
    with open(os.path.join(dossier, 'lexique-rejets.json'), 'w', encoding='utf-8') as f:
        json.dump(rejets, f, ensure_ascii=False, indent=1)
    print(f'lus={len(entrees) + len(rejets)} gardes={len(entrees)} rejetes={len(rejets)}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
