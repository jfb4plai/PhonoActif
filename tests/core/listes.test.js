import test from 'node:test';
import assert from 'node:assert/strict';
import { nettoyerMot, creerListe, motsDuNiveau, motsJusquAuNiveau } from '../../src/core/index.js';

const NIVEAUX = ['P1', 'P2', 'P3'];
const params = (lignes, plus = {}) => ({ id: 'essai', nom: 'Essai', source: 'test', licence: 'propre', niveaux: NIVEAUX, lignes, ...plus });

test('nettoyerMot : variante avec « ou »', () => {
  assert.deepEqual(nettoyerMot('août ou aout'), { mots: ['août', 'aout'], remarque: '' });
});

test('nettoyerMot : parenthèse qui est un mot = variante', () => {
  assert.deepEqual(nettoyerMot('abimer (abîmer)'), { mots: ['abimer', 'abîmer'], remarque: '' });
});

test('nettoyerMot : autre parenthèse = remarque', () => {
  assert.deepEqual(nettoyerMot("asseoir (s')"), { mots: ['asseoir'], remarque: "(s')" });
});

test('nettoyerMot : espaces, vide, mots à plusieurs mots', () => {
  assert.deepEqual(nettoyerMot('  absent '), { mots: ['absent'], remarque: '' });
  assert.deepEqual(nettoyerMot(''), { mots: [], remarque: '' });
  assert.deepEqual(nettoyerMot('à peu près'), { mots: ['à peu près'], remarque: '' });
  assert.deepEqual(nettoyerMot('ou'), { mots: ['ou'], remarque: '' });
  assert.deepEqual(nettoyerMot(undefined), { mots: [], remarque: '' });
});

test('creerListe : un champ obligatoire vide lève une erreur qui nomme le champ', () => {
  for (const champ of ['id', 'nom', 'source', 'licence']) {
    assert.throws(() => creerListe(params([], { [champ]: ' ' })), new RegExp(champ));
  }
  assert.throws(() => creerListe(params([], { niveaux: [] })), /niveaux/);
});

test('creerListe : une ligne valide donne une entrée complète', () => {
  const { liste, avertissements } = creerListe(params([{ mot: 'à', niveau: 'P1', nature: 'm-l.', remarque: 'Inv.' }]));
  assert.deepEqual(avertissements, []);
  assert.deepEqual(liste.entrees, [{ mot: 'à', niveau: 'P1', nature: 'm-l.', remarque: 'Inv.', motBrut: 'à' }]);
  assert.equal(liste.source, 'test');
  assert.deepEqual(liste.niveaux, NIVEAUX);
});

test('creerListe : niveau inconnu ou vide écarté avec avertissement', () => {
  const { liste, avertissements } = creerListe(params([{ mot: 'chat', niveau: 'P7' }, { mot: 'lune', niveau: '' }, { mot: 'pain', niveau: 'P1' }]));
  assert.deepEqual(liste.entrees.map(e => e.mot), ['pain']);
  assert.deepEqual(avertissements, ['chat : niveau inconnu « P7 »', 'lune : niveau manquant']);
});

test('creerListe : mot dans plusieurs années, la plus précoce gagne', () => {
  const { liste, avertissements } = creerListe(params([{ mot: 'chat', niveau: 'P3' }, { mot: 'chat', niveau: 'P1' }]));
  assert.deepEqual(liste.entrees.map(e => [e.mot, e.niveau]), [['chat', 'P1']]);
  assert.deepEqual(avertissements, ['chat : présent en P1 et P3, gardé en P1']);
});

test('creerListe : mot répété au même niveau fusionné, natures jointes sans doublon', () => {
  const { liste, avertissements } = creerListe(params([
    { mot: 'car', niveau: 'P2', nature: 'n.m.' }, { mot: 'car', niveau: 'P2', nature: 'conj.' }, { mot: 'car', niveau: 'P2', nature: 'n.m.' }
  ]));
  assert.equal(liste.entrees.length, 1);
  assert.equal(liste.entrees[0].nature, 'n.m., conj.');
  assert.deepEqual(avertissements, []);
});

test('creerListe : ligne sans mot ignorée, variantes en deux entrées', () => {
  const { liste } = creerListe(params([{ mot: '  ', niveau: 'P1' }, { mot: undefined, niveau: 'P1' }, { mot: 'août ou aout', niveau: 'P2' }]));
  assert.deepEqual(liste.entrees.map(e => e.mot), ['aout', 'août']);
  assert.ok(liste.entrees.every(e => e.motBrut === 'août ou aout'));
});

test('creerListe : triée par niveau puis par mot', () => {
  const { liste } = creerListe(params([{ mot: 'zèbre', niveau: 'P2' }, { mot: 'lune', niveau: 'P1' }, { mot: 'arbre', niveau: 'P2' }, { mot: 'chat', niveau: 'P1' }]));
  assert.deepEqual(liste.entrees.map(e => e.mot), ['chat', 'lune', 'arbre', 'zèbre']);
});

test('motsDuNiveau et motsJusquAuNiveau', () => {
  const { liste } = creerListe(params([{ mot: 'chat', niveau: 'P1' }, { mot: 'lune', niveau: 'P2' }, { mot: 'pain', niveau: 'P3' }]));
  assert.deepEqual(motsDuNiveau(liste, 'P2'), ['lune']);
  assert.deepEqual(motsJusquAuNiveau(liste, 'P2'), ['chat', 'lune']);
  assert.deepEqual(motsJusquAuNiveau(liste, 'P7'), []);
  assert.deepEqual(motsDuNiveau(liste, 'P7'), []);
});
