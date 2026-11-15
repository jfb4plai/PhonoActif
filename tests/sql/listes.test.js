import test from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest, creerUtilisateur, comme } from './harness.js';

const ids = n => Array.from({ length: n }, (_, i) => `mot-${i}`);
const creer = (db, u, nom, mots) => comme(db, 'authenticated', u, () => db.query('insert into phono_listes (created_by, name, words) values ($1, $2, $3) returning id', [u, nom, mots]));
const T = 'a1'.repeat(12);

test('phono_listes : une liste de 1 et de 50 mots est acceptée', async () => {
  const db = await baseDeTest();
  const u = await creerUtilisateur(db);
  await creer(db, u, 'Un mot', ['chat']);
  await creer(db, u, 'Cinquante', ids(50));
  const n = (await db.query('select count(*)::int as n from phono_listes')).rows[0].n;
  assert.equal(n, 2);
});

test('phono_listes : 0 mot, 51 mots, doublon, identifiant mal formé et nom trop long sont refusés par la base', async () => {
  const db = await baseDeTest();
  const u = await creerUtilisateur(db);
  await assert.rejects(creer(db, u, 'Vide', []), /check/i);
  await assert.rejects(creer(db, u, 'Trop', ids(51)), /check/i);
  await assert.rejects(creer(db, u, 'Doublon', ['chat', 'chat']), /check/i);
  await assert.rejects(creer(db, u, 'Mal formé', ['A b']), /check/i);
  await assert.rejects(creer(db, u, 'x'.repeat(61), ['chat']), /check/i);
  await assert.rejects(creer(db, u, '', ['chat']), /check/i);
});

test('phono_listes : un enseignant ne voit, ne modifie et ne supprime que ses listes', async () => {
  const db = await baseDeTest();
  const [a, b] = [await creerUtilisateur(db), await creerUtilisateur(db)];
  const id = (await creer(db, a, 'À moi', ['chat'])).rows[0].id;
  const vues = await comme(db, 'authenticated', b, () => db.query('select id from phono_listes'));
  assert.equal(vues.rows.length, 0);
  const maj = await comme(db, 'authenticated', b, () => db.query("update phono_listes set name = 'volée' where id = $1 returning id", [id]));
  assert.equal(maj.rows.length, 0);
  const sup = await comme(db, 'authenticated', b, () => db.query('delete from phono_listes where id = $1 returning id', [id]));
  assert.equal(sup.rows.length, 0);
  const miennes = await comme(db, 'authenticated', a, () => db.query('select name from phono_listes'));
  assert.deepEqual(miennes.rows, [{ name: 'À moi' }]);
});

test('phono_listes : on ne peut pas créer une liste au nom d’un autre', async () => {
  const db = await baseDeTest();
  const [a, b] = [await creerUtilisateur(db), await creerUtilisateur(db)];
  await assert.rejects(comme(db, 'authenticated', a, () => db.query('insert into phono_listes (created_by, name, words) values ($1, $2, $3)', [b, 'Intrus', ['chat']])), /row-level security/i);
});

test('phono_listes : aucun accès pour anon', async () => {
  const db = await baseDeTest();
  await assert.rejects(comme(db, 'anon', null, () => db.query('select * from phono_listes')), /permission denied/i);
});

test('phono_tasks.mots : jusqu’à 200 mots, 201 refusés ; phono_lire_tache renvoie les mots', async () => {
  const db = await baseDeTest();
  const u = await creerUtilisateur(db);
  const classe = (await comme(db, 'authenticated', u, () => db.query('insert into phono_classes (name, created_by) values ($1, $2) returning id', ['3P A', u]))).rows[0].id;
  const tache = (token, mots) => comme(db, 'authenticated', u, () => db.query(
    "insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, mots, listes_noms, created_by) values ($1, $2, 'Semaine 3', 'sans', 'album', 3, false, $3, 'Semaine 3 + Révisions', $4)", [classe, token, mots, u]));
  await tache(T, ['chat', 'lune', 'terre']);
  await assert.rejects(tache('b2'.repeat(12), ids(201)), /check/i);
  const r = await comme(db, 'anon', null, async () => (await db.query('select public.phono_lire_tache($1) as r', [T])).rows[0].r);
  assert.deepEqual(r.mots, ['chat', 'lune', 'terre']);
  assert.equal(r.pack, 'Semaine 3');
});
