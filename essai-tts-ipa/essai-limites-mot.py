# -*- coding: utf-8 -*-
"""
Essai 5 : Azure donne-t-il l'instant exact où le mot cible est dit (événement « limite de mot » du SDK) quand le mot porte une balise <phoneme> IPA ?
Si oui, on monte le son de ce seul passage avec du code local (le volume SSML est ignoré par la voix, constaté aux essais 3 et 4).

3 mots (dans, qui, tout), phrases à 75 % comme l'essai 2 « neutre ». 2 appels Azure par mot (phrase seule + amorce C) via le SDK (pas par l'API REST des essais précédents, qui ne renvoie pas les limites).
Pour chaque mot : liste de tous les événements de limite reçus (texte, début, durée), repérage du mot cible, puis deux versions locales : gain +6 dB et +10 dB sur ce passage
(rampes de 20 ms, gain réduit si le pic dépasserait la saturation), et mesure du rapport de volume dans la fenêtre du mot.

Préalable (à lancer par JF, une fois) :  python -m pip install azure-cognitiveservices-speech
  python essai-limites-mot.py azure         # 3 appels Azure (mots courts : dans, qui, tout), événements, versions +6 / +10 dB, mesure, page
  python essai-limites-mot.py azure-longs   # 4 appels Azure, mots LONGS tirés des packs (voiture, poisson, rivière, tambour), mêmes versions ; sortie/limites-mot-longs/
  python essai-limites-mot.py azure-longs-c2 # 4 appels Azure : amorce C2 (amorce seule + silence 0,35 s + phrase seule déjà générée), +6 / +10 dB ; page ecoute-limites-mot-longs-c2.html
  python essai-limites-mot.py page          # reconstruit ecoute-limites-mot.html
  python essai-limites-mot.py page-longs    # reconstruit ecoute-limites-mot-longs.html
Clé : comme essai-charline.py, lue seulement quand JF lance « azure ». Seul du texte de phrase et de l'IPA part vers Azure.
NON ENCORE ESSAYÉ avec le SDK (non installé au moment de l'écriture) : les noms d'attributs des événements viennent de ma connaissance du SDK, pas d'un test.
"""
import html
import importlib.util
import io
import json
import math
import pathlib
import struct
import sys
import wave

ICI = pathlib.Path(__file__).resolve().parent
_e = importlib.util.spec_from_file_location("essai_phrases_75", ICI / "essai-phrases-75.py")
E2 = importlib.util.module_from_spec(_e)
_e.loader.exec_module(E2)
C, ipa_de, DEBIT = E2.C, E2.ipa_de, E2.DEBIT

MOTS = ("dans", "qui", "tout")
PHRASES = [p for p in E2.PHRASES if p[0] in MOTS]
GAINS_DB = (6, 10)
RAMPE_S = 0.02
SORTIE = ICI / "sortie" / "limites-mot"
NOM_PAGE = "ecoute-limites-mot.html"
DOSSIER_WEB = "sortie/limites-mot/"
IPA_PACK = {}


def charger_longs():
    """Mots longs : phrases et IPA réels des packs (data/packs-atelier/p1-100 et p1-illustre-4). Renvoie [(mot, avant, apres)] et remplit IPA_PACK."""
    global PHRASES, SORTIE, NOM_PAGE, DOSSIER_WEB
    sp = importlib.util.spec_from_file_location("phrases_ssml", ICI.parent / "tools" / "phrases_ssml.py")
    PS = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(PS)
    voulus = {"p1-100": ("voiture", "poisson", "rivière"), "p1-illustre-4": ("tambour",)}
    out = []
    for pack, mots in voulus.items():
        liste = json.loads((ICI.parent / "data" / "packs-atelier" / pack / "phrases-a-generer.json").read_text(encoding="utf-8"))["phrases"]
        for mot in mots:
            x = next(i for i in liste if i["mot"] == mot)
            pos = PS.trouver_mot(mot, x["phrase"])
            out.append((x["phrase"][pos[0]:pos[1]], x["phrase"][:pos[0]], x["phrase"][pos[1]:]))
            IPA_PACK[x["phrase"][pos[0]:pos[1]].lower()] = x["ipa"]
    PHRASES = out
    SORTIE = ICI / "sortie" / "limites-mot-longs"
    NOM_PAGE = "ecoute-limites-mot-longs.html"
    DOSSIER_WEB = "sortie/limites-mot-longs/"


