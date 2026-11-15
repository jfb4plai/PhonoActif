# -*- coding: utf-8 -*-
"""
Phrases d'aide « C2 » pour les packs, +10 dB sur le mot cible (décision de JF, 2026-11-15, après écoute de l'essai C2).
Une phrase C2 = amorce « mot, comme dans : » (prise 1) + silence de 0,35 s + phrase entière (prise 2, lue à 75 %), le mot cible de la phrase monté de +10 dB
après coup (le volume SSML est ignoré par Charline, constaté). Limites de mot par le SDK Azure (python -m pip install azure-cognitiveservices-speech).

Génération PAR MOT (pas par pack) : une phrase identique dans plusieurs packs n'est demandée qu'une fois (156 phrases de packs, 136 distinctes).
Cache brut : sortie/bibliotheque/brut-c2/<clé>_phrase.wav, _events.json, _amorce.wav (clé = mot + phrase + IPA + débit). Reprenable : rien n'est redemandé s'il existe.
Le gain et la pause se règlent sans nouvel appel Azure (assemblage local).

  python generer-c2-packs.py compter                   # combien d'appels Azure manquent, aucun appel
  python generer-c2-packs.py azure [pack ...]          # appels Azure manquants (2 par phrase distincte), puis assemblage, normalisation, copie dans public/packs/<pack>/audio
  python generer-c2-packs.py assembler [pack ...]      # SANS Azure : assemble ce qui est en cache (rapporte ce qui manque)
Options : --mots a,b,c (limiter à ces mots)   --dest DOSSIER (écrire ailleurs que dans public/packs, pour essayer)
Packs par défaut : p1-100 p1-20-images p1-illustre-2 p1-illustre-3 p1-illustre-4. Les noms de fichiers des packs ne changent pas (manifestes inchangés).
Clé Azure : comme essai-charline.py, lue seulement pour « azure », seulement s'il manque un fichier.
Seul du texte de phrase et de l'IPA part vers Azure.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import pathlib
import shutil
import sys
import time
import unicodedata

ICI = pathlib.Path(__file__).resolve().parent


def _charger(nom, chemin):
    s = importlib.util.spec_from_file_location(nom, chemin)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


L = _charger("limites", ICI / "essai-limites-mot.py")
N = _charger("normaliser", ICI.parent / "tools" / "normaliser_audio.py")
PS = _charger("phrases_ssml", ICI.parent / "tools" / "phrases_ssml.py")

GAIN_DB = 10.0
PAUSE_S = 0.35
AMORCE_AU_NIVEAU_DU_MOT = True   # le mot cité en amorce est monté au niveau (RMS de parole) du mot cible déjà monté de GAIN_DB ; décidé par JF le 2026-11-15 (amorce jugée peu audible)
AMORCE_GAIN_MAX_DB = 15.0
PACKS = ["p1-100", "p1-20-images", "p1-illustre-2", "p1-illustre-3", "p1-illustre-4"]
BASE = ICI / "sortie" / "bibliotheque"
BRUT, ASSEMBLE, NORM = BASE / "brut-c2", BASE / "assemble-c2", BASE / "norm-c2"
VERSION_SSML = "c2-v1"          # à changer si la forme du SSML change : invalide le cache


def cle(x):
    h = hashlib.sha1("|".join([x["mot"], x["phrase"], x["ipa"], L.DEBIT, VERSION_SSML]).encode("utf-8")).hexdigest()[:10]
    ascii_ = unicodedata.normalize("NFKD", x["mot"]).encode("ascii", "ignore").decode() or "mot"
    return f"{ascii_}_{h}"


def liste_pack(nom):
    return json.loads((ICI.parent / "data" / "packs-atelier" / nom / "phrases-a-generer.json").read_text(encoding="utf-8"))["phrases"]


def fichiers_bruts(k):
    return BRUT / f"{k}_phrase.wav", BRUT / f"{k}_events.json", BRUT / f"{k}_amorce.wav"


def distinctes(packs, mots):
    vus = {}
    for p in packs:
        for x in liste_pack(p):
            if mots and x["mot"] not in mots:
                continue
            vus.setdefault((x["mot"], x["phrase"], x["ipa"]), x)
    return list(vus.values())


def generer_bruts(xs):
    cle_az = None
    nouveaux = erreurs = 0
    BRUT.mkdir(parents=True, exist_ok=True)
    for x in xs:
        k = cle(x)
        fp, fe, fa = fichiers_bruts(k)
        if fp.exists() and fe.exists() and fa.exists():
            continue
        if cle_az is None:
            cle_az = L.C.cle_region()
        for essai in range(3):
            try:
                if not (fp.exists() and fe.exists()):
                    audio, evts = L.synthese_avec_limites(*cle_az, PS.ssml_phrase(x["phrase"], x["mot"], x["ipa"]))
                    fp.write_bytes(audio)
                    fe.write_text(json.dumps(evts, ensure_ascii=False), encoding="utf-8")
                if not fa.exists():
                    audio, _ = L.synthese_avec_limites(*cle_az, L.ssml_amorce_seule(x["mot"], x["ipa"]))
                    fa.write_bytes(audio)
                nouveaux += 1
                break
            except Exception as e:
                if essai == 2:
                    erreurs += 1
                    print("ERR", x["mot"], str(e)[:140], flush=True)
                else:
                    time.sleep(2)
        time.sleep(0.15)
    print(f"{nouveaux} phrases demandées à Azure, {erreurs} erreur(s).")


def booster_exact(samples, sr, d, f, db):
    """Gain de +db sur [d, f] avec rampes de 20 ms. Si le pic dépasserait 32000, TOUT le fichier est atténué (le rapport mot / reste reste exact),
    la normalisation ramène ensuite le pic à -3 dB. Renvoie (échantillons, atténuation globale en dB)."""
    g = 10 ** (db / 20)
    a, b = max(0, int(d * sr)), min(len(samples), int(f * sr))
    r = max(1, int(L.RAMPE_S * sr))
    sortie = [float(v) for v in samples]
    for i in range(a, b):
        k = min(1.0, (i - a) / r, (b - i) / r)
        sortie[i] = samples[i] * (1 + (g - 1) * k)
    pic = max(abs(v) for v in sortie)
    ech = min(1.0, 32000 / pic) if pic else 1.0
    return [int(round(v * ech)) for v in sortie], 20 * math.log10(ech)


def rms_parole(x, sr):
    """RMS des seules fenêtres de 10 ms qui portent de la parole (silences et pauses ignorés)."""
    w = int(sr * 0.01)
    fr = [x[i:i + w] for i in range(0, len(x) - w, w)]
    voix = [v for f in fr if L.rms(f) > 300 for v in f]
    return L.rms(voix) if voix else 0.0


def cible_dans_events(evts, x):
    pos = PS.trouver_mot(x["mot"], x["phrase"])
    if not pos:
        return None
    texte = x["phrase"][pos[0]:pos[1]].lower()
    cand = [e for e in evts if e["texte"].strip().lower() in (texte, x["ipa"].lower())]
    return cand[0] if cand else None       # première occurrence, comme PS.trouver_mot


def assembler(x):
    """Renvoie (chemin mp3 normalisé, texte d'état). None si le brut manque."""
    k = cle(x)
    fp, fe, fa = fichiers_bruts(k)
    if not (fp.exists() and fe.exists() and fa.exists()):
        return None, "brut absent"
    phrase, sr = L.lire_wav(fp.read_bytes())
    amorce, sr_a = L.lire_wav(fa.read_bytes())
    if sr != sr_a:
        return None, "fréquences différentes"
    evts = json.loads(fe.read_text(encoding="utf-8"))
    a = L.couper_silence_fin(amorce, sr)
    cible = cible_dans_events(evts, x)
    sig = f"g{int(GAIN_DB)}p{int(PAUSE_S * 100)}" + ("a" if AMORCE_AU_NIVEAU_DU_MOT else "")
    note_amorce = ""
    if AMORCE_AU_NIVEAU_DU_MOT and cible:
        r_mot = rms_parole(phrase[int(cible["debut_s"] * sr):int((cible["debut_s"] + cible["duree_s"]) * sr)], sr) * 10 ** (GAIN_DB / 20)
        r_am = rms_parole(a, sr)
        if r_am > 0 and r_mot > r_am:
            ga = min(r_mot / r_am, 10 ** (AMORCE_GAIN_MAX_DB / 20))
            a = [v * ga for v in a]    # flottants : pas d'écrêtage ici, l'atténuation globale de booster_exact ramène le pic sous 32000
            note_amorce = f", amorce +{20 * math.log10(ga):.1f} dB"
    tout = a + [0] * int(PAUSE_S * sr) + phrase
    decal = len(a) / sr + PAUSE_S
    ASSEMBLE.mkdir(parents=True, exist_ok=True)
    if cible:
        d, f = cible["debut_s"] + decal, cible["debut_s"] + cible["duree_s"] + decal
        final, att = booster_exact(tout, sr, d, f, GAIN_DB)
        etat = f"mot {d:.2f}-{f:.2f} s, atténuation globale {att:.1f} dB{note_amorce}"
    else:
        tout = [max(-32768, min(32767, int(v))) for v in tout]
        final, etat = tout, "MOT NON REPÉRÉ : phrase sans gain"
    wav = ASSEMBLE / f"{k}_{sig}.wav"
    L.ecrire_wav(wav, final, sr)
    mp3 = NORM / f"{k}_{sig}.mp3"
    if not mp3.exists() or mp3.stat().st_mtime < wav.stat().st_mtime:
        N.normaliser(wav, mp3)
    return mp3, etat


def copier(packs, mots, dest_racine):
    manque, non_repere, total = [], [], 0
    for p in packs:
        dest = (pathlib.Path(dest_racine) / p / "audio") if dest_racine else (ICI.parent / "public" / "packs" / p / "audio")
        dest.mkdir(parents=True, exist_ok=True)
        n = 0
        for x in liste_pack(p):
            if mots and x["mot"] not in mots:
                continue
            mp3, etat = assembler(x)
            if mp3 is None:
                manque.append((p, x["mot"], etat))
                continue
            if "NON REPÉRÉ" in etat:
                non_repere.append((p, x["mot"]))
            shutil.copyfile(mp3, dest / pathlib.Path(x["fichier"]).name)
            n += 1
        total += n
        print(f"{p} : {n} phrases C2 copiées dans {dest}")
    print(f"Total {total} ; brut absent : {manque or 'aucun'} ; mot non repéré (sans gain) : {non_repere or 'aucun'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("commande", choices=["compter", "azure", "assembler"])
    ap.add_argument("packs", nargs="*")
    ap.add_argument("--mots", default="")
    ap.add_argument("--dest", default="")
    a = ap.parse_args()
    packs = a.packs or PACKS
    mots = set(m for m in a.mots.split(",") if m)
    xs = distinctes(packs, mots)
    if a.commande == "compter":
        manquants = [x for x in xs if not all(f.exists() for f in fichiers_bruts(cle(x)))]
        print(f"{len(xs)} phrases distinctes ; {len(manquants)} à demander à Azure ({2 * len(manquants)} appels au plus) ; {len(xs) - len(manquants)} déjà en cache.")
        return
    if a.commande == "azure":
        generer_bruts(xs)
    copier(packs, mots, a.dest)


if __name__ == "__main__":
    main()
