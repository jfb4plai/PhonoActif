# -*- coding: utf-8 -*-
"""
Essai 2 : le mot cible mis en relief dans une phrase LUE À 75 % (voix fr-BE-CharlineNeural).
Mêmes 10 phrases et même IPA que essai-phrases.py (importés de ce fichier). Trois versions par mot :
  neutre  : phrase à 75 %, aucune insistance (= ce que produit tools/phrases_ssml.py aujourd'hui)
  pauses  : courte pause avant et après le mot cible
  pauses_volume : pauses + mot cible un peu plus fort (VOLUME)
Sortie dans sortie/phrases75/ (les résultats de l'essai 1 ne sont pas touchés). 30 appels Azure.

  python essai-phrases-75.py azure   # appels Azure, normalisation, page
  python essai-phrases-75.py norm    # normalise sans Azure (ffmpeg local), puis page
  python essai-phrases-75.py page    # reconstruit ecoute-phrases-75.html
Clé : comme essai-charline.py, lue seulement quand JF lance « azure ». Seul du texte de phrase et de l'IPA part vers Azure.
"""
import html
import importlib.util
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
_e = importlib.util.spec_from_file_location("essai_phrases", ICI / "essai-phrases.py")
E1 = importlib.util.module_from_spec(_e)
_e.loader.exec_module(E1)
C, N, PHRASES, ipa_de = E1.C, E1.N, E1.PHRASES, E1.ipa_de

DEBIT = "0.75"          # multiplicateur Azure, comme tools/phrases_ssml.py
PAUSE_MS = 250          # pause avant et après le mot (variantes pauses)
VOLUME = "+10%"         # NON vérifié : forme relative acceptée par Azure ? l'écoute dira si le mot est plus fort
VARIANTES = ["neutre", "pauses", "pauses_volume"]
BASE = ICI / "sortie" / "phrases75"
BRUT, NORM = BASE / "brut", BASE / "norm"


def ssml(mot, avant, apres, ipa, variante):
    cible = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    if variante == "pauses_volume":
        cible = f'<prosody volume="{VOLUME}">{cible}</prosody>'
    pause = f'<break time="{PAUSE_MS}ms"/>'
    if variante == "neutre":
        corps = f"{html.escape(avant)}{cible}{html.escape(apres)}"
    else:
        # pas de pause après le mot s'il termine la phrase (le point suffit)
        fin = pause if apres.strip() not in (".", "") else ""
        corps = f"{html.escape(avant)}{pause}{cible}{fin}{html.escape(apres)}"
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


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Le mot dans une phrase, à 75 %%</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}
audio{width:200px;height:32px}select{font-size:15px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Le mot cible dans une phrase, lue à 75 %%</h1>
<p>Écouter les trois versions de chaque phrase (toutes à 75 %%). Le mot cible doit se détacher sans être déformé ni crié. Noter : <b>bon</b>, <b>mot pas assez marqué</b>, <b>mot trop marqué ou déformé</b>, <b>mal lu</b> (autre prononciation), <b>coupé ou bruit</b>, <b>trop lent</b>. Les phrases sont des propositions à réécrire. Versions : 1 neutre, 2 pause de %(pause)s ms avant et après le mot, 3 pauses + mot à %(vol)s de volume.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %(data)s, cle = "ecoute-phrases-75-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var V = ["neutre", "pauses", "pauses_volume"], OPT = ["", "bon", "mot pas assez marqué", "mot trop marqué ou déformé", "mal lu", "coupé ou bruit", "trop lent"];
var h = "<table><tr><th>Mot et phrase</th><th>1. neutre</th><th>2. pauses</th><th>3. pauses + volume</th></tr>";
DATA.forEach(function (d) {
  h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "<br>/" + d.ipa + "/</div></td>" + V.map(function (v) {
    var k = d.mot + "|" + v;
    return "<td><audio controls preload='none' src='sortie/phrases75/norm/" + encodeURIComponent(d.mot + "_" + v) + ".mp3'></audio><br><select onchange=\\"sauve('" + k + "', this.value)\\">" +
      OPT.map(function (o) { return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td>"; }).join("") + "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}", "ipa": ipa_de(m)} for m, a, p in PHRASES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-phrases-75.html").write_text(PAGE % {"data": corps, "pause": PAUSE_MS, "vol": VOLUME}, encoding="utf-8")
    print("Page :", ICI / "ecoute-phrases-75.html")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer(); normaliser(); page()
    elif cmd == "norm":
        normaliser(); page()
    elif cmd == "page":
        page()
    else:
        sys.exit(__doc__)
