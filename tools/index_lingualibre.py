"""Index de tous les fichiers français de Lingua Libre sur Wikimedia Commons (titres seulement), pour mesurer la couverture de n'importe quelle liste de mots hors ligne.
Lecture seule, requêtes simples « allpages » (500 titres par requête, environ 800 requêtes pour ~400 000 fichiers), une seule requête à la fois, 4 s d'écart,
pause de 120 s sur HTTP 429. Reprenable (curseur sauvegardé). Écrit data/lingualibre/index-fra.tsv : une ligne par fichier, « Locuteur-mot » (titre sans préfixe ni extension).
Usage : python tools/index_lingualibre.py [attente initiale en secondes]"""
import json
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {'User-Agent': 'phonoactif-index-lingualibre/0.1 (index des titres, lecture seule)'}
DOSSIER = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'lingualibre'
SORTIE, ETAT, VERROU = DOSSIER / 'index-fra.tsv', DOSSIER / 'index-fra.etat.json', DOSSIER / 'index-fra.verrou'
PREFIXE = 'LL-Q150 (fra)-'


def requete(continuation):
    p = {'action': 'query', 'list': 'allpages', 'apnamespace': '6', 'apprefix': PREFIXE, 'aplimit': '500', 'format': 'json'}
    if continuation:
        p['apcontinue'] = continuation
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)
    for essai in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            pause = 120 if e.code == 429 else 10 * (essai + 1)
            print(f'HTTP {e.code} : pause de {pause} s', flush=True)
            time.sleep(pause)
        except Exception:
            time.sleep(10 * (essai + 1))
    raise RuntimeError('API Commons injoignable')


def main():
    DOSSIER.mkdir(parents=True, exist_ok=True)
    if VERROU.exists():
        sys.exit(f'Une exécution est déjà en cours (supprimer {VERROU} si elle est arrêtée).')
    VERROU.write_text('1')
    try:
        if len(sys.argv) > 1:
            time.sleep(float(sys.argv[1]))
        cont = json.loads(ETAT.read_text(encoding='utf-8')).get('continue') if ETAT.exists() else None
        n = 0
        while True:
            d = requete(cont)
            titres = [x['title'] for x in d['query']['allpages']]
            with SORTIE.open('a', encoding='utf-8') as f:
                for t in titres:
                    t = t[len('File:' + PREFIXE):] if t.startswith('File:' + PREFIXE) else t
                    f.write(t.rsplit('.', 1)[0] + '\n')
            n += len(titres)
            cont = d.get('continue', {}).get('apcontinue')
            ETAT.write_text(json.dumps({'continue': cont}), encoding='utf-8')
            if (n // 500) % 20 == 0:
                print(f'{n} titres ajoutés depuis le dernier démarrage', flush=True)
            if not cont:
                print('Terminé.', flush=True)
                break
            time.sleep(4.0)  # allure lente : 1,5 s provoquait des 429 répétés
    finally:
        VERROU.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
