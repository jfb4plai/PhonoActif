# -*- coding: utf-8 -*-
"""
Essai : une synthese vocale pilotee par l'IPA lit-elle bien le francais (fr-BE) ?

Teste 20 elements (phonemes isoles, voyelles, syllabes, mots) avec Azure et/ou Amazon Polly,
ecrit un fichier MP3 par element, puis une page d'ecoute (ecoute.html) ou JF note chaque son.
Rien n'est envoye a un service tant qu'on ne lance pas « azure » ou « polly ».

Commandes (dans PowerShell, depuis ce dossier) :
  python essai-tts-ipa.py ssml                      # affiche le SSML, aucun appel reseau
  python essai-tts-ipa.py voix                      # liste les voix fr-BE (Azure et Polly)
  python essai-tts-ipa.py azure --voix NOM          # 20 appels Azure (NOM = ShortName vu avec « voix »)
  python essai-tts-ipa.py polly --voix Isabelle     # 20 appels Polly, moteur neural par defaut
  python essai-tts-ipa.py polly --voix Isabelle --moteur generative
  python essai-tts-ipa.py page                      # reconstruit ecoute.html

Cles : variables d'environnement, jamais dans ce fichier ni dans la page.
  Azure : AZURE_SPEECH_KEY et AZURE_SPEECH_REGION (ex. westeurope)
  Polly : identifiants AWS habituels (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) ; pip install boto3
Option --temoin : ajoute, pour les mots et syllabes, une version lue a partir du texte ecrit
(sans IPA), pour voir ce que l'IPA change.
"""
import argparse
import html
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

TILDE = "̃"  # tilde combinant : a~ e~ o~ nasales

# id, IPA, texte ecrit (remplace par l'IPA dans la balise), categorie, ce qu'on doit entendre
ITEMS = [
    ("01-b", "b", "b", "phonème isolé", "/b/ voisé, sans « bé » ni « be »"),
    ("02-p", "p", "p", "phonème isolé", "/p/ sourd, bref, sans « pé »"),
    ("03-t", "t", "t", "phonème isolé", "/t/ sourd, bref, sans « té »"),
    ("04-d", "d", "d", "phonème isolé", "/d/ voisé, sans « dé »"),
    ("05-r", "ʁ", "r", "phonème isolé", "/r/ sans « re » ni « erre »"),
    ("06-w", "w", "w", "phonème isolé", "/w/ bref, pas « wo »"),
    ("07-gn", "ɲ", "gn", "phonème isolé", "« gn » de « vigne », pas « gue »"),
    ("08-e", "e", "é", "voyelle", "é de « été »"),
    ("09-ep", "ɛ", "è", "voyelle", "è de « geai »"),
    ("10-an", "ɑ" + TILDE, "an", "nasale", "an de « enfant »"),
    ("11-in", "ɛ" + TILDE, "in", "nasale", "in de « pain »"),
    ("12-on", "ɔ" + TILDE, "on", "nasale", "on de « pont »"),
    ("13-ge-grave", "ʒɛ", "gè", "syllabe", "gè (accent grave), comme « geai »"),
    ("14-ge-aigu", "ʒe", "gé", "syllabe", "gé (accent aigu), comme la lettre « g » nommée"),
    ("15-se", "sə", "se", "syllabe", "comme « se » dans « se lever »"),
    ("16-oi", "wa", "oi", "syllabe", "comme « moi » sans le m"),
    ("17-bien", "bjɛ" + TILDE, "bien", "mot", "bien"),
    ("18-chien", "ʃjɛ" + TILDE, "chien", "mot", "chien"),
    ("19-geai", "ʒɛ", "geai", "mot", "geai (l'oiseau)"),
    ("20-sept", "sɛt", "sept", "mot", "sept (le p ne se prononce pas)"),
]
TEMOINS = [i for i in ITEMS if i[3] in ("syllabe", "mot")]

ICI = pathlib.Path(__file__).resolve().parent


def esc_attr(s):
    return html.escape(s, quote=True)


def ssml_azure(voix, ph, txt):
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
        f'<voice name="{esc_attr(voix)}">'
        f'<phoneme alphabet="ipa" ph="{esc_attr(ph)}">{html.escape(txt)}</phoneme>'
        "</voice></speak>"
    )


def ssml_azure_texte(voix, txt):
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
        f'<voice name="{esc_attr(voix)}">{html.escape(txt)}</voice></speak>'
    )


def ssml_polly(ph, txt):
    return f'<speak><phoneme alphabet="ipa" ph="{esc_attr(ph)}">{html.escape(txt)}</phoneme></speak>'


def ssml_polly_texte(txt):
    return f"<speak>{html.escape(txt)}</speak>"


