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
