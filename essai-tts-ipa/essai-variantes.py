# -*- coding: utf-8 -*-
"""
Essai de variantes de voix pour les défauts signalés par Virginie (2026-11-27) : vél, to, ʁi (souris), arbre.
Chaque variante est une HYPOTHÈSE à écouter, pas une correction : aucune n'est appliquée aux packs.

  python -I essai-variantes.py azure [2]  # un appel Azure par variante (clé lue seulement quand JF lance), normalisation, page ; « 2 » = lot 2
  python -I essai-variantes.py norm [2]   # normalise sans appel Azure, puis page
  python -I essai-variantes.py page [2]   # reconstruit la page d'écoute
  python -I essai-variantes.py autonome [2]  # APRÈS azure : une seule page avec les sons dedans, à envoyer par courriel
Lot 1 (2026-11-27, noté par JF) : vél, to, souris, arbre. Lot 2 : vél (autres techniques) et e final de livre, table, tigre, ogre, zèbre, chambre. Lot 3 : o ouvert, 9 états consonne + ɔ et 3 états consonne + ɔ + r/l, avec ɔ puis avec o.

Sortie : essai-tts-ipa/ecoute-variantes.html (JF note « bon / faux / autre » pour chaque variante, puis « Copier le bilan »).
Seules des chaînes IPA partent vers Azure.
"""
import importlib.util
import json
import pathlib
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("charline", ICI / "essai-charline.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)
_n = importlib.util.spec_from_file_location("normaliser", ICI.parent / "tools" / "normaliser_audio.py")
N = importlib.util.module_from_spec(_n)
_n.loader.exec_module(N)

LOT = sys.argv[2] if len(sys.argv) > 2 else "1"
SUF = "" if LOT == "1" else "_lot" + LOT
SORTIE = ICI / "sortie" / ("azure__" + C.VOIX + "__variantes" + SUF)
SORTIE_NORM = ICI / "sortie" / ("azure__" + C.VOIX + "__variantes" + SUF + "_norm")
ASSETS = ICI.parent / "data" / "base" / "assets" / "audio"

# (mot, état ou syllabe, id, IPA, vitesse, ce que la variante teste)
VARIANTES = [
    ("vélo", "état « vél » : l'app joue /vel/ à -30 %", "velo-vel-A", "vel", -30, "actuel (témoin)"),
    ("vélo", "état « vél »", "velo-vel-B", "vel", 0, "même chaîne, vitesse normale"),
    ("vélo", "état « vél »", "velo-vel-C", "veːl", -30, "voyelle allongée"),
    ("vélo", "état « vél »", "velo-vel-D", "ve.l", -30, "coupure de syllabe avant l"),
    ("tortue", "état « to » : l'app joue /tɔ/ à -30 %", "tortue-to-A", "tɔ", -30, "actuel (témoin)"),
    ("tortue", "état « to »", "tortue-to-B", "tɔ", 0, "même chaîne, vitesse normale"),
    ("tortue", "état « to »", "tortue-to-C", "tɔː", -30, "voyelle allongée"),
    ("tortue", "état « to »", "tortue-to-D", "to", -30, "o fermé au lieu de ouvert"),
    ("souris", "syllabe 2 : l'app joue /ʁi/ à -30 %", "souris-ri-A", "ʁi", -30, "actuel (témoin)"),
    ("souris", "syllabe 2", "souris-ri-B", "ʁi", 0, "même chaîne, vitesse normale"),
    ("souris", "syllabe 2", "souris-ri-C", "ʁiː", -30, "voyelle allongée"),
    ("souris", "mot « souris » : /suʁi/ à -30 % (témoin du mot entier)", "souris-mot-A", "suʁi", -30, "actuel (témoin)"),
    ("arbre", "mot « arbre » : l'app joue /aʁbʁə/ à -30 %", "arbre-mot-A", "aʁbʁə", -30, "actuel (témoin, avec schwa)"),
    ("arbre", "mot « arbre »", "arbre-mot-B", "aʁbʁ", -30, "sans schwa final"),
    ("arbre", "syllabe 2 : l'app joue /bʁə/ à -30 %", "arbre-syl2-A", "bʁə", -30, "actuel (témoin, avec schwa)"),
    ("arbre", "syllabe 2", "arbre-syl2-B", "bʁ", -30, "sans schwa final"),
]


# Lot 2. Entrées spéciales : "@deux:a|b" = deux balises phoneme consécutives dans un seul SSML ; "@collage:f1+f2" = collage local (ffmpeg) de deux fichiers de la base.
VARIANTES_LOT2 = [
    ("vélo", "état « vél » : /vel/ lu « vèl » dans le lot 1", "velo-vel-E", "@deux:ve|l", -30, "deux balises : /ve/ puis /l/ dans un seul appel"),
    ("vélo", "état « vél »", "velo-vel-F", "ve̝l", -30, "e avec signe « relevé » (plus fermé)"),
    ("vélo", "état « vél »", "velo-vel-G", "@collage:76_65_-30+6c_0", -30, "collage local : fichier « vé » de la base + fichier « l » de la base"),
]
# e final de mots à groupe consonne + r ou l : A = lecture actuelle (avec schwa), B = sans schwa (comme arbre, jugé bon par JF).
for _mot, _avec in [("livre", "livʁə"), ("table", "tablə"), ("tigre", "tiɡʁə"), ("ogre", "ɔɡʁə"), ("zèbre", "zɛbʁə"), ("chambre", "ʃɑ̃bʁə")]:
    _id = _mot.replace("è", "e")
    VARIANTES_LOT2 += [
        (_mot, f"mot « {_mot} » : lecture actuelle", f"{_id}-mot-A", _avec, -30, "actuel (témoin, avec schwa)"),
        (_mot, f"mot « {_mot} »", f"{_id}-mot-B", _avec[:-1], -30, "sans schwa final"),
    ]
if LOT == "2":
    VARIANTES = VARIANTES_LOT2

# Lot 3 : o ouvert. Dans le lot 1, « to » écrit /tɔ/ perd le o ; écrit /to/ il sonne ouvert (JF, 2026-11-27 ; cible = o ouvert [ɔ]).
# A = chaîne actuelle de la base (avec ɔ), B = même chaîne avec o. Sert à savoir si « consonne + o écrit /o/ » donne partout l'o ouvert.
VARIANTES_LOT3 = []
for _c, _nom in [("f", "f"), ("k", "k"), ("m", "m"), ("p", "p"), ("ʁ", "r"), ("s", "s"), ("t", "t"), ("v", "v"), ("ʒ", "zh")]:
    VARIANTES_LOT3 += [
        ("o ouvert, consonne + o", f"état « {_nom}o » : /{_c}ɔ/ actuel", f"o-{_nom}-A", _c + "ɔ", -30, "actuel (avec ɔ)"),
        ("o ouvert, consonne + o", f"état « {_nom}o »", f"o-{_nom}-B", _c + "o", -30, "écrit avec o"),
    ]
for _ipa, _nom in [("tɔʁ", "tor"), ("kɔʁ", "kor"), ("pɔl", "pol")]:
    VARIANTES_LOT3 += [
        ("o ouvert, consonne + o + r ou l", f"état « {_nom} » : /{_ipa}/ actuel", f"o-{_nom}-A", _ipa, -30, "actuel (avec ɔ)"),
        ("o ouvert, consonne + o + r ou l", f"état « {_nom} »", f"o-{_nom}-B", _ipa.replace("ɔ", "o"), -30, "écrit avec o"),
    ]
# Suite du lot 3 (après les notes du lot 2 : « vél » est bon avec deux balises /ve/ puis /l/) :
# (a) la technique « deux balises » généralisée à d'autres voyelle + l ou r ; (b) o ouvert + r ou l en deux balises ; (c) o FERMÉ : /lo/ de « vélo » (voir ci-dessous).
for _ipa, _a, _b, _nom in [("tel", "te", "l", "tel"), ("seʁ", "se", "ʁ", "ser"), ("vɛʁ", "vɛ", "ʁ", "ver")]:
    VARIANTES_LOT3 += [
        ("voyelle + l ou r, deux balises", f"état « {_nom} » : /{_ipa}/ actuel", f"e-{_nom}-A", _ipa, -30, "actuel"),
        ("voyelle + l ou r, deux balises", f"état « {_nom} »", f"e-{_nom}-E", f"@deux:{_a}|{_b}", -30, "deux balises"),
    ]
for _a, _b, _nom in [("to", "ʁ", "tor"), ("ko", "ʁ", "kor"), ("po", "l", "pol")]:
    VARIANTES_LOT3.append(("o ouvert, consonne + o + r ou l", f"état « {_nom} »", f"o-{_nom}-C", f"@deux:{_a}|{_b}", -30, "deux balises, o écrit /o/"))
# o fermé : dans le lot 1, /to/ sonne ouvert ; si /o/ sonne toujours ouvert, le o FERMÉ (vélo, auto) n'a pas de chaîne qui le rende.
VARIANTES_LOT3 += [
    ("o fermé (vélo)", "état « vélo », dernier son : /lo/ actuel (o fermé voulu)", "oc-lo-A", "lo", -30, "actuel"),
    ("o fermé (vélo)", "même état", "oc-lo-B", "loː", -30, "o allongé"),
    ("o fermé (vélo)", "même état", "oc-lo-C", "lo̝", -30, "o avec signe « relevé »"),
]
if LOT == "3":
    VARIANTES = VARIANTES_LOT3


def collage(spec, dest):
    import subprocess
    a, b = spec.split("+")
    liste = ICI / "sortie" / "_collage.txt"
    lignes = [f"file '{(ASSETS / (x + '.mp3')).as_posix()}'" for x in (a, b)]
    liste.write_text(chr(10).join(lignes) + chr(10), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(liste), "-c:a", "libmp3lame", "-b:a", "48k", str(dest)], check=True)


