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
