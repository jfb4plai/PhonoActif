import test from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest, creerUtilisateur, comme, sqlDesMigrations } from './harness.js';

const TABLES = ['phono_classes', 'phono_class_members', 'phono_students', 'phono_tasks', 'phono_attempts'];
const REFUS = /row-level security|permission denied/;

async function monde() {
  const db = await baseDeTest();
  const [master, invite, etranger] = [await creerUtilisateur(db), await creerUtilisateur(db), await creerUtilisateur(db)];
  const classe = (await comme(db, 'authenticated', master, () =>
    db.query("insert into phono_classes (name, created_by) values ('3P A', $1) returning id", [master]))).rows[0].id;
  await comme(db, 'authenticated', master, () =>
    db.query("insert into phono_class_members (class_id, user_id, role) values ($1, $2, 'invite')", [classe, invite]));
  return { db, master, invite, etranger, classe };
}
const eleve = (db, who, classe, code) => comme(db, 'authenticated', who, () =>
  db.query('insert into phono_students (class_id, code) values ($1, $2) returning id', [classe, code]));

test('le créateur d\'une classe en devient le master', async () => {
  const { db, master, classe } = await monde();
  const r = await comme(db, 'authenticated', master, () => db.query('select role from phono_class_members where class_id = $1 and user_id = $2', [classe, master]));
  assert.equal(r.rows[0].role, 'master');
});

test('on ne peut pas créer une classe au nom d\'un autre', async () => {
  const { db, master, etranger } = await monde();
  await assert.rejects(comme(db, 'authenticated', etranger, () => db.query("insert into phono_classes (name, created_by) values ('x', $1)", [master])), REFUS);
});

