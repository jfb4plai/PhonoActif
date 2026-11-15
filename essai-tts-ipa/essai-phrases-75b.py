# -*- coding: utf-8 -*-
"""
Essai 3 : mot cible à +30 % de volume, phrases lues à 75 % (voix fr-BE-CharlineNeural). Mêmes 10 phrases et même IPA que essai-phrases.py.
Versions (30 appels Azure, 3 par mot) :
  phrase_seule30 : la phrase, mot cible à +30 %
  B              : « mot. » puis la phrase, mot cible à +30 % dans la phrase
  C              : « mot, comme dans : » puis la phrase, mot cible à +30 % dans la phrase
Dans B et C, le mot annoncé au début est dit sans surcroît de volume. Pas de balise de pause (le point et les deux-points font la coupure).
La colonne « neutre » de la page réutilise sortie/phrases75/norm/<mot>_neutre.mp3 (essai 2, aucun appel de plus).
Sortie dans sortie/phrases75b/ ; essais 1 et 2 non touchés.

  python essai-phrases-75b.py azure   # appels Azure, normalisation, page
  python essai-phrases-75b.py norm    # normalise sans Azure, puis page
  python essai-phrases-75b.py page    # reconstruit ecoute-phrases-75b.html
Clé : comme essai-charline.py, lue seulement quand JF lance « azure ». Seul du texte de phrase et de l'IPA part vers Azure.
"""
import html
import importlib.util
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
_e = importlib.util.spec_from_file_location("essai_phrases_75", ICI / "essai-phrases-75.py")
E2 = importlib.util.module_from_spec(_e)
_e.loader.exec_module(E2)
C, N, PHRASES, ipa_de, DEBIT = E2.C, E2.N, E2.PHRASES, E2.ipa_de, E2.DEBIT

VOLUME = "+30%"
VARIANTES = ["phrase_seule30", "B", "C"]
BASE = ICI / "sortie" / "phrases75b"
BRUT, NORM = BASE / "brut", BASE / "norm"


def ssml(mot, avant, apres, ipa, variante):
    ph = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    dans_phrase = f'{html.escape(avant)}<prosody volume="{VOLUME}">{ph}</prosody>{html.escape(apres)}'
    if variante == "phrase_seule30":
        corps = dans_phrase
    elif variante == "B":
        corps = f"{ph}. {dans_phrase}"
    else:
        corps = f"{ph}, comme dans : {dans_phrase}"
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
<title>Le mot dans une phrase, à 75 %%, mot à +30 %%</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}
audio{width:190px;height:32px}select{font-size:15px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Le mot cible dans une phrase : volume +30 %% et annonce du mot</h1>
<p>Toutes les versions sont lues à 75 %%. Le mot cible doit se détacher sans être déformé ni crié. Noter : <b>bon</b>, <b>mot pas assez marqué</b>, <b>mot trop marqué ou déformé</b>, <b>mal lu</b> (autre prononciation), <b>coupé ou bruit</b>, <b>trop long</b>, <b>annonce inutile</b>.</p>
<p>0. neutre (essai 2, rien de plus fort) &nbsp;|&nbsp; 1. phrase seule, mot à +30 %% &nbsp;|&nbsp; 2. B : « mot. » puis la phrase, mot à +30 %% &nbsp;|&nbsp; 3. C : « mot, comme dans : » puis la phrase, mot à +30 %%.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %(data)s, cle = "ecoute-phrases-75b-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var V = [["neutre", "sortie/phrases75/norm/", "0. neutre"], ["phrase_seule30", "sortie/phrases75b/norm/", "1. phrase seule +30 %%"], ["B", "sortie/phrases75b/norm/", "2. B"], ["C", "sortie/phrases75b/norm/", "3. C"]];
var OPT = ["", "bon", "mot pas assez marqué", "mot trop marqué ou déformé", "mal lu", "coupé ou bruit", "trop long", "annonce inutile"];
var h = "<table><tr><th>Mot et phrase</th>" + V.map(function (v) { return "<th>" + v[2] + "</th>"; }).join("") + "</tr>";
DATA.forEach(function (d) {
  h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "<br>/" + d.ipa + "/</div></td>" + V.map(function (v) {
    var k = d.mot + "|" + v[0];
    return "<td><audio controls preload='none' src='" + v[1] + encodeURIComponent(d.mot + "_" + v[0]) + ".mp3'></audio><br><select onchange=\\"sauve('" + k + "', this.value)\\">" +
      OPT.map(function (o) { return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td>"; }).join("") + "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}", "ipa": ipa_de(m)} for m, a, p in PHRASES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-phrases-75b.html").write_text(PAGE % {"data": corps}, encoding="utf-8")
    print("Page :", ICI / "ecoute-phrases-75b.html")


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
