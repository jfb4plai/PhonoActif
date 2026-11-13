# -*- coding: utf-8 -*-
"""
Comparaison Charline / Lingua Libre sur 30 mots (liste : comparaison-mots.json, produite par tools/mots_charline.js ;
fichiers Lingua Libre : data/lingualibre/echantillon-licences.json, produit par tools/licences_lingualibre.py).

  python essai-comparaison.py telecharger   # 89 fichiers wav de Commons (7 Mo), 1 s d'écart, dossier à part ; reprenable
  python essai-comparaison.py azure         # Charline, 30 appels (clé : AZURE_SPEECH_KEY ou cle.txt, lue seulement quand JF lance la commande)
  python essai-comparaison.py norm          # rognage + pic à -3 dB de tous les fichiers (ffmpeg local), mêmes réglages pour les deux sources
  python essai-comparaison.py page          # ecoute-comparaison.html
  python essai-comparaison.py paquet        # pour-logopede-comparaison/ + zip (écoute à l'aveugle, LICENCES.csv) ; clé : cle-comparaison-aveugle.json (ne pas envoyer)
  python essai-comparaison.py decoder f.txt # remplace les numéros de voix par la source dans un bilan renvoyé

Sortie : sortie/comparaison/{ll,charline_brut,norm}/ . Les fichiers Lingua Libre gardent leur licence propre (voir la page) ; ils ne sont pas redistribués.
"""
import importlib.util
import json
import pathlib
import shutil
import sys
import time
import urllib.request

ICI = pathlib.Path(__file__).resolve().parent
RACINE = ICI.parent
BASE = ICI / "sortie" / "comparaison"
LL, BRUT, NORM = BASE / "ll", BASE / "charline_brut", BASE / "norm"
UA = {"User-Agent": "phonoactif-comparaison/0.1 (essai d'ecoute, usage non commercial)"}


def charger(nom, chemin):
    s = importlib.util.spec_from_file_location(nom, chemin)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def mots():
    return json.loads((ICI / "comparaison-mots.json").read_text(encoding="utf-8"))


def fichiers_ll():
    return json.loads((RACINE / "data" / "lingualibre" / "echantillon-licences.json").read_text(encoding="utf-8"))


def nom_ll(x):
    return f"{x['locuteur']}_{x['mot']}"


def telecharger():
    LL.mkdir(parents=True, exist_ok=True)
    n = 0
    for x in fichiers_ll():
        if x.get("absent"):
            continue
        f = LL / (nom_ll(x) + ".wav")
        if f.exists() and f.stat().st_size == x["octets"]:
            continue
        url = x["url"].split("?")[0]
        for essai in range(5):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                    f.write_bytes(r.read())
                break
            except Exception as e:
                # HTTP 429 : Wikimedia indique le délai dans l'en-tête Retry-After (600 s constaté le 2026-11-12)
                pause = 30 * (essai + 1)
                if getattr(e, "code", None) == 429:
                    pause = int(e.headers.get("retry-after", 600)) + 10
                print("erreur", nom_ll(x), str(e)[:60], "pause", pause, flush=True)
                time.sleep(pause)
        n += 1
        time.sleep(5.0)
    print(n, "fichiers téléchargés dans", LL)


def azure():
    C = charger("charline", ICI / "essai-charline.py")
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    n = err = 0
    for m in mots():
        f = BRUT / (m["mot"] + ".mp3")
        if f.exists():
            continue
        try:
            f.write_bytes(C.E.azure_appel(cle, region, C.ssml(m["ipa"], m["mot"], m["vitesse"])))
            n += 1
        except Exception as e:
            err += 1
            print("ERR", m["mot"], str(e)[:140], flush=True)
        time.sleep(0.15)
    print(n, "fichiers générés,", err, "erreur(s).")


