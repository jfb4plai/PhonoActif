"""Licence, auteur et taille des fichiers Lingua Libre pour un échantillon de mots et trois locuteurs (lecture seule, API Commons, 1 requête / 4 s).
Écrit data/lingualibre/echantillon-licences.json. Aucun fichier audio n'est téléchargé ici.
Usage : python -I tools/licences_lingualibre.py"""
import collections
import json
import pathlib
import time
import unicodedata
import urllib.parse
import urllib.request

UA = {'User-Agent': 'phonoactif-licences-lingualibre/0.1 (lecture seule)'}
RACINE = pathlib.Path(__file__).resolve().parent.parent
DOSSIER = RACINE / 'data' / 'lingualibre'
LOCUTEURS = ['LoquaxFR', 'Sartus85', 'Poslovitch']
MOTS = ['maison', 'chat', 'pomme', 'école', 'ville', 'fille', 'soleil', 'roi', 'pain', 'chien', 'bateau', 'champignon', 'oiseau', 'tableau',
        'garçon', 'lune', 'rouge', 'vélo', 'rat', 'ré', 'dé', 'nuit', 'feuille', 'travail', 'crayon', 'cartable', 'fromage', 'lundi', 'jaune', 'singe']


def sans_accent(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def appel(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    titres_index = {}
    for ligne in (DOSSIER / 'index-fra.tsv').read_text(encoding='utf-8').split('\n'):
        for loc in LOCUTEURS:
            if ligne.startswith(loc + '-'):
                titres_index.setdefault((loc, sans_accent(ligne[len(loc) + 1:])), []).append(ligne[len(loc) + 1:])
    demandes = []
    for m in MOTS:
        for loc in LOCUTEURS:
            for exact in titres_index.get((loc, sans_accent(m)), [])[:1]:
                demandes.append((loc, m, exact))
    print(len(demandes), 'fichiers à interroger sur', len(MOTS) * len(LOCUTEURS), 'possibles')
    resultats = []
    for i in range(0, len(demandes), 40):
        lot = demandes[i:i + 40]
        # extension inconnue dans l'index : .wav est le format d'envoi de Lingua Libre
        d = appel({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|user|extmetadata', 'format': 'json',
                   'titles': '|'.join(f'File:LL-Q150 (fra)-{loc}-{exact}.wav' for loc, _, exact in lot)})
        pages = d['query']['pages'].values()
        par_titre = {p['title']: p for p in pages}
        for loc, m, exact in lot:
            p = par_titre.get(f'File:LL-Q150 (fra)-{loc}-{exact}.wav')
            if not p or 'imageinfo' not in p:
                resultats.append({'locuteur': loc, 'mot': m, 'exact': exact, 'absent': True})
                continue
            ii = p['imageinfo'][0]
            em = ii.get('extmetadata', {})
            g = lambda k: (em.get(k) or {}).get('value')
            resultats.append({'locuteur': loc, 'mot': m, 'exact': exact, 'url': ii['url'], 'octets': ii['size'], 'envoye_par': ii['user'],
                              'licence': g('LicenseShortName'), 'licence_url': g('LicenseUrl'), 'auteur': g('Artist'), 'attribution': g('AttributionRequired'),
                              'description': g('ImageDescription')})
        time.sleep(4.0)
    (DOSSIER / 'echantillon-licences.json').write_text(json.dumps(resultats, ensure_ascii=False, indent=1), encoding='utf-8')
    c = collections.Counter((r['locuteur'], r.get('licence', 'ABSENT')) for r in resultats)
    for k, v in sorted(c.items()):
        print(k, v)


if __name__ == '__main__':
    main()
