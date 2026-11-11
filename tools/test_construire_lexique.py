import os
import tempfile
import unittest

import openpyxl

from construire_lexique import lire_feuille

NOM_FEUILLE = 'manulemme-ver2.4'


def ligne(ortho, phono, classe, nb_syll, p1, p2, p15, graphemes, codes):
    r = [None] * 14
    r[0], r[1], r[2], r[7] = ortho, phono, classe, nb_syll
    r[8], r[9], r[10] = p1, p2, p15
    r[12], r[13] = graphemes, codes
    return r


def classeur(lignes):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = NOM_FEUILLE
    ws.append(['ManuLemme ver. 2.4'])
    ws.append([None] * 14)
    ws.append(['ortho', 'phono', 'class'])
    ws.append([None] * 14)
    for l in lignes:
        ws.append(l)
    chemin = os.path.join(tempfile.mkdtemp(), 'essai.xlsx')
    wb.save(chemin)
    return chemin


class TestLireFeuille(unittest.TestCase):
    def test_entree_valide(self):
        chemin = classeur([ligne('chat', 'Sa', 'NC', 1, 1714.06, 1254.98, 785.24, '.ch.a.t', '.S.a.#')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(rejets, [])
        self.assertEqual(len(entrees), 1)
        e = entrees[0]
        self.assertEqual(e['ortho'], 'chat')
        self.assertEqual(e['graphemes'], ['ch', 'a', 't'])
        self.assertEqual(e['codes'], ['S', 'a', '#'])
        self.assertEqual(e['nbSyllabes'], 1)
        self.assertEqual(e['freq'], {'P1': 1714.06, 'P2': 1254.98, 'P1_5': 785.24})

    def test_code_numerique_converti_en_chaine(self):
        chemin = classeur([
            ligne('bien', 'bj5', 'ADV', 1, 1, 1, 1, '.b.i.en', '.b.j.5'),
            ligne('pain', 'p5', 'NC', 1, 1, 1, 1, '.p.ain', '.p.5'),
            ligne('un', '1', 'DET', 1, 1, 1, 1, '.un', 1),
        ])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(rejets, [])
        par_mot = {e['ortho']: e for e in entrees}
        self.assertEqual(par_mot['bien']['codes'], ['b', 'j', '5'])
        self.assertIsInstance(par_mot['bien']['codes'][-1], str)
        self.assertEqual(par_mot['un']['codes'], ['1'])
        self.assertIsInstance(par_mot['un']['codes'][0], str)

    def test_nombre_de_graphemes_different_du_nombre_de_codes_rejete(self):
        chemin = classeur([ligne('chat', 'Sa', 'NC', 1, 1, 1, 1, '.ch.a.t', '.S.a')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(entrees, [])
        self.assertEqual(rejets[0]['ortho'], 'chat')
        self.assertIn('graphèmes', rejets[0]['raison'])

    def test_graphemes_differents_du_mot_rejete(self):
        chemin = classeur([ligne('chat', 'Sa', 'NC', 1, 1, 1, 1, '.c.h.a', '.k.#.a')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(entrees, [])
        self.assertIn('ne recompose pas', rejets[0]['raison'])

    def test_annotation_cc_des_consonnes_doubles_retiree(self):
        chemin = classeur([ligne('elle', 'El', 'PRO', 1, 1, 1, 1, '.e[CC].ll.e', '.E.l.°')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(rejets, [])
        self.assertEqual(entrees[0]['graphemes'], ['e', 'll', 'e'])
        self.assertEqual(entrees[0]['codes'], ['E', 'l', '°'])

    def test_ligne_de_titre_ignoree_sans_etre_comptee_comme_rejet(self):
        chemin = classeur([ligne('chat', 'Sa', 'NC', 1, 1, 1, 1, '.ch.a.t', '.S.a.#')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual(len(entrees), 1)
        self.assertEqual(rejets, [])

    def test_lignes_vides_et_en_tete_ignorees(self):
        chemin = classeur([[None] * 14, ['ortho'] + [None] * 13,
                           ligne('lune', 'lyn', 'NC', 1, 1, 1, 1, '.l.u.n.e', '.l.y.n.°')])
        entrees, rejets = lire_feuille(chemin)
        self.assertEqual([e['ortho'] for e in entrees], ['lune'])
        self.assertEqual(rejets, [])
        self.assertEqual(entrees[0]['codes'][-1], '°')


if __name__ == '__main__':
    unittest.main()
