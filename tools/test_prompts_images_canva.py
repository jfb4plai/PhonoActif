# -*- coding: utf-8 -*-
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import prompts_images_canva as P  # noqa: E402


class TestPrompts(unittest.TestCase):
    def test_le_fond_est_decrit_en_valeurs_exactes(self):
        for m in P.TOUS:
            p = P.prompt(m)
            self.assertIn("#cde7f7", p, m[0])
            self.assertIn("RGB 205, 231, 247", p, m[0])
            self.assertIn("no gradient", p, m[0])

    def test_la_verification_exige_l_uniformisation(self):
        for m in P.TOUS:
            v = P.verification(m)
            self.assertIn("uniformiser_fond.py", v)
            self.assertIn("3/255", v)

    def test_le_csv_porte_l_etape_apres_generation(self):
        chemin = P.ecrire_csv()
        entete = chemin.read_text(encoding="utf-8-sig").split("\n", 1)[0]
        self.assertIn("après génération", entete)
        self.assertIn("uniformiser_fond.py", chemin.read_text(encoding="utf-8-sig"))

    def test_lot_2_connu(self):
        self.assertEqual([m[0] for m in P.MOTS_LOT2], ["jardin", "école", "lit", "feu", "rivière"])


if __name__ == "__main__":
    unittest.main()