def ecrire(dossier, nom, octets):
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / nom).write_bytes(octets)


# ---------- Azure ----------
def azure_creds():
    cle = os.environ.get("AZURE_SPEECH_KEY", "").strip().strip('"')
    region = os.environ.get("AZURE_SPEECH_REGION", "").strip().strip('"')
    if not cle or not region:
        sys.exit("Definir AZURE_SPEECH_KEY et AZURE_SPEECH_REGION (variables d'environnement).")
    return cle, region


def azure_voix():
    cle, region = azure_creds()
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list",
        headers={"Ocp-Apim-Subscription-Key": cle},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        voix = json.loads(r.read().decode("utf-8"))
    be = [v for v in voix if v.get("Locale") == "fr-BE"]
    print(f"Azure : {len(be)} voix fr-BE")
    for v in be:
        print("  ", v.get("ShortName"), v.get("Gender"), v.get("VoiceType"))
    if not be:
        print("   aucune ; voix fr-* :", sorted({v['ShortName'] for v in voix if v.get('Locale', '').startswith('fr-')})[:12])


def azure_appel(cle, region, ssml):
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": cle,
            "Content-Type": "application/ssml+xml; charset=utf-8",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "essai-tts-ipa",
        },
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def lancer_azure(voix, sortie, temoin):
    cle, region = azure_creds()
    dossier = sortie / f"azure__{voix}"
    for (iid, ph, txt, _cat, _att) in ITEMS:
        try:
            ecrire(dossier, f"{iid}.mp3", azure_appel(cle, region, ssml_azure(voix, ph, txt)))
            print("ok  ", iid)
        except urllib.error.HTTPError as e:
            print("ERR ", iid, e.code, e.read().decode("utf-8", "replace")[:200])
    if temoin:
        for (iid, _ph, txt, _c, _a) in TEMOINS:
            try:
                ecrire(dossier, f"T-{iid}.mp3", azure_appel(cle, region, ssml_azure_texte(voix, txt)))
                print("ok  T-" + iid)
            except urllib.error.HTTPError as e:
                print("ERR T-" + iid, e.code, e.read().decode("utf-8", "replace")[:200])


# ---------- Polly ----------
def polly_client():
    try:
        import boto3
    except ImportError:
        sys.exit("Polly demande boto3 : pip install boto3")
    return boto3.client("polly", region_name=os.environ.get("AWS_REGION", "eu-west-1"))


def polly_voix():
    c = polly_client()
    rep = c.describe_voices(LanguageCode="fr-BE")
    print(f"Polly : {len(rep['Voices'])} voix fr-BE")
    for v in rep["Voices"]:
        print("  ", v["Id"], v["Gender"], v.get("SupportedEngines"))


def lancer_polly(voix, moteur, sortie, temoin):
    c = polly_client()
    dossier = sortie / f"polly__{voix}__{moteur}"
    def appel(ssml):
        return c.synthesize_speech(
            Text=ssml, TextType="ssml", VoiceId=voix, Engine=moteur, OutputFormat="mp3", LanguageCode="fr-BE"
        )["AudioStream"].read()
    for (iid, ph, txt, _cat, _att) in ITEMS:
        try:
            ecrire(dossier, f"{iid}.mp3", appel(ssml_polly(ph, txt)))
            print("ok  ", iid)
        except Exception as e:  # erreur d'API : on la montre, on continue
            print("ERR ", iid, str(e)[:200])
    if temoin:
        for (iid, _ph, txt, _c, _a) in TEMOINS:
            try:
                ecrire(dossier, f"T-{iid}.mp3", appel(ssml_polly_texte(txt)))
                print("ok  T-" + iid)
            except Exception as e:
                print("ERR T-" + iid, str(e)[:200])


