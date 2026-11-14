# -*- coding: utf-8 -*-
"""
Génère la bibliothèque audio (syllabes et sons isolés) avec Charline à partir de data/syllabes.json
(produit par : node tools/liste_syllabes.js). Reprenable : un fichier déjà généré n'est pas redemandé.

  python generer-bibliotheque.py liste --palier 1     # compte et montre, aucun appel réseau
  python generer-bibliotheque.py azure --palier 1     # génère les paliers 0 à 1 (526 fichiers), puis normalise
  python generer-bibliotheque.py azure --palier 4 --max 200   # au plus 200 nouveaux fichiers dans cet appel
  python generer-bibliotheque.py pack <nom>           # états du pack fabriqué par node tools/construire_pack_atelier.js <nom> -> public/packs/<nom>/audio
  python generer-bibliotheque.py phrases <nom>        # phrases d'aide du pack (écrites par l'enseignant) -> public/packs/<nom>/audio/phrase-<id>.mp3 ; node tools/ajouter_phrases_pack.js <nom> d'abord
  python generer-bibliotheque.py etats                # états du mode A de data/mode-a.json (node tools/mode_a_mots.js 100) -> public/packs/p1-100/audio
  python generer-bibliotheque.py syllabes-mots        # syllabes manquantes des 100 mots du pack (node tools/syllabes_mots.js), puis normalise
  python generer-bibliotheque.py mots-3               # mots de 3 syllabes (node tools/mots_trois_syllabes.js 5) : syllabes et mot entier, puis normalise
  python generer-bibliotheque.py norm                 # normalise sans appel Azure (ffmpeg local)
  python generer-bibliotheque.py page --n 40          # page d'écoute d'un échantillon au hasard (graine fixe) des fichiers normalisés

Sortie : sortie/bibliotheque/brut/*.mp3 (Azure), sortie/bibliotheque/norm/*.mp3 (rognés, pic à -3 dB), sortie/bibliotheque/index.json (ipa -> fichier).
Nom de fichier = codes Unicode de l'IPA + vitesse : sans caractère spécial, réversible via index.json.
Clé : comme essai-charline.py (variable AZURE_SPEECH_KEY ou première ligne de cle.txt, lue seulement quand JF lance la commande).
Seules des chaînes IPA partent vers Azure.
"""
import argparse
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

_s = importlib.util.spec_from_file_location("phrases_ssml", ICI.parent / "tools" / "phrases_ssml.py")
PS = importlib.util.module_from_spec(_s)
_s.loader.exec_module(PS)

BASE = ICI / "sortie" / "bibliotheque"
BRUT, NORM = BASE / "brut", BASE / "norm"
SYLLABES = ICI.parent / "data" / "syllabes.json"


def nom(ipa, vitesse):
    return "_".join(f"{ord(c):x}" for c in ipa) + f"_{vitesse}"


def charger(palier):
    return [x for x in json.loads(SYLLABES.read_text(encoding="utf-8")) if x["palier"] <= palier]


def generer(palier, maxi):
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    nouveaux = erreurs = 0
    for x in charger(palier):
        f = BRUT / (nom(x["ipa"], x["vitesse"]) + ".mp3")
        if f.exists():
            continue
        if maxi and nouveaux >= maxi:
            print(f"Arrêt : {maxi} nouveaux fichiers atteints ; relancer la même commande pour continuer.")
            break
        try:
            f.write_bytes(C.E.azure_appel(cle, region, C.ssml(x["ipa"], x["ipa"], x["vitesse"])))
            nouveaux += 1
            if nouveaux % 25 == 0:
                print(f"{nouveaux} fichiers générés (dernier : /{x['ipa']}/)", flush=True)
        except Exception as e:
            erreurs += 1
            print("ERR", x["ipa"], str(e)[:140], flush=True)
        time.sleep(0.15)
    print(f"{nouveaux} nouveaux fichiers, {erreurs} erreur(s).")


MODE_A = ICI.parent / "data" / "mode-a.json"          # produit par : node tools/mode_a_mots.js 100
DEST_PACK = ICI.parent / "public" / "packs" / "p1-100" / "audio"


