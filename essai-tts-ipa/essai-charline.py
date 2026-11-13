# -*- coding: utf-8 -*-
"""
Test d'acceptation Charline (fr-BE-CharlineNeural) pilotée par l'IPA.
Contenu : 37 sons isolés + 20 syllabes + 20 pseudo-mots + 6 témoins (lus sans IPA).
Sortie : sortie/azure__fr-BE-CharlineNeural/*.mp3 + ecoute.html (page de notation de JF).

Commandes (PowerShell, depuis ce dossier) :
  python essai-charline.py ssml     # affiche le SSML de chaque élément, aucun appel réseau
  python essai-charline.py azure    # ~80 appels Azure (quota F0), puis reconstruit ecoute.html
  python essai-charline.py azure -20   # idem, 20 % plus lent (dossier séparé, comparable dans la page)
  python essai-charline.py page     # reconstruit ecoute.html sans appel

Clé : variable AZURE_SPEECH_KEY (et AZURE_SPEECH_REGION, défaut northeurope), ou, à défaut,
la première ligne de C:\\Users\\jfbeg\\.azure-speech\\cle.txt (lue seulement quand JF lance la commande).
Seules les chaînes IPA partent vers Azure : aucune donnée d'élève.
"""
import importlib.util
import os
import pathlib
import sys
import time
import urllib.error

ICI = pathlib.Path(__file__).resolve().parent
VOIX = "fr-BE-CharlineNeural"
T = "̃"  # tilde combinant (nasales)

# Réutilise SSML, appel HTTP et page d'écoute de l'essai précédent
spec = importlib.util.spec_from_file_location("essai", ICI / "essai-tts-ipa.py")
E = importlib.util.module_from_spec(spec)
spec.loader.exec_module(E)

# id du son (src/core/sons.js) -> (IPA, lettres, ce qu'on doit entendre)
SONS = [
    ("a", "a", "a", "a de « papa »"),
    ("an", "ɑ" + T, "an", "an de « enfant »"),
    ("b", "b", "b", "/b/ sans « bé » ni « be »"),
    ("ch", "ʃ", "ch", "ch de « chat », long possible"),
    ("d", "d", "d", "/d/ sans « dé »"),
    ("e_ferme", "e", "é", "é de « été »"),
    ("e_ouvert", "ɛ", "è", "è de « père »"),
    ("schwa", "ə", "e", "e de « le », bref"),
    ("eu_ferme", "ø", "eu", "eu de « feu »"),
    ("eu_ouvert", "œ", "eu", "eu de « peur »"),
    ("f", "f", "f", "f de « feu », sans « effe »"),
    ("g", "g", "g", "/g/ de « gare », sans « gue »"),
    ("gn", "ɲ", "gn", "gn de « vigne »"),
    ("i", "i", "i", "i de « midi »"),
    ("in", "ɛ" + T, "in", "in de « pain »"),
    ("j", "ʒ", "j", "j de « jour », sans « ji »"),
    ("k", "k", "k", "/k/ de « car », sans « ka »"),
    ("ks", "ks", "x", "x de « taxi »"),
    ("l", "l", "l", "l de « lune », sans « elle »"),
    ("m", "m", "m", "m de « mer », sans « emme »"),
    ("n", "n", "n", "n de « nez », sans « enne »"),
    ("o_ferme", "o", "ô", "o de « chaud »"),
    ("o_ouvert", "ɔ", "o", "o de « pomme »"),
    ("oi", "wa", "oi", "oi de « moi » sans le m"),
    ("on", "ɔ" + T, "on", "on de « pont »"),
    ("ou", "u", "ou", "ou de « loup »"),
    ("p", "p", "p", "/p/ sourd, bref, sans « pé »"),
    ("r", "ʁ", "r", "r de « rat », sans « re » ni « erre »"),
    ("s", "s", "s", "s de « sac », sifflé, sans « esse »"),
    ("t", "t", "t", "/t/ sourd, bref, sans « té »"),
    ("u", "y", "u", "u de « lune »"),
    ("ui", "ɥi", "ui", "ui de « nuit »"),
    ("un", "œ" + T, "un", "un de « brun »"),
    ("v", "v", "v", "v de « vélo », sans « vé »"),
    ("w", "w", "w", "/w/ bref, sans « wo »"),
    ("z", "z", "z", "z de « zéro », sans « zède »"),
    ("yod", "j", "y", "yod de « pied » (la glissante)"),
]

