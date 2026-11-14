import test from 'node:test';
import assert from 'node:assert/strict';
import { lireAdresse, ecrireAdresse, REGLAGES_PAR_DEFAUT } from '../../src/app/route.js';

const TACHE = { pack: 'été', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true };
const hashDe = url => new URL(url).hash;

test('réglages par défaut', () => {
  assert.deepEqual(REGLAGES_PAR_DEFAUT, { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false, essaisMax: 3, syllabes: 'toujours' });
});

test('aller-retour jeu avec un nom de pack accentué', () => {
  const url = ecrireAdresse('https://exemple.test/', 'jeu', TACHE);
  assert.equal(url, 'https://exemple.test/#/jeu?pack=%C3%A9t%C3%A9&mode=avec&habillage=sobre&intrus=2&accents=1&syllabes=toujours');
  assert.deepEqual(lireAdresse(hashDe(url)), { ecran: 'jeu', tache: { ...TACHE, syllabes: 'toujours' } });
});

test('aller-retour carte', () => {
  const url = ecrireAdresse('https://exemple.test/', 'carte', TACHE, 'pêche-2');
  assert.deepEqual(lireAdresse(hashDe(url)), { ecran: 'carte', tache: { ...TACHE, syllabes: 'toujours' }, carte: 'pêche-2' });
});

test('la base avec ou sans barre finale donne la même adresse', () => {
  assert.equal(ecrireAdresse('https://exemple.test', 'jeu', TACHE), ecrireAdresse('https://exemple.test/', 'jeu', TACHE));
  assert.equal(ecrireAdresse('https://exemple.test/app', 'jeu', TACHE), ecrireAdresse('https://exemple.test/app/', 'jeu', TACHE));
});

test('accueil : hash vide, # et #/', () => {
  for (const h of ['', '#', '#/']) assert.deepEqual(lireAdresse(h), { ecran: 'accueil' }, JSON.stringify(h));
});

test('valeurs invalides ignorées champ par champ', () => {
  const r = lireAdresse('#/jeu?pack=p2&mode=xx&habillage=rose&intrus=-1&accents=oui');
  assert.deepEqual(r, { ecran: 'jeu', tache: { pack: 'p2' } });
  assert.deepEqual(lireAdresse('#/jeu?intrus=9&mode=sans').tache, { modeMot: 'sans' });
  assert.deepEqual(lireAdresse('#/jeu?intrus=0&accents=0').tache, { nbIntrus: 0, exigerAccents: false });
  assert.deepEqual(lireAdresse('#/jeu?intrus=2.5').tache, {});
});

test('paramètres dans le désordre acceptés', () => {
  assert.deepEqual(lireAdresse('#/jeu?accents=1&intrus=4&pack=p3&habillage=album&mode=sans').tache,
    { pack: 'p3', modeMot: 'sans', habillage: 'album', nbIntrus: 4, exigerAccents: true });
});

test('adresses inconnues', () => {
  for (const h of ['#/n-importe-quoi', '#/carte/p2', '#/carte//chat', '#/carte/p2/chat/extra', '#/jeu/extra', '#jeu', 'pas-un-hash', '#/carte/%E0%A4%A/chat']) {
    assert.equal(lireAdresse(h).ecran, 'inconnue', h);
  }
});

test('jeu sans paramètres', () => {
  assert.deepEqual(lireAdresse('#/jeu'), { ecran: 'jeu', tache: {} });
});

test('carte avec ses réglages dans la requête', () => {
  assert.deepEqual(lireAdresse('#/carte/p2/chat?mode=avec'), { ecran: 'carte', tache: { pack: 'p2', modeMot: 'avec' }, carte: 'chat' });
});

const JETON = 'a1b2c3d4e5f6a7b8c9d0e1f2';

test('jeton de tâche : lu, écrit, et seul dans l\'adresse', () => {
  assert.deepEqual(lireAdresse(`#/jeu?t=${JETON}`), { ecran: 'jeu', tache: { jeton: JETON } });
  const url = ecrireAdresse('https://exemple.test/', 'jeu', { jeton: JETON, pack: 'demo', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true });
  assert.equal(url, `https://exemple.test/#/jeu?t=${JETON}`);
});

test('jeton mal formé ignoré', () => {
  for (const t of ['abc', 'A1B2C3D4E5F6A7B8C9D0E1F2', `${JETON}0`, 'zz'.repeat(12)]) {
    assert.deepEqual(lireAdresse(`#/jeu?t=${t}`), { ecran: 'jeu', tache: {} }, t);
  }
});

test('écran enseignant', () => {
  assert.deepEqual(lireAdresse('#/enseignant'), { ecran: 'enseignant' });
  assert.equal(lireAdresse('#/enseignant/extra').ecran, 'inconnue');
});

test('lien personnel d’un élève : code et clé lus ensemble, réécrits à l’identique', () => {
  const cle = '0123456789abcdef0123';
  const a = lireAdresse(`#/jeu?t=${'a'.repeat(24)}&e=E07&k=${cle}`);
  assert.equal(a.tache.codeEleve, 'E07'); assert.equal(a.tache.cle, cle); assert.equal(a.tache.jeton, 'a'.repeat(24));
  assert.equal(ecrireAdresse('https://x.test/', 'jeu', a.tache), `https://x.test/#/jeu?t=${'a'.repeat(24)}&e=E07&k=${cle}`);
});

test('lien personnel : clé ou code mal formé, ou un seul des deux : ignorés', () => {
  for (const q of ['&e=E07', '&k=0123456789abcdef0123', '&e=E07&k=court', '&e=E07&k=ZZZZZZZZZZZZZZZZZZZZ', '&e=a%20b&k=0123456789abcdef0123']) {
    const a = lireAdresse(`#/jeu?t=${'a'.repeat(24)}${q}`);
    assert.equal(a.tache.cle, undefined, q); assert.equal(a.tache.codeEleve, undefined, q);
  }
});

test('réglage « écoute par syllabes » : trois valeurs lues et réécrites, une valeur inconnue est ignorée', () => {
  for (const v of ['non', 'toujours', 'aide']) {
    const url = ecrireAdresse('https://exemple.test/', 'jeu', { ...TACHE, syllabes: v });
    assert.equal(lireAdresse(hashDe(url)).tache.syllabes, v);
  }
  assert.equal(lireAdresse('#/jeu?pack=x&syllabes=partout').tache.syllabes, undefined);
});