test('un enseignant étranger à la classe ne voit rien et ne peut rien y écrire', async () => {
  const { db, master, etranger, classe } = await monde();
  await eleve(db, master, classe, 'E01');
  await comme(db, 'authenticated', master, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'sans', 'album', 3, false, $3)", [classe, 'a'.repeat(24), master]));
  for (const t of ['phono_classes', 'phono_class_members', 'phono_students', 'phono_tasks', 'phono_attempts']) {
    const r = await comme(db, 'authenticated', etranger, () => db.query(`select count(*)::int as n from ${t}`));
    assert.equal(r.rows[0].n, 0, t);
  }
  await assert.rejects(eleve(db, etranger, classe, 'E99'), REFUS);
  await assert.rejects(comme(db, 'authenticated', etranger, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'sans', 'album', 3, false, $3)", [classe, 'b'.repeat(24), etranger])), REFUS);
  await assert.rejects(comme(db, 'authenticated', etranger, () => db.query("insert into phono_class_members (class_id, user_id, role) values ($1, $2, 'invite')", [classe, etranger])), REFUS);
});

test('l\'invité voit tout, crée des élèves et des tâches', async () => {
  const { db, invite, master, classe } = await monde();
  await eleve(db, master, classe, 'E01');
  const vus = await comme(db, 'authenticated', invite, () => db.query('select count(*)::int as n from phono_students'));
  assert.equal(vus.rows[0].n, 1);
  await eleve(db, invite, classe, 'E02');
  await comme(db, 'authenticated', invite, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'avec', 'sobre', 2, true, $3)", [classe, 'c'.repeat(24), invite]));
});

test('l\'invité ne peut ni supprimer d\'élève, ni supprimer la classe, ni inviter', async () => {
  const { db, invite, master, etranger, classe } = await monde();
  await eleve(db, master, classe, 'E01');
  const suppr = await comme(db, 'authenticated', invite, () => db.query('delete from phono_students where class_id = $1', [classe]));
  assert.equal(suppr.affectedRows, 0);
  const supprClasse = await comme(db, 'authenticated', invite, () => db.query('delete from phono_classes where id = $1', [classe]));
  assert.equal(supprClasse.affectedRows, 0);
  await assert.rejects(comme(db, 'authenticated', invite, () => db.query("insert into phono_class_members (class_id, user_id, role) values ($1, $2, 'invite')", [classe, etranger])), REFUS);
  const reste = await comme(db, 'authenticated', master, () => db.query('select count(*)::int as n from phono_students'));
  assert.equal(reste.rows[0].n, 1);
});

test('le master supprime un élève, puis la classe en cascade', async () => {
  const { db, master, classe } = await monde();
  const e = (await eleve(db, master, classe, 'E01')).rows[0].id;
  const del = await comme(db, 'authenticated', master, () => db.query('delete from phono_students where id = $1', [e]));
  assert.equal(del.affectedRows, 1);
  await eleve(db, master, classe, 'E02');
  await comme(db, 'authenticated', master, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'sans', 'album', 3, false, $3)", [classe, 'd'.repeat(24), master]));
  const sup = await comme(db, 'authenticated', master, () => db.query('delete from phono_classes where id = $1', [classe]));
  assert.equal(sup.affectedRows, 1);
  for (const t of ['phono_students', 'phono_tasks', 'phono_class_members']) {
    const r = await db.query(`select count(*)::int as n from ${t}`);
    assert.equal(r.rows[0].n, 0, t);
  }
});

test('un code est unique dans sa classe, pas dans le système', async () => {
  const { db, master, etranger, classe } = await monde();
  await eleve(db, master, classe, 'E07');
  await assert.rejects(eleve(db, master, classe, 'E07'), /unique|duplicate/);
  const autre = (await comme(db, 'authenticated', etranger, () => db.query("insert into phono_classes (name, created_by) values ('5P B', $1) returning id", [etranger]))).rows[0].id;
  await eleve(db, etranger, autre, 'E07');
});

test('codes d\'élèves invalides refusés', async () => {
  const { db, master, classe } = await monde();
  for (const code of ['E 07', 'x'.repeat(13), 'Étienne', '', 'E07!']) {
    await assert.rejects(eleve(db, master, classe, code), /check|violates/, JSON.stringify(code));
  }
  await eleve(db, master, classe, 'ABC-123');
});

test('jeton de tâche et réglages invalides refusés', async () => {
  const { db, master, classe } = await monde();
  const essai = (token, mode = 'sans', hab = 'album', intrus = 3) => comme(db, 'authenticated', master, () =>
    db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', $3, $4, $5, false, $6)", [classe, token, mode, hab, intrus, master]));
  for (const t of ['abc', 'Z'.repeat(24), 'a'.repeat(25)]) await assert.rejects(essai(t), /check|violates/, t);
  await assert.rejects(essai('e'.repeat(24), 'xx'), /check|violates/);
  await assert.rejects(essai('f'.repeat(24), 'sans', 'rose'), /check|violates/);
  await assert.rejects(essai('0'.repeat(24), 'sans', 'album', 9), /check|violates/);
  await essai('1'.repeat(24));
  await assert.rejects(essai('1'.repeat(24)), /unique|duplicate/);
});

test('anon n\'a aucun droit sur aucune table', async () => {
  const { db } = await monde();
  for (const t of TABLES) {
    await assert.rejects(comme(db, 'anon', null, () => db.query(`select * from ${t}`)), /permission denied/, t);
    await assert.rejects(comme(db, 'anon', null, () => db.query(`delete from ${t}`)), /permission denied/, t);
  }
});

test('un enseignant connecté ne peut pas écrire dans les essais', async () => {
  const { db, master, classe } = await monde();
  const e = (await eleve(db, master, classe, 'E01')).rows[0].id;
  const t = (await comme(db, 'authenticated', master, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'sans', 'album', 3, false, $3) returning id", [classe, '2'.repeat(24), master]))).rows[0].id;
  await assert.rejects(comme(db, 'authenticated', master, () => db.query(
    "insert into phono_attempts (id, class_id, student_id, task_id, session, card, word, attempt, correct, help, positions, played_at) values (gen_random_uuid(), $1, $2, $3, 's', 'chat', 'chat', 1, true, 'aucune', '[]', now())", [classe, e, t])), /permission denied/);
});

test('les droits sont accordés à service_role seulement en plus de authenticated', async () => {
  const { db } = await monde();
  const r = await db.query(`select table_name, grantee from information_schema.role_table_grants where table_schema = 'public' and table_name like 'phono_%' and grantee in ('anon', 'public', 'PUBLIC')`);
  assert.deepEqual(r.rows, []);
});

test('aucune politique ne relit sa propre table : elles passent par des fonctions security definer', () => {
  const sql = sqlDesMigrations().map(m => m.sql).join('\n');
  const politiques = sql.match(/create policy[\s\S]*?;/gi) || [];
  assert.ok(politiques.length >= 10);
  for (const p of politiques) assert.doesNotMatch(p, /\bexists\b|\(\s*select\b/i, p.slice(0, 80));
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public/i);
});

test('le SQL ne contient aucun commentaire « -- » (collage dans l\'éditeur Supabase)', () => {
  for (const m of sqlDesMigrations()) assert.doesNotMatch(m.sql, /--/, m.fichier);
});

test('toutes les tables et fonctions sont préfixées phono_', () => {
  const sql = sqlDesMigrations().map(m => m.sql).join('\n');
  for (const m of sql.matchAll(/create (?:or replace )?(?:table|function|trigger|index)\s+(?:if not exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
    assert.ok(m[1].startsWith('phono_'), m[1]);
  }
});