def generer():
    cle, region = C.cle_region()
    SORTIE.mkdir(parents=True, exist_ok=True)
    erreurs = 0
    for mot, _, vid, ipa, vit, _ in VARIANTES:
        try:
            if ipa.startswith("@collage:"):
                collage(ipa.split(":", 1)[1], SORTIE / (vid + ".mp3"))
                print("ok ", vid, ipa, "(collage local)", flush=True)
                continue
            if ipa.startswith("@deux:"):
                a, b = ipa.split(":", 1)[1].split("|")
                ssml = C.E.ssml_azure(C.VOIX, a, mot).replace("</phoneme></voice>", f'</phoneme><phoneme alphabet="ipa" ph="{b}">{mot}</phoneme></voice>')
                if vit:
                    ssml = ssml.replace(f'<voice name="{C.VOIX}">', f'<voice name="{C.VOIX}"><prosody rate="{vit:+d}%">').replace("</voice>", "</prosody></voice>")
            else:
                ssml = C.ssml(ipa, mot, vit)
            data = C.E.azure_appel(cle, region, ssml)
            (SORTIE / (vid + ".mp3")).write_bytes(data)
            print("ok ", vid, "/" + ipa + "/", vit, round(C.duree_s(data), 2), "s", flush=True)
        except Exception as ex:
            erreurs += 1
            print("ERR", vid, str(ex)[:150], flush=True)
        time.sleep(0.15)
    print(f"\n{len(VARIANTES) - erreurs} réussis, {erreurs} erreurs.")