def ipa_mot(mot):
    return IPA_PACK.get(mot.lower()) or ipa_de(mot)


def ssml_neutre(mot, avant, apres, ipa):
    ph = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{C.VOIX}"><prosody rate="{DEBIT}">{html.escape(avant)}{ph}{html.escape(apres)}</prosody></voice></speak>')


def lire_wav(octets):
    with wave.open(io.BytesIO(octets)) as w:
        assert w.getsampwidth() == 2 and w.getnchannels() == 1, "attendu : PCM 16 bits mono"
        sr = w.getframerate()
        d = w.readframes(w.getnframes())
    return list(struct.unpack("<%dh" % (len(d) // 2), d)), sr


def ecrire_wav(chemin, samples, sr):
    with wave.open(str(chemin), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(struct.pack("<%dh" % len(samples), *samples))


def appliquer_gain(samples, sr, debut_s, fin_s, db, rampe_s=RAMPE_S):
    """Multiplie le passage [debut_s, fin_s] par 10^(db/20), rampes de montée et de descente ; gain réduit si le pic dépasserait 32000.
    Renvoie (nouveaux échantillons, gain réellement appliqué en dB)."""
    a, b = max(0, int(debut_s * sr)), min(len(samples), int(fin_s * sr))
    pic = max((abs(v) for v in samples[a:b]), default=0)
    g = 10 ** (db / 20)
    if pic * g > 32000:
        g = 32000 / pic
    r = max(1, int(rampe_s * sr))
    sortie = list(samples)
    for i in range(a, b):
        k = min(1.0, (i - a) / r, (b - i) / r)         # 0 -> 1 -> 0 aux bords
        sortie[i] = int(max(-32768, min(32767, samples[i] * (1 + (g - 1) * k))))
    return sortie, 20 * math.log10(g)


def rms(x):
    return math.sqrt(sum(v * v for v in x) / max(1, len(x)))


def rapport_fenetre(avant, apres, sr, debut_s, fin_s):
    a, b = int(debut_s * sr), int(fin_s * sr)
    return rms(apres[a:b]) / max(1.0, rms(avant[a:b]))


def synthese_avec_limites(cle, region, ssml):
    import azure.cognitiveservices.speech as sdk
    cfg = sdk.SpeechConfig(subscription=cle, region=region)
    cfg.speech_synthesis_voice_name = C.VOIX
    cfg.set_speech_synthesis_output_format(sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
    synth = sdk.SpeechSynthesizer(speech_config=cfg, audio_config=None)
    evts = []

    def cb(e):
        evts.append({"texte": e.text, "debut_s": e.audio_offset / 1e7, "duree_s": e.duration.total_seconds(),
                     "type": str(e.boundary_type)})
    synth.synthesis_word_boundary.connect(cb)
    res = synth.speak_ssml_async(ssml).get()
    if res.reason != sdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"synthèse non terminée : {res.reason} {getattr(res, 'cancellation_details', '')}")
    return res.audio_data, evts


def trouver_cible(evts, mot, ipa, dernier=False):
    """Événement du mot cible. Version phrase seule : il doit être unique. Version C (le mot est aussi annoncé au début, et « comme dans » peut contenir le mot) : on prend le DERNIER."""
    cand = [e for e in evts if e["texte"].strip().lower() in (mot.lower(), ipa.lower())]
    if dernier:
        return cand[-1] if cand else None
    return cand[0] if len(cand) == 1 else None


def ssml_amorce_c(mot, avant, apres, ipa):
    """Version C : « mot, comme dans : » puis la phrase entière (même débit)."""
    ph = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{C.VOIX}"><prosody rate="{DEBIT}">{ph}, comme dans : {html.escape(avant)}{ph}{html.escape(apres)}</prosody></voice></speak>')


FORMES = (("", ssml_neutre, False), ("C_", ssml_amorce_c, True))    # (préfixe de fichier, constructeur SSML, prendre le dernier événement)


def generer():
    cle, region = C.cle_region()
    SORTIE.mkdir(parents=True, exist_ok=True)
    bilan = {}
    for mot, avant, apres in PHRASES:
        ipa = ipa_mot(mot)
        for pref, construire, dernier in FORMES:
            audio, evts = synthese_avec_limites(cle, region, construire(mot, avant, apres, ipa))
            (SORTIE / f"{mot}_{pref}events.json").write_text(json.dumps(evts, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"\n== {mot} {'(amorce C)' if pref else '(phrase seule)'} : {len(evts)} événement(s)")
            for e in evts:
                print(f"   {e['texte']!r:16} début {e['debut_s']:.3f} s  durée {e['duree_s']:.3f} s  {e['type']}")
            samples, sr = lire_wav(audio)
            ecrire_wav(SORTIE / f"{mot}_{pref}neutre.wav", samples, sr)
            cible = trouver_cible(evts, mot, ipa, dernier)
            if not cible:
                print("   -> mot cible NON repéré parmi les événements (voir la liste ci-dessus)")
                bilan[mot + pref] = "non repéré"
                continue
            d, f = cible["debut_s"], cible["debut_s"] + cible["duree_s"]
            for db in GAINS_DB:
                nouv, reel = appliquer_gain(samples, sr, d, f, db)
                ecrire_wav(SORTIE / f"{mot}_{pref}plus{db}dB.wav", nouv, sr)
                rf = rapport_fenetre(samples, nouv, sr, d, f)
                hors = rapport_fenetre(samples, nouv, sr, 0, d) if d > 0.05 else 1.0
                print(f"   +{db} dB demandé, {reel:.1f} dB appliqué : rapport dans la fenêtre du mot {rf:.2f} ; avant le mot {hors:.2f} (attendu 1,00)")
            bilan[mot + pref] = f"mot de {d:.2f} à {f:.2f} s"
    print("\nBilan :", bilan)
    page()


PAUSE_C2_S = 0.35     # silence entre l'amorce et la phrase (version C2)


def couper_silence_fin(samples, sr, seuil=300, garde_s=0.05):
    """Retire le silence en fin de prise (Azure en laisse environ une seconde) pour que la pause de C2 soit exactement celle voulue."""
    w = int(sr * 0.01)
    fin = 0
    for i in range(0, len(samples) - w, w):
        if rms(samples[i:i + w]) > seuil:
            fin = i + w
    return samples[:min(len(samples), fin + int(garde_s * sr))]


def construire_c2(amorce, phrase, evts_phrase, mot, ipa, sr, pause_s=PAUSE_C2_S):
    """C2 = amorce seule + silence + phrase seule (deux prises distinctes). Renvoie (samples neutres, début et fin du mot cible dans l'ensemble) ou (samples, None)."""
    a = couper_silence_fin(amorce, sr)
    decalage = (len(a) + int(pause_s * sr)) / sr
    tout = a + [0] * int(pause_s * sr) + phrase
    cible = trouver_cible(evts_phrase, mot, ipa)
    if not cible:
        return tout, None
    return tout, (cible["debut_s"] + decalage, cible["debut_s"] + cible["duree_s"] + decalage)


def ssml_amorce_seule(mot, ipa):
    ph = f'<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(mot)}</phoneme>'
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{C.VOIX}"><prosody rate="{DEBIT}">{ph}, comme dans :</prosody></voice></speak>')


def generer_c2():
    """Réutilise les phrases seules déjà générées (sortie/.../<mot>_neutre.wav et <mot>_events.json) : un seul appel Azure par mot, pour l'amorce."""
    cle, region = C.cle_region()
    for mot, avant, apres in PHRASES:
        ipa = ipa_mot(mot)
        fw, fe = SORTIE / f"{mot}_neutre.wav", SORTIE / f"{mot}_events.json"
        if not (fw.exists() and fe.exists()):
            sys.exit(f"Phrase seule absente pour {mot} : lancer d'abord « azure-longs ».")
        phrase, sr = lire_wav(fw.read_bytes())
        evts = json.loads(fe.read_text(encoding="utf-8"))
        audio, _ = synthese_avec_limites(cle, region, ssml_amorce_seule(mot, ipa))
        amorce, sr_a = lire_wav(audio)
        assert sr_a == sr, "fréquences d'échantillonnage différentes"
        ecrire_wav(SORTIE / f"{mot}_amorce.wav", amorce, sr)
        tout, fen = construire_c2(amorce, phrase, evts, mot, ipa, sr)
        ecrire_wav(SORTIE / f"{mot}_C2_neutre.wav", tout, sr)
        if not fen:
            print(mot, ": mot cible non repéré dans la phrase seule")
            continue
        for db in GAINS_DB:
            nouv, reel = appliquer_gain(tout, sr, fen[0], fen[1], db)
            ecrire_wav(SORTIE / f"{mot}_C2_plus{db}dB.wav", nouv, sr)
            print(f"{mot} C2 +{db} dB demandé, {reel:.1f} appliqué ; mot de {fen[0]:.2f} à {fen[1]:.2f} s ; rapport dans la fenêtre {rapport_fenetre(tout, nouv, sr, fen[0], fen[1]):.2f}")
    page_c2()


PAGE_C2 = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Amorce C2 : pause avant la phrase</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}audio{width:170px;height:32px}</style></head><body>
<h1>Amorce C2 : une vraie pause avant la phrase</h1>
<p>C +10 dB : version actuelle (amorce et phrase dans une même prise). C2 : l'amorce et la phrase sont deux prises séparées, avec %(pause)s s de silence entre les deux. Écouter surtout le début de la phrase (« Papa » ne doit pas devenir « Apa ») et le mot cible.</p><div id="t"></div>
<script>
var DATA = %(data)s, V = [["C_plus10dB", "C +10 dB (actuel)"], ["C2_plus6dB", "C2 +6 dB"], ["C2_plus10dB", "C2 +10 dB"]];
var h = "<table><tr><th>Mot et phrase</th>" + V.map(function (v) { return "<th>" + v[1] + "</th>"; }).join("") + "</tr>";
DATA.forEach(function (d) { h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "</div></td>" + V.map(function (v) {
  return "<td><audio controls preload='none' src='%(dossier)s" + encodeURIComponent(d.mot + "_" + v[0]) + ".wav'></audio></td>"; }).join("") + "</tr>"; });
document.getElementById("t").innerHTML = h + "</table>";
</script></body></html>"""


def page_c2():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}"} for m, a, p in PHRASES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / "ecoute-limites-mot-longs-c2.html").write_text(PAGE_C2 % {"data": corps, "dossier": DOSSIER_WEB, "pause": PAUSE_C2_S}, encoding="utf-8")
    print("Page :", ICI / "ecoute-limites-mot-longs-c2.html")


PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mot cible monté après coup</title>
<style>body{font-family:Arial,sans-serif;font-size:16px;margin:16px;background:#faf9f7;color:#222}table{border-collapse:collapse;width:100%%}
th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#0f6e56;color:#fff;text-align:left}.m{font-size:20px;font-weight:bold}.p{font-size:16px;font-weight:normal}audio{width:150px;height:32px}</style></head><body>
<h1>Mot cible monté après coup (limites de mot Azure)</h1>
<p>Phrases lues à 75 %% (SDK, même réglage que les packs). Colonnes 1 à 3 : la phrase seule ; colonnes 4 à 6 : « mot, comme dans : » puis la phrase, le gain portant sur le mot dans la phrase. Chaque trio vient d'un même enregistrement. Le mot cible doit ressortir sans coupure ni claquement aux bords, et le reste de la phrase doit être inchangé.</p><div id="t"></div>
<script>
var DATA = %(data)s, V = [["neutre", "%(dossier)s"], ["plus6dB", "%(dossier)s"], ["plus10dB", "%(dossier)s"], ["C_neutre", "%(dossier)s"], ["C_plus6dB", "%(dossier)s"], ["C_plus10dB", "%(dossier)s"]];
var h = "<table><tr><th>Mot et phrase</th><th>phrase seule : neutre</th><th>mot +6 dB</th><th>mot +10 dB</th><th>amorce C : neutre</th><th>mot +6 dB</th><th>mot +10 dB</th></tr>";
DATA.forEach(function (d) { h += "<tr><td class='m'>" + d.mot + "<div class='p'>" + d.phrase + "</div></td>" + V.map(function (v) {
  return "<td><audio controls preload='none' src='" + v[1] + encodeURIComponent(d.mot + "_" + v[0]) + ".wav'></audio></td>"; }).join("") + "</tr>"; });
document.getElementById("t").innerHTML = h + "</table>";
</script></body></html>"""


def page():
    data = [{"mot": m, "phrase": f"{a}<b>{m}</b>{p}"} for m, a, p in PHRASES]
    corps = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    (ICI / NOM_PAGE).write_text(PAGE % {"data": corps, "dossier": DOSSIER_WEB}, encoding="utf-8")
    print("Page :", ICI / NOM_PAGE)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "azure":
        generer()
    elif cmd == "azure-longs":
        charger_longs(); generer()
    elif cmd == "azure-longs-c2":
        charger_longs(); generer_c2()
    elif cmd == "page-longs-c2":
        charger_longs(); page_c2()
    elif cmd == "page":
        page()
    elif cmd == "page-longs":
        charger_longs(); page()
    else:
        sys.exit(__doc__)