def norm():
    N = charger("normaliser", RACINE / "tools" / "normaliser_audio.py")
    NORM.mkdir(parents=True, exist_ok=True)
    sources = [(f, NORM / ("charline_" + f.stem + ".mp3")) for f in sorted(BRUT.glob("*.mp3"))]
    sources += [(f, NORM / ("ll_" + f.stem + ".mp3")) for f in sorted(LL.glob("*.wav"))]
    plafonnes = []
    for src, dst in sources:
        if not dst.exists():
            _, gain, _ = N.normaliser(src, dst)
            if gain >= N.GAIN_MAX_DB:
                plafonnes.append(dst.stem)
    print(len(sources), "fichiers normalisés ; gain plafonné (bruit ?) :", plafonnes or "aucun")


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Charline contre Lingua Libre</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.l{color:#555;font-size:14px}
audio{width:170px;height:32px}select{font-size:15px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Charline contre Lingua Libre : %d mots</h1>
<p>Pour chaque mot, écouter les quatre voix puis noter : <b>bon</b> (je le donnerais à un élève), <b>passable</b>, <b>faux</b> (autre son ou mot mal dit), <b>bruit</b> (qualité technique). Les trois colonnes Lingua Libre sont des voix de locuteurs différents ; l'ordre est fixe (l'accent n'est pas indiqué sur Commons). Même rognage et même volume pour toutes les sources.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "ecoute-comparaison-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var SRC = ["charline", "LoquaxFR", "Sartus85", "Poslovitch"], OPT = ["", "bon", "passable", "faux", "bruit"];
function cell(m, s) {
  var f = s === "charline" ? "charline_" + m.mot : "ll_" + s + "_" + m.mot; var k = m.mot + "|" + s;
  if (s !== "charline" && !m.ll[s]) return "<td class='l'>absent</td>";
  return "<td><audio controls preload='none' src='sortie/comparaison/norm/" + encodeURIComponent(f) + ".mp3'></audio><br><select onchange=\\"sauve('" + k + "', this.value)\\">" +
    OPT.map(function (o) { return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>" + (s === "charline" ? "" : "<div class='l'>" + m.ll[s] + "</div>") + "</td>";
}
var h = "<table><tr><th>Mot</th><th>Charline (IPA)</th><th>LoquaxFR</th><th>Sartus85</th><th>Poslovitch</th></tr>";
DATA.forEach(function (m) {
  h += "<tr><td class='m'>" + m.mot + "<div class='l'>/" + m.ipa + "/" + (m.aVerifier ? " (IPA écrit à la main)" : "") + "</div></td>" + SRC.map(function (s) { return cell(m, s); }).join("") + "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page():
    par = {(x["mot"], x["locuteur"]): x for x in fichiers_ll() if not x.get("absent")}
    data = []
    for m in mots():
        ll = {}
        for loc in ("LoquaxFR", "Sartus85", "Poslovitch"):
            x = par.get((m["mot"], loc))
            if x:
                ll[loc] = f"{x['licence']}"
        data.append({"mot": m["mot"], "ipa": m["ipa"], "aVerifier": m["aVerifier"], "ll": ll})
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-comparaison.html").write_text(PAGE % (len(data), corps), encoding="utf-8")
    print("Page :", ICI / "ecoute-comparaison.html")


# ---- Paquet pour relecture professionnelle : écoute à l'aveugle (voix numérotées, ordre mélangé par mot, clé gardée hors du paquet) ----
PAQUET = ICI / "pour-logopede-comparaison"
CLE = ICI / "cle-comparaison-aveugle.json"   # NE PAS ENVOYER : correspondance voix numérotée -> source, pour JF seul
INTRO = """<div class="intro"><h2>À l'attention de la personne qui relit</h2>
<p>Cette page compare, pour <b>30 mots</b> courants du début du primaire, <b>quatre voix</b> : une voix de synthèse belge (Azure, Charline fr-BE, pilotée par une transcription phonétique) et trois enregistrements humains de mots isolés (projet collaboratif Lingua Libre, Wikimedia Commons). Les voix sont <b>numérotées et mélangées</b> à chaque mot : vous ne savez pas laquelle est laquelle.</p>
<p><b>Contexte :</b> une application de lecture pour élèves à besoins spécifiques (Fédération Wallonie-Bruxelles) doit faire entendre des mots isolés et des syllabes. On cherche à savoir si la voix de synthèse suffit, ou si des enregistrements humains sont préférables, notamment pour la prononciation belge.</p>
<p><b>À noter pour chaque voix :</b> <i>bon</i> (je le donnerais à un élève), <i>passable</i>, <i>faux</i> (autre son ou mot mal dit), <i>bruit</i> (défaut technique). Tous les fichiers ont été rognés des silences et ramenés au même volume.</p>
<p><b>Limites :</b> les locuteurs humains ne sont pas identifiés par leur origine ; la transcription affichée (ManuLemme) est celle donnée à la voix de synthèse, pas aux locuteurs humains ; quatre transcriptions (ville, soleil, nuit, crayon) ont été écrites à la main ; l'auteur est seul à avoir choisi ces mots, sans élève.</p>
<p><b>Questions :</b></p>
<ol><li>La voix de synthèse est-elle acceptable pour des mots isolés ? Pour lesquels pose-t-elle problème ?</li>
<li>Les enregistrements humains sont-ils plus adaptés à des élèves dyslexiques (clarté, rythme, accent) ?</li>
<li>Quels défauts retenir comme rédhibitoires (accent non belge, e muet, voyelles ouvertes ou fermées, finales) ?</li>
<li>Faut-il, pour certains mots, imposer une voix humaine ?</li></ol>
<p>Mode d'emploi : écouter les voix de chaque ligne, noter dans les listes, puis « Copier le bilan » et le renvoyer. Les licences des enregistrements sont dans le fichier LICENCES.csv.</p></div>"""

PAGE2 = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comparaison de voix : relecture</title>
<style>body{font-family:Arial,sans-serif;font-size:17px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.l{color:#555;font-size:14px;font-weight:normal}
audio{width:165px;height:32px}select{font-size:15px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}
.intro{background:#fff;border-left:6px solid #0f6e56;padding:4px 16px;margin-bottom:14px;font-size:16px}.intro h2{margin:8px 0}</style></head><body>
<h1>Comparaison de voix : relecture</h1>""" + INTRO + """
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "ecoute-comparaison-relecture-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var OPT = ["", "bon", "passable", "faux", "bruit"];
var h = "<table><tr><th>Mot</th><th>Voix 1</th><th>Voix 2</th><th>Voix 3</th><th>Voix 4</th></tr>";
DATA.forEach(function (d) {
  h += "<tr><td class='m'>" + d.mot + "<div class='l'>transcription de référence : /" + d.ipa + "/" + (d.main ? " (écrite à la main)" : "") + "</div></td>";
  for (var k = 1; k <= 4; k++) {
    var f = d.voix[k - 1];
    if (!f) { h += "<td class='l'>absent</td>"; continue; }
    var id = d.mot + "|" + k;
    h += "<td><audio controls preload='none' src='audio/" + encodeURIComponent(f) + "'></audio><br><select onchange=\\"sauve('" + id + "', this.value)\\">" +
      OPT.map(function (o) { return "<option" + ((ETAT[id] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td>";
  }
  h += "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def paquet():
    import csv
    import random
    import zipfile
    if PAQUET.exists():
        shutil.rmtree(PAQUET)
    (PAQUET / "audio").mkdir(parents=True)
    par = {(x["mot"], x["locuteur"]): x for x in fichiers_ll() if not x.get("absent")}
    cle, data = {}, []
    for m in mots():
        sources = ["charline"] + [loc for loc in ("LoquaxFR", "Sartus85", "Poslovitch") if (m["mot"], loc) in par]
        ordre = sources[:]
        random.Random("phonoactif-" + m["mot"]).shuffle(ordre)
        voix = []
        for k, src in enumerate(ordre, 1):
            nom = f"{m['mot']}_{k}.mp3"
            origine = NORM / (("charline_" + m["mot"]) if src == "charline" else ("ll_" + src + "_" + m["mot"]))
            shutil.copyfile(origine.with_suffix(".mp3"), PAQUET / "audio" / nom)
            voix.append(nom)
            cle[f"{m['mot']}|{k}"] = src
        data.append({"mot": m["mot"], "ipa": m["ipa"], "main": m["aVerifier"], "voix": voix})
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (PAQUET / "ecoute-comparaison.html").write_text(PAGE2 % corps, encoding="utf-8")
    with (PAQUET / "LICENCES.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["mot", "locuteur (Lingua Libre)", "licence", "page source (Wikimedia Commons)", "note"])
        for (mot, loc), x in sorted(par.items()):
            w.writerow([mot, loc, x["licence"], x["url"].split("?")[0], "extrait de Lingua Libre ; rogné des silences et volume ramené à un pic commun (modifié)"])
        w.writerow([])
        w.writerow(["voix de synthèse", "Microsoft Azure, fr-BE-CharlineNeural", "usage d'évaluation interne, non redistribuable en l'état", "", "transcription phonétique ManuLemme"])
    CLE.write_text(json.dumps(cle, ensure_ascii=False, indent=1), encoding="utf-8")
    with zipfile.ZipFile(ICI / "pour-logopede-comparaison.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(PAQUET.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(PAQUET).as_posix())
    print("Paquet :", PAQUET, "| zip :", ICI / "pour-logopede-comparaison.zip", "| clé (ne pas envoyer) :", CLE)


def decoder():
    """python essai-comparaison.py decoder bilan.txt : remplace « mot|k » par « mot|source » dans le bilan renvoyé."""
    cle = json.loads(CLE.read_text(encoding="utf-8"))
    for ligne in pathlib.Path(sys.argv[2]).read_text(encoding="utf-8").splitlines():
        k, _, note = ligne.partition(" : ")
        print(f"{cle.get(k, k)} : {note}" if note else ligne)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    {"telecharger": telecharger, "azure": azure, "norm": norm, "page": page, "paquet": paquet, "decoder": decoder}.get(cmd, lambda: print(__doc__))()
