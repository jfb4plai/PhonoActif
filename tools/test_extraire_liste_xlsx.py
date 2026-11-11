import os
import tempfile
import unittest

import openpyxl

from extraire_liste_xlsx import extraire


def classeur(lignes, feuille='Feuil1'):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = feuille
    for l in lignes:
        ws.append(l)
    chemin = os.path.join(tempfile.mkdtemp(), 'essai.xlsx')
    wb.save(chemin)
    return chemin


TITRE = ['Vocabulaire orthographique de base']
ENTETE = ['Ordre alphabétique', 'Mots', 'Natures', 'Remarques', 'Année suggérée']


class TestExtraire(unittest.TestCase):
    def test_lignes_apres_les_titres(self):
        chemin = classeur([TITRE, ENTETE, ['A', 'à', 'm-l.', 'Inv.', 'P1'], ['A', 'abattre', 'v.', None, 'P5']])
        r = extraire(chemin, 1, niveau_col=4, nature_col=2, remarque_col=3, premiere_ligne=3)
        self.assertEqual(r, [
            {'mot': 'à', 'niveau': 'P1', 'nature': 'm-l.', 'remarque': 'Inv.'},
            {'mot': 'abattre', 'niveau': 'P5', 'nature': 'v.', 'remarque': ''},
        ])

    def test_espaces_de_fin_conserves_et_lignes_vides_ignorees(self):
        chemin = classeur([TITRE, ENTETE, ['A', 'absent ', 'adj.', None, 'P5'], [None, None, None, None, None], ['A', None, 'n.', None, 'P2']])
        r = extraire(chemin, 1, niveau_col=4, premiere_ligne=3)
        self.assertEqual([x['mot'] for x in r], ['absent '])

    def test_nombre_en_colonne_mot_devient_texte(self):
        chemin = classeur([ENTETE, ['A', 12, None, None, 'P1']])
        r = extraire(chemin, 1, niveau_col=4, premiere_ligne=2)
        self.assertEqual(r[0]['mot'], '12')

    def test_colonnes_facultatives_absentes(self):
        chemin = classeur([['chat'], ['lune']])
        r = extraire(chemin, 0)
        self.assertEqual(r, [{'mot': 'chat', 'niveau': '', 'nature': '', 'remarque': ''},
                             {'mot': 'lune', 'niveau': '', 'nature': '', 'remarque': ''}])

    def test_feuille_choisie_par_son_nom(self):
        wb = openpyxl.Workbook()
        wb.active.title = 'A'
        wb.create_sheet('Mots').append(['zèbre'])
        chemin = os.path.join(tempfile.mkdtemp(), 'deux.xlsx')
        wb.save(chemin)
        self.assertEqual(extraire(chemin, 0, feuille='Mots')[0]['mot'], 'zèbre')


if __name__ == '__main__':
    unittest.main()
