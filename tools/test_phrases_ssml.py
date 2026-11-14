# -*- coding: utf-8 -*-
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import phrases_ssml as S  # noqa: E402


class TestSsml(unittest.TestCase):
    def test_le_mot_cible_porte_l_ipa_et_le_reste_est_echappe(self):
        s = S.ssml_phrase("Le chat & le chien dorment dans le panier.", "dans", "dɑ̃")
        self.assertIn('<phoneme alphabet="ipa" ph="dɑ̃">dans</phoneme>', s)
        self.assertIn("Le chat &amp; le chien dorment ", s)
        self.assertIn(" le panier.", s)
        self.assertIn('<voice name="fr-BE-CharlineNeural">', s)

    def test_mot_entier_seulement_et_majuscule_conservee(self):
        s = S.ssml_phrase("Dans la maison, il dort dansant.", "dans", "dɑ̃")
        self.assertIn('<phoneme alphabet="ipa" ph="dɑ̃">Dans</phoneme>', s)    # première occurrence, casse de la phrase
        self.assertEqual(s.count("<phoneme"), 1)                               # « dansant » n'est pas le mot

    def test_mot_introuvable_phrase_lue_sans_consigne(self):
        s = S.ssml_phrase("Il danse.", "dans", "dɑ̃")
        self.assertNotIn("<phoneme", s)

    def test_empreinte_change_avec_la_phrase_ou_l_ipa(self):
        a = S.empreinte("Le chat dort.", "a")
        self.assertEqual(a, S.empreinte("Le chat dort.", "a"))
        self.assertNotEqual(a, S.empreinte("Le chat dort ici.", "a"))
        self.assertNotEqual(a, S.empreinte("Le chat dort.", "b"))


if __name__ == "__main__":
    unittest.main()
