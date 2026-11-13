"""Contrôle indicatif des voyelles des syllabes CV de la bibliothèque : la voyelle a-t-elle le même timbre quelle que soit la consonne qui la précède ?
Mesure F1 et F2 (prédiction linéaire, ordre 14) sur la fin de chaque fichier et signale les consonnes dont la voyelle s'écarte de la médiane de plus de 60 Hz en F1.
LIMITES : indication seulement, pas un jugement. Fichiers très courts, peu de trames, /a/ et nasales non fiables avec cette méthode (exclus).
Un écart signalé est une raison d'écouter, jamais une preuve de défaut ; l'oreille de JF tranche.
Usage : python tools/controle_voyelles.py [dossier bibliotheque]   (défaut : essai-tts-ipa/sortie/bibliotheque)
Nécessite numpy et ffmpeg."""
import json
import pathlib
import subprocess
import sys
from collections import defaultdict

import numpy as np

VOYELLES = "eiyuoɛɔø"  # a, schwa et nasales exclus : mesure peu fiable
SEUIL_HZ = 60
FE = 16000


def charger(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(f), '-f', 's16le', '-ac', '1', '-ar', str(FE), '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(float) / 32768


def formants(x, ordre=14):
    x = np.append(x[0], x[1:] - 0.97 * x[:-1]) * np.hamming(len(x))
    r = np.correlate(x, x, 'full')[len(x) - 1:len(x) + ordre]
    R = np.array([[r[abs(i - j)] for j in range(ordre)] for i in range(ordre)]) + 1e-9 * np.eye(ordre)
    a = np.concatenate(([1], -np.linalg.solve(R, r[1:ordre + 1])))
    res = []
    for z in np.roots(a):
        if z.imag > 0:
            f = np.angle(z) * FE / (2 * np.pi)
            bw = -np.log(abs(z)) * FE / np.pi
            if 200 < f < 3600 and bw < 500:
                res.append(f)
    return sorted(res)[:2]


def mesure(f, part):
    x = charger(f)
    seg = x[int(len(x) * (1 - part)):]
    seuil = 0.25 * np.sqrt(np.mean(x ** 2))
    out = []
    for d in range(0, len(seg) - 400, 160):
        fr = seg[d:d + 400]
        if np.sqrt(np.mean(fr ** 2)) < seuil:
            continue
        ff = formants(fr)
        if len(ff) == 2:
            out.append(ff)
    if len(out) < 4:
        return None
    a = np.array(out)
    return len(out), float(np.median(a[:, 0])), float(np.median(a[:, 1]))


def main():
    base = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / 'essai-tts-ipa' / 'sortie' / 'bibliotheque'
    index = json.loads((base / 'index.json').read_text(encoding='utf-8'))
    par_voyelle = defaultdict(list)
    for ipa, info in index.items():
        if len(ipa) == 2 and ipa[1] in VOYELLES and ipa[0] not in VOYELLES:
            m = mesure(base / 'norm' / info['fichier'], 0.45)
            if m:
                par_voyelle[ipa[1]].append((ipa[0], *m))
    sortie = []
    for v, lst in sorted(par_voyelle.items()):
        if len(lst) < 3:
            sortie.append(f"/{v}/ : {len(lst)} syllabe(s) mesurée(s), trop peu pour comparer")
            continue
        med = float(np.median([x[2] for x in lst]))
        sortie.append(f"/{v}/ : F1 médian {med:.0f} Hz sur {len(lst)} consonnes")
        for c, n, f1, f2 in sorted(lst, key=lambda x: -abs(x[2] - med)):
            if abs(f1 - med) > SEUIL_HZ:
                sortie.append(f"    à écouter : /{c}{v}/ F1 {f1:.0f} Hz ({f1 - med:+.0f}), F2 {f2:.0f} Hz, {n} trames")
    sys.stdout.buffer.write(('\n'.join(sortie) + '\n').encode('utf-8'))


if __name__ == '__main__':
    main()
