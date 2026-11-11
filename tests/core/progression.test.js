import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, creerListe, liaisonsParNiveau, liaisonsConnuesJusqua } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const liste = (lignes) => creerListe({ id: 'e', nom: 'E', source: 's', licence: 'l', niveaux: ['P1', 'P2', 'P3'], lignes }).liste;
const MINI = liste([
  { mot: 'chat', niveau: 'P1' }, { mot: 'lune', niveau: 'P2' }, { mot: 'zorbalon', niveau: 'P2' },
  { mot: 'pain', niveau: 'P3' }, { mot: 'examen', niveau: 'P3' }
]);
const EXAMEN = [{ g: 'e', son: 'e_ouvert' }, { g: 'x', son: 'g+z' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'en', son: 'in' }];
const corr = (mot, cubes, statut = 'corrige') =>
  creerCorrections([{ mot, cubes, statut, auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;

test('un élément par niveau déclaré, dans l\'ordre', () => {
  assert.deepEqual(liaisonsParNiveau(MINI, lex).map(n => n.niveau), ['P1', 'P2', 'P3']);
});

test('P1 : les liaisons de chat', () => {
  const p1 = liaisonsParNiveau(MINI, lex)[0];
  assert.deepEqual(p1.nouvelles, ['a=a', 'ch=ch', 't=']);
  assert.equal(p1.motsRetenus, 1);
  assert.deepEqual(p1.motsIgnores, []);
});

test('P2 : seules les liaisons nouvelles, mot absent ignoré avec sa raison', () => {
  const p2 = liaisonsParNiveau(MINI, lex)[1];
  assert.ok(p2.nouvelles.includes('l=l') && p2.nouvelles.includes('u=u'));
  assert.ok(!p2.nouvelles.includes('a=a'));
  assert.deepEqual(p2.motsIgnores, [{ mot: 'zorbalon', raison: 'absent du lexique' }]);
  assert.ok(!p2.cumulees.has('z=z'));
  assert.equal(p2.motsRetenus, 1);
});

test('P3 : un mot à code inconnu est ignoré, puis retenu une fois corrigé', () => {
  const p3 = liaisonsParNiveau(MINI, lex)[2];
  assert.equal(p3.motsIgnores.length, 1);
  assert.equal(p3.motsIgnores[0].mot, 'examen');
  assert.ok(p3.motsIgnores[0].raison.includes('son inconnu'));
  assert.ok(!p3.cumulees.has('x=g+z'));
  const avec = liaisonsParNiveau(MINI, lex, corr('examen', EXAMEN))[2];
  assert.deepEqual(avec.motsIgnores, []);
  assert.ok(avec.nouvelles.includes('x=g+z'));
});

test('une correction a_valider ne suffit pas', () => {
  const p3 = liaisonsParNiveau(MINI, lex, corr('examen', EXAMEN, 'a_valider'))[2];
  assert.equal(p3.motsIgnores.length, 1);
});

test('les liaisons cumulées croissent, sans fuite entre niveaux', () => {
  const [p1, p2, p3] = liaisonsParNiveau(MINI, lex);
  assert.ok([...p1.cumulees].every(l => p2.cumulees.has(l)));
  assert.ok([...p2.cumulees].every(l => p3.cumulees.has(l)));
  assert.ok(p3.cumulees.size > p2.cumulees.size && p2.cumulees.size > p1.cumulees.size);
});

test('la casse compte : ch=ch connu ne rend pas s=s connu', () => {
  const p1 = liaisonsParNiveau(MINI, lex)[0];
  assert.ok(p1.cumulees.has('ch=ch'));
  assert.ok(!p1.cumulees.has('s=s'));
});

test('liaisonsConnuesJusqua', () => {
  const prog = liaisonsParNiveau(MINI, lex);
  assert.deepEqual([...liaisonsConnuesJusqua(prog, 'P2')].sort(), [...prog[1].cumulees].sort());
  assert.equal(liaisonsConnuesJusqua(prog, 'P7').size, 0);
});

test('liste vide : un élément vide par niveau, sans exception', () => {
  const prog = liaisonsParNiveau(liste([]), lex);
  assert.equal(prog.length, 3);
  assert.ok(prog.every(n => n.nouvelles.length === 0 && n.cumulees.size === 0 && n.motsRetenus === 0 && n.motsIgnores.length === 0));
});

test('un multi-mots non validé est ignoré', () => {
  const p = liaisonsParNiveau(liste([{ mot: 'à peu près', niveau: 'P1' }]), lex)[0];
  assert.equal(p.motsRetenus, 0);
  assert.ok(p.motsIgnores[0].raison.includes('plusieurs mots'));
});
