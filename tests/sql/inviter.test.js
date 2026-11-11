import test from 'node:test';
import assert from 'node:assert/strict';
import { baseDeTest, creerUtilisateur, comme } from './harness.js';

async function monde() {
  const db = await baseDeTest();
  const master = await creerUtilisateur(db, 'master@ecole.be');
  const collegue = await creerUtilisateur(db, 'Collegue@Ecole.be');
  const intrus = await creerUtilisateur(db, 'intrus@ecole.be');
  const classe = (await comme(db, 'authenticated', master, () => db.query("insert into phono_classes (name, created_by) values ('3P A', $1) returning id", [master]))).rows[0].id;
  return { db, master, collegue, intrus, classe };
}
const inviter = (db, who, classe, email) => comme(db, who ? 'authenticated' : 'anon', who, () => db.query('select public.phono_inviter($1, $2)', [classe, email]));
const roles = async (db, classe) => (await db.query('select u.email, m.role from phono_class_members m join auth.users u on u.id = m.user_id where m.class_id = $1 order by m.role', [classe])).rows;

test('le master invite un collègue par son e-mail, sans tenir compte de la casse ni des espaces', async () => {
  const { db, master, classe } = await monde();
  await inviter(db, master, classe, '  collegue@ecole.be ');
  assert.deepEqual(await roles(db, classe), [{ email: 'Collegue@Ecole.be', role: 'invite' }, { email: 'master@ecole.be', role: 'master' }]);
});

test('un invité ne peut pas inviter', async () => {
  const { db, master, collegue, classe } = await monde();
  await inviter(db, master, classe, 'collegue@ecole.be');
  await assert.rejects(inviter(db, collegue, classe, 'intrus@ecole.be'), /reserve_au_master/);
});

test('un étranger à la classe ne peut pas inviter', async () => {
  const { db, intrus, classe } = await monde();
  await assert.rejects(inviter(db, intrus, classe, 'collegue@ecole.be'), /reserve_au_master/);
});

test('e-mail inconnu ou déjà membre', async () => {
  const { db, master, classe } = await monde();
  await assert.rejects(inviter(db, master, classe, 'personne@ecole.be'), /enseignant_inconnu/);
  await assert.rejects(inviter(db, master, classe, 'master@ecole.be'), /deja_membre/);
  await inviter(db, master, classe, 'collegue@ecole.be');
  await assert.rejects(inviter(db, master, classe, 'collegue@ecole.be'), /deja_membre/);
});

test('e-mail vide ou absent : enseignant inconnu', async () => {
  const { db, master, classe } = await monde();
  await assert.rejects(inviter(db, master, classe, ''), /enseignant_inconnu/);
  await assert.rejects(inviter(db, master, classe, null), /enseignant_inconnu/);
});

test('anon ne peut pas appeler la fonction', async () => {
  const { db, classe } = await monde();
  await assert.rejects(inviter(db, null, classe, 'collegue@ecole.be'), /permission denied/);
});
