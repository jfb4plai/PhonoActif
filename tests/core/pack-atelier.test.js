import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creerLexique, construirePackLettres, packsVisibles, identifiantCarte, nomFichierAudio, empreinteCourriel } from '../../src/core/index.js';

const lexique = creerLexique(JSON.parse(readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8')));
const pack = (mots, plus = {}) => ({ nom: 'essai', titre: 'Essai', visibilite: 'commun', proprietaire: '', cartes: mots.map(m => (typeof m === 'string' ? { mot: m } : m)), ...plus });

test('mots du lexique : manifeste en mode lettres, un état par lettre, graphèmes finaux qui recomposent le mot', () => {
  const { manifest, exclus } = construirePackLettres({ pack: pack(['chat', 'lune']), lexique });
  assert.deepEqual(exclus, []);
  assert.equal(manifest.mode, 'lettres');
  const chat = manifest.cartes.find(c => c.mot === 'chat');
  assert.deepEqual(chat.lettres, ['c', 'h', 'a', 't']);
  assert.equal(chat.etats.length, 4);
  assert.deepEqual(chat.etats.map(e => e.lettres), ['c', 'ch', 'cha', 'chat']);
  assert.equal(chat.cubes.map(c => c.g).join(''), 'chat');
  assert.ok(chat.etats.every(e => e.fichier && e.fichier.startsWith('audio/') && e.fichier.endsWith('.mp3')));
});

test('mot absent du lexique : écarté par défaut, accepté avec avertissement si on le demande', () => {
  const sans = construirePackLettres({ pack: pack(['chat', 'zorglub']), lexique });
  assert.deepEqual(sans.exclus.map(e => e.mot), ['zorglub']);
  assert.ok(sans.exclus[0].raison.includes('absent du lexique'));
  assert.deepEqual(sans.manifest.cartes.map(c => c.mot), ['chat']);
  const avec = construirePackLettres({ pack: pack(['chat', 'zorglub']), lexique, inclureAVerifier: true });
  assert.deepEqual(avec.manifest.cartes.map(c => c.mot), ['chat', 'zorglub']);
  assert.equal(avec.manifest.cartes[1].aVerifier, true);
  assert.ok(avec.avertissements.some(a => a.includes('zorglub')));
});

test('fichiers audio : distincts, partagés entre mots, nommés comme la bibliothèque', () => {
  const { fichiersDistincts, manifest } = construirePackLettres({ pack: pack(['chat', 'chien']), lexique });
  const noms = fichiersDistincts.map(f => f.fichier);
  assert.equal(new Set(noms).size, noms.length);
  const tous = manifest.cartes.flatMap(c => c.etats.map(e => e.fichier.replace(/^audio\//, '').replace(/\.mp3$/, '')));
  assert.ok(tous.every(n => noms.includes(n)));
  assert.ok(tous.length > noms.length, 'les états identiques de deux mots partagent un fichier (« ch »)');
  assert.equal(nomFichierAudio('ʃa', -30), '283_61_-30');
  fichiersDistincts.forEach(f => assert.equal(f.vitesse, [...f.ipa.normalize('NFD').replace(/[̀-ͯ͡]/g, '')].length > 1 ? -30 : 0));
});

test('images : source et licence portées par la carte ; sans image, aucun champ image', () => {
  const { manifest } = construirePackLettres({ pack: pack([{ mot: 'chat', image: 'images/chat.png', image_mot: 'images/chat-mot.png', source: 'moi', licence: 'propre', niveau: 'P1', phrase: 'Le chat dort.' }, { mot: 'lune' }]), lexique });
  const [chat, lune] = manifest.cartes;
  assert.equal(chat.image_sans_mot, 'images/chat.png');
  assert.equal(chat.image_avec_mot, 'images/chat-mot.png');
  assert.equal(chat.source, 'moi');
  assert.equal(chat.licence, 'propre');
  assert.equal(chat.niveau, 'P1');
  assert.equal(chat.phrase, 'Le chat dort.');
  assert.equal(lune.image_sans_mot, undefined);
  assert.equal(lune.source, undefined);
});

test('pack personnel : seule l’empreinte du propriétaire est écrite (jamais l’adresse), libellé « personnel »', async () => {
  const emp = await empreinteCourriel('A@B.be');
  const { manifest, entreeIndex } = construirePackLettres({ pack: pack(['chat'], { visibilite: 'prive', proprietaire: 'a@b.be', proprietaireEmpreinte: emp, titre: 'Mes mots' }), lexique });
  assert.equal(manifest.visibilite, 'prive');
  assert.equal(manifest.proprietaire, emp);
  assert.deepEqual(entreeIndex, { id: 'essai', label: 'Mes mots (personnel)', visibilite: 'prive', proprietaire: emp });
  assert.ok(!JSON.stringify(manifest).includes('a@b.be') && !JSON.stringify(entreeIndex).includes('a@b.be'));
  const commun = construirePackLettres({ pack: pack(['chat']), lexique });
  assert.deepEqual(commun.entreeIndex, { id: 'essai', label: 'Essai', visibilite: 'commun' });
  assert.equal(commun.manifest.proprietaire, undefined);
});

test('pack personnel sans empreinte : refusé (l’adresse ne doit pas être publiée en clair)', () => {
  assert.throws(() => construirePackLettres({ pack: pack(['chat'], { visibilite: 'prive', proprietaire: 'a@b.be' }), lexique }), /empreinte/);
});

test('empreinteCourriel : stable, insensible à la casse et aux espaces, 64 caractères hexadécimaux, différente d’une adresse à l’autre', async () => {
  const a = await empreinteCourriel('Jean@Ecole.be');
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, await empreinteCourriel('  jean@ecole.be '));
  assert.notEqual(a, await empreinteCourriel('jeanne@ecole.be'));
  assert.ok(!a.includes('jean'));
});

test('identifiants de carte : sans accent ni ligature', () => {
  assert.equal(identifiantCarte('forêt'), 'foret');
  assert.equal(identifiantCarte('cœur'), 'coeur');
  assert.equal(identifiantCarte('élève'), 'eleve');
});

test('packsVisibles : un pack personnel n’est vu que par son propriétaire (empreinte)', async () => {
  const moi = await empreinteCourriel('jean@ecole.be'), autre = await empreinteCourriel('autre@ecole.be');
  const index = [{ id: 'demo', label: 'D' }, { id: 'commun', label: 'C', visibilite: 'commun' }, { id: 'perso', label: 'P (personnel)', visibilite: 'prive', proprietaire: moi }, { id: 'sans-label' }];
  assert.deepEqual(packsVisibles(index, moi).map(p => p.id), ['demo', 'commun', 'perso']);
  assert.deepEqual(packsVisibles(index, autre).map(p => p.id), ['demo', 'commun']);
  assert.deepEqual(packsVisibles(index, '').map(p => p.id), ['demo', 'commun']);
  assert.deepEqual(packsVisibles(index, undefined).map(p => p.id), ['demo', 'commun']);
  assert.deepEqual(packsVisibles(null, moi), []);
});

test('syllabes : coupées sur les sons du mot entier, fichiers nommés comme la bibliothèque et ajoutés aux fichiers à générer', () => {
  const { manifest, fichiersDistincts } = construirePackLettres({ pack: pack(['maman', 'chat', 'petit']), lexique });
  const par = Object.fromEntries(manifest.cartes.map(c => [c.mot, c]));
  assert.deepEqual(par.maman.syllabes.map(s => s.ipa), ['ma', 'mɑ̃']);
  assert.deepEqual(par.maman.syllabes.map(s => s.fichier), ['audio/6d_61_-30.mp3', 'audio/6d_251_303_-30.mp3']);
  assert.deepEqual(par.petit.syllabes.map(s => s.ipa), ['pə', 'ti']);
  assert.equal(par.chat.syllabes.length, 1);
  const noms = fichiersDistincts.map(f => f.fichier);
  par.maman.syllabes.forEach(s => assert.ok(noms.includes(s.fichier.replace(/^audio\//, '').replace(/\.mp3$/, ''))));
  assert.equal(new Set(noms).size, noms.length);
});
