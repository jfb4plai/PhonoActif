import test from 'node:test';
import assert from 'node:assert/strict';
import { creerTache, listerTaches, resumeTache } from '../../src/enseignant/api.js';
import { chargerTache } from '../../src/sync/envoi.js';
import { fauxClient } from './fauxClient.js';

const MASTER = 'u-master';
const base = { modeMot: 'sans', habillage: 'album', nbIntrus: 0, exigerAccents: false, syllabes: 'toujours', vitesse: 100, vitesseVerrou: false, mots: ['ami'], listesNoms: 'Essai' };
const client = () => fauxClient({ tables: { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: MASTER, role: 'master' }], phono_tasks: [] } });

test('niveau : « maternelle » est enregistré, « primaire » ou absent n’envoie rien au serveur', async () => {
  const c = client();
  await creerTache(c, 'c1', { ...base, niveau: 'maternelle' }, MASTER, 'https://x.test/');
  await creerTache(c, 'c1', { ...base, niveau: 'primaire' }, MASTER, 'https://x.test/');
  await creerTache(c, 'c1', { ...base }, MASTER, 'https://x.test/');
  assert.equal(c.tables.phono_tasks[0].niveau, 'maternelle');
  assert.equal('niveau' in c.tables.phono_tasks[1], false);
  assert.equal('niveau' in c.tables.phono_tasks[2], false);
});

test('niveau : serveur sans la colonne -> message clair pour la maternelle', async () => {
  const c = client();
  const insert = c.from('phono_tasks').insert;
  const faux = { from: t => (t === 'phono_tasks' ? { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'column "niveau" of relation "phono_tasks" does not exist' } }) }) }) } : c.from(t)) };
  await assert.rejects(creerTache(faux, 'c1', { ...base, niveau: 'maternelle' }, MASTER, 'https://x.test/'), /pas encore activé sur le serveur/);
  assert.ok(insert);
});

test('listerTaches : niveau lu, « primaire » quand la colonne est absente', async () => {
  const c = client();
  await creerTache(c, 'c1', { ...base, niveau: 'maternelle' }, MASTER, 'https://x.test/');
  await creerTache(c, 'c1', { ...base }, MASTER, 'https://x.test/');
  c.tables.phono_tasks[0].created_at = '2026-11-24T10:00:00Z'; c.tables.phono_tasks[1].created_at = '2026-11-24T11:00:00Z';
  const l = await listerTaches(c, 'c1', 'https://x.test/');
  assert.deepEqual(l.map(t => t.niveau), ['primaire', 'maternelle']);
});

test('resumeTache : maternelle = première lettre, majuscules, sans les réglages du primaire', () => {
  const r = resumeTache({ niveau: 'maternelle', habillage: 'album', modeMot: 'sans', nbIntrus: 3, exigerAccents: true, syllabes: 'non', vitesse: 75, vitesseVerrou: true });
  assert.equal(r, 'maternelle : première lettre · majuscules · voix à 75 % (verrouillée)');
  assert.doesNotMatch(r, /cube|accent|syllabes/);
  assert.match(resumeTache({ niveau: 'primaire', habillage: 'album', modeMot: 'sans', nbIntrus: 2, exigerAccents: false, syllabes: 'toujours' }), /2 cubes en trop/);
});

const rpc = corps => ({ url: 'https://x.supabase.co', anonKey: 'k', fetch: async () => ({ ok: true, status: 200, json: async () => corps }) });
const tacheServeur = plus => ({ pack: 'Liste', mode_mot: 'sans', habillage: 'album', nb_intrus: 0, exiger_accents: false, syllabes: 'toujours', vitesse: 100, vitesse_verrou: false, mots: ['ami'], ...plus });

test('chargerTache : niveau maternelle lu ; absent, primaire ou inconnu = pas de niveau (primaire)', async () => {
  assert.equal((await chargerTache('a'.repeat(24), rpc(tacheServeur({ niveau: 'maternelle' })))).niveau, 'maternelle');
  for (const v of [{}, { niveau: 'primaire' }, { niveau: 'secondaire' }]) assert.equal((await chargerTache('a'.repeat(24), rpc(tacheServeur(v)))).niveau, undefined, JSON.stringify(v));
});
