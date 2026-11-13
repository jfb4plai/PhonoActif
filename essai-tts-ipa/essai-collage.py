# -*- coding: utf-8 -*-
"""
Page d'écoute : réglage « à l'oreille » de l'entrée complémentaire « par syllabes » (demande de JF, 2026-11-13) :
espace entre les syllabes (valeur fixe) et allongement de la dernière syllabe. Aucun appel Azure : réutilise les fichiers déjà générés
et normalisés (sortie/bibliotheque/norm et public/packs/p1-100/audio). Produit ecoute-collage.html et sortie/collage/audio/.

  python -I essai-collage.py paquet   # dossier pour-logopede/ + zip à envoyer (page avec introduction et questions, réglages 500 ms et 75 %)
  python -I essai-collage.py          # choisit jusqu'à 10 mots de 2 à 4 syllabes dont toutes les syllabes existent, copie les fichiers, écrit la page
Prérequis : node tools/mode_a_mots.js 100 ; node tools/syllabes_mots.js
"""
import json
import pathlib
import shutil

ICI = pathlib.Path(__file__).resolve().parent
RACINE = ICI.parent
SOURCES = [ICI / "sortie" / "bibliotheque" / "norm", RACINE / "public" / "packs" / "p1-100" / "audio"]
DEST = ICI / "sortie" / "collage" / "audio"


def trouver(nom):
    for d in SOURCES:
        if (d / nom).exists():
            return d / nom
    return None


