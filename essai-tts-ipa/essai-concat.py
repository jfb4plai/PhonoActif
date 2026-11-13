# -*- coding: utf-8 -*-
"""
Test : un mot entier lu d'un seul tenant par Charline, ou reconstitué en collant ses syllabes générées séparément ?
Pour chaque mot : (1) entier, (2) syllabes collées bout à bout, (3) syllabes avec fondu de 20 ms.
Chaque syllabe est rognée (silence) et ramenée au même pic avant d'être assemblée (tools/normaliser_audio.py).

  python essai-concat.py azure    # un appel Azure par syllabe et par mot entier, puis assemblage ffmpeg et page
  python essai-concat.py concat   # réassemble avec les fichiers déjà générés (sans Azure)
Clé : comme essai-charline.py (variable AZURE_SPEECH_KEY ou première ligne de cle.txt, lue seulement quand JF lance la commande).
"""
import importlib.util
import json
import pathlib
import subprocess
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
T = "̃"
_c = importlib.util.spec_from_file_location("charline", ICI / "essai-charline.py")
C = importlib.util.module_from_spec(_c)
_c.loader.exec_module(C)
_n = importlib.util.spec_from_file_location("normaliser", ICI.parent / "tools" / "normaliser_audio.py")
N = importlib.util.module_from_spec(_n)
_n.loader.exec_module(N)

# mot, IPA entier, syllabes IPA (coupées sur les SONS de la lecture du mot entier, pas sur les lettres)
MOTS = [
    ("maison", "mɛzɔ" + T, ["mɛ", "zɔ" + T]),
    ("chocolat", "ʃɔkɔla", ["ʃɔ", "kɔ", "la"]),
    ("matin", "matɛ" + T, ["ma", "tɛ" + T]),
    ("chapeau", "ʃapo", ["ʃa", "po"]),
    ("secret", "səkʁɛ", ["sə", "kʁɛ"]),
    ("lupa", "lypa", ["ly", "pa"]),
]
VITESSE = -30
BASE = ICI / "sortie" / ("azure__" + C.VOIX + "__concat")
BRUT, NORM, OUT = BASE / "brut", BASE / "norm", BASE / "assemble"


def generer():
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    pieces = {}
    for mot, entier, syl in MOTS:
        pieces[f"{mot}-entier"] = entier
        for k, s in enumerate(syl, 1):
            pieces[f"{mot}-s{k}"] = s
    for nom, ipa in pieces.items():
        try:
            data = C.E.azure_appel(cle, region, C.ssml(ipa, nom, VITESSE))
            (BRUT / (nom + ".mp3")).write_bytes(data)
            print("ok ", nom, "/" + ipa + "/", flush=True)
        except Exception as e:
            print("ERR", nom, str(e)[:150], flush=True)
        time.sleep(0.15)


def ffmpeg(args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:200])


def assembler(fichiers, sortie, fondu_s):
    """fondu_s = 0 : bout à bout ; sinon fondu enchaîné de cette durée entre syllabes."""
    entrees = []
    for f in fichiers:
        entrees += ["-i", str(f)]
    if len(fichiers) == 1:
        ffmpeg(entrees + ["-codec:a", "libmp3lame", "-b:a", "96k", str(sortie)])
        return
    if fondu_s == 0:
        filtre = "".join(f"[{i}]" for i in range(len(fichiers))) + f"concat=n={len(fichiers)}:v=0:a=1[o]"
    else:
        filtre, prec = "", "[0]"
        for i in range(1, len(fichiers)):
            suiv = "[o]" if i == len(fichiers) - 1 else f"[a{i}]"
            filtre += f"{prec}[{i}]acrossfade=d={fondu_s}:c1=tri:c2=tri{suiv};"
            prec = suiv
        filtre = filtre.rstrip(";")
    ffmpeg(entrees + ["-filter_complex", filtre, "-map", "[o]", "-codec:a", "libmp3lame", "-b:a", "96k", str(sortie)])


def concat():
    NORM.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for f in sorted(BRUT.glob("*.mp3")):
        N.normaliser(f, NORM / f.name)
    for mot, _entier, syl in MOTS:
        parts = [NORM / f"{mot}-s{k}.mp3" for k in range(1, len(syl) + 1)]
        if not all(p.exists() for p in parts) or not (NORM / f"{mot}-entier.mp3").exists():
            print("manque des fichiers pour", mot)
            continue
        assembler(parts, OUT / f"{mot}-colle.mp3", 0)
        assembler(parts, OUT / f"{mot}-fondu.mp3", 0.02)
        print("assemblé", mot, flush=True)


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entier ou syllabes collées</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:middle}th{background:#0f6e56;color:#fff;text-align:left}audio{width:190px;height:34px}
select{font-size:16px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Mot entier ou syllabes collées ?</h1>
<p>Pour chaque mot, comparer. Noter les versions collée et fondue : <b>aussi bien que l'entier</b>, <b>acceptable</b>, <b>on entend la coupure</b>, <b>faux</b>.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "essai-concat-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
function sel(k) { return "<select onchange=\\"sauve('" + k + "', this.value)\\">" + ["", "aussi bien que l'entier", "acceptable", "on entend la coupure", "faux"].map(function (o) { return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>"; }
function au(d, f) { return "<audio controls preload='none' src='sortie/%s/" + d + "/" + encodeURIComponent(f) + ".mp3'></audio>"; }
var h = "<table><tr><th>Mot</th><th>Syllabes</th><th>Entier</th><th>Collé</th><th>Fondu 20 ms</th></tr>";
DATA.forEach(function (m) {
  h += "<tr><td><b>" + m.mot + "</b><br>/" + m.entier + "/</td><td>" + m.syl.join(" | ") + "</td><td>" + au("norm", m.mot + "-entier") + "</td><td>" + au("assemble", m.mot + "-colle") + "<br>" + sel(m.mot + "|colle") + "</td><td>" + au("assemble", m.mot + "-fondu") + "<br>" + sel(m.mot + "|fondu") + "</td></tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    data = [{"mot": m, "entier": e, "syl": s} for m, e, s in MOTS]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-concat.html").write_text(PAGE % (corps, BASE.name), encoding="utf-8")
    print("Page :", ICI / "ecoute-concat.html")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer()
        concat()
        page()
    elif cmd == "concat":
        concat()
        page()
    else:
        sys.exit(__doc__)
