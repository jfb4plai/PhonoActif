# -*- coding: utf-8 -*-
"""
Génère avec Charline (fr-BE-CharlineNeural, IPA) les états « lettre par lettre » listés dans etats.json
(produit par : node tools/etats_charline.js maison chien pomme), puis écrit ecoute-etats.html.

  python essai-etats.py azure              # un appel Azure par état, puis normalisation (volume, silences) et page
  python essai-etats.py azure ID [ID...]   # seulement ces états (ex. pomme-3-pom), puis normalisation de tout et page
  python essai-etats.py norm               # normalise sans appel Azure (ffmpeg local), puis page
  python essai-etats.py page               # reconstruit ecoute-etats.html sans appel

Clé : variable AZURE_SPEECH_KEY (région AZURE_SPEECH_REGION, défaut northeurope) ou, à défaut, première ligne de
C:\\Users\\jfbeg\\.azure-speech\\cle.txt (lue seulement quand JF lance la commande). Seules des chaînes IPA partent vers Azure.
"""
import html
import importlib.util
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("charline", ICI / "essai-charline.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

SORTIE = ICI / "sortie" / ("azure__" + C.VOIX + "__etats")
SORTIE_NORM = ICI / "sortie" / ("azure__" + C.VOIX + "__etats_norm")
_n = importlib.util.spec_from_file_location("normaliser", ICI.parent / "tools" / "normaliser_audio.py")
N = importlib.util.module_from_spec(_n)
_n.loader.exec_module(N)
ETATS = json.loads((ICI / "etats.json").read_text(encoding="utf-8"))


def normaliser_tout():
    for f in sorted(SORTIE.glob("*.mp3")):
        p0, gain, p1 = N.normaliser(f, SORTIE_NORM / f.name)
        print(f"norm {f.name:26} pic {p0:6.1f} -> {p1:6.1f} dB (gain {gain:+.1f})", flush=True)


def generer(ids=None):
    cle, region = C.cle_region()
    SORTIE.mkdir(parents=True, exist_ok=True)
    n_err = 0
    inconnus = set(ids or []) - {e["id"] for e in ETATS}
    if inconnus:
        sys.exit("États inconnus : " + ", ".join(sorted(inconnus)))
    for e in ETATS:
        if ids and e["id"] not in ids:
            continue
        try:
            data = C.E.azure_appel(cle, region, C.ssml(e["ipa"], e["lettres"], e["vitesse"]))
            (SORTIE / (e["id"] + ".mp3")).write_bytes(data)
            print("ok ", e["id"], "/" + e["ipa"] + "/", e["vitesse"], round(C.duree_s(data), 2), "s", flush=True)
        except Exception as ex:
            n_err += 1
            print("ERR", e["id"], str(ex)[:150], flush=True)
        time.sleep(0.15)
    print(f"\n{len(ETATS) - n_err} réussis, {n_err} erreurs.")


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>États lettre par lettre (Charline)</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}
h2{color:#0f6e56;margin-top:28px}table{border-collapse:collapse;width:100%%}th,td{border:1px solid #ccc;padding:6px;vertical-align:middle}
th{background:#0f6e56;color:#fff;text-align:left}.l{font-size:24px;font-weight:bold}audio{width:200px;height:34px}
select{font-size:16px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>États lettre par lettre : écoute</h1>
<p>Pour chaque lettre posée, écouter ce que l'app dirait. Noter : <b>bon</b>, <b>faux</b> (autre son attendu), <b>voyelle ajoutée</b>, <b>coupé ou bruit</b>.
La colonne « lecture » montre comment les règles ont découpé et lu (le point d'interrogation = choix signalé à l'enseignant).</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "essai-etats-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var h = "", mot = "";
DATA.forEach(function (e) {
  if (e.mot !== mot) { if (mot) h += "</table>"; mot = e.mot; h += "<h2>" + e.mot + "</h2><table><tr><th>Posé</th><th>Écouter (normalisé)</th><th>Original</th><th>IPA</th><th>Vitesse</th><th>Lecture</th><th>Note</th></tr>"; }
  h += "<tr><td class='l'>" + e.lettres + "</td><td><audio controls preload='none' src='sortie/%s/" + encodeURIComponent(e.id) + ".mp3'></audio></td><td><audio controls preload='none' src='sortie/%s/" + encodeURIComponent(e.id) + ".mp3'></audio></td><td>/" + e.ipa + "/</td><td>" + e.vitesse + " %%</td><td>" + e.lecture + "</td><td><select onchange=\\"sauve('" + e.id + "', this.value)\\">" +
    ["", "bon", "faux", "voyelle ajoutée", "coupé ou bruit"].map(function (o) { return "<option" + ((ETAT[e.id] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td></tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    corps = json.dumps(ETATS, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-etats.html").write_text(PAGE % (corps, SORTIE_NORM.name, SORTIE.name), encoding="utf-8")
    print("Page :", ICI / "ecoute-etats.html")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer(sys.argv[2:] or None)
        normaliser_tout()
        page()
    elif cmd == "norm":
        normaliser_tout()
        page()
    elif cmd == "page":
        page()
    else:
        sys.exit(__doc__)
