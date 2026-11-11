import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, creerCorrections, filtrerMots, analyserListe, validerPack } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const TOUT = { liaisonsConnues: new Set(), tolerance: 99 };
const corr = (mot, cubes, statut = 'corrige') =>
  creerCorrections([{ mot, cubes, statut, auteur: 'JF', date: '2026-11-11', raison: 'essai' }]).corrections;
const EXAMEN = [{ g: 'e', son: 'e_ouvert' }, { g: 'x', son: 'g+z' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'en', son: 'in' }];
const PDT = [{ g: 'pomme', son: 'p+o_ouvert+m' }, { g: ' ', son: '' }, { g: 'de', son: 'd+schwa' }, { g: ' ', son: '' }, { g: 'terre', son: 't+e_ouvert+r' }];
const mots = res => res.map(r => r.mot);

test('filtrerMots : un mot à code inconnu est proposé une fois corrigé', () => {
  assert.ok(!mots(filtrerMots(lex, TOUT)).includes('examen'));
  const res = filtrerMots(lex, { ...TOUT, corrections: corr('examen', EXAMEN) });
  const ex = res.find(r => r.mot === 'examen');
  assert.ok(ex);
  assert.ok(ex.liaisons.includes('x=g+z'));
});

test('filtrerMots : une correction a_valider ne suffit pas', () => {
  assert.ok(!mots(filtrerMots(lex, { ...TOUT, corrections: corr('examen', EXAMEN, 'a_valider') })).includes('examen'));
});

test('filtrerMots : une correction valide peut aussi modifier les sons d\'un mot déjà connu', () => {
  const bien = [{ g: 'b', son: 'b' }, { g: 'i', son: 'i' }, { g: 'en', son: 'an' }];
  const res = filtrerMots(lex, { ...TOUT, corrections: corr('bien', bien) });
  assert.ok(res.find(r => r.mot === 'bien').liaisons.includes('en=an'));
});

test('filtrerMots : un mot qui n\'existe que dans les corrections n\'est jamais proposé', () => {
  assert.ok(!mots(filtrerMots(lex, { ...TOUT, corrections: corr('pomme de terre', PDT, 'valide') })).includes('pomme de terre'));
});

test('filtrerMots : une entrée multi-mots du lexique est exclue tant qu\'elle n\'est pas validée', () => {
  const multi = { ortho: 'peut-être', phono: 'pøtEtR', classe: 'ADV', nbSyllabes: 2, freq: { P1: 500, P2: 500, P1_5: 500 },
    graphemes: ['p', 'eu', 't', '-', 'ê', 't', 'r', 'e'], codes: ['p', '2', 't', '#', 'E', 't', 'R', '°'] };
  const l = creerLexique([multi]);
  assert.deepEqual(filtrerMots(l, TOUT), []);
  const cubes = multi.graphemes.map((g, i) => ({ g, son: ['p', 'eu_ferme', 't', '', 'e_ouvert', 't', 'r', ''][i] }));
  assert.deepEqual(mots(filtrerMots(l, { ...TOUT, corrections: corr('peut-être', cubes, 'valide') })), ['peut-être']);
});

test('analyserListe : un mot corrigé n\'est plus à vérifier, avec son statut', () => {
  const sans = analyserListe([{ mot: 'examen' }], lex);
  assert.deepEqual(sans.aVerifier, ['examen']);
  assert.equal(sans.parMot[0].statut, null);
  const avec = analyserListe([{ mot: 'examen' }], lex, undefined, corr('examen', EXAMEN));
  assert.deepEqual(avec.aVerifier, []);
  assert.equal(avec.parMot[0].statut, 'corrige');
});

test('analyserListe : un mot absent mais validé n\'est plus absent', () => {
  const zor = [{ g: 'zorbalon', son: 'z+o_ouvert+r+b+a+l+on' }];
  const r = analyserListe([{ mot: 'zorbalon' }], lex, undefined, corr('zorbalon', zor, 'valide'));
  assert.deepEqual(r.absents, []);
  assert.deepEqual(r.aVerifier, []);
  assert.equal(r.parMot[0].statut, 'valide');
});

const carte = (mot, plus = {}) => ({ id: `c-${mot}`, mot, image_sans_mot: `${mot}.png`, image_avec_mot: `${mot}-mot.png`, source: 's', licence: 'l', ...plus });
const valider = (cartes, corrections) => validerPack({ nom: 'x', cartes }, new Set(cartes.flatMap(c => [c.image_sans_mot, c.image_avec_mot])), lex, corrections);

test('validerPack : multi-mots à valider, sauf correction valide', () => {
  const sans = valider([carte('pomme de terre')]);
  assert.ok(sans.avertissements.some(a => a.includes('c-pomme de terre : entrée à plusieurs mots : à valider')));
  assert.ok(!sans.avertissements.some(a => a.includes('segmentation à vérifier')));
  const avec = valider([carte('pomme de terre')], corr('pomme de terre', PDT, 'valide'));
  assert.deepEqual(avec.avertissements, []);
});

test('validerPack : mot absent du lexique mais validé : pas d\'avertissement de segmentation', () => {
  const zor = [{ g: 'zorbalon', son: 'z+o_ouvert+r+b+a+l+on' }];
  assert.ok(valider([carte('zorbalon')]).avertissements.some(a => a.includes('segmentation à vérifier')));
  assert.deepEqual(valider([carte('zorbalon')], corr('zorbalon', zor, 'valide')).avertissements, []);
});
