# -*- coding: utf-8 -*-
import json
import pathlib
import sys
import tempfile
import time
import unittest

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import galerie_images as G  # noqa: E402


def png(chemin, couleur=(205, 231, 247)):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (40, 40), couleur).save(chemin)


def monde(d):
    d = pathlib.Path(d)
    png(d / "public" / "packs" / "p1-20-images" / "images" / "chat.png")
    (d / "public" / "packs" / "p1-20-images" / "manifest.json").write_text(json.dumps({"nom": "p1-20-images", "cartes": [{"mot": "chat", "image_sans_mot": "images/chat.png"}]}), encoding="utf-8")
    (d / "public" / "packs" / "p1-100").mkdir(parents=True)
    (d / "public" / "packs" / "p1-100" / "manifest.json").write_text(json.dumps({"nom": "p1-100", "cartes": [{"mot": "jardin", "image_sans_mot": "images/jardin.png"}]}), encoding="utf-8")
    png(d / "docs" / "images-canva" / "lot2" / "jardin.png")
    png(d / "docs" / "images-canva" / "lot3" / "monde.png", (179, 212, 238))
    return d


class TestGalerie(unittest.TestCase):
    def test_toutes_les_images_et_les_emplacements_a_generer(self):
        with tempfile.TemporaryDirectory() as t:
            r = monde(t)
            page = G.construire(r)
            self.assertIn("3 image(s)", page)                                  # chat (pack des 20) + jardin (lot 2) + monde (lot 3)
            for titre in ("Pack des 20 mots illustrés", "Lot 2", "Lot 3", "Lot 4", "Dernières générations"):
                self.assertIn(titre, page)
            self.assertIn("à générer", page)                                   # mots du lot 4 pas encore générés
            self.assertIn("dans : p1-100", page)                               # jardin est dans le pack de 100
            self.assertIn("dans aucun pack", page)                             # monde n'est dans aucun pack
            self.assertIn('class="ecart"', page)                               # fond de monde : écart de 26

    def test_la_page_se_recharge_toute_seule(self):
        with tempfile.TemporaryDirectory() as t:
            self.assertIn('<meta http-equiv="refresh" content="60">', G.construire(monde(t)))

    def test_une_nouvelle_image_apparait_a_la_regeneration_et_l_en_cours_est_signale(self):
        with tempfile.TemporaryDirectory() as t:
            r = monde(t)
            (r / "docs" / "images-canva" / "lot4").mkdir(parents=True)
            (r / "docs" / "images-canva" / "lot4" / "en-cours.json").write_text(json.dumps({"fichier": "oiseau", "mot": "oiseau"}), encoding="utf-8")
            avant = G.construire(r)
            self.assertIn("en cours de génération", avant)
            self.assertIn("3 image(s)", avant)
            time.sleep(0.05)
            png(r / "docs" / "images-canva" / "lot4" / "oiseau.png")
            apres = G.construire(r)
            self.assertIn("4 image(s)", apres)

    def test_ecriture_du_fichier(self):
        with tempfile.TemporaryDirectory() as t:
            r = monde(t)
            sortie = G.main(r)
            self.assertTrue(pathlib.Path(sortie).exists())
            self.assertEqual(pathlib.Path(sortie).name, "galerie-images.html")


if __name__ == "__main__":
    unittest.main()
