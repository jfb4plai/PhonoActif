# -*- coding: utf-8 -*-
import pathlib
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import uniformiser_fond as U  # noqa: E402

FOND = (179, 212, 238)
CIBLE = (205, 231, 247)


def image_test():
    rng = np.random.default_rng(1)
    a = np.zeros((60, 60, 3), dtype=np.int16)
    a[:] = FOND
    a += rng.integers(-2, 3, size=a.shape)               # grain du papier
    a[20:40, 20:40] = (200, 50, 50)                       # objet rouge
    a[18:20, 20:40] = (FOND[0] - 18, FOND[1] - 18, FOND[2] - 18)   # ombre portée au-dessus de l'objet
    # anneau sombre fermé contenant du « fond » : ne doit pas bouger (non relié au bord)
    a[44:56, 44:56] = (40, 40, 40)
    a[47:53, 47:53] = FOND
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")


class TestUniformiser(unittest.TestCase):
    def test_fond_devient_la_cible(self):
        sortie = U.uniformiser(image_test(), CIBLE)
        m = U.mesure(sortie)
        self.assertTrue(all(abs(m[i] - CIBLE[i]) <= 1 for i in range(3)), m)
        coin = np.asarray(sortie)[2:10, 2:10].reshape(-1, 3).mean(axis=0)
        self.assertTrue(all(abs(coin[i] - CIBLE[i]) <= 1.5 for i in range(3)), coin)

    def test_dessin_intact(self):
        avant, apres = np.asarray(image_test()), np.asarray(U.uniformiser(image_test(), CIBLE))
        self.assertTrue((apres[22:38, 22:38] == avant[22:38, 22:38]).all())          # objet rouge
        self.assertTrue((apres[44:56, 44:56] == avant[44:56, 44:56]).all())          # anneau et intérieur non relié au bord

    def test_ombre_reste_plus_sombre_que_le_fond(self):
        apres = np.asarray(U.uniformiser(image_test(), CIBLE)).astype(int)
        ombre = apres[18:20, 22:38].reshape(-1, 3).mean(axis=0)
        fond = apres[2:10, 2:10].reshape(-1, 3).mean(axis=0)
        self.assertTrue(all(ombre[i] < fond[i] - 8 for i in range(3)), (ombre, fond))

    def test_idempotent(self):
        une = U.uniformiser(image_test(), CIBLE)
        deux = U.uniformiser(une, CIBLE)
        self.assertLessEqual(int(np.abs(np.asarray(une).astype(int) - np.asarray(deux).astype(int)).max()), 2)

    def test_ligne_de_commande_garde_l_original(self):
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            image_test().save(d / "x.png")
            octets = (d / "x.png").read_bytes()
            U.main([str(d), "--cible", "cde7f7"])
            self.assertEqual((d / "originaux-canva" / "x.png").read_bytes(), octets)
            m = U.mesure(Image.open(d / "x.png"))
            self.assertTrue(all(abs(m[i] - CIBLE[i]) <= 1 for i in range(3)))
            U.main([str(d)])    # deuxième passage : l'original n'est pas écrasé par une image déjà traitée
            self.assertEqual((d / "originaux-canva" / "x.png").read_bytes(), octets)


class TestTraiterLot2(unittest.TestCase):
    def test_une_commande_copie_uniformise_et_rend_la_planche(self):
        import traiter_lot as T
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            source = d / "brut.png"
            image_test().save(source)
            T.traiter(str(source), "jardin", 2, d / "lot2")
            m = U.mesure(Image.open(d / "lot2" / "jardin.png"))
            self.assertTrue(all(abs(m[i] - CIBLE[i]) <= 1 for i in range(3)), m)
            self.assertTrue((d / "lot2" / "originaux-canva" / "jardin.png").exists())
            self.assertTrue((d / "lot2" / "planche-lot2.html").exists())

    def test_un_png_etranger_au_lot_n_est_pas_modifie(self):
        import traiter_lot as T
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            (d / "lot2").mkdir()
            image_test().save(d / "lot2" / "jardin.png")
            image_test().save(d / "lot2" / "planche-contact.png")
            octets = (d / "lot2" / "planche-contact.png").read_bytes()
            T.traiter(None, None, 2, d / "lot2")
            self.assertEqual((d / "lot2" / "planche-contact.png").read_bytes(), octets)
            self.assertFalse((d / "lot2" / "originaux-canva" / "planche-contact.png").exists())
            m = U.mesure(Image.open(d / "lot2" / "jardin.png"))
            self.assertTrue(all(abs(m[i] - CIBLE[i]) <= 1 for i in range(3)), m)


if __name__ == "__main__":
    unittest.main()
