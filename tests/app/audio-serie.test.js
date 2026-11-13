import test from 'node:test';
import assert from 'node:assert/strict';
import { jouerSerie } from '../../src/app/audio.js';

// Faux élément audio : « lit » en un tour d'horloge, signale la fin ; une adresse contenant « absent » échoue.
function fabrique(journal) {
  return url => {
    const a = { url, playbackRate: 1, preservesPitch: undefined };
    a.play = () => {
      journal.push({ evt: 'lecture', url, vitesse: a.playbackRate, hauteur: a.preservesPitch });
      setTimeout(() => (url.includes('absent') ? a.onerror && a.onerror() : a.onended && a.onended()), 0);
      return Promise.resolve();
    };
    return a;
  };
}

test('jouerSerie : les fichiers dans l’ordre, un espace entre eux, seule la dernière syllabe est ralentie (hauteur conservée)', async () => {
  const journal = [];
  const attentes = [];
  const r = await jouerSerie(['/a.mp3', '/b.mp3', '/c.mp3'], { pauseMs: 500, vitesseDerniere: 0.75, creerAudio: fabrique(journal), attendre: ms => { attentes.push(ms); journal.push({ evt: 'pause', ms }); return Promise.resolve(); } });
  assert.deepEqual(r.manquants, []);
  assert.deepEqual(journal.map(j => (j.evt === 'pause' ? `pause ${j.ms}` : j.url)), ['/a.mp3', 'pause 500', '/b.mp3', 'pause 500', '/c.mp3']);
  assert.deepEqual(attentes, [500, 500]);
  const lectures = journal.filter(j => j.evt === 'lecture');
  assert.deepEqual(lectures.map(l => l.vitesse), [1, 1, 0.75]);
  assert.equal(lectures[2].hauteur, true);
  assert.equal(lectures[0].hauteur, undefined);
});

test('jouerSerie : valeurs par défaut = celles de JF (500 ms, 75 %)', async () => {
  const journal = [];
  const attentes = [];
  await jouerSerie(['/a.mp3', '/b.mp3'], { creerAudio: fabrique(journal), attendre: ms => { attentes.push(ms); return Promise.resolve(); } });
  assert.deepEqual(attentes, [500]);
  assert.equal(journal.at(-1).vitesse, 0.75);
});

test('jouerSerie : une seule syllabe, pas de pause, elle est ralentie', async () => {
  const journal = [];
  const attentes = [];
  await jouerSerie(['/a.mp3'], { creerAudio: fabrique(journal), attendre: ms => { attentes.push(ms); return Promise.resolve(); } });
  assert.deepEqual(attentes, []);
  assert.equal(journal[0].vitesse, 0.75);
});

test('jouerSerie : un fichier absent est signalé et la suite continue', async () => {
  const journal = [];
  const r = await jouerSerie(['/a.mp3', '/absent.mp3', '/c.mp3'], { creerAudio: fabrique(journal), attendre: () => Promise.resolve() });
  assert.deepEqual(r.manquants, ['/absent.mp3']);
  assert.deepEqual(journal.filter(j => j.evt === 'lecture').map(j => j.url), ['/a.mp3', '/absent.mp3', '/c.mp3']);
});

test('jouerSerie : un nouvel appel interrompt la série en cours', async () => {
  const journal = [];
  let relache;
  const bloque = new Promise(r => { relache = r; });
  const premiere = jouerSerie(['/a.mp3', '/b.mp3', '/c.mp3'], { creerAudio: fabrique(journal), attendre: () => bloque });
  await new Promise(r => setTimeout(r, 5));
  const seconde = jouerSerie(['/x.mp3'], { creerAudio: fabrique(journal), attendre: () => Promise.resolve() });
  relache();
  await Promise.all([premiere, seconde]);
  const urls = journal.filter(j => j.evt === 'lecture').map(j => j.url);
  assert.deepEqual(urls, ['/a.mp3', '/x.mp3']);
});
