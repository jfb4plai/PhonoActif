import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { demarrerJeu } from '../../src/jeu/session.js';
import { continuerPalier, passerPalier, arreterApresPalier } from '../../src/jeu/paliers.js';

const lex = creerLexique(JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8')));
const base = preparerPack({ nom: 'essai', mots: ['chat', 'été', 'pain'], source: 's', licence: 'l', lexique: lex }).manifest;
// 5 cartes : les 3 du pack plus 2 copies à identifiants distincts.
const cartes = [...base.cartes, { ...base.cartes[0], id: 'c4' }, { ...base.cartes[1], id: 'c5' }].map((c, i) => ({ ...c, id: c.id + '-' + i }));
const PALIERS = [
  { id: 'P1', difficulte: 'x', annonce: '', ids: [], debut: 0, fin: 1 },
  { id: 'P2', difficulte: 'y', annonce: '', ids: [], debut: 2, fin: 3 },
  { id: 'P3', difficulte: 'z', annonce: '', ids: [], debut: 4, fin: 4 },
];
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;

// Jeu positionné sur la carte `index`, carte terminée (statut juste).
function fini(index, statut = 'juste') {
  const e = demarrerJeu({ pack: { ...base, cartes }, reglages: { modeMot: 'sans', habillage: 'album', nbIntrus: 2, exigerAccents: false, essaisMax: 3 }, code: 'E07', rng: graine(3), maintenant: () => 't' });
  return { ...e, cartes, index, statut };
}

{
  test('continuerPalier : carte suivante, état neuf', () => {
    const e = continuerPalier(fini(1), PALIERS);
    assert.equal(e.index, 2);
    assert.equal(e.statut, 'en_cours');
    assert.deepEqual(e.poses, []);
  });

  test('passerPalier : saute le palier annoncé et le note', () => {
    const e = passerPalier(fini(1), PALIERS);
    assert.equal(e.index, 4);
    assert.equal(e.statut, 'en_cours');
    assert.deepEqual(e.paliersSautes, ['P2']);
  });

  test('passerPalier sur l\'avant-dernier palier : fin, dernier palier noté sauté', () => {
    const e = passerPalier(fini(3), PALIERS);
    assert.equal(e.statut, 'fini');
    assert.deepEqual(e.paliersSautes, ['P3']);
  });

  test('passerPalier cumule les sauts successifs', () => {
    const e = passerPalier({ ...fini(1), paliersSautes: ['P0'] }, PALIERS);
    assert.deepEqual(e.paliersSautes, ['P0', 'P2']);
  });

  test('arreterApresPalier : fini, palier terminé noté, index inchangé', () => {
    const e = arreterApresPalier(fini(1, 'revelation'), PALIERS);
    assert.equal(e.statut, 'fini');
    assert.deepEqual(e.arret, { apres: 'P1' });
    assert.equal(e.index, 1);
  });

  test('une transition alors que la carte est en cours ne change rien', () => {
    const e = fini(1, 'en_cours');
    assert.strictEqual(continuerPalier(e, PALIERS), e);
    assert.strictEqual(passerPalier(e, PALIERS), e);
    assert.strictEqual(arreterApresPalier(e, PALIERS), e);
  });
}
