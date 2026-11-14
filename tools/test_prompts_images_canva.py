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


class TestFileDAttente(unittest.TestCase):
    def test_etat_d_un_lot(self):
        import tempfile
        import time
        import json
        import prochaine_image as F
        with tempfile.TemporaryDirectory() as d:
            e = F.etat(3, d)
            self.assertFalse(e["termine"])
            self.assertEqual(e["restants"], ["monde", "deux", "trois", "jour", "fête"])
            self.assertEqual(e["prochain"]["fichier"], "monde")
            self.assertIn("RGB 205, 231, 247", e["prochain"]["prompt"])
            (pathlib.Path(d) / "monde.png").write_bytes(b"x")
            self.assertEqual(F.etat(3, d)["prochain"]["fichier"], "deux")
            (pathlib.Path(d) / "en-cours.json").write_text(json.dumps({"mot": "deux", "fichier": "deux", "travail": "t", "heure": time.time()}))
            e = F.etat(3, d)
            self.assertEqual(e["en_cours"]["fichier"], "deux")
            self.assertIsNone(e["prochain"])          # une génération est déjà lancée : ne pas en relancer une autre
            (pathlib.Path(d) / "en-cours.json").write_text(json.dumps({"mot": "deux", "fichier": "deux", "travail": "t", "heure": time.time() - 3 * 3600}))
            self.assertEqual(F.etat(3, d)["prochain"]["fichier"], "deux")   # note périmée : on recommence
            for f in ("deux", "trois", "jour", "fete"):
                (pathlib.Path(d) / (f + ".png")).write_bytes(b"x")
            self.assertTrue(F.etat(3, d)["termine"])

    def test_groupes_dans_le_prompt(self):
        deux = next(m for m in P.MOTS_LOT3 if m[0] == "deux")
        self.assertTrue(P.prompt(deux).startswith("Children's picture book illustration in cut-paper collage style. A group of two identical"))


if __name__ == "__main__":
    unittest.main()
