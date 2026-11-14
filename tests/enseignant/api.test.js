import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genererJeton, genererCodes, prochainDebut, creerCodesAuto, listerTaches, resumeTache, decouperCodes, lienDeTache, qrDeLien, creerClasse, lister, ajouterEleves, creerTache, revoquerTache,
  resultats, inviter, supprimerEleve, supprimerClasse, lienEleve, liensEleves, genererCle, nouvelleCleEleve
} from '../../src/enseignant/api.js';
import { fauxClient } from './fauxClient.js';

const MASTER = 'u-master';

test('genererJeton : 24 caractères hexadécimaux, aucun doublon sur 1000 tirages', () => {
  const vus = new Set();
  for (let i = 0; i < 1000; i++) { const j = genererJeton(); assert.match(j, /^[a-f0-9]{24}$/); vus.add(j); }
  assert.equal(vus.size, 1000);
});

test('genererCodes : préfixe et numéros, valides et sans doublon', () => {
  assert.deepEqual(genererCodes('E', 3), ['E01', 'E02', 'E03']);
  assert.deepEqual(genererCodes('E', 3, 5), ['E05', 'E06', 'E07']);
  const cent = genererCodes('E', 120);
  assert.equal(cent[0], 'E001'); assert.equal(cent[119], 'E120');
  assert.equal(new Set(cent).size, 120);
  for (const c of cent) assert.match(c, /^[A-Za-z0-9-]{1,12}$/);
});

test('genererCodes : refuse n invalide, préfixe invalide ou code trop long', () => {
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => genererCodes('E', n), /nombre/);
  assert.throws(() => genererCodes('É', 3), /préfixe/);
  assert.throws(() => genererCodes('E 1', 3), /préfixe/);
  assert.throws(() => genererCodes('x'.repeat(11), 3), /trop long/);
});

test('prochainDebut : numéro suivant le plus grand numéro existant du même préfixe', () => {
  assert.equal(prochainDebut([], 'E'), 1);
  assert.equal(prochainDebut(['E01', 'E02', 'E07'], 'E'), 8);
  assert.equal(prochainDebut(['E01', 'A05', 'Eva', 'E-3'], 'E'), 2);
  assert.equal(prochainDebut(['E01', 'E02'], 'A'), 1);
});

test('creerCodesAuto : crée n codes à la suite des existants', async () => {
  const c = fauxClient({ tables: { phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }, { id: 's2', class_id: 'c1', code: 'E02' }] } });
  const r = await creerCodesAuto(c, 'c1', 'E', 3);
  assert.deepEqual(r.ajoutes, ['E03', 'E04', 'E05']);
  assert.deepEqual(r.refuses, []);
  assert.equal(c.tables.phono_students.length, 5);
  await assert.rejects(creerCodesAuto(c, 'c1', 'E', 0), /nombre/);
});

test('decouperCodes : virgules, point-virgules, espaces et retours à la ligne', () => {
  assert.deepEqual(decouperCodes('E01, E02;E03\nE04  E05,,'), ['E01', 'E02', 'E03', 'E04', 'E05']);
  assert.deepEqual(decouperCodes('   '), []);
  assert.deepEqual(decouperCodes(undefined), []);
});

test('lienDeTache et QR', async () => {
  assert.equal(lienDeTache('https://phonoactif.jfb4plai.com/', 'a1'.repeat(12)), `https://phonoactif.jfb4plai.com/#/jeu?t=${'a1'.repeat(12)}`);
  assert.match(await qrDeLien('https://x.test/#/jeu?t=abc'), /^data:image\/png;base64,/);
});

test('creerClasse : nom valide, créateur inscrit ; nom vide ou trop long refusé', async () => {
  const c = fauxClient();
  const r = await creerClasse(c, ' 3P A ', MASTER);
  assert.equal(r.name, '3P A');
  assert.equal(c.tables.phono_classes[0].created_by, MASTER);
  await assert.rejects(creerClasse(c, '  ', MASTER), /nom/);
  await assert.rejects(creerClasse(c, 'x'.repeat(61), MASTER), /nom/);
});

test('lister : mes classes avec mon rôle, sans les adhésions des autres', async () => {
  const c = fauxClient({ tables: {
    phono_classes: [{ id: 'c1', name: '3P A' }, { id: 'c2', name: '5P B' }],
    phono_class_members: [{ class_id: 'c1', user_id: MASTER, role: 'master' }, { class_id: 'c1', user_id: 'u-autre', role: 'invite' }, { class_id: 'c2', user_id: MASTER, role: 'invite' }]
  } });
  assert.deepEqual(await lister(c, MASTER), [{ id: 'c1', name: '3P A', role: 'master' }, { id: 'c2', name: '5P B', role: 'invite' }]);
});

