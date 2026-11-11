import test from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest, creerUtilisateur, comme } from './harness.js';

const T1 = 'a1'.repeat(12);
const T2 = 'b2'.repeat(12);

async function monde() {
  const db = await baseDeTest();
  const [m1, m2] = [await creerUtilisateur(db), await creerUtilisateur(db)];
  const classe = async (u, nom) => (await comme(db, 'authenticated', u, () => db.query('insert into phono_classes (name, created_by) values ($1, $2) returning id', [nom, u]))).rows[0].id;
  const [c1, c2] = [await classe(m1, '3P A'), await classe(m2, '5P B')];
  const eleve = (u, c, code) => comme(db, 'authenticated', u, () => db.query('insert into phono_students (class_id, code) values ($1, $2) returning id', [c, code]));
  const tache = (u, c, token) => comme(db, 'authenticated', u, () => db.query("insert into phono_tasks (class_id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, created_by) values ($1, $2, 'demo', 'avec', 'sobre', 2, true, $3) returning id", [c, token, u]));
  await eleve(m1, c1, 'E01'); await eleve(m2, c2, 'E02');
  await tache(m1, c1, T1); await tache(m2, c2, T2);
  return { db, m1, c1, c2 };
}
const ligne = (plus = {}) => ({
  id: crypto.randomUUID(), session: 's-1', carte: 'chat', mot: 'chat', modeMot: 'sans', tentative: 1, juste: true, aide: 'aucune',
  positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }, { liaison: 'a=a', pose: 'a', juste: true }, { liaison: 't=', pose: 't', juste: true }],
  date: '2026-11-11T10:00:00.000Z', ...plus
});
const lire = (db, token) => comme(db, 'anon', null, async () => (await db.query('select public.phono_lire_tache($1) as r', [token])).rows[0].r);
const envoyer = (db, token, code, lignes) => comme(db, 'anon', null, async () => (await db.query('select public.phono_envoyer_essais($1, $2, $3::jsonb) as r', [token, code, JSON.stringify(lignes)])).rows[0].r);
const nb = async db => (await db.query('select count(*)::int as n from phono_attempts')).rows[0].n;

test('phono_lire_tache : les réglages, sans nom de classe ni identifiant', async () => {
  const { db } = await monde();
  assert.deepEqual(await lire(db, T1), { pack: 'demo', mode_mot: 'avec', habillage: 'sobre', nb_intrus: 2, exiger_accents: true });
});

test('phono_lire_tache : jeton inconnu, révoqué ou mal formé', async () => {
  const { db } = await monde();
  await assert.rejects(lire(db, 'c3'.repeat(12)), /tache_inconnue/);
  await assert.rejects(lire(db, 'pas un jeton'), /tache_inconnue/);
  await assert.rejects(lire(db, null), /tache_inconnue/);
  await db.query('update phono_tasks set revoked = true where token = $1', [T1]);
  await assert.rejects(lire(db, T1), /tache_inconnue/);
});

test('phono_envoyer_essais : deux lignes valides rattachées au bon élève, à la bonne tâche et classe', async () => {
  const { db, c1 } = await monde();
  assert.deepEqual(await envoyer(db, T1, 'E01', [ligne(), ligne({ tentative: 2, juste: false, aide: 'ecoute' })]), { recus: 2, ignores: 0 });
  const r = await db.query('select a.class_id, s.code, t.token, a.attempt, a.correct, a.help, a.card, a.word from phono_attempts a join phono_students s on s.id = a.student_id join phono_tasks t on t.id = a.task_id order by a.attempt');
  assert.equal(r.rows.length, 2);
  assert.ok(r.rows.every(x => x.class_id === c1 && x.code === 'E01' && x.token === T1 && x.card === 'chat' && x.word === 'chat'));
  assert.deepEqual(r.rows.map(x => [x.attempt, x.correct, x.help]), [[1, true, 'aucune'], [2, false, 'ecoute']]);
});

test('phono_envoyer_essais : renvoyer les mêmes lignes ne crée aucun doublon', async () => {
  const { db } = await monde();
  const lignes = [ligne(), ligne({ carte: 'lune', mot: 'lune' })];
  await envoyer(db, T1, 'E01', lignes);
  assert.deepEqual(await envoyer(db, T1, 'E01', lignes), { recus: 0, ignores: 2 });
  assert.equal(await nb(db), 2);
  assert.deepEqual(await envoyer(db, T1, 'E01', [...lignes, ligne({ carte: 'pain', mot: 'pain' })]), { recus: 1, ignores: 2 });
});