def etats_mode_a(liste=None, dest=None):
    """Génère les états du mode A absents (fichiers partagés avec la bibliothèque), normalise, copie dans le pack."""
    import shutil
    liste, dest = liste or MODE_A, dest or DEST_PACK
    items = json.loads(liste.read_text(encoding="utf-8"))["fichiersDistincts"]
    cle = region = None   # la clé Azure n'est lue que si un fichier manque vraiment
    BRUT.mkdir(parents=True, exist_ok=True)
    NORM.mkdir(parents=True, exist_ok=True)
    dest.mkdir(parents=True, exist_ok=True)
    nouveaux = erreurs = 0
    for x in items:
        f = BRUT / (x["fichier"] + ".mp3")
        if not f.exists():
            if cle is None:
                cle, region = C.cle_region()
            try:
                f.write_bytes(C.E.azure_appel(cle, region, C.ssml(x["ipa"], x["ipa"], x["vitesse"])))
                nouveaux += 1
                if nouveaux % 25 == 0:
                    print(f"{nouveaux} fichiers générés (dernier : /{x['ipa']}/)", flush=True)
            except Exception as e:
                erreurs += 1
                print("ERR", x["ipa"], str(e)[:140], flush=True)
            time.sleep(0.15)
    plafonnes = []
    for x in items:
        src, dst = BRUT / (x["fichier"] + ".mp3"), NORM / (x["fichier"] + ".mp3")
        if not src.exists():
            continue
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            _, gain, _ = N.normaliser(src, dst)
            if gain >= N.GAIN_MAX_DB:
                plafonnes.append(x["ipa"])
        shutil.copyfile(dst, dest / dst.name)
    manque = [x["ipa"] for x in items if not (dest / (x["fichier"] + ".mp3")).exists()]
    print(f"{nouveaux} nouveaux fichiers, {erreurs} erreur(s) ; copiés dans {dest} : {len(items) - len(manque)}/{len(items)} ; gain plafonné : {plafonnes or 'aucun'} ; manquants : {manque or 'aucun'}")


def phrases_pack(nom_pack):
    """Génère l'audio des phrases d'aide d'un pack (liste : data/packs-atelier/<pack>/phrases-a-generer.json, faite par node tools/ajouter_phrases_pack.js).
    Le mot cible est lu avec son IPA, le reste de la phrase par la voix. Seul du texte de phrase et de l'IPA part vers Azure. Clé lue seulement si un fichier manque."""
    import hashlib
    import shutil
    liste = json.loads((ICI.parent / "data" / "packs-atelier" / nom_pack / "phrases-a-generer.json").read_text(encoding="utf-8"))["phrases"]
    dest = ICI.parent / "public" / "packs" / nom_pack / "audio"
    brut, norm = BASE / "brut-phrases", BASE / "norm-phrases"
    for d in (brut, norm, dest):
        d.mkdir(parents=True, exist_ok=True)
    cle = region = None
    nouveaux = erreurs = 0
    for x in liste:
        f = brut / f"phrase_{x['id']}_{PS.empreinte(x['phrase'], x['ipa'])}.mp3"
        if not f.exists():
            if cle is None:
                cle, region = C.cle_region()
            try:
                f.write_bytes(C.E.azure_appel(cle, region, PS.ssml_phrase(x["phrase"], x["mot"], x["ipa"])))
                nouveaux += 1
            except Exception as e:
                erreurs += 1
                print("ERR", x["mot"], str(e)[:140], flush=True)
            time.sleep(0.15)
        if f.exists():
            n = norm / f.name
            if not n.exists() or n.stat().st_mtime < f.stat().st_mtime:
                N.normaliser(f, n)
            shutil.copyfile(n, dest / (pathlib.Path(x["fichier"]).name))
    manque = [x["mot"] for x in liste if not (dest / pathlib.Path(x["fichier"]).name).exists()]
    print(f"{nouveaux} nouvelles phrases, {erreurs} erreur(s) ; copiées dans {dest} : {len(liste) - len(manque)}/{len(liste)} ; manquantes : {manque or 'aucune'}")
    print(f"Suite : node tools/ajouter_phrases_pack.js {nom_pack}")


SYLLABES_MOTS = ICI.parent / "data" / "syllabes-mots.json"   # produit par : node tools/syllabes_mots.js