test('ajouterEleves : valides ajoutés, doublons, existants et codes invalides refusés avec leur raison', async () => {
  const c = fauxClient({ tables: { phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }] } });
  const r = await ajouterEleves(c, 'c1', ['E01', 'E02', 'E02', 'x y', 'Étienne', 'E03']);
  assert.deepEqual(r.ajoutes, ['E02', 'E03']);
  assert.deepEqual(r.refuses, [
    { code: 'E01', raison: 'déjà dans la classe' }, { code: 'E02', raison: 'doublon dans la liste' },
    { code: 'x y', raison: 'code invalide' }, { code: 'Étienne', raison: 'code invalide' }
  ]);
  assert.deepEqual(c.tables.phono_students.map(s => s.code), ['E01', 'E02', 'E03']);
});

test('ajouterEleves : liste vide, rien à ajouter', async () => {
  const r = await ajouterEleves(fauxClient(), 'c1', []);
  assert.deepEqual(r, { ajoutes: [], refuses: [] });
});

test('creerTache : jeton, réglages, lien, créateur', async () => {
  const c = fauxClient();
  const r = await creerTache(c, 'c1', { pack: 'demo', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true }, MASTER, 'https://x.test/');
  assert.match(r.jeton, /^[a-f0-9]{24}$/);
  assert.equal(r.lien, `https://x.test/#/jeu?t=${r.jeton}`);
  assert.deepEqual(c.tables.phono_tasks[0], { id: r.id, class_id: 'c1', token: r.jeton, pack: 'demo', mode_mot: 'avec', habillage: 'sobre', nb_intrus: 2, exiger_accents: true, created_by: MASTER });
  await assert.rejects(creerTache(c, 'c1', { pack: '', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: false }, MASTER, 'https://x.test/'), /pack/);
});

test('listerTaches : les plus récentes d’abord, avec lien et résumé des réglages', async () => {
  const ligne = (id, quand, extra = {}) => ({ id, class_id: 'c1', token: id.repeat(24).slice(0, 24), pack: 'demo', mode_mot: 'sans', habillage: 'album', nb_intrus: 3, exiger_accents: false, revoked: false, created_at: quand, ...extra });
  const c = fauxClient({ tables: { phono_tasks: [ligne('a', '2026-11-10T10:00:00Z', { habillage: 'sobre', mode_mot: 'avec', nb_intrus: 2 }), ligne('b', '2026-11-11T10:00:00Z'), ligne('z', '2026-11-12T10:00:00Z', { class_id: 'autre' })] } });
  const r = await listerTaches(c, 'c1', 'https://x.test/');
  assert.deepEqual(r.map(t => t.id), ['b', 'a']);
  assert.equal(r[0].lien, `https://x.test/#/jeu?t=${'b'.repeat(24)}`);
  assert.equal(resumeTache(r[0]), 'album · sans le mot · 3 cubes en trop · accents non exigés');
  assert.equal(resumeTache(r[1]), 'sobre · avec le mot · 2 cubes en trop · accents non exigés');
  assert.equal(resumeTache({ ...r[0], nbIntrus: 1, exigerAccents: true }), 'album · sans le mot · 1 cube en trop · accents exigés');
});

test('revoquerTache', async () => {
  const c = fauxClient({ tables: { phono_tasks: [{ id: 't1', revoked: false }] } });
  await revoquerTache(c, 't1');
  assert.equal(c.tables.phono_tasks[0].revoked, true);
});

const essai = (student_id, tentative, positions, played_at, id = crypto.randomUUID()) =>
  ({ id, class_id: 'c1', student_id, task_id: 't1', session: 's', card: 'chat', word: 'chat', attempt: tentative, correct: positions.every(p => p.juste), help: 'aucune', positions, played_at });
const P = (liaison, pose, juste) => ({ liaison, pose, juste });

test('resultats : regroupés par élève, dernière séance, résumé par liaison et plus ratées', async () => {
  const c = fauxClient({ tables: {
    phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }, { id: 's2', class_id: 'c1', code: 'E02' }],
    phono_attempts: [
      essai('s1', 1, [P('ch=ch', 's', false), P('a=a', 'a', true)], '2026-11-10T09:00:00Z'),
      essai('s1', 2, [P('ch=ch', 'ch', true), P('a=a', 'a', true)], '2026-11-10T09:01:00Z'),
      essai('s1', 1, [P('ch=ch', 'ch', true), P('a=a', 'a', true)], '2026-11-11T09:00:00Z')
    ]
  } });
  const r = await resultats(c, 'c1');
  assert.deepEqual(r.map(x => x.code), ['E01', 'E02']);
  const e1 = r[0];
  assert.equal(e1.essais, 3);
  assert.equal(e1.derniereSeance, '2026-11-11T09:00:00Z');
  const ch = e1.liaisons.find(l => l.liaison === 'ch=ch');
  assert.deepEqual(ch, { liaison: 'ch=ch', essais: 2, justesDuPremierCoup: 1, reprises: 1, confusions: { s: 1 } });
  assert.deepEqual(e1.plusRatees.map(l => l.liaison), ['ch=ch']);
  assert.deepEqual({ essais: r[1].essais, derniereSeance: r[1].derniereSeance, liaisons: r[1].liaisons, plusRatees: r[1].plusRatees }, { essais: 0, derniereSeance: null, liaisons: [], plusRatees: [] });
});

