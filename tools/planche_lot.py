# -*- coding: utf-8 -*-
"""Planche HTML (autonome, images intégrées) d'un lot d'images du pack de 100 mots.
Usage : python -I tools/planche_lot.py [--lot 3]   ->  docs/images-canva/lot<N>/planche-lot<N>.html   (lot 2 par défaut)
Relancer après chaque nouvelle image copiée dans docs/images-canva/lot<N>/<fichier>.png (les mots attendus viennent de MOTS_LOT<N>).
Chaque vignette indique la couleur de fond MESURÉE (coins de l'image) à côté de la couleur demandée (#cde7f7)."""
import base64
import html
import importlib.util
import pathlib
import datetime

RACINE = pathlib.Path(__file__).resolve().parent.parent
DEMANDEE = (0xCD, 0xE7, 0xF7)


def dossier_du_lot(lot):
    return RACINE / "docs" / "images-canva" / f"lot{lot}"


def charger_mots(lot=2):
    spec = importlib.util.spec_from_file_location("prompts", RACINE / "tools" / "prompts_images_canva.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return [(x[0], x[1]) for x in m.LOTS[lot]]


def fond_mesure(chemin):
    from PIL import Image
    im = Image.open(chemin).convert("RGB")
    w, h = im.size
    pts = [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4), (w // 2, 3), (3, h // 2)]
    px = [im.getpixel(p) for p in pts]
    return tuple(round(sum(c[i] for c in px) / len(px)) for i in range(3))


def hexa(c):
    return "#%02x%02x%02x" % c


def ecart(c):
    return max(abs(c[i] - DEMANDEE[i]) for i in range(3))


def main(lot=2, dossier=None):
    dossier = pathlib.Path(dossier) if dossier else dossier_du_lot(lot)
    dossier.mkdir(parents=True, exist_ok=True)
    mots = charger_mots(lot)
    faites = 0
    figures = []
    for mot, fichier in mots:
        p = dossier / (fichier + ".png")
        if p.exists():
            faites += 1
            c = fond_mesure(p)
            b64 = base64.b64encode(p.read_bytes()).decode()
            alerte = ' class="ecart"' if ecart(c) > 20 else ""
            figures.append(
                f'<figure><img src="data:image/png;base64,{b64}" alt="{html.escape(mot)}" width="200" height="200">'
                f'<figcaption><strong>{html.escape(mot)}</strong><br><span{alerte}>fond mesuré {hexa(c)} (RVB {c[0]}, {c[1]}, {c[2]}), écart {ecart(c)}/255</span></figcaption></figure>')
        else:
            figures.append(f'<figure class="attente"><div class="vide">à générer</div><figcaption><strong>{html.escape(mot)}</strong><br><span>en attente (plafond Canva)</span></figcaption></figure>')
    d = DEMANDEE
    page = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lot {lot} : images à valider</title>
<style>
body {{ font-family: Arial, sans-serif; background:#fff8ea; color:#1a1713; margin:0; padding:20px; font-size:18px; line-height:1.5; }}
h1 {{ font-size:1.6rem; margin:0 0 6px; }}
.note {{ max-width:60rem; }}
.swatch {{ display:inline-block; width:1.4em; height:1.4em; vertical-align:middle; border:2px solid #1a1713; background:#cde7f7; }}
figure {{ display:inline-block; margin:12px; text-align:center; vertical-align:top; }}
img, .vide {{ width:200px; height:200px; display:block; margin:0 auto; border:2px solid #1a1713; }}
.vide {{ display:grid; place-items:center; background:#eee; color:#555; border-style:dashed; }}
figcaption {{ font-size:16px; max-width:230px; margin:4px auto 0; }}
.ecart {{ color:#9c1c0c; font-weight:bold; }}
</style></head><body>
<h1>Lot {lot} du pack de 100 mots : à valider par JF</h1>
<p class="note">{faites} image(s) sur {len(mots)}. Mise à jour : {datetime.date.today().isoformat()}. Images <strong>non publiées</strong> dans le pack.
Fond demandé : <span class="swatch"></span> <strong>#cde7f7</strong> (RVB {d[0]}, {d[1]}, {d[2]} ; TSL 203°, 72 %, 89 %). Canva l'approche sans l'atteindre ; les fonds de ces images ont donc été <strong>uniformisés</strong> par tools/uniformiser_fond.py (les originaux de Canva sont dans originaux-canva). Un écart en rouge signalerait un fond non uniformisé.</p>
{''.join(figures)}
</body></html>"""
    (dossier / f"planche-lot{lot}.html").write_text(page, encoding="utf-8")
    print(f"écrit : {dossier / f'planche-lot{lot}.html'} ({faites}/{len(mots)} images)")


if __name__ == "__main__":
    import sys
    main(int(sys.argv[sys.argv.index("--lot") + 1]) if "--lot" in sys.argv else 2)