def syllabes_des_mots(seulement_liste=False):
    """Génère les syllabes des 100 mots du pack qui manquent (même nommage et même vitesse que la bibliothèque), puis normalise."""
    donnees = json.loads(SYLLABES_MOTS.read_text(encoding="utf-8"))
    items = {}
    for syls in donnees.values():
        for s in syls:
            items[s["fichier"]] = {"ipa": s["ipa"], "vitesse": int(s["fichier"][:-4].rsplit("_", 1)[1])}
    manquants = [(f, x) for f, x in items.items() if not (BRUT / f).exists()]
    print(f"{len(items)} syllabes distinctes, {len(manquants)} à générer : " + " ".join("/" + x["ipa"] + "/" for _, x in manquants))
    if seulement_liste:
        return
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    ok = err = 0
    for f, x in manquants:
        try:
            (BRUT / f).write_bytes(C.E.azure_appel(cle, region, C.ssml(x["ipa"], x["ipa"], x["vitesse"])))
            ok += 1
        except Exception as e:
            err += 1
            print("ERR", x["ipa"], str(e)[:140], flush=True)
        time.sleep(0.15)
    print(f"{ok} générés, {err} erreur(s).")
    NORM.mkdir(parents=True, exist_ok=True)
    for f in items:
        if (BRUT / f).exists() and not (NORM / f).exists():
            N.normaliser(BRUT / f, NORM / f)
    print("Normalisés :", sum(1 for f in items if (NORM / f).exists()), "/", len(items))


MOTS_3 = ICI.parent / "data" / "mots-3-syllabes.json"   # produit par : node tools/mots_trois_syllabes.js


def mots_trois_syllabes(seulement_liste=False):
    """Génère ce qui manque pour les mots de 3 syllabes : chaque syllabe et le mot entier (-30 %), puis normalise."""
    items = {}
    for m in json.loads(MOTS_3.read_text(encoding="utf-8")):
        for ipa, f in [(m["ipa"], m["entier"])] + [(s["ipa"], s["fichier"]) for s in m["syllabes"]]:
            items[f] = {"ipa": ipa, "vitesse": int(f[:-4].rsplit("_", 1)[1])}
    manquants = [(f, x) for f, x in items.items() if not (BRUT / f).exists()]
    print(f"{len(items)} fichiers nécessaires, {len(manquants)} à générer : " + " ".join("/" + x["ipa"] + "/" for _, x in manquants))
    if seulement_liste:
        return
    cle, region = C.cle_region()
    BRUT.mkdir(parents=True, exist_ok=True)
    ok = err = 0
    for f, x in manquants:
        try:
            (BRUT / f).write_bytes(C.E.azure_appel(cle, region, C.ssml(x["ipa"], x["ipa"], x["vitesse"])))
            ok += 1
        except Exception as e:
            err += 1
            print("ERR", x["ipa"], str(e)[:140], flush=True)
        time.sleep(0.15)
    print(f"{ok} générés, {err} erreur(s).")
    NORM.mkdir(parents=True, exist_ok=True)
    for f in items:
        if (BRUT / f).exists() and not (NORM / f).exists():
            N.normaliser(BRUT / f, NORM / f)
    print("Normalisés :", sum(1 for f in items if (NORM / f).exists()), "/", len(items))


