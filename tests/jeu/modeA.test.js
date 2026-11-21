import test from 'node:test';
import assert from 'node:assert/strict';
import { lettresMuettes, pieceMuette } from '../../src/jeu/modeA.js';
test('lettresMuettes : une valeur par lettre, le t de chat est muet ; intrus jamais muets', () => {
  const carte = { lettres: ['c', 'h', 'a', 't'], graphemes: [{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }] };
  assert.deepEqual(lettresMuettes(carte), [false, false, false, true]);
  const m = lettresMuettes(carte);
  assert.equal(pieceMuette({ id: 'p3', intrus: false }, m), true);
  assert.equal(pieceMuette({ id: 'p0', intrus: false }, m), false);
  assert.equal(pieceMuette({ id: 'p3', intrus: true }, m), false);
  assert.equal(lettresMuettes({ lettres: ['a'], graphemes: [{ g: 'a', son: 'a' }, { g: 'b', son: '' }] }), null);
  assert.equal(pieceMuette({ id: 'p0', intrus: false }, null), false);
});

import { construirePlateauLettres, packDeSession } from '../../src/jeu/modeA.js';
import { demarrerJeu, poser, verifier } from '../../src/jeu/session.js';
const CHAT = { id: 'chat', mot: 'chat', lettres: ['c', 'h', 'a', 't'], cubes: [{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }] };
test('blocs : chat avec digraphes 2 = pièces ch, a, t ; sans bloc = 4 lettres ; ch non permis en longueur 3', () => {
  const carte = packDeSession({ cartes: [CHAT] }).cartes[0];
  const avec = construirePlateauLettres(carte, { nbIntrus: 0, digraphes: [2] }).map(p => p.g).sort();
  assert.deepEqual(avec, ['a', 'ch', 't']);
  assert.deepEqual(construirePlateauLettres(carte, { nbIntrus: 0 }).map(p => p.g).sort(), ['a', 'c', 'h', 't']);
  assert.deepEqual(construirePlateauLettres(carte, { nbIntrus: 0, digraphes: [3, 4] }).map(p => p.g).sort(), ['a', 'c', 'h', 't']);
  const t = construirePlateauLettres(carte, { nbIntrus: 0, digraphes: [2] }).find(p => p.g === 't');
  assert.equal(pieceMuette(t, lettresMuettes(carte)), true);
});
test('session : un bloc compte pour ses lettres, le mot se vérifie juste avec ch-a-t', () => {
  const pack = packDeSession({ nom: 'x', cartes: [CHAT] });
  let e = demarrerJeu({ pack, code: 'E1', reglages: { nbIntrus: 0, essaisMax: 3, exigerAccents: false, modeMot: 'sans', construirePlateau: construirePlateauLettres, parLettres: true, digraphes: [2] }, rng: () => 0.5, session: 's', nouvelId: () => 'i', maintenant: () => 'd' });
  const id = g => e.plateau.find(p => p.g === g).id;
  assert.equal(verifier(poser(e, id('ch'))).resultat, 'incomplet');
  for (const g of ['ch', 'a', 't']) e = poser(e, id(g));
  const r = verifier(e);
  assert.equal(r.resultat, 'juste');
});
