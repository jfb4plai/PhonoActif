import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, creerListe, rapportParNiveau } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const liste = lignes => creerListe({ id: 'e', nom: 'E', source: 's', licence: 'l', niveaux: ['P1', 'P2', 'P3'], lignes }).liste;
const MINI = liste([
  { mot: 'chat', niveau: 'P1' }, { mot: 'lune', niveau: 'P2' }, { mot: 'zorbalon', niveau: 'P2' },
  { mot: 'pain', niveau: 'P3' }, { mot: 'examen', niveau: 'P3' }
]);
const EXAMEN = [{ g: 'e', son: 'e_ouvert' }, { g: 'x', son: 'g+z' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'en', son: 'in' }];

test('une ligne par niveau, nombres exacts', () => {
  const { lignes } = rapportParNiveau(MINI, lex);
  assert.deepEqual(lignes.map(l => l.niveau), ['P1', 'P2', 'P3']);
  const [p1, p2, p3] = lignes;
  assert.deepEqual({ ...p1 }, { niveau: 'P1', mots: 1, trouves: 1, absents: 0, aVerifier: 0, multiMots: 0, liaisonsNouvelles: 3, motsIgnores: 0 });
  assert.deepEqual([p2.mots, p2.trouves, p2.absents, p2.aVerifier, p2.motsIgnores], [2, 1, 1, 1, 1]);
  assert.deepEqual([p3.mots, p3.trouves, p3.absents, p3.aVerifier, p3.motsIgnores], [2, 2, 0, 1, 1]);
  assert.ok(p2.liaisonsNouvelles > 0 && p3.liaisonsNouvelles > 0);
});

test('le total somme les lignes', () => {
  const { lignes, total } = rapportParNiveau(MINI, lex);
  for (const champ of ['mots', 'trouves', 'absents', 'aVerifier', 'multiMots', 'liaisonsNouvelles', 'motsIgnores']) {
    assert.equal(total[champ], lignes.reduce((s, l) => s + l[champ], 0), champ);
  }
  assert.equal(total.niveau, 'total');
  assert.equal(total.mots, 5);
});

test('multiMots compte espaces, apostrophes et traits d\'union', () => {
  const l = liste([{ mot: 'à peu près', niveau: 'P1' }, { mot: "l'ami", niveau: 'P1' }, { mot: 'peut-être', niveau: 'P1' }, { mot: 'chat', niveau: 'P1' }]);
  assert.equal(rapportParNiveau(l, lex).lignes[0].multiMots, 3);
});

test('un niveau sans mot : ligne de zéros', () => {
  const { lignes } = rapportParNiveau(liste([{ mot: 'chat', niveau: 'P1' }]), lex);
  assert.deepEqual({ ...lignes[1] }, { niveau: 'P2', mots: 0, trouves: 0, absents: 0, aVerifier: 0, multiMots: 0, liaisonsNouvelles: 0, motsIgnores: 0 });
});

test('une correction valide fait baisser aVerifier et motsIgnores', () => {
  const corr = creerCorrections([{ mot: 'examen', cubes: EXAMEN, statut: 'corrige', auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;
  const p3 = rapportParNiveau(MINI, lex, corr).lignes[2];
  assert.equal(p3.aVerifier, 0);
  assert.equal(p3.motsIgnores, 0);
});