def normaliser():
    NORM.mkdir(parents=True, exist_ok=True)
    index, plafonnes = {}, []
    for x in json.loads(SYLLABES.read_text(encoding="utf-8")):
        n = nom(x["ipa"], x["vitesse"])
        src = BRUT / (n + ".mp3")
        if not src.exists():
            continue
        dst = NORM / (n + ".mp3")
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            p0, gain, _ = N.normaliser(src, dst)
            if gain >= N.GAIN_MAX_DB:
                plafonnes.append(x["ipa"])
        index[x["ipa"]] = {"fichier": n + ".mp3", "vitesse": x["vitesse"], "palier": x["palier"]}
    (BASE / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    taille = sum(f.stat().st_size for f in NORM.glob("*.mp3"))
    print(f"{len(index)} fichiers normalisés, {taille / 1e6:.1f} Mo ; gain plafonné (bruit ?) : {len(plafonnes)} {' '.join(plafonnes[:20])}")

PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Écoute de la bibliothèque</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:middle}th{background:#0f6e56;color:#fff;text-align:left}.l{font-size:18px;color:#555}.ex{font-size:22px}.c{color:#0f6e56;text-decoration:underline}
audio{width:200px;height:34px}select{font-size:16px}button{font-size:16px;padding:8px 14px}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}</style></head><body>
<h1>Échantillon de la bibliothèque (%d fichiers au hasard)</h1>
<p>Noter : <b>bon</b>, <b>faux</b> (autre son), <b>voyelle ajoutée</b>, <b>coupé ou bruit</b>. La colonne de gauche montre un ou deux mots où l'on entend ce son ; la partie en gras et soulignée est celle qui doit être prononcée (les traits d'union séparent les syllabes). L'IPA est ce qui a été demandé à Charline.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "ecoute-bibliotheque-v1", ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
function exemple(e, son) { var t = son ? "" : "-"; return (e[0] ? e[0] + t : "") + "<b class='c'>" + e[1] + "</b>" + (e[2] ? t + e[2] : ""); }
var h = "<table><tr><th>À entendre (en gras)</th><th>IPA demandé</th><th>Palier</th><th>Écouter</th><th>Note</th></tr>";
DATA.forEach(function (x) {
  h += "<tr><td class='ex'>" + (x.ex || []).slice(0, 2).map(function (e) { return exemple(e, x.palier === 0); }).join("<br>") + "</td><td class='l'>/" + x.ipa + "/</td><td>" + x.palier + "</td><td><audio controls preload='none' src='sortie/bibliotheque/norm/" + encodeURIComponent(x.fichier) + "'></audio></td><td><select onchange=\\"sauve('" + x.ipa + "', this.value)\\">" +
    ["", "bon", "faux", "voyelle ajoutée", "coupé ou bruit"].map(function (o) { return "<option" + ((ETAT[x.ipa] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td></tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push("/" + k + "/ : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def page(n):
    import random
    index = json.loads((BASE / "index.json").read_text(encoding="utf-8"))
    cles = sorted(index)
    random.Random(1).shuffle(cles)  # graine fixe : même échantillon à chaque fois
    exemples = {x["ipa"]: x.get("exemplesLettres", []) for x in json.loads(SYLLABES.read_text(encoding="utf-8"))}
    echant = [{"ipa": k, "fichier": index[k]["fichier"], "palier": index[k]["palier"], "ex": exemples.get(k, [])} for k in cles[:n]]
    corps = json.dumps(echant, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-bibliotheque.html").write_text(PAGE % (len(echant), corps), encoding="utf-8")
    print("Page :", ICI / "ecoute-bibliotheque.html", f"({len(echant)} fichiers sur {len(index)})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("commande", choices=["liste", "azure", "norm", "page", "etats", "syllabes-mots", "mots-3", "pack", "phrases"])
    ap.add_argument("--n", type=int, default=40)
    ap.add_argument("nom_pack", nargs="?", default=None, help="avec la commande pack : nom du pack fabriqué par construire_pack_atelier.js")
    ap.add_argument("--palier", type=int, default=1, choices=[0, 1, 2, 3, 4])
    ap.add_argument("--max", type=int, default=0)
    a = ap.parse_args()
    if a.commande == "liste":
        L = charger(a.palier)
        deja = sum(1 for x in L if (BRUT / (nom(x["ipa"], x["vitesse"]) + ".mp3")).exists())
        print(f"paliers 0 à {a.palier} : {len(L)} fichiers, dont {deja} déjà générés ; exemples : " + " ".join(x["ipa"] for x in L[:15]))
    elif a.commande == "azure":
        generer(a.palier, a.max)
        normaliser()
    elif a.commande == "pack":
        if not a.nom_pack:
            sys.exit("Donner le nom du pack : python generer-bibliotheque.py pack <nom>")
        atelier = ICI.parent / "data" / "packs-atelier" / a.nom_pack / "a-generer.json"
        if not atelier.exists():
            sys.exit(f"Introuvable : {atelier} (lancer d'abord node tools/construire_pack_atelier.js {a.nom_pack})")
        etats_mode_a(atelier, ICI.parent / "public" / "packs" / a.nom_pack / "audio")
    elif a.commande == "phrases":
        if not a.nom_pack:
            sys.exit("Donner le nom du pack : python generer-bibliotheque.py phrases <nom>")
        phrases_pack(a.nom_pack)
    elif a.commande == "etats":
        etats_mode_a()
    elif a.commande == "mots-3":
        mots_trois_syllabes()
    elif a.commande == "syllabes-mots":
        syllabes_des_mots()
    elif a.commande == "page":
        page(a.n)
    else:
        normaliser()
