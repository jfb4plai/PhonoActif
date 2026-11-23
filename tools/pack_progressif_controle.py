"""Contrôle déterministe des paliers du pack progressif P1 contre les conseils de Virginie (docx « Apport Virginie à Phonoactif »).
Règles contrôlées sur les PIÈCES (graphèmes ; er, ez, et, qu lus lettre par lettre pour la règle V) de chaque mot, d'après data/lexique.json :
  V  paires visuelles absentes d'un même mot : e/a, t/f, d/b/p/q, u/n, on/ou, an/au, en/eu
  P  paires phonétiques absentes d'un même mot : p/b/m, f/v, ch/j, c/g, t/d
  S  structure : pas de deux consonnes de suite (CCV, VCC)
  L  consonnes longues (f m l s n r v j z) avant les courtes (p k d t q b) : signalé si un palier 1 à 6 contient une courte
Le palier F (e/a) est exempté de la règle V pour e/a (décision JF 2026-11-20). Un mot absent du lexique est signalé.
Usage : python -I -X utf8 tools/pack_progressif_controle.py [fichier paliers.json]   (écrit 2026-11-23)"""
import json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lire(f):
    with open(f if os.path.isabs(f) else os.path.join(R, f), encoding='utf-8') as h:
        return json.load(h)
VOY = {'a','à','â','e','é','è','ê','o','ô','u','i','î','y','œ','eau','ain','ein','eil','ail','oin','aim','eur','euil','ouil','au','oi','ou','eu','ai','ei','an','on','in','en','un','er','ez','et','es','ent','oeu'}
def est_voy(g): return g in VOY or all(c in 'aàâeéèêoôuiîyœ' for c in g)
PV = [{'e','a'},{'t','f'},{'d','b','p','q'},{'u','n'},{'on','ou'},{'an','au'},{'en','eu'}]
PP = [{'p','b','m'},{'f','v'},{'ch','j'},{'c','g'},{'t','d'}]
COURT = set('pktdqb')
def lettre(k): return {'é':'e','è':'e','ê':'e','à':'a','â':'a'}.get(k, k)
def controle(mot, lex, palier):
    x = lex.get(mot)
    if not x: return ['absent du lexique']
    g = x['graphemes']; pb = []
    # eau, ain, ein, eil, oin… restent des pièces (digraphes de Virginie) ; er, ez, et, qu sont lus lettre par lettre pour la règle visuelle (e/a, t/f, d/b/p/q)
    s = set()
    for k in g:
        s |= set(k) if k in ('er','ez','et','es','ent','qu','gu') else {lettre(k)}
    for p in PV:
        if len(p & s) >= 2 and not (palier == 'F' and p == {'e','a'}): pb.append('V ' + '/'.join(sorted(p & s)))
    for p in PP:
        if len(p & set(g)) >= 2: pb.append('P ' + '/'.join(sorted(p & set(g))))
    f = ''.join('V' if est_voy(k) else 'C' for k in g)
    if 'CC' in f: pb.append('S ' + f)
    return pb
def main():
    paliers = lire(sys.argv[1] if len(sys.argv) > 1 else 'data/pack-progressif/paliers-p1.json')['paliers']
    lex = {}
    for x in lire('data/lexique.json'):
        lex.setdefault(x['ortho'], x)
    n = 0
    for p in paliers:
        for m in p['mots']:
            pb = controle(m, lex, p['id'])
            courtes = [k for k in lex.get(m, {}).get('graphemes', []) if k in COURT]
            if courtes and p['id'] in ('1', '3', '4'):
                pb.append('L courtes ' + ''.join(courtes))
            if pb:
                n += 1; print(f"palier {p['id']:>3} | {m:<10} | " + ' ; '.join(pb))
    print(f'{n} mot(s) signalé(s) sur {sum(len(p["mots"]) for p in paliers)}')
main()