# ---------- Page d'ecoute ----------
PAGE = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Essai synthèse IPA fr-BE</title>
<style>
body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}
th{background:#0f6e56;color:#fff;text-align:left}.cat{color:#555;font-size:14px}
audio{width:200px;height:34px}select{font-size:16px;margin-top:4px}
button{font-size:16px;padding:8px 14px;margin:8px 4px 8px 0}pre{background:#fff;border:1px solid #ccc;padding:8px;white-space:pre-wrap}
</style></head><body>
<h1>Essai synthèse vocale pilotée par l'IPA (fr-BE)</h1>
<p>Écouter chaque son, puis choisir : <b>bon</b>, <b>faux</b>, <b>voyelle ajoutée</b> (un « e » ou « eu » après la consonne), <b>coupé ou bruit</b>. Les lignes T- sont les témoins lus sans IPA.</p>
<div id="t"></div>
<button onclick="bilan()">Copier le bilan</button><pre id="b"></pre>
<script>
var DATA = __DATA__;
var cle = "essai-tts-ipa-v1";
var ETAT = {};
try { ETAT = JSON.parse(localStorage.getItem(cle) || "{}"); } catch (e) { ETAT = {}; }
function sauve(k, v) { ETAT[k] = v; try { localStorage.setItem(cle, JSON.stringify(ETAT)); } catch (e) {} }
var h = "<table><tr><th>Élément</th><th>Attendu</th>";
DATA.runs.forEach(function (r) { h += "<th>" + r + "</th>"; });
h += "</tr>";
DATA.items.forEach(function (it) {
  h += "<tr><td><b>" + it.id + "</b> /" + it.ipa + "/<div class='cat'>" + it.cat + "</div></td><td>" + it.att + "</td>";
  DATA.runs.forEach(function (r) {
    var f = r + "/" + it.id + ".mp3", k = r + "|" + it.id;
    var ex = DATA.fichiers.indexOf(f) >= 0;
    h += "<td>" + (ex ? "<audio controls preload='none' src='sortie/" + f + "'></audio><br><select onchange=\\"sauve('" + k + "', this.value)\\">" +
      ["", "bon", "faux", "voyelle ajoutée", "coupé ou bruit"].map(function (o) {
        return "<option" + ((ETAT[k] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>" : "—");
    var ft = r + "/T-" + it.id + ".mp3", kt = r + "|T-" + it.id;
    if (DATA.fichiers.indexOf(ft) >= 0) {
      h += "<div class='cat'>T- sans IPA</div><audio controls preload='none' src='sortie/" + ft + "'></audio><br><select onchange=\\"sauve('" + kt + "', this.value)\\">" +
      ["", "bon", "faux", "voyelle ajoutée", "coupé ou bruit"].map(function (o) {
        return "<option" + ((ETAT[kt] || "") === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>";
    }
    h += "</td>";
  });
  h += "</tr>";
});
document.getElementById("t").innerHTML = h + "</table>";
function bilan() {
  var l = [];
  Object.keys(ETAT).forEach(function (k) { if (ETAT[k]) l.push(k.replace("|", " | ") + " : " + ETAT[k]); });
  var t = l.join("\\n") || "(rien noté)";
  document.getElementById("b").textContent = t;
  try { navigator.clipboard.writeText(t); } catch (e) {}
}
</script></body></html>
"""


def construire_page(sortie):
    runs, fichiers = [], []
    if sortie.exists():
        for d in sorted(p for p in sortie.iterdir() if p.is_dir()):
            mp3 = sorted(f.name for f in d.glob("*.mp3"))
            if mp3:
                runs.append(d.name)
                fichiers += [f"{d.name}/{n}" for n in mp3]
    data = {
        "runs": runs,
        "fichiers": fichiers,
        "items": [{"id": i, "ipa": p, "cat": c, "att": a} for (i, p, _t, c, a) in ITEMS],
    }
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = ICI / "ecoute.html"
    page.write_text(PAGE.replace("__DATA__", corps), encoding="utf-8")
    print("Page :", page, f"({len(runs)} série(s))")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("commande", choices=["ssml", "voix", "azure", "polly", "page"])
    ap.add_argument("--voix", help="nom de la voix (Azure ShortName ou Polly Id)")
    ap.add_argument("--moteur", default="neural", choices=["neural", "generative", "standard", "long-form"])
    ap.add_argument("--temoin", action="store_true", help="ajoute les versions lues sans IPA")
    ap.add_argument("--sortie", default=str(ICI / "sortie"), help="dossier des MP3")
    a = ap.parse_args()
    sortie = pathlib.Path(a.sortie)
    if a.commande == "ssml":
        for (iid, ph, txt, _c, _a) in ITEMS:
            print(iid, "|", ssml_polly(ph, txt))
        print("\nAzure, exemple :", ssml_azure("fr-BE-VOIX", ITEMS[12][1], ITEMS[12][2]))
        return
    if a.commande == "voix":
        for f in (azure_voix, polly_voix):
            try:
                f()
            except SystemExit as e:
                print("  (ignoré)", e)
            except Exception as e:
                print("  (échec)", f.__name__, str(e)[:200])
        return
    if a.commande in ("azure", "polly") and not a.voix:
        sys.exit("--voix est obligatoire (voir la commande voix).")
    if a.commande == "azure":
        lancer_azure(a.voix, sortie, a.temoin)
    elif a.commande == "polly":
        lancer_polly(a.voix, a.moteur, sortie, a.temoin)
    construire_page(sortie)


if __name__ == "__main__":
    main()