def normaliser_tout():
    for f in sorted(SORTIE.glob("*.mp3")):
        p0, gain, p1 = N.normaliser(f, SORTIE_NORM / f.name)
        print(f"norm {f.name:22} pic {p0:6.1f} -> {p1:6.1f} dB (gain {gain:+.1f})", flush=True)


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Variantes de voix (retours de Virginie)</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}
h2{color:#0f6e56;margin-top:28px}table{border-collapse:collapse;width:100%%}th,td{border:1px solid #ccc;padding:6px;vertical-align:middle}
th{background:#0f6e56;color:#fff;text-align:left}audio{width:220px;height:34px}select{font-size:16px}button{font-size:16px;padding:8px 14px}
pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}.t{color:#555;font-size:14px}</style></head><body>
<h1>Variantes de voix : écoute</h1>
<p>Pour chaque ligne : écouter et noter. <b>bon</b> = on entend, dans cet état, le son que ces lettres ont <u>dans le mot</u> (voir « mots de la base » : le début de ce mot dit normalement, pas la syllabe dite seule) ; <b>faux</b> = une voyelle manque, change de timbre (o fermé au lieu d'ouvert, è au lieu de é…) ou s'ajoute ; <b>autre</b> = un défaut différent (coupure, bruit, voix étrange). Le témoin A est ce que l'application joue aujourd'hui.
Rien n'est appliqué aux packs avant ta réponse.</p>
<div id="t"></div><button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = %s, cle = "essai-variantes-v1-lot" + "%s", ETAT = {};
// Page autonome : les sons sont dans la page (AUDIO) ; sinon ils sont lus dans le dossier de sortie, à côté de la page.
function srcDe(id) { return (typeof AUDIO !== "undefined" && AUDIO[id]) ? AUDIO[id] : "sortie/%s/" + id + ".mp3"; }
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) {}
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var h = "", mot = "";
DATA.forEach(function (e) {
  if (e.mot !== mot) { if (mot) h += "</table>"; mot = e.mot; h += "<h2>" + e.mot + "</h2><table><tr><th>Ce qui est testé</th><th>Mots de la base qui utilisent cet état</th><th>Écouter</th><th>IPA</th><th>Vitesse</th><th>Variante</th><th>Note</th></tr>"; }
  h += "<tr><td>" + e.cible + "</td><td class='t'>" + (e.utilise || "") + "</td><td><audio controls preload='none' src='" + srcDe(e.id) + "'></audio></td><td>/" + e.ipa + "/</td><td>" + e.vitesse + " %%</td><td class='t'>" + e.test + "</td><td><select onchange=\\"sauve('" + e.id + "', this.value)\\">" +
    ["", "bon", "faux", "autre"].map(function (o) { return "<option" + ((ETAT[e.id] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></td></tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() { var l = []; Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)"; document.getElementById("b").textContent = t; try { navigator.clipboard.writeText(t); } catch (e) {} }
</script></body></html>"""


def mots_par_chaine():
    """Mots de la base qui utilisent chaque chaîne IPA (docs/etats-a-risque-voix.csv, produit par tools/base/etats_a_risque.js)."""
    f = ICI.parent / "docs" / "etats-a-risque-voix.csv"
    out = {}
    if f.exists():
        for ligne in f.read_text(encoding="utf-8-sig").splitlines()[1:]:
            c = ligne.split(";")
            if len(c) >= 5:
                out[c[0]] = c[4]
    return out


def page(autonome=False):
    mots = mots_par_chaine()
    ipa_de = {i: p for _, _, i, p, _, _ in VARIANTES}
    def utilise(i):
        base = ipa_de.get(i[:-1] + "A", ipa_de[i])
        return mots.get(base, "")
    data = [dict(mot=m, cible=c, id=i, ipa=p, vitesse=v, test=t, utilise=utilise(i)) for m, c, i, p, v, t in VARIANTES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html_page = PAGE % (corps, LOT, SORTIE_NORM.name)
    nom = "ecoute-variantes" + SUF + (".html" if not autonome else "_autonome.html")
    if autonome:
        import base64
        audio = {}
        for _, _, i, _, _, _ in VARIANTES:
            f = SORTIE_NORM / (i + ".mp3")
            if not f.exists():
                sys.exit(f"Fichier absent : {f}. Lancer d'abord « azure » (ou « norm »).")
            audio[i] = "data:audio/mpeg;base64," + base64.b64encode(f.read_bytes()).decode("ascii")
        html_page = html_page.replace("<script>", "<script>" + chr(10) + "var AUDIO = " + json.dumps(audio) + ";", 1)
    (ICI / nom).write_text(html_page, encoding="utf-8")
    print("Page :", ICI / nom, f"({(ICI / nom).stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer()
        normaliser_tout()
        page()
    elif cmd == "norm":
        normaliser_tout()
        page()
    elif cmd == "page":
        page()
    elif cmd == "autonome":
        page(autonome=True)
    else:
        sys.exit(__doc__)
