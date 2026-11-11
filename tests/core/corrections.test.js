import test from 'node:test';
import assert from 'node:assert/strict';
import { validerCorrection, creerCorrections, fusionnerCorrections, corrigeValide, STATUTS } from '../../src/core/index.js';

const soleil = (plus = {}) => ({
  mot: 'soleil',
  cubes: [{ g: 's', son: 's' }, { g: 'o', son: 'o_ferme' }, { g: 'l', son: 'l' }, { g: 'eil', son: 'e_ouvert+yod' }],
  statut: 'corrige', auteur: 'JF', date: '2026-11-11', raison: 'eil se prononce /ɛj/', ...plus
});
const aMot = (c, texte) => c.some(e => e.includes(texte));

test('STATUTS', () => assert.deepEqual(STATUTS, ['a_valider', 'valide', 'corrige']));

test('correction valide : aucune erreur', () => {
  assert.deepEqual(validerCorrection(soleil()), []);
});

test('multi-mots et apostrophe : séparateurs à son vide', () => {
  const pdt = { mot: 'pomme de terre', statut: 'valide', auteur: 'JF', date: '2026-11-11', raison: '',
    cubes: [{ g: 'pomme', son: 'p+o_ouvert+m' }, { g: ' ', son: '' }, { g: 'de', son: 'd+schwa' }, { g: ' ', son: '' }, { g: 'terre', son: 't+e_ouvert+r' }] };
  assert.deepEqual(validerCorrection(pdt), []);
  const lami = { mot: "l'ami", statut: 'a_valider', auteur: 'JF', date: '2026-11-11', raison: '',
    cubes: [{ g: 'l', son: 'l' }, { g: "'", son: '' }, { g: 'ami', son: 'a+m+i' }] };
  assert.deepEqual(validerCorrection(lami), []);
});

test('chaque erreur a son message', () => {
  assert.ok(aMot(validerCorrection(soleil({ mot: 'Soleil' })), 'mot non normalisé'));
  assert.ok(aMot(validerCorrection(soleil({ cubes: [] })), 'aucun cube'));
  assert.ok(aMot(validerCorrection(soleil({ cubes: [{ g: 's', son: 's' }] })), 'graphèmes ne recomposent pas le mot'));
  assert.ok(aMot(validerCorrection(soleil({ cubes: [{ g: 'soleil', son: 'zz' }] })), 'son inconnu : zz'));
  assert.ok(aMot(validerCorrection(soleil({ statut: 'ok' })), 'statut inconnu'));
  assert.ok(aMot(validerCorrection(soleil({ auteur: '' })), 'auteur manquant'));
  assert.ok(aMot(validerCorrection(soleil({ date: '11/11/2026' })), 'date invalide'));
  assert.ok(aMot(validerCorrection(soleil({ raison: '  ' })), 'raison manquante'));
});

test('la raison n\'est obligatoire que pour « corrige »', () => {
  assert.deepEqual(validerCorrection(soleil({ statut: 'valide', raison: '' })), []);
  assert.deepEqual(validerCorrection(soleil({ statut: 'a_valider', raison: '' })), []);
});

test('une correction mal formée (null, champ absent) ne fait pas planter la validation', () => {
  assert.ok(validerCorrection(null).length > 0);
  assert.ok(validerCorrection({}).length > 0);
});

test('creerCorrections : les invalides vont dans les rejets, les autres sont gardées', () => {
  const mauvaise = { ...soleil(), mot: 'bien', cubes: [{ g: 'bien', son: 'b' }], statut: 'zz' };
  const { corrections, rejets } = creerCorrections([soleil(), mauvaise]);
  assert.equal(corrections.taille, 1);
  assert.equal(rejets.length, 1);
  assert.equal(rejets[0].mot, 'bien');
  assert.ok(aMot(rejets[0].erreurs, 'statut inconnu'));
});

test('chercher normalise le mot', () => {
  const { corrections } = creerCorrections([soleil()]);
  assert.equal(corrections.chercher('SOLEIL ').statut, 'corrige');
  assert.equal(corrections.chercher('absent'), null);
});

test('fusion : un valide ou corrigé n\'est jamais remplacé par un a_valider', () => {
  const ancienValide = soleil({ statut: 'valide', date: '2026-01-01' });
  const recentAValider = soleil({ statut: 'a_valider', date: '2026-11-11' });
  assert.equal(fusionnerCorrections([ancienValide], [recentAValider])[0].statut, 'valide');
  const ancienCorrige = soleil({ statut: 'corrige', date: '2026-01-01' });
  assert.equal(fusionnerCorrections([ancienCorrige], [recentAValider])[0].statut, 'corrige');
});

test('fusion : un a_valider est remplacé par un valide, même plus ancien', () => {
  const aValider = soleil({ statut: 'a_valider', date: '2026-11-11' });
  const valide = soleil({ statut: 'valide', date: '2026-01-01' });
  assert.equal(fusionnerCorrections([aValider], [valide])[0].statut, 'valide');
});

test('fusion : la date la plus récente gagne, à date égale la nouvelle', () => {
  const a = soleil({ date: '2026-02-01', raison: 'ancienne' }), b = soleil({ date: '2026-03-01', raison: 'récente' });
  assert.equal(fusionnerCorrections([a], [b])[0].raison, 'récente');
  assert.equal(fusionnerCorrections([b], [a])[0].raison, 'récente');
  const c = soleil({ date: '2026-03-01', raison: 'nouvelle' });
  assert.equal(fusionnerCorrections([b], [c])[0].raison, 'nouvelle');
});

test('fusion : résultat trié par mot, sans doublon', () => {
  const x = { ...soleil(), mot: 'zebre', cubes: [{ g: 'zebre', son: 'z' }] };
  const res = fusionnerCorrections([x], [soleil(), soleil()]);
  assert.deepEqual(res.map(c => c.mot), ['soleil', 'zebre']);
});

test('corrigeValide', () => {
  assert.equal(corrigeValide(soleil({ statut: 'valide' })), true);
  assert.equal(corrigeValide(soleil({ statut: 'corrige' })), true);
  assert.equal(corrigeValide(soleil({ statut: 'a_valider' })), false);
  assert.equal(corrigeValide(null), false);
});
