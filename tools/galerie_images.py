# -*- coding: utf-8 -*-
r"""Galerie unique de toutes les images PhonoActif : pack des 20 mots illustrés, lots 2, 3, 4… (une page HTML autonome, images intégrées).
Page : docs/images-canva/galerie-images.html. Elle se recharge toute seule toutes les 60 secondes : tant qu'elle est ouverte, une nouvelle image apparaît sans rien faire.
Mise à jour : automatique à chaque nouvelle image, parce que tools/traiter_lot.py (utilisé pour chaque génération) la régénère. À la main :
  python -I tools/galerie_images.py
Chaque vignette indique le mot, le fond mesuré (écart avec #cde7f7) et les packs qui l'utilisent. Les mots d'un lot pas encore générés ont un emplacement « à générer » ;
celui en cours de génération est signalé. « Dernières générations » : les 6 fichiers des lots les plus récemment écrits."""
import base64
import datetime
import html
import importlib.util
import json
import pathlib
import sys

ICI = pathlib.Path(__file__).resolve().parent
RACINE = ICI.parent
sys.path.insert(0, str(ICI))
import planche_lot  # noqa: E402


def _prompts():
    spec = importlib.util.spec_from_file_location("prompts", ICI / "prompts_images_canva.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def packs_utilisant(racine, nom_fichier):
    """Noms des packs dont une carte utilise ce fichier image."""
    res = []
    for man in sorted((racine / "public" / "packs").glob("*/manifest.json")):
        try:
            d = json.loads(man.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if any((c.get("image_sans_mot") or "").endswith("/" + nom_fichier) for c in d.get("cartes", [])):
            res.append(man.parent.name)
    return res


def collecter(racine=RACINE):
    P = _prompts()
    sections = []
    # pack des 20 mots illustrés : images validées par JF
    man = racine / "public" / "packs" / "p1-20-images" / "manifest.json"
    if man.exists():
        d = json.loads(man.read_text(encoding="utf-8"))
        items = []
        for c in d["cartes"]:
            f = c.get("image_sans_mot")
            if f:
                chemin = man.parent / f
                items.append({"mot": c["mot"], "chemin": chemin if chemin.exists() else None, "etat": "validée" if chemin.exists() else "absente"})
        sections.append({"titre": "Pack des 20 mots illustrés (validées)", "items": items, "lot": None})
    for lot, mots in sorted(P.LOTS.items()):
        dossier = racine / "docs" / "images-canva" / f"lot{lot}"
        note = dossier / "en-cours.json"
        en_cours = None
        if note.exists():
            try:
                en_cours = json.loads(note.read_text(encoding="utf-8")).get("fichier")
            except ValueError:
                pass
        items = []
        for mot, fichier in [(m[0], m[1]) for m in mots]:
            p = dossier / (fichier + ".png")
            if p.exists():
                items.append({"mot": mot, "chemin": p, "etat": "à valider"})
            else:
                items.append({"mot": mot, "chemin": None, "etat": "en cours de génération" if en_cours == fichier else "à générer"})
        sections.append({"titre": f"Lot {lot}", "items": items, "lot": lot})
    return sections


def construire(racine=RACINE, autonome=True, maintenant=None):
    sections = collecter(racine)
    maintenant = maintenant or datetime.datetime.now()
    total = sum(1 for s in sections for i in s["items"] if i["chemin"])
    attendues = sum(len(s["items"]) for s in sections)
    recents = sorted([(i["chemin"].stat().st_mtime, s["titre"], i) for s in sections if s["lot"] for i in s["items"] if i["chemin"]], key=lambda x: -x[0])[:6]

    def vignette(i, titre):
        mot = html.escape(i["mot"])
        if not i["chemin"]:
            cls = "attente" + (" encours" if i["etat"].startswith("en cours") else "")
            return f'<figure class="{cls}"><div class="vide">{html.escape(i["etat"])}</div><figcaption><strong>{mot}</strong></figcaption></figure>'
        c = planche_lot.fond_mesure(i["chemin"])
        ec = planche_lot.ecart(c)
        alerte = ' class="ecart"' if ec > 20 else ""
        src = ("data:image/png;base64," + base64.b64encode(i["chemin"].read_bytes()).decode()) if autonome else i["chemin"].as_uri()
        packs = packs_utilisant(racine, i["chemin"].name)
        usage = ("dans : " + ", ".join(packs)) if packs else "dans aucun pack"
        return (f'<figure><img src="{src}" alt="{mot}" width="200" height="200">'
                f'<figcaption><strong>{mot}</strong><br><span class="etat">{html.escape(i["etat"])}</span><br>'
                f'<span{alerte}>fond {planche_lot.hexa(c)} (écart {ec}/255)</span><br><span class="usage">{html.escape(usage)}</span></figcaption></figure>')

    corps = []
    if recents:
        corps.append('<section><h2>Dernières générations</h2>' + "".join(vignette(i, t) for _, t, i in recents) + "</section>")
    for s in sections:
        faites = sum(1 for i in s["items"] if i["chemin"])
        corps.append(f'<section><h2>{html.escape(s["titre"])} <small>({faites} sur {len(s["items"])})</small></h2>' + "".join(vignette(i, s["titre"]) for i in s["items"]) + "</section>")
    d = planche_lot.DEMANDEE
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60"><title>Galerie des images PhonoActif</title>
<style>
body {{ font-family: Arial, sans-serif; background:#fff8ea; color:#1a1713; margin:0; padding:20px; font-size:18px; line-height:1.45; }}
h1 {{ font-size:1.7rem; margin:0 0 6px; }} h2 {{ font-size:1.3rem; margin:28px 0 6px; border-bottom:3px solid #1a1713; padding-bottom:4px; }} h2 small {{ font-weight:normal; font-size:1rem; }}
.note {{ max-width:62rem; }} .swatch {{ display:inline-block; width:1.3em; height:1.3em; vertical-align:middle; border:2px solid #1a1713; background:#cde7f7; }}
figure {{ display:inline-block; margin:10px; text-align:center; vertical-align:top; width:230px; }}
img, .vide {{ width:200px; height:200px; display:block; margin:0 auto; border:2px solid #1a1713; background:#fff; }}
.vide {{ display:grid; place-items:center; background:#eee; color:#555; border-style:dashed; font-size:16px; padding:8px; box-sizing:border-box; }}
.encours .vide {{ background:#fff3c4; border-color:#b07d00; color:#6b4b00; font-weight:bold; }}
figcaption {{ font-size:15px; margin-top:4px; }} .etat {{ font-weight:bold; }} .usage {{ color:#4a4338; }} .ecart {{ color:#9c1c0c; font-weight:bold; }}
</style></head><body>
<h1>Galerie des images PhonoActif</h1>
<p class="note"><strong>{total} image(s)</strong> générées sur {attendues} prévues. Mise à jour : {maintenant.strftime('%Y-%m-%d %H:%M:%S')}. Cette page se recharge toute seule chaque minute : une nouvelle génération y apparaît sans rien faire.
Fond demandé : <span class="swatch"></span> <strong>#cde7f7</strong> (RVB {d[0]}, {d[1]}, {d[2]}). « à valider » : image reçue, pas encore validée par JF ; « dans : … » : packs qui l'utilisent déjà.</p>
{''.join(corps)}
</body></html>"""


def main(racine=RACINE, sortie=None, autonome=True):
    sortie = pathlib.Path(sortie) if sortie else racine / "docs" / "images-canva" / "galerie-images.html"
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text(construire(racine, autonome), encoding="utf-8")
    print(f"écrit : {sortie}")
    return sortie


if __name__ == "__main__":
    main()
