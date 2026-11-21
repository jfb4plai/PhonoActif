import test from 'node:test';
import assert from 'node:assert/strict';
import { libelleLiaison } from '../../src/enseignant/liaison.js';

test('liaison lisible : lettres → son entre crochets, muet quand le son est vide', () => {
  assert.equal(libelleLiaison('ch=ch'), 'ch → [ʃ]');
  assert.equal(libelleLiaison('a=a'), 'a → [a]');
  assert.equal(libelleLiaison('t='), 't → muet');
  assert.equal(libelleLiaison('on=on'), 'on → [ɔ̃]');
});

test('son absent de la table IPA : affiché tel quel ; format inattendu : inchangé', () => {
  assert.equal(libelleLiaison('x=inconnu'), 'x → [inconnu]');
  assert.equal(libelleLiaison('sansegal'), 'sansegal');
});

import { etatLiaison, syntheseClasse } from '../../src/enseignant/liaison.js';

test('état d\'une liaison : seuils provisoires 0 / 1-49 / 50 % de ratés au premier coup, aucun sans essai', () => {
  assert.equal(etatLiaison(undefined), 'aucun');
  assert.equal(etatLiaison({ essais: 0, justesDuPremierCoup: 0 }), 'aucun');
  assert.equal(etatLiaison({ essais: 4, justesDuPremierCoup: 4 }), 'acquis');
  assert.equal(etatLiaison({ essais: 4, justesDuPremierCoup: 3 }), 'fragile');
  assert.equal(etatLiaison({ essais: 4, justesDuPremierCoup: 2 }), 'difficile');
});

test('synthèse de classe : liaisons classées par nombre d\'élèves en difficulté, grille par élève, élève sans essai = tirets', () => {
  const L = (liaison, essais, justes) => ({ liaison, essais, justesDuPremierCoup: justes });
  const lignes = [
    { id: 'a', code: 'E01', essais: 6, liaisons: [L('ch=ch', 4, 1), L('a=a', 4, 4)] },
    { id: 'b', code: 'E02', essais: 6, liaisons: [L('ch=ch', 4, 2), L('t=', 2, 1)] },
    { id: 'c', code: 'E03', essais: 0, liaisons: [] }
  ];
  const s = syntheseClasse(lignes);
  assert.deepEqual(s.liaisons.map(x => [x.liaison, x.nbDifficile]), [['ch=ch', 2], ['t=', 1]]); // « a=a » jamais ratée : absente
  assert.deepEqual(s.grille.map(g => [g.code, g.cellules]), [['E01', ['difficile', 'aucun']], ['E02', ['difficile', 'difficile']], ['E03', ['aucun', 'aucun']]]);
  assert.deepEqual(syntheseClasse([], 6), { liaisons: [], grille: [] });
});