test('phono_envoyer_essais : une ligne déjà reçue ne peut pas être écrasée par un autre jeton', async () => {
  const { db } = await monde();
  const l = ligne();
  await envoyer(db, T1, 'E01', [l]);
  const r = await envoyer(db, T2, 'E02', [{ ...l, mot: 'AUTRE', juste: false }]);
  assert.deepEqual(r, { recus: 0, ignores: 1 });
  const s = await db.query('select word, correct from phono_attempts');
  assert.deepEqual(s.rows, [{ word: 'chat', correct: true }]);
});

test('phono_envoyer_essais : code d\'une autre classe, absent ou de mauvaise casse', async () => {
  const { db } = await monde();
  for (const code of ['E02', 'e01', '', null, 'E 01']) {
    await assert.rejects(envoyer(db, T1, code, [ligne()]), /code_inconnu/, String(code));
  }
  assert.equal(await nb(db), 0);
});

test('phono_envoyer_essais : jeton inconnu', async () => {
  const { db } = await monde();
  await assert.rejects(envoyer(db, 'c3'.repeat(12), 'E01', [ligne()]), /tache_inconnue/);
});

test('phono_envoyer_essais : charge invalide refusée, rien d\'écrit, aucune ligne partielle', async () => {
  const { db } = await monde();
  const sans = (cle) => { const l = ligne(); delete l[cle]; return l; };
  const mauvaises = {
    'objet à la place d\'un tableau': { pas: 'un tableau' },
    '201 lignes': Array.from({ length: 201 }, () => ligne()),
    'sans positions': [sans('positions')],
    'positions vides': [ligne({ positions: [] })],
    '41 positions': [ligne({ positions: Array.from({ length: 41 }, () => ({ liaison: 'a=a', pose: 'a', juste: true })) })],
    'position sans liaison': [ligne({ positions: [{ pose: 'a', juste: true }] })],
    'position juste en texte': [ligne({ positions: [{ liaison: 'a=a', pose: 'a', juste: 'oui' }] })],
    'tentative 0': [ligne({ tentative: 0 })],
    'tentative 21': [ligne({ tentative: 21 })],
    'tentative décimale': [ligne({ tentative: 1.5 })],
    'tentative texte': [ligne({ tentative: '1' })],
    'aide inconnue': [ligne({ aide: 'triche' })],
    'juste en texte': [ligne({ juste: 'oui' })],
    'id invalide': [ligne({ id: 'pas-un-uuid' })],
    'sans id': [sans('id')],
    'date invalide': [ligne({ date: 'pas une date' })],
    'session vide': [ligne({ session: '' })],
    'mot trop long': [ligne({ mot: 'x'.repeat(121) })],
    'ligne qui n\'est pas un objet': ['chat'],
    'une ligne valide puis une invalide': [ligne(), ligne({ tentative: 0 })]
  };
  for (const [nom, charge] of Object.entries(mauvaises)) {
    await assert.rejects(envoyer(db, T1, 'E01', charge), /charge_invalide/, nom);
  }
  assert.equal(await nb(db), 0);
});

test('phono_envoyer_essais : tableau vide, champs en plus tolérés', async () => {
  const { db } = await monde();
  assert.deepEqual(await envoyer(db, T1, 'E01', []), { recus: 0, ignores: 0 });
  assert.deepEqual(await envoyer(db, T1, 'E01', [ligne({ code: 'E01', pack: 'demo', inconnu: 42 })]), { recus: 1, ignores: 0 });
});

test('200 lignes d\'un coup acceptées', async () => {
  const { db } = await monde();
  const r = await envoyer(db, T1, 'E01', Array.from({ length: 200 }, () => ligne()));
  assert.deepEqual(r, { recus: 200, ignores: 0 });
});

test('anon et authenticated n\'ont toujours aucun accès direct aux essais, anon peut seulement exécuter les deux fonctions', async () => {
  const { db, m1 } = await monde();
  await assert.rejects(comme(db, 'anon', null, () => db.query('select * from phono_attempts')), /permission denied/);
  await assert.rejects(comme(db, 'authenticated', m1, () => db.query("insert into phono_attempts (id, class_id, student_id, task_id, session, card, word, attempt, correct, help, positions, played_at) select gen_random_uuid(), class_id, id, (select id from phono_tasks limit 1), 's', 'c', 'c', 1, true, 'aucune', '[]', now() from phono_students limit 1")), /permission denied/);
  await assert.rejects(comme(db, 'anon', null, () => db.query('select public.phono_is_member(gen_random_uuid())')), /permission denied/);
});