test('resultats : au plus trois liaisons les plus ratées, les plus ratées d\'abord', async () => {
  const lignes = ['a', 'b', 'c', 'd'].map((x, i) => essai('s1', 1, [P(`${x}=${x}`, 'z', i === 3)], `2026-11-1${i}T09:00:00Z`));
  lignes.push(essai('s1', 1, [P('a=a', 'a', true)], '2026-11-20T09:00:00Z'));
  const c = fauxClient({ tables: { phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }], phono_attempts: lignes } });
  const [e1] = await resultats(c, 'c1');
  assert.equal(e1.plusRatees.length, 3);
  assert.deepEqual(e1.plusRatees.map(l => l.liaison), ['b=b', 'c=c', 'a=a']);
});

test('inviter : appel de la fonction et messages en français', async () => {
  const c = fauxClient();
  await inviter(c, 'c1', ' collegue@ecole.be ');
  assert.deepEqual(c.rpcs[0], { nom: 'phono_inviter', args: { p_class: 'c1', p_email: 'collegue@ecole.be' } });
  await assert.rejects(inviter(fauxClient({ rpcErreurs: { phono_inviter: 'enseignant_inconnu' } }), 'c1', 'x@y.be'), /Aucun enseignant PLAI/);
  await assert.rejects(inviter(fauxClient({ rpcErreurs: { phono_inviter: 'deja_membre' } }), 'c1', 'x@y.be'), /déjà dans la classe/);
  await assert.rejects(inviter(fauxClient({ role: 'invite' }), 'c1', 'x@y.be'), /Réservé au master de la classe/);
  await assert.rejects(inviter(c, 'c1', ''), /e-mail/);
});

test('supprimerEleve et supprimerClasse : le master supprime, l\'invité reçoit « Réservé au master de la classe »', async () => {
  const tables = () => ({ phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }], phono_classes: [{ id: 'c1', name: '3P A' }] });
  const m = fauxClient({ tables: tables() });
  await supprimerEleve(m, 's1');
  assert.equal(m.tables.phono_students.length, 0);
  await supprimerClasse(m, 'c1');
  assert.equal(m.tables.phono_classes.length, 0);
  const i = fauxClient({ role: 'invite', tables: tables() });
  await assert.rejects(supprimerEleve(i, 's1'), /Réservé au master de la classe/);
  await assert.rejects(supprimerClasse(i, 'c1'), /Réservé au master de la classe/);
  assert.equal(i.tables.phono_students.length, 1);
});

test('genererCle : 20 caractères hexadécimaux, aucun doublon sur 1000 tirages', () => {
  const vus = new Set();
  for (let i = 0; i < 1000; i++) { const k = genererCle(); assert.match(k, /^[a-f0-9]{20}$/); vus.add(k); }
  assert.equal(vus.size, 1000);
});

test('lienEleve et liensEleves : un lien par élève, trié, avec son code et sa propre clé', async () => {
  const jeton = 'a1'.repeat(12);
  assert.equal(lienEleve('https://x.test/', jeton, 'E07', '0123456789abcdef0123'), `https://x.test/#/jeu?t=${jeton}&e=E07&k=0123456789abcdef0123`);
  const client = fauxClient({ tables: { phono_students: [
    { id: 's2', class_id: 'c1', code: 'E02', secret: 'b'.repeat(20) }, { id: 's1', class_id: 'c1', code: 'E01', secret: 'a'.repeat(20) }, { id: 's9', class_id: 'c2', code: 'E09', secret: 'c'.repeat(20) }
  ] } });
  const liens = await liensEleves(client, 'c1', jeton, 'https://x.test/');
  assert.deepEqual(liens.map(l => l.code), ['E01', 'E02']);
  assert.ok(liens[0].lien.endsWith(`&e=E01&k=${'a'.repeat(20)}`) && liens[1].lien.endsWith(`&e=E02&k=${'b'.repeat(20)}`));
});

test('nouvelleCleEleve : la clé de cet élève change, pas celle des autres', async () => {
  const client = fauxClient({ tables: { phono_students: [{ id: 's1', class_id: 'c1', code: 'E01', secret: 'a'.repeat(20) }, { id: 's2', class_id: 'c1', code: 'E02', secret: 'b'.repeat(20) }] } });
  await nouvelleCleEleve(client, 's1');
  const [s1, s2] = client.tables.phono_students;
  assert.match(s1.secret, /^[a-f0-9]{20}$/); assert.notEqual(s1.secret, 'a'.repeat(20));
  assert.equal(s2.secret, 'b'.repeat(20));
});
