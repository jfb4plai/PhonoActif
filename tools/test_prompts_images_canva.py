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
        neige = next(m for m in P.MOTS if m[0] == "neige")
        self.assertTrue(P.prompt(neige).startswith("Children's picture book illustration in cut-paper collage style. A group of several"))


class TestNombres(unittest.TestCase):
    def test_tout_nombre_est_le_chiffre_seul_sans_pommes(self):
        for mot, (en, n) in P.NOMBRES.items():
            p = P.prompt(P.entree_nombre(mot))
            self.assertIn(f"the numeral {n}", p, mot)
            self.assertIn("no apples", p, mot)
            self.assertIn("one single flat orange paper piece", p, mot)
            self.assertNotIn("identical red apple", p, mot)
            self.assertNotIn("Exactly", p, mot)                      # plus de « Exactly n apples »

    def test_les_nombres_n_ont_plus_d_image_de_reference(self):
        for mot in P.NOMBRES:
            self.assertEqual(P.references_de(mot), [], mot)
        self.assertEqual(P.references_de("jour"), [])

    def test_un_seul_sujet_et_le_chiffre_dix_a_deux_chiffres(self):
        self.assertTrue(P.prompt(P.entree_nombre("deux")).startswith("Children's picture book illustration in cut-paper collage style. One single the numeral 2"))
        self.assertIn("digits 10", P.prompt(P.entree_nombre("dix")))


class TestFete(unittest.TestCase):
    def test_fete_est_une_retouche_de_la_v1_avec_confettis_et_notes(self):
        fete = next(m for m in P.MOTS_LOT3 if m[0] == "fête")
        self.assertEqual(P.references_de("fête"), ["MAHa5Zs7GdA"])
        p = P.prompt(fete)
        self.assertIn("confetti", p)
        self.assertIn("musical notes", p)
        self.assertNotIn("No confetti", p)
        self.assertIn("exactly as in the reference image", p)


class TestArbre(unittest.TestCase):
    def test_arbre_est_une_retouche_de_la_v1_avec_des_branches(self):
        arbre = next(m for m in P.MOTS_LOT4 if m[0] == "arbre")
        self.assertEqual(P.references_de("arbre"), ["MAHa5sjOz-w"])
        p = P.prompt(arbre)
        self.assertIn("four to five thin branches", p)
        self.assertIn("exactly as in the reference image", p)


class TestLot4(unittest.TestCase):
    def test_lot_4_douze_mots_de_la_liste_p1(self):
        self.assertEqual([m[0] for m in P.MOTS_LOT4], ["oiseau", "renard", "arbre", "lapin", "fenêtre", "train", "chapeau", "château", "cheval", "fromage", "gâteau", "avion"])
        self.assertEqual(len(set(m[1] for m in P.MOTS_LOT4)), 12)

    def test_animaux_de_profil_un_seul_oeil(self):
        for m in P.MOTS_LOT4:
            if m[0] in ("oiseau", "renard", "lapin", "cheval"):
                self.assertIn("single small dark dot for the eye", P.prompt(m), m[0])


if __name__ == "__main__":
    unittest.main()
