"""Normalise des sons courts générés par synthèse vocale : coupe le silence de début et de fin, ramène le pic à une valeur commune.
Pourquoi : Azure rend chaque fichier avec ~1,5 s de silence et une consonne seule (p, c) peut sortir 18 dB sous une syllabe.
Usage : python tools/normaliser_audio.py <dossier entrée> <dossier sortie> [--pic -3] [--seuil -50]
Nécessite ffmpeg. Écrit des .mp3 (mono, 96 kbit/s) de même nom ; ne modifie pas les originaux."""
import argparse
import pathlib
import re
import subprocess
import sys

GAIN_MAX_DB = 30.0  # au-delà, on amplifierait surtout du bruit : le fichier est signalé


def pic_db(chemin):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(chemin), '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'max_volume:\s*(-?[\d.]+) dB', r.stderr)
    return float(m.group(1)) if m else None


def rogner(seuil_db):
    s = f'silenceremove=start_periods=1:start_threshold={seuil_db}dB:start_silence=0.03'
    return f'{s},areverse,{s},areverse'


def normaliser(entree, sortie, pic=-3.0, seuil=-50.0):
    p0 = pic_db(entree)
    if p0 is None:
        raise RuntimeError(f'pic illisible : {entree}')
    gain = min(pic - p0, GAIN_MAX_DB)
    filtre = f'{rogner(seuil)},volume={gain:.2f}dB'
    sortie.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(entree), '-af', filtre,
                        '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', str(sortie)], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:200])
    return p0, gain, pic_db(sortie)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('entree'); ap.add_argument('sortie')
    ap.add_argument('--pic', type=float, default=-3.0); ap.add_argument('--seuil', type=float, default=-50.0)
    a = ap.parse_args()
    ent, sor = pathlib.Path(a.entree), pathlib.Path(a.sortie)
    fichiers = sorted(list(ent.glob('*.mp3')) + list(ent.glob('*.wav')))
    if not fichiers:
        sys.exit(f'aucun fichier audio dans {ent}')
    for f in fichiers:
        p0, gain, p1 = normaliser(f, sor / (f.stem + '.mp3'), a.pic, a.seuil)
        note = '  (gain plafonné : bruit amplifié ?)' if gain >= GAIN_MAX_DB else ''
        print(f'{f.name:28} pic {p0:6.1f} dB -> {p1:6.1f} dB (gain {gain:+.1f} dB){note}')


if __name__ == '__main__':
    main()