SYLLABES = [  # ipa, texte écrit
    ("ma", "ma"), ("pa", "pa"), ("bi", "bi"), ("ty", "tu"), ("lo", "lo"), ("ʁe", "ré"),
    ("fu", "fou"), ("ʃi", "chi"), ("ʁɔ" + T, "ron"), ("sɛ" + T, "sin"), ("vy", "vu"),
    ("no", "nô"), ("di", "di"), ("ka", "ka"), ("ʒy", "ju"), ("zɛ", "zè"),
    ("ɡu", "gou"), ("mɑ" + T, "man"), ("pjɛ", "pié"), ("tɥi", "tui"),
]

PSEUDOS = [  # ipa, texte écrit (graphies sans ambiguïté de lecture)
    ("lypa", "lupa"), ("mivo", "mivo"), ("sotɛ", "sotè"), ("favi", "favi"), ("ʁytɑ" + T, "rutan"),
    ("pilɔ" + T, "pilon"), ("daʃy", "dachu"), ("nibu", "nibou"), ("ɡamo", "gamô"), ("vely", "vélu"),
    ("tany", "tanu"), ("zoli", "zoli"), ("bʁyna", "bruna"), ("kʁepi", "crépi"), ("ʃɔ" + T + "ba", "chonba"),
    ("lɛ" + T + "to", "linto"), ("mɑ" + T + "di", "mandi"), ("sɔlɥi", "solui"), ("fupa", "foupa"), ("ʒivy", "jivu"),
]

TEMOINS = [("ma", "ma"), ("bi", "bi"), ("lupa", "lupa"), ("mivo", "mivo"), ("sotè", "sotè"), ("tanu", "tanu")]

ITEMS = []
for sid, ipa, txt, att in SONS:
    ITEMS.append(("S-" + sid, ipa, txt, "son isolé", att))
for i, (ipa, txt) in enumerate(SYLLABES, 1):
    ITEMS.append((f"Y{i:02d}-{txt}", ipa, txt, "syllabe", f"« {txt} » en deux sons liés, sans voyelle ajoutée"))
for i, (ipa, txt) in enumerate(PSEUDOS, 1):
    ITEMS.append((f"P{i:02d}-{txt}", ipa, txt, "pseudo-mot", f"« {txt} » lu comme écrit"))
E.ITEMS = ITEMS
E.TEMOINS = []  # témoins gérés ici


def cle_region():
    cle = os.environ.get("AZURE_SPEECH_KEY", "").strip().strip('"')
    region = os.environ.get("AZURE_SPEECH_REGION", "northeurope").strip().strip('"')
    if not cle:
        f = pathlib.Path.home() / ".azure-speech" / "cle.txt"
        if f.exists():
            ligne = f.read_text(encoding="utf-8-sig").splitlines()[0].strip()
            cle = ligne.split("=", 1)[-1].strip().strip('"')
    if not cle:
        sys.exit("Aucune clé : définir AZURE_SPEECH_KEY.")
    return cle, region


def duree_s(octets):
    return len(octets) * 8 / 48000  # mp3 mono 48 kbps


def ssml(ipa, txt, vitesse):
    s = E.ssml_azure(VOIX, ipa, txt)
    if vitesse:  # ex. -20 = 20 % plus lent
        s = s.replace(f'<voice name="{VOIX}">', f'<voice name="{VOIX}"><prosody rate="{vitesse:+d}%">') \
             .replace("</voice>", "</prosody></voice>")
    return s


