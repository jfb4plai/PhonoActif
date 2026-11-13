# Croise Manulex (formes orthographiques, par niveau) avec la liste P1 de JF et la VOB. Lecture seule.
import json, sys, collections
import pyreadr
sys.stdout.reconfigure(encoding='utf-8')
df = pyreadr.read_r('data/openlexicon/Manulex-Ortho.rds')[None]
def num(s):
    try: return float(str(s).replace(' ','').replace('\xa0','').replace(' ',''))
    except: return float('nan')
df['mot'] = df['FORMES_ORTHOGRAPHIQUES']
for c in ['CP_U','CE1_U','CE2-CM2_U','CP_F','CE1_F','CE2-CM2_F']: df[c] = df[c].map(num)
agg = df.groupby('mot')[['CP_U','CE1_U','CE2-CM2_U','CP_F']].sum(min_count=1)
print('formes Manulex', len(agg), '| test accent:', 'bébé' in agg.index, 'blé' in agg.index)
p1 = json.load(open('data/p1-mots.json', encoding='utf-8'))
vob = json.load(open('data/listes/vob.json', encoding='utf-8'))['entrees']
def part(mots, label):
    mots = set(mots); tr = [m for m in mots if m in agg.index]
    cp = [m for m in tr if agg.loc[m,'CP_U'] == agg.loc[m,'CP_U']]
    print(f'{label}: {len(mots)} mots, dans Manulex {len(tr)}, avec fréquence CP {len(cp)}')
    return tr
part(p1, 'Liste P1 JF (941)')
for n in ['P1','P2','P3','P4','P5','P6']:
    ms = [e['mot'] for e in vob if e['niveau']==n]
    tr = part(ms, 'VOB '+n)
    cp_abs = sum(1 for m in tr if agg.loc[m,'CP_U'] != agg.loc[m,'CP_U'])
    print('   absents des manuels de CP (NaN):', cp_abs, '| U CP médiane:', round(agg.loc[[m for m in tr if agg.loc[m,'CP_U']==agg.loc[m,'CP_U']],'CP_U'].median(),1))
# P1 JF : mots rares ou absents en CP
tr = [m for m in set(p1) if m in agg.index]
rares = sorted([m for m in tr if (agg.loc[m,'CP_U']!=agg.loc[m,'CP_U']) or agg.loc[m,'CP_U']<5])
print('P1 JF : absents de Manulex', len(set(p1))-len(tr), sorted(set(p1)-set(tr))[:25])
print('P1 JF : absents/rares (<5 par million) en CP', len(rares), rares[:40])
