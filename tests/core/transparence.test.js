import test from 'node:test';
import assert from 'node:assert/strict';
import { lectureDuMot } from '../../src/core/transparence.js';

test('lecture régulière : papa, ami (tous les sons habituels, aucune lettre muette)', () => {
  assert.equal(lectureDuMot([{ g: 'p', son: 'p' }, { g: 'a', son: 'a' }, { g: 'p', son: 'p' }, { g: 'a', son: 'a' }]).reguliere, true);
  assert.equal(lectureDuMot([{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }]).reguliere, true);
});
test('lecture irrégulière : lettre muette (chat, dans) et son inhabituel (avec)', () => {
  const chat = lectureDuMot([{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }]);
  assert.equal(chat.reguliere, false);
  assert.deepEqual(chat.raisons, ['« t » ne se lit pas']);
  assert.equal(lectureDuMot([{ g: 'a', son: 'a' }, { g: 'v', son: 'v' }, { g: 'e', son: 'e_ouvert' }, { g: 'c', son: 'k' }]).reguliere, false);
});
test('h muet seul ne rend pas le mot irrégulier ; entrée invalide sans plantage', () => {
  assert.equal(lectureDuMot([{ g: 'h', son: '' }, { g: 'i', son: 'i' }, { g: 'b', son: 'b' }, { g: 'ou', son: 'ou' }]).reguliere, true);
  assert.equal(lectureDuMot(undefined).reguliere, true);
});
