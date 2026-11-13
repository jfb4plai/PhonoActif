# -*- coding: utf-8 -*-
"""Tests du modèle xlsx de pack et de son lecteur. Lancer : python -m unittest discover -s tools -p "test_*.py"  (ou python -I tools/test_modele_pack_xlsx.py)"""
import importlib.util
import pathlib
import tempfile
import unittest

import openpyxl

ICI = pathlib.Path(__file__).resolve().parent
_s = importlib.util.spec_from_file_location("modele_pack_xlsx", ICI / "modele_pack_xlsx.py")
M = importlib.util.module_from_spec(_s)
_s.loader.exec_module(M)


def remplir(chemin, pack, mots, vider_exemples=False):
    """Ouvre le modèle créé, remplit la feuille Pack (liste de 4 valeurs) et les lignes de mots à partir de la ligne 6."""
    wb = openpyxl.load_workbook(chemin)
    p = wb[M.FEUILLE_PACK]
    for i, v in enumerate(pack, start=2):
        p.cell(row=i, column=2, value=v)
    m = wb[M.FEUILLE_MOTS]
    for i, ligne in enumerate(mots, start=6):
        for j, v in enumerate(ligne, start=1):
            m.cell(row=i, column=j, value=v)
    wb.save(chemin)


class Modele(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.xlsx = self.tmp / "m.xlsx"
        M.creer_modele(self.xlsx)
        self.images = self.tmp / "images"
        self.images.mkdir()
        (self.images / "chat.png").write_bytes(b"x")
        (self.images / "chat-mot.png").write_bytes(b"x")

    def test_modele_vierge_est_refuse_sans_mot(self):
        pack, erreurs, _ = M.lire_modele(self.xlsx)
        self.assertIsNone(pack)
        self.assertTrue(any("Nom du pack" in e for e in erreurs))
        self.assertTrue(any("aucun mot valide" in e for e in erreurs))

    def test_pack_valide_pour_mon_usage(self):
        remplir(self.xlsx, ["classe-3b", "Les mots de 3B", "pour mon usage", "Prenom.Nom@Exemple.be"],
                [("Chat", "p1", "chat.png", "chat-mot.png", "Dessin de l'enseignant", "propre", "Le chat dort.", ""), ("lune", "P1", "", "", "", "", "", "")])
        pack, erreurs, avert = M.lire_modele(self.xlsx, self.images)
        self.assertEqual(erreurs, [])
        self.assertEqual(avert, [])
        self.assertEqual(pack["visibilite"], "prive")
        self.assertEqual(pack["proprietaire"], "prenom.nom@exemple.be")
        self.assertEqual([c["mot"] for c in pack["cartes"]], ["chat", "lune"])
        self.assertEqual(pack["cartes"][0]["niveau"], "P1")
        self.assertEqual(pack["cartes"][0]["image"], "chat.png")

    def test_lignes_exemple_et_aide_sont_ignorees(self):
        remplir(self.xlsx, ["pack-un", "Titre", "à partager avec tous", ""], [("pomme", "P2", "", "", "", "", "", "")])
        pack, erreurs, _ = M.lire_modele(self.xlsx)
        self.assertEqual(erreurs, [])
        self.assertEqual([c["mot"] for c in pack["cartes"]], ["pomme"])
        self.assertEqual(pack["visibilite"], "commun")
        self.assertEqual(pack["proprietaire"], "")

    def test_pour_mon_usage_exige_le_courriel(self):
        remplir(self.xlsx, ["pack-un", "Titre", "pour mon usage", ""], [("pomme", "", "", "", "", "", "", "")])
        pack, erreurs, _ = M.lire_modele(self.xlsx)
        self.assertIsNone(pack)
        self.assertTrue(any("e-mail" in e for e in erreurs))

    def test_nom_invalide_et_utilisation_invalide(self):
        remplir(self.xlsx, ["Mon Pack", "Titre", "peut-être", ""], [("pomme", "", "", "", "", "", "", "")])
        _, erreurs, _ = M.lire_modele(self.xlsx)
        self.assertTrue(any("Nom du pack" in e for e in erreurs))
        self.assertTrue(any("Utilisation" in e for e in erreurs))

    def test_mots_refuses_ou_ignores_sans_bloquer(self):
        remplir(self.xlsx, ["pack-un", "Titre", "à partager avec tous", ""],
                [("pomme", "P9", "", "", "", "", "", ""), ("pomme", "", "", "", "", "", "", ""), ("l'eau", "", "", "", "", "", "", ""), ("rez-de-chaussée", "", "", "", "", "", "", ""),
                 ("a", "", "", "", "", "", "", ""), ("", "P1", "", "", "", "", "", "pas de mot")])
        pack, erreurs, avert = M.lire_modele(self.xlsx)
        self.assertEqual(erreurs, [])
        self.assertEqual([c["mot"] for c in pack["cartes"]], ["pomme"])
        self.assertEqual(pack["cartes"][0]["niveau"], "")           # P9 non prévu
        texte = " ".join(avert)
        self.assertIn("doublon", texte)
        self.assertIn("l'eau", texte)
        self.assertIn("rez-de-chaussée", texte)
        self.assertIn("« a »", texte)
        self.assertIn("pas de mot", texte)

    def test_image_sans_source_ou_introuvable_est_ignoree(self):
        remplir(self.xlsx, ["pack-un", "Titre", "à partager avec tous", ""],
                [("chat", "", "chat.png", "", "", "", "", ""), ("chien", "", "chien.png", "", "moi", "propre", "", ""), ("souris", "", "souris.gif", "", "moi", "propre", "", "")])
        pack, erreurs, avert = M.lire_modele(self.xlsx, self.images)
        self.assertEqual(erreurs, [])
        self.assertEqual([c["image"] for c in pack["cartes"]], ["", "", ""])
        t = " ".join(avert)
        self.assertIn("source ou licence", t)
        self.assertIn("introuvable", t)
        self.assertIn("extension", t)

    def test_image_avec_mot_sans_image_simple_ignoree(self):
        remplir(self.xlsx, ["pack-un", "Titre", "à partager avec tous", ""], [("chat", "", "", "chat-mot.png", "moi", "propre", "", "")])
        pack, _, avert = M.lire_modele(self.xlsx, self.images)
        self.assertEqual(pack["cartes"][0]["image_mot"], "")
        self.assertTrue(any("sans image simple" in a for a in avert))

    def test_chemin_dans_nom_de_fichier_refuse(self):
        remplir(self.xlsx, ["pack-un", "Titre", "à partager avec tous", ""], [("chat", "", "../chat.png", "", "moi", "propre", "", "")])
        pack, _, avert = M.lire_modele(self.xlsx, self.images)
        self.assertEqual(pack["cartes"][0]["image"], "")
        self.assertTrue(any("sans dossier" in a for a in avert))

    def test_ecriture_copie_les_images_et_refuse_d_ecraser(self):
        remplir(self.xlsx, ["pack-essai", "Titre", "à partager avec tous", ""], [("chat", "P1", "chat.png", "", "moi", "propre", "", "")])
        pack, _, _ = M.lire_modele(self.xlsx, self.images)
        racine = self.tmp / "racine"
        chemin = M.ecrire_pack(pack, self.images, racine=racine)
        self.assertTrue((racine / "public" / "packs" / "pack-essai" / "images" / "chat.png").is_file())
        self.assertEqual(pack["cartes"][0]["image"], "images/chat.png")
        self.assertTrue(chemin.is_file())
        pack2, _, _ = M.lire_modele(self.xlsx, self.images)
        with self.assertRaises(FileExistsError):
            M.ecrire_pack(pack2, self.images, racine=racine)
        M.ecrire_pack(pack2, self.images, remplacer=True, racine=racine)

    def test_fichier_sans_les_bonnes_feuilles(self):
        wb = openpyxl.Workbook()
        wb.save(self.tmp / "autre.xlsx")
        pack, erreurs, _ = M.lire_modele(self.tmp / "autre.xlsx")
        self.assertIsNone(pack)
        self.assertTrue(any("Feuilles" in e for e in erreurs))


if __name__ == "__main__":
    unittest.main()
