"""Met à jour la feuille « Pack progressif » de docs/mots-par-pack-v2.xlsx depuis data/pack-progressif/paliers-p1.json.
Marques calculées (jamais saisies à la main) : * au catalogue avec image, ° au catalogue sans image,
sans marque = à créer ; † = absent de data/p1-mots.json et de data/vob-brut.json.
Usage : python -I -X utf8 tools/mots_par_pack_xlsx.py    (écrit 2026-11-23)"""
import json, os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lire(f):
    with open(os.path.join(R, f), encoding='utf-8') as h:
        return json.load(h)

def main():
    paliers = lire('data/pack-progressif/paliers-p1.json')['paliers']
    cat = {x['mot'] for x in lire('public/mots/catalogue.json')}
    fiches = {x['mot']: x for x in lire('public/mots/fiches.json')}
    p1 = set(lire('data/p1-mots.json'))
    vob = {x['mot'] for x in lire('data/vob-brut.json')}
    def marque(m):
        s = ''
        if m in cat:
            s += '*' if fiches.get(m, {}).get('image_sans_mot') else '°'
        if m not in p1 and m not in vob:
            s += '†'
        return m + s
    f = os.path.join(R, 'docs/mots-par-pack-v2.xlsx')
    wb = openpyxl.load_workbook(f)
    nom = 'Pack progressif'
    for n in list(wb.sheetnames):
        if n.startswith('Pack progressif'):
            ancien = wb[n]
            wb.remove(ancien)
    ws = wb.create_sheet(nom)
    entetes = ['Position'] + [('Palier ' + p['id']) if p['id'] != 'F' else 'Palier final F' for p in paliers]
    ws.append(entetes)
    ws.append([''] + [p['difficulte'] for p in paliers])
    ws.append([''] + [f"{len(p['mots'])} mots" for p in paliers])
    n = max(len(p['mots']) for p in paliers)
    for i in range(n):
        ws.append([i + 1] + [marque(p['mots'][i]) if i < len(p['mots']) else '' for p in paliers])
    total = sum(len(p['mots']) for p in paliers)
    cataloguees = sum(1 for p in paliers for m in p['mots'] if m in cat)
    ws.append([]); 
    ws.append([f"Pack progressif P1 (apport de Virginie) : {total} mots, {cataloguees} au catalogue, {total - cataloguees} à créer. NON publié (publication seulement pack complet, décision JF 2026-11-22). Source : data/pack-progressif/paliers-p1.json."])
    ws.append(['* = au catalogue avec image ; ° = au catalogue sans image ; sans marque = à créer ; † = hors liste P1 / VOB, niveau P1 à valider par JF.'])
    ws.append(['Paliers 1 à 7 = noyau (65 mots) ; 8 à 12 = suite (20 mots) ; F = palier final (8 mots).'])
    bleu = PatternFill('solid', fgColor='0F6E56')
    for c in ws[1]:
        c.font = Font(bold=True, color='FFFFFF'); c.fill = bleu
        c.alignment = Alignment(wrap_text=True, vertical='top')
    for c in ws[2]:
        c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.column_dimensions['A'].width = 9
    for col in range(2, len(entetes) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 17
    ws.row_dimensions[2].height = 75
    ws.freeze_panes = 'B4'
    wb.save(f)
    print(f'écrit {f} : {total} mots, {cataloguees} au catalogue')

main()