def lancer(sortie, vitesse=0):
    cle, region = cle_region()
    dossier = sortie / ("azure__" + VOIX + (f"__{vitesse:+d}" if vitesse else ""))
    lignes = []
    for iid, ipa, txt, cat, _att in ITEMS:
        if vitesse and cat != "syllabe":  # ralentir : seulement les syllabes (décision JF)
            continue
        try:
            data = E.azure_appel(cle, region, ssml(ipa, txt, vitesse))
            E.ecrire(dossier, iid + ".mp3", data)
            lignes.append((iid, cat, ipa, round(duree_s(data), 2), "ok"))
        except urllib.error.HTTPError as e:
            lignes.append((iid, cat, ipa, 0, f"ERR {e.code} " + e.read().decode("utf-8", "replace")[:120]))
        except Exception as e:  # réseau
            lignes.append((iid, cat, ipa, 0, "ERR " + str(e)[:120]))
        time.sleep(0.15)
    for _ipa, txt in ([] if vitesse else TEMOINS):
        iid = "T-" + txt
        try:
            data = E.azure_appel(cle, region, E.ssml_azure_texte(VOIX, txt))
            E.ecrire(dossier, iid + ".mp3", data)
            lignes.append((iid, "témoin sans IPA", "", round(duree_s(data), 2), "ok"))
        except Exception as e:
            lignes.append((iid, "témoin sans IPA", "", 0, "ERR " + str(e)[:120]))
    for l in lignes:
        print(*l, sep=" | ", flush=True)
    n_err = sum(1 for l in lignes if l[4] != "ok")
    print(f"\n{len(lignes) - n_err} réussis, {n_err} erreurs.")
    return lignes


# Réglage retenu par JF le 2026-11-12 : sons isolés bons à vitesse normale (écoutés),
# syllabes bonnes à -30 % (écoutées). Pseudo-mots à -30 % : HYPOTHÈSE, pas encore écoutés.
VITESSE_PAR_CATEGORIE = {"son isolé": 0, "syllabe": -30, "pseudo-mot": -30}


def lancer_final(sortie):
    cle, region = cle_region()
    dossier = sortie / ("azure__" + VOIX + "__final")
    n_err = 0
    for iid, ipa, txt, cat, _att in ITEMS:
        v = VITESSE_PAR_CATEGORIE[cat]
        try:
            data = E.azure_appel(cle, region, ssml(ipa, txt, v))
            E.ecrire(dossier, iid + ".mp3", data)
            print(iid, cat, v, round(duree_s(data), 2), "ok", flush=True)
        except Exception as e:
            n_err += 1
            print(iid, cat, v, "ERR", str(e)[:120], flush=True)
        time.sleep(0.15)
    print(f"\n{len(ITEMS) - n_err} réussis, {n_err} erreurs.")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    sortie = ICI / "sortie"
    if cmd == "ssml":
        for iid, ipa, txt, cat, _a in ITEMS:
            print(iid, "|", cat, "|", E.ssml_azure(VOIX, ipa, txt))
        print(f"\n{len(ITEMS)} éléments + {len(TEMOINS)} témoins")
    elif cmd == "azure":
        v = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        lancer(sortie, v)
        E.construire_page(sortie)
    elif cmd == "final":  # réglage retenu : voir VITESSE_PAR_CATEGORIE
        lancer_final(sortie)
        E.construire_page(sortie)
    elif cmd == "item":  # régénère un seul élément, vitesse normale : python essai-charline.py item P10-vélu
        cible = sys.argv[2]
        cle, region = cle_region()
        for iid, ipa, txt, cat, _a in ITEMS:
            if iid == cible:
                data = E.azure_appel(cle, region, ssml(ipa, txt, 0))
                E.ecrire(sortie / ("azure__" + VOIX), iid + ".mp3", data)
                print(iid, ipa, round(duree_s(data), 2), "s ok")
                break
        else:
            sys.exit("Élément inconnu : " + cible)
        E.construire_page(sortie)
    elif cmd == "page":
        E.construire_page(sortie)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
