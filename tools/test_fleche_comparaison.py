# -*- coding: utf-8 -*-
import pathlib, sys, tempfile, unittest

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fleche_comparaison as F  # noqa: E402

FOND = (205, 231, 247)


def base(chemin):
    im = Image.new("RGB", (200, 200), FOND)
    d = ImageDraw.Draw(im)
    d.ellipse((38, 60, 113, 135), fill=F.TEAL)     # grand
    d.ellipse((122, 95, 161, 135), fill=F.TEAL)    # petit
    im.save(chemin)
    return im


def orange(im):
    a = np.array(im.convert("RGB")).astype(int)
    m = (abs(a[:, :, 0] - 249) < 30) & (abs(a[:, :, 1] - 115) < 40) & (abs(a[:, :, 2] - 22) < 50)
    ys, xs = np.where(m)
    return m, xs, ys


class TestFleche(unittest.TestCase):
    def test_la_fleche_est_au_dessus_du_bon_disque_et_le_reste_est_identique(self):
        with tempfile.TemporaryDirectory() as t:
            b = pathlib.Path(t) / "base.png"
            ref = base(b)
            g, p = F.produire(b, t)
            ig, ip = Image.open(g), Image.open(p)
            mg, xg, yg = orange(ig)
            mp, xp, yp = orange(ip)
            self.assertGreater(mg.sum(), 100)
            self.assertTrue(38 <= xg.min() and xg.max() <= 113 and yg.max() < 60)      # au-dessus du grand disque
            self.assertTrue(122 <= xp.min() and xp.max() <= 161 and yp.max() < 95)     # au-dessus du petit disque
            self.assertAlmostEqual(int(mg.sum()), int(mp.sum()), delta=8)             # même flèche dans les deux images
            # hors du cadre de la flèche (ombre comprise), les deux images sont identiques à la base
            a, bm, r = np.array(ig).astype(int), np.array(ip).astype(int), np.array(ref).astype(int)
            hors = np.ones(a.shape[:2], bool)
            hors[0:70, 0:200] = False
            hors[60:100, 100:200] = False
            self.assertEqual(int(abs(a[hors] - r[hors]).max()), 0)
            self.assertEqual(int(abs(bm[hors] - r[hors]).max()), 0)

    def test_erreur_si_pas_deux_disques(self):
        with tempfile.TemporaryDirectory() as t:
            Image.new("RGB", (50, 50), FOND).save(pathlib.Path(t) / "v.png")
            with self.assertRaises(ValueError):
                F.produire(pathlib.Path(t) / "v.png", t)


if __name__ == "__main__":
    unittest.main()