def main():
    syl = json.loads((RACINE / "data" / "syllabes-mots.json").read_text(encoding="utf-8"))
    mots = {m["mot"]: m for m in json.loads((RACINE / "data" / "mode-a.json").read_text(encoding="utf-8"))["mots"]}
    candidats = [m for m, s in syl.items() if len(s) >= 2 and all(trouver(x["fichier"]) for x in s) and mots[m]["etats"][-1]["fichier"] and trouver(mots[m]["etats"][-1]["fichier"] + ".mp3")]
    # 12 mots de deux syllabes aux structures variées (e muet, nasales, groupes consonantiques, glissantes, finales) : choix de Claude, à discuter ;
    # le pack de 100 mots ne contient AUCUN mot de trois syllabes ou plus (73 d'une syllabe, 27 de deux : constaté).
    VOULUS = ["petit", "maman", "maison", "avec", "jardin", "école", "voiture", "livre", "table", "rivière", "pendant", "forêt"]
    choisis = [m for m in VOULUS if m in candidats]
    deux, trois = choisis, []
    extra = RACINE / "data" / "mots-3-syllabes.json"   # mots de 3 syllabes (node tools/mots_trois_syllabes.js), hors pack de 100 mots
    extra_mots = {}
    if extra.exists():
        for m in json.loads(extra.read_text(encoding="utf-8")):
            if trouver(m["entier"]) and all(trouver(x["fichier"]) for x in m["syllabes"]):
                extra_mots[m["mot"]] = m
                trois.append(m["mot"])
                choisis.append(m["mot"])
            else:
                print("mot de 3 syllabes non retenu faute de fichier :", m["mot"])
    DEST.mkdir(parents=True, exist_ok=True)
    data = []
    for m in choisis:
        if m in extra_mots:
            entier, sy = extra_mots[m]["entier"], extra_mots[m]["syllabes"]
        else:
            entier, sy = mots[m]["etats"][-1]["fichier"] + ".mp3", syl[m]
        for nom in [entier] + [x["fichier"] for x in sy]:
            shutil.copyfile(trouver(nom), DEST / nom)
        data.append({"mot": m, "entier": entier, "syllabes": [{"ipa": x["ipa"], "fichier": x["fichier"]} for x in sy]})
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-collage.html").write_text(PAGE % corps, encoding="utf-8")
    print(f"{len(data)} mots ({len(deux)} de 2 syllabes, {len(trois)} de 3 ou plus) : {' '.join(choisis)}")
    print("candidats non retenus faute d'un fichier :", ", ".join(m for m, s in syl.items() if len(s) >= 2 and m not in candidats) or "aucun")
    print("Page :", ICI / "ecoute-collage.html")


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Écoute par syllabes</title>
<style>body{font-family:Arial,sans-serif;font-size:18px;margin:16px;background:#faf9f7;color:#222}
.reglages{position:sticky;top:0;background:#fff;border:2px solid #0f6e56;border-radius:8px;padding:10px 14px;margin-bottom:14px}
.reglages label{display:block;margin:6px 0}input[type=range]{width:min(420px,70vw);vertical-align:middle}output{font-weight:bold;margin-left:8px}
table{border-collapse:collapse;width:100%%}th,td{border:1px solid #ccc;padding:8px;vertical-align:middle}th{background:#0f6e56;color:#fff;text-align:left}
.m{font-size:22px;font-weight:bold}.s{font-size:15px;color:#555;font-weight:normal}
button{font-size:18px;min-height:46px;padding:6px 16px;border:2px solid #0f6e56;border-radius:8px;background:#fff;cursor:pointer}
button.p{background:#0f6e56;color:#fff}select{font-size:16px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Écoute par syllabes : régler à l'oreille</h1>
<p>Trois boutons par mot : <b>Entier</b> (le mot dit d'un seul tenant), <b>Collé</b> (syllabes bout à bout, comme dans le premier test) et <b>Réglé</b> (avec les deux réglages ci-dessous). Régler les curseurs, puis réécouter. Les curseurs s'appliquent à tous les mots.</p>
<div class="reglages">
<label>Espace entre les syllabes : <input id="gap" type="range" min="0" max="1000" step="50" value="400"><output id="gapV"></output></label>
<label>Vitesse de la dernière syllabe : <input id="vit" type="range" min="50" max="100" step="5" value="80"><output id="vitV"></output></label>
<small>Vitesse 100 %% = comme les autres syllabes ; 60 %% = nettement plus longue. La hauteur de la voix est censée rester la même (à vérifier à l'oreille).</small>
</div>
<div id="t"></div><button class="p" onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, DOSSIER = "sortie/collage/audio/", cle = "ecoute-collage-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var gap = document.getElementById("gap"), vit = document.getElementById("vit");
function maj() { document.getElementById("gapV").textContent = gap.value + " ms"; document.getElementById("vitV").textContent = vit.value + " %%"; sauve("_reglage", gap.value + "|" + vit.value); }
if (ETAT._reglage) { var r = ETAT._reglage.split("|"); gap.value = r[0]; vit.value = r[1]; }
gap.oninput = maj; vit.oninput = maj; maj();
var courant = null, minuterie = null;
function arreter() { if (minuterie) clearTimeout(minuterie); if (courant) { courant.pause(); courant = null; } }
function son(nom, vitesse, fini) {
  var a = new Audio(DOSSIER + encodeURIComponent(nom)); courant = a;
  a.preservesPitch = true; a.webkitPreservesPitch = true; a.playbackRate = vitesse;
  a.onended = fini; a.onerror = function () { alert("Fichier introuvable : " + nom); };
  a.play().catch(function () { alert("Lecture refusée par le navigateur."); });
}
function lire(d, mode) {
  arreter();
  if (mode === "entier") { son(d.entier, 1, null); return; }
  var ecart = mode === "colle" ? 0 : Number(gap.value), v = mode === "colle" ? 1 : Number(vit.value) / 100;
  (function suite(i) {
    if (i >= d.syllabes.length) return;
    var dernier = i === d.syllabes.length - 1;
    son(d.syllabes[i].fichier, dernier ? v : 1, function () { minuterie = setTimeout(function () { suite(i + 1); }, ecart); });
  })(0);
}
var OPT = ["", "trop court", "bien", "trop long", "à refaire"], h = "<table><tr><th>Mot</th><th>Écouter</th><th>Espace</th><th>Dernière syllabe</th></tr>";
DATA.forEach(function (d, i) {
  var k = d.mot;
  function sel(champ) { return "<select onchange=\\"sauve('" + k + "|" + champ + "', this.value)\\">" + OPT.map(function (o) { return "<option" + ((ETAT[k + "|" + champ] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>"; }
  h += "<tr><td class='m'>" + d.mot + "<div class='s'>" + d.syllabes.map(function (s) { return "/" + s.ipa + "/"; }).join(" ") + "</div></td><td>" +
    "<button onclick='lire(DATA[" + i + "],\\"entier\\")'>Entier</button> <button onclick='lire(DATA[" + i + "],\\"colle\\")'>Collé</button> <button class='p' onclick='lire(DATA[" + i + "],\\"regle\\")'>Réglé</button></td><td>" + sel("espace") + "</td><td>" + sel("derniere") + "</td></tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = ["Réglage affiché : espace " + gap.value + " ms, dernière syllabe à " + vit.value + " %%"]; Object.keys(ETAT).forEach(function (k) { if (k !== "_reglage" && ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n"); document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""

INTRO = """<div class="intro"><h2>À l'attention de la personne qui relit</h2>
<p>Cette page teste une <b>entrée complémentaire d'écoute « par syllabes »</b> pour une application de lecture destinée à des élèves à besoins spécifiques (Fédération Wallonie-Bruxelles, début du primaire). L'élève entend d'abord le mot entier, puis, s'il le demande, le mot dit syllabe par syllabe, avec un espace entre les syllabes et la dernière syllabe allongée.</p>
<p><b>Ce qui est évalué ici :</b> l'espace entre les syllabes et l'allongement de la dernière. Les réglages affichés au départ (500 ms, dernière syllabe à 75 pour cent de la vitesse) ont été choisis à l'oreille par l'auteur seul, sans élève.</p>
<p><b>La voix :</b> synthèse vocale belge (Azure, Charline fr-BE), pilotée par une transcription phonétique issue d'une base lexicale (ManuLemme). Chaque syllabe est générée séparément, coupée sur les <b>sons</b> du mot entier (par exemple maman = ma | mɑ̃) puis assemblée dans la page.</p>
<p><b>Limites :</b> dix-sept mots seulement (douze de deux syllabes, cinq de trois) ; voix synthétique ; aucun test avec des élèves ; l'allongement est obtenu par ralentissement de la lecture dans le navigateur, sans garantie sur la qualité du rendu.</p>
<p><b>Questions :</b></p>
<ol><li>Cette découpe en syllabes est-elle celle que vous donneriez (par exemple maison = mɛ | zɔ̃, livre = li | vʁə, mercredi = mɛʁ | kʁə | di) ?</li>
<li>L'espace entre les syllabes est-il adapté à un élève qui apprend à fusionner ? Trop court, trop long, ou trop uniforme ?</li>
<li>L'allongement de la dernière syllabe aide-t-il ou déforme-t-il le mot ?</li>
<li>La voix de synthèse introduit-elle des défauts de prononciation, d'accent ou de rythme gênants ?</li>
<li>Les e muets prononcés dans fenêtre (fə | nɛ | tʁə), mercredi (mɛʁ | kʁə | di) et petit (pə | ti) correspondent-ils à votre prononciation de référence ?</li>
<li>Faut-il d'autres entrées (par exemple lecture de l'attaque et de la rime) ?</li></ol>
<p>Mode d'emploi : régler les curseurs, appuyer sur Entier, Collé ou Réglé, noter dans les listes, puis « Copier le bilan » et le renvoyer.</p></div>"""


def paquet():
    """Dossier prêt à envoyer : pour-logopede/ (page + audio) et pour-logopede.zip. Réglages de départ de JF : 500 ms, 75 pour cent."""
    import zipfile
    main()
    dest = ICI / "pour-logopede"
    if dest.exists():
        shutil.rmtree(dest)
    (dest / "audio").mkdir(parents=True)
    for f in DEST.glob("*.mp3"):
        shutil.copyfile(f, dest / "audio" / f.name)
    page = (ICI / "ecoute-collage.html").read_text(encoding="utf-8")
    for ancien, nouveau in [
        ('DOSSIER = "sortie/collage/audio/"', 'DOSSIER = "audio/"'),
        ('value="400"', 'value="500"'),
        ('max="100" step="5" value="80"', 'max="100" step="5" value="75"'),
        ('"ecoute-collage-v1"', '"ecoute-collage-relecture-v1"'),
        ("<title>Écoute par syllabes</title>", "<title>Écoute par syllabes : relecture</title>"),
        ("<h1>Écoute par syllabes : régler à l'oreille</h1>", "<h1>Écoute par syllabes : relecture</h1>" + INTRO),
        (".reglages{", ".intro{background:#fff;border-left:6px solid #0f6e56;padding:4px 16px;margin-bottom:14px;font-size:17px}.intro h2{margin:8px 0}.reglages{"),
    ]:
        assert ancien in page, ancien
        page = page.replace(ancien, nouveau, 1)
    (dest / "ecoute-syllabes.html").write_text(page, encoding="utf-8")
    with zipfile.ZipFile(ICI / "pour-logopede.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(dest.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(dest).as_posix())
    print("Paquet :", dest, "|", ICI / "pour-logopede.zip")


if __name__ == "__main__":
    import sys
    paquet() if sys.argv[1:] == ["paquet"] else main()
