"""Couverture de Lingua Libre (Wikimedia Commons) pour une liste de mots : combien ont un enregistrement français, sous quelle licence, par combien de locuteurs.
Lecture seule, API publique de Commons, aucune donnée personnelle envoyée (seulement des mots). Reprenable : les mots déjà interrogés ne sont pas redemandés.
Usage : python tools/couverture_lingualibre.py data/p1-mots.json data/lingualibre/couverture-p1.json
Limites : seuls les fichiers « LL-Q150 (fra)-<locuteur>-<mot>.wav » au titre exact sont comptés (minuscules) ; le pays du locuteur n'est PAS dans Commons (il est sur lingualibre.org)."""
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {'User-Agent': 'phonoactif-couverture-test/0.1 (essai de couverture, lecture seule)'}


def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'})
    for essai in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:  # trop de requêtes : on respecte la limite, longue pause
                print('429 : pause de 90 s', flush=True)
                time.sleep(90)
            else:
                time.sleep(5 * (essai + 1))
        except Exception:
            time.sleep(5 * (essai + 1))
    raise RuntimeError('API Commons injoignable')


def chercher(mot):
    q = r'intitle:/-%s\.wav$/ intitle:"LL-Q150"' % re.escape(mot)
    d = api({'action': 'query', 'list': 'search', 'srnamespace': '6', 'srsearch': q, 'srlimit': '50'})
    titres = [x['title'] for x in d['query']['search']]
    pat = re.compile(r'^File:LL-Q150 \(fra\)-(.+)-' + re.escape(mot) + r'\.wav$')
    exacts = [t for t in titres if pat.match(t)]
    return {'total': d['query']['searchinfo']['totalhits'], 'titres': exacts, 'locuteurs': sorted({pat.match(t).group(1) for t in exacts})}


def licences(titres):
    res = {}
    for i in range(0, len(titres), 40):
        d = api({'action': 'query', 'titles': '|'.join(titres[i:i + 40]), 'prop': 'imageinfo', 'iiprop': 'extmetadata|size'})
        for p in d['query']['pages'].values():
            if 'imageinfo' in p:
                ii = p['imageinfo'][0]
                res[p['title']] = {'licence': ii['extmetadata'].get('LicenseShortName', {}).get('value'), 'octets': ii['size']}
        time.sleep(0.3)
    return res


def main():
    verrou = pathlib.Path(sys.argv[2] + '.verrou')
    if verrou.exists():
        sys.exit('Une exécution est déjà en cours (supprimer ' + str(verrou) + ' si elle est arrêtée).')
    verrou.write_text('1')
    try:
        main2()
    finally:
        verrou.unlink(missing_ok=True)


def main2():
    if len(sys.argv) > 3:
        time.sleep(float(sys.argv[3]))  # attente initiale en secondes (laisser retomber la limite de débit)
    mots = [m for m in dict.fromkeys(json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))) if re.fullmatch(r'[a-zàâäéèêëîïôöûùüçœ]+', m)]
    sortie = pathlib.Path(sys.argv[2]); sortie.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(sortie.read_text(encoding='utf-8')) if sortie.exists() else {'mots': {}, 'licences': {}}
    for k, m in enumerate(mots, 1):
        if m in data['mots']:
            continue
        try:
            data['mots'][m] = chercher(m)
        except Exception as e:
            print('ERR', m, str(e)[:80], flush=True)
            continue
        if k % 25 == 0:
            sortie.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
            print(f'{k}/{len(mots)} mots interrogés', flush=True)
        time.sleep(1.5)  # allure douce : une seule requête à la fois, environ 25 minutes pour 941 mots
    # licence et taille du premier fichier de chaque mot couvert
    premiers = [v['titres'][0] for v in data['mots'].values() if v['titres'] and v['titres'][0] not in data['licences']]
    data['licences'].update(licences(premiers))
    sortie.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    couverts = [m for m, v in data['mots'].items() if v['total'] > 0]
    print(f"{len(data['mots'])} mots interrogés, {len(couverts)} avec au moins un enregistrement ({100 * len(couverts) / len(data['mots']):.1f} %)")


if __name__ == '__main__':
    main()
