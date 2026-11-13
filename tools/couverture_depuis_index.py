"""Couverture de Lingua Libre (français) pour des listes de mots, à partir de l'index des titres (data/lingualibre/index-fra.tsv, produit par tools/index_lingualibre.py).
Aucune requête réseau. Chaque ligne de l'index est « Locuteur-mot » ; le locuteur peut contenir un trait d'union, donc pour chaque ligne on essaie tous les découpages.
Comparaison sans accent ni majuscule (la liste des belgicismes de LisiblActif a perdu ses accents) : une couverture « sans accent » peut compter un mot voisin (cote / côté).
Limites : la licence n'est pas dans le titre (à lire fichier par fichier sur Commons) ; le pays du locuteur n'est pas sur Commons.
Usage : python tools/couverture_depuis_index.py [sortie.md]"""
import collections
import json
import pathlib
import re
import sys
import unicodedata

RACINE = pathlib.Path(__file__).resolve().parent.parent
INDEX = RACINE / 'data' / 'lingualibre' / 'index-fra.tsv'
ETAT = RACINE / 'data' / 'lingualibre' / 'index-fra.etat.json'


def sans_accent(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def charger_index():
    par_mot = collections.defaultdict(list)  # mot sans accent -> [(locuteur, mot exact)]
    n = 0
    for ligne in INDEX.read_text(encoding='utf-8').split('\n'):
        if not ligne:
            continue
        n += 1
        pos = [i for i, c in enumerate(ligne) if c == '-']
        for i in pos:
            loc, mot = ligne[:i], ligne[i + 1:]
            if loc and mot:
                par_mot[sans_accent(mot)].append((loc, mot))
    return n, par_mot


def listes():
    out = {}
    out['P1 (941 mots)'] = json.loads((RACINE / 'data' / 'p1-mots.json').read_text(encoding='utf-8'))
    vob = json.loads((RACINE / 'data' / 'listes' / 'vob.json').read_text(encoding='utf-8'))['entrees']
    out['VOB (liste par année)'] = sorted({m for e in vob for m in re.findall(r'[^\W\d_]+', e['mot'].split('(')[0].lower())[:1]})
    bel = RACINE.parent / 'projets' / 'lisiblactif' / 'src' / 'data' / 'belgicismes.json'
    if bel.exists():
        out['Belgicismes (BDLP, 2 035 formes, sans accent)'] = json.loads(bel.read_text(encoding='utf-8'))
    return out


def main():
    n, idx = charger_index()
    etat = json.loads(ETAT.read_text(encoding='utf-8')) if ETAT.exists() else {}
    termine = not etat.get('continue')
    lignes = [f'# Couverture de Lingua Libre (français) : {"index complet" if termine else "INDEX PARTIEL, résultats sous-estimés"}', '',
              f'Index : {n} fichiers. Locuteurs distincts (découpage le plus court) : voir ci-dessous.', '']
    loc_tous = collections.Counter(l.split('-')[0] for l in INDEX.read_text(encoding='utf-8').split('\n') if l)
    lignes.append(f'Locuteurs (premier segment du titre) : {len(loc_tous)}. Les 10 plus prolifiques : ' + ', '.join(f'{k} {v}' for k, v in loc_tous.most_common(10)) + '.')
    lignes.append('')
    lignes.append('| Liste | Mots | Avec ≥1 enregistrement | ≥3 enregistrements (≥3 locuteurs) | Sans enregistrement |')
    lignes.append('|---|---|---|---|---|')
    manquants = {}
    for nom, mots in listes().items():
        mots = [m for m in dict.fromkeys(sans_accent(m) for m in mots) if re.fullmatch(r'[a-z\-\']+', m)]
        c1 = [m for m in mots if idx.get(m)]
        c3 = [m for m in mots if len({l for l, _ in idx.get(m, [])}) >= 3]
        manquants[nom] = [m for m in mots if not idx.get(m)]
        lignes.append(f'| {nom} | {len(mots)} | {len(c1)} ({100 * len(c1) / len(mots):.1f} %) | {len(c3)} ({100 * len(c3) / len(mots):.1f} %) | {len(mots) - len(c1)} |')
    lignes.append('')
    for nom, m in manquants.items():
        lignes.append(f'**Sans enregistrement, {nom}** (50 premiers) : ' + ', '.join(m[:50]))
        lignes.append('')
    # locuteurs qui couvrent le plus de mots de P1
    p1 = [sans_accent(m) for m in listes()['P1 (941 mots)']]
    cpt = collections.Counter(l for m in p1 for l in {l for l, _ in idx.get(m, [])})
    lignes.append('Locuteurs couvrant le plus de mots de P1 : ' + ', '.join(f'{k} {v}' for k, v in cpt.most_common(10)) + '.')
    texte = '\n'.join(lignes) + '\n'
    sortie = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RACINE / 'docs' / 'couverture-lingualibre.md'
    sortie.write_text(texte, encoding='utf-8')
    sys.stdout.buffer.write(texte.encode('utf-8'))


if __name__ == '__main__':
    main()
