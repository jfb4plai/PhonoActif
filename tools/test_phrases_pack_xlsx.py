# -*- coding: utf-8 -*-
import json
import pathlib
import sys
import tempfile
import unittest

import openpyxl

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import phrases_pack_xlsx as P  # noqa: E402


def racine_test(d):
    d = pathlib.Path(d)
    (d / "public" / "packs" / "x").mkdir(parents=True)
    (d / "public" / "packs" / "x" / "manifest.json").write_text(json.dumps({"nom": "x", "mode": "lettres", "cartes": [
        {"mot": "chat", "image_sans_mot": "images/chat.png"}, {"mot": "dans"}, {"mot": "avec"}, {"mot": "plus"}]}), encoding="utf-8")
    return d


class TestPhrases(unittest.TestCase):
    def test_le_tableau_liste_les_mots_sans_image_et_aucune_phrase_n_est_preremplie(self):
        with tempfile.TemporaryDirectory() as t:
            r = racine_test(t)
            sortie, n = P.creer("x", r)
            self.assertEqual(n, 3)
            ws = openpyxl.load_workbook(sortie)[P.FEUILLE_PHRASES]
            lignes = [(c[0].value, c[1].value) for c in ws.iter_rows(min_row=2)]
            self.assertEqual(lignes, [("dans", None), ("avec", None), ("plus", None)])

    def test_lecture_acceptee_et_refusee(self):
        with tempfile.TemporaryDirectory() as t:
            r = racine_test(t)
            sortie, _ = P.creer("x", r)
            wb = openpyxl.load_workbook(sortie)
            ws = wb[P.FEUILLE_PHRASES]
            ws["B2"] = "Le chat dort dans le panier."           # dans : accepté
            ws["B3"] = "Je joue sans mon chien."                 # avec : le mot n'y est pas
            ws["B4"] = "Je veux du pain, et du lait en plus."    # plus : accepté
            wb.save(sortie)
            phrases, refuses, notes, attendus = P.lire(sortie, "x", r)
            self.assertEqual(sorted(phrases), ["dans", "plus"])
            self.assertEqual([m for m, _ in refuses], ["avec"])
            ecrit = json.loads((r / "data" / "packs-atelier" / "x" / "phrases.json").read_text(encoding="utf-8"))
            self.assertEqual(ecrit, phrases)

    def test_regles_de_verification(self):
        self.assertEqual(P.verifier("dans", "Le chat dort dans le panier."), [])
        self.assertTrue(P.verifier("dans", "Il est dansant."))                      # mot entier seulement
        self.assertTrue(P.verifier("dans", "x" * 130 + " dans"))                   # trop long
        self.assertTrue(P.verifier("dans", "J'ai 3 chats dans la maison."))         # chiffre
        self.assertTrue(any("majuscule" in x for x in P.verifier("dans", "Je pars dans la maison de Paul.")))   # nom propre probable
        self.assertEqual(P.verifier("Dans", "Dans la maison, il dort."), [])


if __name__ == "__main__":
    unittest.main()
