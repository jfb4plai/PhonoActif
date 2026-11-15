# -*- coding: utf-8 -*-
"""
Essai 4 (9 appels Azure) : le volume +10 % / +30 % n'a eu AUCUN effet mesuré (essai 3). Cause probable, non vérifiée : volume par défaut déjà au maximum.
Ici on essaie autre chose, sur 3 mots (dans, qui, tout), phrases à 75 % :
  reste30  : le RESTE de la phrase à volume -30 %, le mot cible au niveau normal
  reste50  : le RESTE de la phrase à volume -50 %, le mot cible au niveau normal
  xloud    : mot cible à volume="x-loud", le reste normal
Comparaison mesurée avec la version neutre de l'essai 2 (sortie/phrases75/brut/<mot>_neutre.mp3, même texte, même débit, même durée).
Sortie : sortie/phrases75c/ ; essais 1 à 3 non touchés.

  python essai-phrases-75c.py azure   # 9 appels Azure, normalisation, mesure, page
  python essai-phrases-75c.py mesure  # tableau des rapports de volume par tranche de 100 ms (ffmpeg local, sans Azure)
  python essai-phrases-75c.py page    # reconstruit ecoute-phrases-75c.html
Lecture de la mesure : rapport = volume de la version / volume du neutre. 1,00 = aucun changement.
Attendu si ça marche : reste30 et reste50 -> rapport < 1 hors du mot (environ 0,7 et 0,5) et ~1,00 sur le mot ; xloud -> rapport > 1 sur le mot seulement.
Clé : comme essai-charline.py, lue seulement quand JF lance « azure ». Seul du texte de phrase et de l'IPA part vers Azure.
"""
import html
import importlib.util
import json
import math
import pathlib
import struct
import subprocess
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
_e = importlib.util.spec_from_file_location("essai_phrases_75", ICI / "essai-phrases-75.py")
E2 = importlib.util.module_from_spec(_e)
_e.loader.exec_module(E2)
C, N, ipa_de, DEBIT = E2.C, E2.N, E2.ipa_de, E2.DEBIT

MOTS = ("dans", "qui", "tout")
PHRASES = [p for p in E2.PHRASES if p[0] in MOTS]
VARIANTES = ["reste30", "reste50", "xloud"]
BASE = ICI / "sortie" / "phrases75c"
BRUT, NORM = BASE / "brut", BASE / "norm"
NEUTRE = ICI / "sortie" / "phrases75" / "brut"


def ssml(mot, avant, apres, ipa, variante):
    ph = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    if variante == "xloud":
        corps = f'{html.escape(avant)}<prosody volume="x-loud">{ph}</prosody>{html.escape(apres)}'
    else:
        vol = "-30%" if variante == "reste30" else "-50%"
        corps = f'<prosody volume="{vol}">{html.escape(avant)}</prosody>{ph}<prosody volume="{vol}">{html.escape(apres)}</prosody>'
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{C.VOIX}"><prosody rate="{DEBIT}">{corps}</prosody></voice></speak>')


def generer():
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    ok = err = 0
    for mot, avant, apres in PHRASES:
        ipa = ipa_de(mot)
        for v in VARIANTES:
            f = BRUT / f"{mot}_{v}.mp3"
            if f.exists():
                continue
            try:
                f.write_bytes(C.E.azure_appel(cle, region, ssml(mot, avant, apres, ipa, v)))
                ok += 1
            except Exception as e:
                err += 1
                print("ERR", mot, v, str(e)[:140], flush=True)
            time.sleep(0.15)
    print(f"{ok} fichiers générés, {err} erreur(s).")


def normaliser():
    NORM.mkdir(parents=True, exist_ok=True)
    for f in sorted(BRUT.glob("*.mp3")):
        dst = NORM / f.name
        if not dst.exists():
            N.normaliser(f, dst)
    print(len(list(NORM.glob("*.mp3"))), "fichiers normalisés.")


def _pcm(p):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True)
    d = r.stdout
    return struct.unpack("<%dh" % (len(d) // 2), d)


def _env(x, w=1600):
    return [math.sqrt(sum(v * v for v in x[i:i + w]) / w) for i in range(0, len(x) - w + 1, w)]


def rapport(neutre, autre):
    """Rapport de volume par tranche de 100 ms (None si le neutre est quasi silencieux)."""
    ea, eb = _env(_pcm(neutre)), _env(_pcm(autre))
    return [eb[i] / ea[i] if ea[i] > 200 else None for i in range(min(len(ea), len(eb)))]


def mesure():
    for mot, _, _ in PHRASES:
        for v in VARIANTES:
            f = BRUT / f"{mot}_{v}.mp3"
            if not f.exists():
                print(mot, v, ": fichier absent")
                continue
            r = rapport(NEUTRE / f"{mot}_neutre.mp3", f)
            vals = [x for x in r if x is not None]
            med = sorted(vals)[len(vals) // 2]
            print(f"{mot:5s} {v:8s} médiane {med:.2f}  min {min(vals):.2f}  max {max(vals):.2f}  | " + " ".join("--" if x is None else f"{x:.2f}" for x in r))


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Essai volume : reste de la phrase baissé</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}audio{width:190px;height:32px}</style></head><body>
<h1>Essai volume : le mot ressort-il ?</h1>
<p>0. neutre (essai 2) | 1. reste de la phrase à -30 %% | 2. reste à -50 %% | 3. mot à x-loud. Le mot cible doit ressortir sans que la phrase soit étouffée.</p>
<div id="t"></div>
<script>
var DATA = %s, V = [["neutre", "sortie/phrases75/norm/"], ["reste30", "sortie/phrases75c/norm/"], ["reste50", "sortie/phrases75c/norm/"], ["xloud", "sortie/phrases75c/norm/"]];
var h = "<table><tr><th>Mot et phrase</th><th>0. neutre</th><th>1. reste -30 %%</th><th>2. reste -50 %%</th><th>3. mot x-loud</th></tr>";
DATA.forEach(function (d) { h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "</div></td>" + V.map(function (v) {
  return "<td><audio controls preload='none' src='" + v[1] + encodeURIComponent(d.mot + "_" + v[0]) + ".mp3'></audio></td>"; }).join("") + "</tr>"; });
document.getElementById("t").innerHTML = h + "</table>";
</script></body></html>"""


def page():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}"} for m, a, p in PHRASES]
    (ICI / "ecoute-phrases-75c.html").write_text(PAGE % json.dumps(data, ensure_ascii=False).replace("</", "<\\/"), encoding="utf-8")
    print("Page :", ICI / "ecoute-phrases-75c.html")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer(); normaliser(); mesure(); page()
    elif cmd == "mesure":
        mesure()
    elif cmd == "page":
        page()
    else:
        sys.exit(__doc__)
