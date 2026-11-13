# -*- coding: utf-8 -*-
"""
Essai : le mot cible dans une courte phrase, dit « un peu plus fort » (voix fr-BE-CharlineNeural).
Dix mots non imageables, une phrase PROPOSÉE par Claude pour chacun (à réécrire par JF : ses élèves, son vocabulaire).
Le mot cible garde l'IPA de ManuLemme (data/mode-a.json), même dans la phrase, pour que la voix ne le lise pas à sa façon.

  python essai-phrases.py azure   # 40 appels Azure (4 variantes x 10 mots), puis normalisation et page
  python essai-phrases.py norm    # normalise sans appel Azure (ffmpeg local), puis page
  python essai-phrases.py page    # reconstruit ecoute-phrases.html

Variantes : neutre (aucune insistance) / volume (mot plus fort, un peu plus lent) / emphase (balise <emphasis>, support par la voix NON vérifié)
/ complet (phrase avec volume, pause, puis le mot seul à -30 %).
Clé : comme essai-charline.py (variable AZURE_SPEECH_KEY ou cle.txt, lue seulement quand JF lance la commande). Seul du texte de phrases et de l'IPA part vers Azure.
"""
import html
import importlib.util
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
_c = importlib.util.spec_from_file_location("charline", ICI / "essai-charline.py")
C = importlib.util.module_from_spec(_c)
_c.loader.exec_module(C)
_n = importlib.util.spec_from_file_location("normaliser", ICI.parent / "tools" / "normaliser_audio.py")
N = importlib.util.module_from_spec(_n)
_n.loader.exec_module(N)

BASE = ICI / "sortie" / "phrases"
BRUT, NORM = BASE / "brut", BASE / "norm"

# (mot, avant, après) ; « plus » : /plys/ de ManuLemme n'est juste qu'en fin de phrase, d'où la place du mot (voir docs de l'audit)
PHRASES = [
    ("dans", "Le chat dort ", " le panier."),
    ("elle", "Lola est contente, ", " chante."),
    ("qui", "Le garçon ", " rit est mon frère."),
    ("pour", "Ce gâteau est ", " mamie."),
    ("avec", "Je joue ", " mon chien."),
    ("que", "Je pense ", " la lune brille."),
    ("plus", "Je veux du pain, et du lait en ", "."),
    ("tout", "Il mange ", " son pain."),
    ("quand", "Viens ", " tu veux."),
    ("chez", "Léo dort ", " sa tante."),
]
VARIANTES = ["neutre", "volume", "emphase", "complet"]


def ipa_de(mot):
    d = json.loads((ICI.parent / "data" / "mode-a.json").read_text(encoding="utf-8"))
    return next(m for m in d["mots"] if m["mot"] == mot)["etats"][-1]["ipa"]


def ssml_phrase(mot, avant, apres, ipa, variante):
    cible = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    if variante == "volume" or variante == "complet":
        cible = f'<prosody volume="loud" rate="-10%">{cible}</prosody>'
    elif variante == "emphase":
        cible = f'<emphasis level="strong">{cible}</emphasis>'
    corps = f"{html.escape(avant)}{cible}{html.escape(apres)}"
    if variante == "complet":
        corps += f'<break time="800ms"/><prosody rate="-30%"><phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme></prosody>'
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{C.VOIX}"><prosody rate="-10%">{corps}</prosody></voice></speak>')


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
                f.write_bytes(C.E.azure_appel(cle, region, ssml_phrase(mot, avant, apres, ipa, v)))
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
<title>Le mot dans une phrase</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}
audio{width:170px;height:32px}select{font-size:15px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Le mot cible dans une phrase</h1>
<p>Écouter les quatre versions de chaque phrase. Le mot cible doit se détacher sans être déformé. Noter : <b>bon</b>, <b>mot pas assez marqué</b>, <b>mot trop marqué ou déformé</b>, <b>mal lu</b> (autre prononciation), <b>coupé ou bruit</b>. Les phrases sont des propositions à réécrire.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "ecoute-phrases-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var V = ["neutre", "volume", "emphase", "complet"], OPT = ["", "bon", "mot pas assez marqué", "mot trop marqué ou déformé", "mal lu", "coupé ou bruit"];
var h = "<table><tr><th>Mot et phrase</th><th>1. neutre</th><th>2. mot plus fort</th><th>3. balise emphase</th><th>4. phrase + mot seul</th></tr>";
DATA.forEach(function (d) {
  h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "<br>/" + d.ipa + "/</div></td>" + V.map(function (v) {
    var k = d.mot + "|" + v;
    return "<td><audio controls preload='none' src='sortie/phrases/norm/" + encodeURIComponent(d.mot + "_" + v) + ".mp3'></audio><br><select onchange=\\"sauve('" + k + "', this.value)\\">" +
      OPT.map(function (o) { return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td>"; }).join("") + "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}", "ipa": ipa_de(m)} for m, a, p in PHRASES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-phrases.html").write_text(PAGE % corps, encoding="utf-8")
    print("Page :", ICI / "ecoute-phrases.html")


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
