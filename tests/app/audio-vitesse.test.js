import test from 'node:test';
import assert from 'node:assert/strict';
import { jouerFichier, jouerSons } from '../../src/app/audio.js';
import { lireAdresse, ecrireAdresse, REGLAGES_PAR_DEFAUT } from '../../src/app/route.js';

function fabrique(journal) {
  return url => {
    const a = { url, playbackRate: 1, preservesPitch: undefined };
    a.play = () => { journal.push({ url, vitesse: a.playbackRate, hauteur: a.preservesPitch }); setTimeout(() => a.onended && a.onended(), 0); return Promise.resolve(); };
    return a;
  };
}

test('jouerFichier : vitesse demandée appliquée, hauteur conservée ; sans vitesse, lecture normale', async () => {
  const j = [];
  await jouerFichier('/m.mp3', { creerAudio: fabrique(j), vitesse: 0.5 });
  await jouerFichier('/m.mp3', { creerAudio: fabrique(j) });
  assert.deepEqual(j.map(x => x.vitesse), [0.5, 1]);
  assert.equal(j[0].hauteur, true);
  assert.equal(j[1].hauteur, undefined);
});

test('jouerSons : la vitesse s’applique à chaque son isolé', async () => {
  const j = [];
  await jouerSons(['a', 'ch'], { creerAudio: fabrique(j), vitesse: 0.75 });
  assert.deepEqual(j.map(x => x.vitesse), [0.75, 0.75]);
});

test('adresse : vitesse et verrou lus, valeurs hors liste ignorées, défaut = 100 sans verrou', () => {
  assert.deepEqual(REGLAGES_PAR_DEFAUT.vitesse, 100);
  assert.equal(REGLAGES_PAR_DEFAUT.vitesseVerrou, false);
  let t = lireAdresse('#/jeu?pack=p&vitesse=75&verrou=1').tache;
  assert.equal(t.vitesse, 75); assert.equal(t.vitesseVerrou, true);
  t = lireAdresse('#/jeu?pack=p&vitesse=60&verrou=0').tache;
  assert.equal(t.vitesse, undefined); assert.equal(t.vitesseVerrou, undefined);
  t = lireAdresse('#/jeu?pack=p').tache;
  assert.equal(t.vitesse, undefined);
});

test('adresse : vitesse et verrou écrits dans le lien d’un pack', () => {
  const u = ecrireAdresse('/', 'jeu', { pack: 'p', modeMot: 'sans', habillage: 'album', nbIntrus: 0, exigerAccents: false, vitesse: 50, vitesseVerrou: true });
  assert.match(u, /vitesse=50&verrou=1/);
  const d = ecrireAdresse('/', 'jeu', { pack: 'p', modeMot: 'sans', habillage: 'album', nbIntrus: 0, exigerAccents: false });
  assert.match(d, /vitesse=100&verrou=0/);
});

test('une seule voix à la fois : une nouvelle lecture coupe celle en cours', async () => {
  const arretes = [];
  const lente = url => { const a = { url }; a.play = () => Promise.resolve(); a.pause = () => arretes.push(url); return a; }; // ne finit jamais seule
  const premiere = jouerFichier('/consigne.mp3', { creerAudio: lente });
  await new Promise(r => setTimeout(r, 0));
  const j = [];
  await jouerFichier('/mot.mp3', { creerAudio: fabrique(j) });
  await premiere;
  assert.deepEqual(arretes, ['/consigne.mp3']);
  assert.deepEqual(j.map(x => x.url), ['/mot.mp3']);
});
