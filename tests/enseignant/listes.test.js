import test from 'node:test';
import assert from 'node:assert/strict';
import { listerListes, enregistrerListe, dupliquerListe, supprimerListe } from '../../src/enseignant/listes.js';
import { creerTache, listerTaches } from '../../src/enseignant/api.js';
import { fauxClient } from './fauxClient.js';

const U = 'u-1';
const CAT = new Set(['chat', 'lune', 'terre', 'maman']);
const ids = n => Array.from({ length: n }, (_, i) => `m${i}`);
const CAT_GRAND = new Set(ids(300));
const SUBSTITUT_ORPHELIN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/; // moitié d'émoji sans sa seconde moitié

test('enregistrerListe : crée puis met à jour, nom nettoyé, mots sans doublon', async () => {
  const c = fauxClient({ userId: U });
  const l = await enregistrerListe(c, U, { nom: '  Semaine 3  ', mots: ['chat', 'lune', 'chat'] }, { catalogueIds: CAT });
  assert.deepEqual({ nom: l.nom, mots: l.mots }, { nom: 'Semaine 3', mots: ['chat', 'lune'] });
  assert.equal(c.tables.phono_listes.length, 1);
  assert.equal(c.tables.phono_listes[0].created_by, U);
  await enregistrerListe(c, U, { id: l.id, nom: 'Semaine 4', mots: ['terre'] }, { catalogueIds: CAT });
  assert.equal(c.tables.phono_listes.length, 1);
  assert.deepEqual([c.tables.phono_listes[0].name, c.tables.phono_listes[0].words], ['Semaine 4', ['terre']]);
});

test('enregistrerListe : 0 mot, 51 mots, mot inconnu, nom vide ou de 61 caractères refusés AVANT tout appel au serveur', async () => {
  const c = fauxClient({ userId: U });
  const essai = (nom, mots) => enregistrerListe(c, U, { nom, mots }, { catalogueIds: CAT_GRAND });
  await assert.rejects(essai('Vide', []), /au moins 1 mot/);
  await assert.rejects(essai('Trop', ids(51)), /au plus 50 mots/);
  await assert.rejects(essai('Inconnu', ['zzz']), /Mot inconnu : zzz/);
  await assert.rejects(essai('   ', ['m1']), /nom de la liste/);
  await assert.rejects(essai('x'.repeat(61), ['m1']), /nom de la liste/);
  assert.equal(c.tables.phono_listes.length, 0);
  await essai('x'.repeat(60), ids(50));
  assert.equal(c.tables.phono_listes.length, 1);
});

test('listerListes : les listes de l’enseignant, triées par nom', async () => {
  const c = fauxClient({ userId: U, tables: { phono_listes: [
    { id: 'b', created_by: U, name: 'Zèbre', words: ['chat'], updated_at: 't' },
    { id: 'a', created_by: U, name: 'Ancre', words: ['lune', 'terre'], updated_at: 't' },
    { id: 'x', created_by: 'autre', name: 'Autre', words: ['maman'], updated_at: 't' }] } });
  const r = await listerListes(c, U);
  assert.deepEqual(r.map(l => [l.id, l.nom, l.mots]), [['a', 'Ancre', ['lune', 'terre']], ['b', 'Zèbre', ['chat']]]);
});

test('dupliquerListe : copie nommée « (copie) », nom borné à 60 caractères sans couper un émoji', async () => {
  const c = fauxClient({ userId: U });
  const l = await enregistrerListe(c, U, { nom: 'Révisions', mots: ['chat'] }, { catalogueIds: CAT });
  const d = await dupliquerListe(c, U, l, { catalogueIds: CAT });
  assert.equal(d.nom, 'Révisions (copie)');
  assert.notEqual(d.id, l.id);
  const long = await enregistrerListe(c, U, { nom: 'y'.repeat(60), mots: ['chat'] }, { catalogueIds: CAT });
  assert.equal((await dupliquerListe(c, U, long, { catalogueIds: CAT })).nom.length, 60);
  const emoji = await enregistrerListe(c, U, { nom: '😀'.repeat(30), mots: ['chat'] }, { catalogueIds: CAT });
  const copie = await dupliquerListe(c, U, emoji, { catalogueIds: CAT });
  assert.ok(Array.from(copie.nom).length <= 60);
  assert.doesNotMatch(copie.nom, SUBSTITUT_ORPHELIN);
});

test('supprimerListe : retire la liste', async () => {
  const c = fauxClient({ userId: U });
  const l = await enregistrerListe(c, U, { nom: 'À jeter', mots: ['chat'] }, { catalogueIds: CAT });
  await supprimerListe(c, l.id);
  assert.equal(c.tables.phono_listes.length, 0);
});

test('creerTache avec listes : mots fusionnés sans doublon (révision), mots copiés dans la tâche, noms dans listes_noms seulement', async () => {
  const c = fauxClient({ userId: U });
  const r = await creerTache(c, 'c1', { mots: ['chat', 'lune', 'terre', 'chat'], listesNoms: 'Semaine 3 + Révisions', modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false }, U, 'https://x.test/');
  const ligne = c.tables.phono_tasks[0];
  assert.deepEqual(ligne.mots, ['chat', 'lune', 'terre']);
  // `pack` est renvoyé par phono_lire_tache à tout porteur du lien élève : libellé neutre, jamais le nom d'une liste (RGPD)
  assert.equal(ligne.pack, 'Liste');
  assert.equal(ligne.listes_noms, 'Semaine 3 + Révisions');
  assert.deepEqual([ligne.mode_mot, ligne.habillage, ligne.nb_intrus, ligne.exiger_accents], ['sans', 'album', 3, false]); // les réglages de la tâche sont bien écrits
  assert.equal(r.lien, `https://x.test/#/jeu?t=${r.jeton}`);
});

test('creerTache avec listes : noms bornés à 300 caractères sans couper un émoji ; aucun mot ou plus de 200 mots refusés', async () => {
  const c = fauxClient({ userId: U });
  const base = { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false };
  await creerTache(c, 'c1', { ...base, mots: ['chat'], listesNoms: 'L'.repeat(400) }, U, 'https://x.test/');
  assert.equal(c.tables.phono_tasks[0].listes_noms.length, 300);
  await creerTache(c, 'c1', { ...base, mots: ['chat'], listesNoms: '😀'.repeat(400) }, U, 'https://x.test/');
  assert.equal(Array.from(c.tables.phono_tasks[1].listes_noms).length, 300);
  assert.doesNotMatch(c.tables.phono_tasks[1].listes_noms, SUBSTITUT_ORPHELIN);
  await assert.rejects(creerTache(c, 'c1', { ...base, mots: [], listesNoms: 'x' }, U, 'https://x.test/'), /au moins une liste/);
  await assert.rejects(creerTache(c, 'c1', { ...base, mots: ids(201), listesNoms: 'x' }, U, 'https://x.test/'), /au plus 200 mots/);
  assert.equal(c.tables.phono_tasks.length, 2);
});

test('listerTaches : renvoie mots et listesNoms', async () => {
  const c = fauxClient({ userId: U, tables: { phono_tasks: [{ id: 't', class_id: 'c1', token: 'a'.repeat(24), pack: 'Liste', mode_mot: 'sans', habillage: 'album', nb_intrus: 3, exiger_accents: false, revoked: false, created_at: '2026-11-15T10:00:00Z', mots: ['chat', 'lune'], listes_noms: 'S3 + R' }] } });
  const [t] = await listerTaches(c, 'c1', 'https://x.test/');
  assert.deepEqual([t.mots, t.listesNoms], [['chat', 'lune'], 'S3 + R']);
});
