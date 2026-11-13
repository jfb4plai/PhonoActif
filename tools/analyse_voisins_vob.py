# Croise la liste VOB (par année) et Voisins (openlexicon). Lecture seule.
import json, csv, sys, collections
csv.field_size_limit(10**9)
vob = json.load(open('data/listes/vob.json', encoding='utf-8'))['entrees']
vois = {}
with open('data/openlexicon/voisins.txt', encoding='utf-8') as f:
    r = csv.reader(f, delimiter='\t'); next(r)
    for row in r:
        if len(row) >= 3:
            vois[row[0]] = (int(row[1] or 0), [x.strip() for x in row[2].split(',')])
mots = collections.defaultdict(set)
for e in vob: mots[e['niveau']].add(e['mot'])
tous = set().union(*mots.values())
print('niveau  mots  dans_Voisins  >=1_voisin_VOB  mediane_nb_voisins')
for n in sorted(mots):
    ms = mots[n]; trouves = [m for m in ms if m in vois]
    avec = [m for m in trouves if any(v in tous for v in vois[m][1])]
    nb = sorted(vois[m][0] for m in trouves)
    print(n, len(ms), len(trouves), len(avec), nb[len(nb)//2] if nb else '-')
# paires minimales dans P1 (deux mots P1 voisins entre eux)
p1 = mots['P1']; paires = set()
for m in p1:
    if m in vois:
        for v in vois[m][1]:
            if v in p1 and v != m and len(v) == len(m): paires.add(tuple(sorted((m, v))))
print('paires P1-P1 :', len(paires)); print(sorted(paires)[:25])
