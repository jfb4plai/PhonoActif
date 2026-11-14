# -*- coding: utf-8 -*-
"""SSML d'une phrase d'aide : le mot cible est lu avec l'IPA du pack (comme les autres audios), le reste de la phrase est lu par la voix normalement.
Variante « neutre » (aucune insistance). Les variantes essayées le 2026-11-13 (volume, emphase, complet : essai-tts-ipa/essai-phrases.py) ne sont pas retenues
tant que JF ne les a pas choisies. Pur, sans réseau : testé sans Azure."""
import hashlib
import html
import re

VOIX = "fr-BE-CharlineNeural"
LETTRES = "A-Za-zÀ-ÿœŒæÆ0-9_"


def trouver_mot(mot, phrase):
    """Position (début, fin) de la PREMIÈRE occurrence du mot entier dans la phrase, ou None."""
    m = re.search(r"(?<![" + LETTRES + r"])" + re.escape(mot) + r"(?![" + LETTRES + r"])", phrase, flags=re.IGNORECASE)
    return (m.start(), m.end()) if m else None


def ssml_phrase(phrase, mot, ipa, voix=VOIX):
    pos = trouver_mot(mot, phrase)
    if pos:
        avant, cible, apres = phrase[:pos[0]], phrase[pos[0]:pos[1]], phrase[pos[1]:]
        corps = f'{html.escape(avant)}<phoneme alphabet="ipa" ph="{html.escape(ipa, quote=True)}">{html.escape(cible)}</phoneme>{html.escape(apres)}'
    else:
        corps = html.escape(phrase)    # mot non retrouvé tel quel : phrase lue sans consigne de prononciation
    return ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-BE">'
            f'<voice name="{voix}">{corps}</voice></speak>')


def empreinte(phrase, ipa):
    """Nom stable du fichier brut : change si la phrase ou l'IPA change, pour ne pas réutiliser un audio périmé."""
    return hashlib.sha1((phrase + "|" + ipa).encode("utf-8")).hexdigest()[:10]
