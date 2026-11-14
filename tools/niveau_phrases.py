# -*- coding: utf-8 -*-
"""Niveau des phrases d'aide : chaque mot de chaque phrase est cherché dans Manulex (manuels de CP, fréquence par million).
Usage : python -I tools/niveau_phrases.py [data/phrases-propositions-ia.json]
Un mot est signalé s'il est absent de Manulex ou rare en CP (U < 5). Le mot cible n'est pas contrôlé (choisi par l'enseignant).
Lecture seule. Ne remplace pas la relecture de l'enseignant."""
import json, re, sys
import pyreadr
sys.stdout.reconfigure(encoding='utf-8')
chemin = sys.argv[1] if len(sys.argv) > 1 else 'data/phrases-propositions-ia.json'
df = pyreadr.read_r('data/openlexicon/Manulex-Ortho.rds')[None]
def num(s):
    try: return float(str(s).replace(' ', '').replace('\xa0', ''))
    except: return float('nan')
df['mot'] = df['FORMES_ORTHOGRAPHIQUES']; df['cp'] = df['CP_U'].map(num)
cp = df.groupby('mot')['cp'].sum(min_count=1)
PH = json.load(open(chemin, encoding='utf-8'))
signales = {}
for mot, ph in PH.items():
    for t in re.findall(r"[\wàâäçéèêëîïôöùûüÿœæ]+", ph.lower()):
        if t == mot or len(t) == 1: continue
        f = cp.get(t)
        if f is None or f != f or f < 5:
            signales.setdefault(t, []).append((mot, None if f is None or f != f else round(f, 1)))
print(len(PH), 'phrases ; mots signalés :', len(signales))
for t, l in sorted(signales.items()): print(' ', t, l[:3])
