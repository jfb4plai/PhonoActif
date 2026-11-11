import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { demarrerJeu, poser, retirer, vider, verifier, aider, suivant, sonsDuMot } from '../../src/jeu/session.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const lex = creerLexique(entrees);
const pack = preparerPack({ nom: 'essai', mots: ['chat', 'été', 'pain'], source: 's', licence: 'l', lexique: lex }).manifest;
const REGLAGES = { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false, essaisMax: 3 };
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const maintenant = () => '2026-11-11T10:00:00.000Z';
const demarrer = (plus = {}) => demarrerJeu({ pack, reglages: { ...REGLAGES, ...plus.reglages }, code: 'E07', rng: graine(5), maintenant, ...plus.params });

// pièce du plateau portant ce graphème (non intrus), pas encore posée
const piece = (etat, g) => etat.plateau.find(p => !p.intrus && p.g === g && !etat.poses.includes(p.id));
const pieceIntrus = etat => etat.plateau.find(p => p.intrus);
const poserMot = (etat, gs) => gs.reduce((e, g) => poser(e, piece(e, g).id), etat);
const geler = e => { Object.freeze(e); [e.poses, e.essais, e.plateau, e.cartes].forEach(Object.freeze); return e; };

test('démarrage : première carte, plateau, état neuf', () => {
  const e = demarrer();
  assert.equal(e.index, 0); assert.equal(e.cartes[0].mot, 'chat');
  assert.equal(e.statut, 'en_cours'); assert.equal(e.tentative, 1); assert.equal(e.aide, 'aucune');
  assert.deepEqual(e.poses, []); assert.equal(e.plateau.length, 6);
  assert.equal(e.code, 'E07'); assert.equal(e.pack, 'essai');
  assert.match(e.session, /^s-\d{14}-[0-9a-z]{4}$/);
});

test('bonne réponse : juste, une ligne d\'essai complète', () => {
  const { etat, resultat } = verifier(poserMot(demarrer(), ['ch', 'a', 't']));
  assert.equal(resultat, 'juste');
  assert.equal(etat.statut, 'juste');
  assert.equal(etat.essais.length, 1);
  const l = etat.essais[0];
  assert.deepEqual({ ...l, positions: undefined }, {
    session: etat.session, code: 'E07', pack: 'essai', carte: 'chat', mot: 'chat', modeMot: 'sans',
    tentative: 1, juste: true, aide: 'aucune', positions: undefined, date: '2026-11-11T10:00:00.000Z'
  });
  assert.deepEqual(l.positions, [
    { liaison: 'ch=ch', pose: 'ch', juste: true }, { liaison: 'a=a', pose: 'a', juste: true }, { liaison: 't=', pose: 't', juste: true }
  ]);
  assert.ok(!('duree' in l) && !('ms' in l));
});

test('même pièce posée deux fois, ou zone pleine : état identique', () => {
  let e = demarrer();
  const p = piece(e, 'ch');
  e = poser(e, p.id);
  assert.equal(poser(e, p.id), e);
  e = poserMot(e, ['a', 't']);
  assert.equal(poser(e, pieceIntrus(e).id), e);
  assert.equal(poser(e, 'inconnue'), e);
});

test('vérifier une zone incomplète : rien n\'est enregistré', () => {
  const e = poserMot(demarrer(), ['ch']);
  const r = verifier(e);
  assert.equal(r.resultat, 'incomplet');
  assert.equal(r.etat, e);
  assert.deepEqual(r.etat.essais, []);
});

test('mauvaise réponse : zone vidée, tentative suivante, ligne fausse', () => {
  let e = poser(poser(poser(demarrer(), piece(demarrer(), 'ch').id), piece(demarrer(), 'a').id), pieceIntrus(demarrer()).id);
  const r = verifier(e);
  assert.equal(r.resultat, 'faux');
  assert.deepEqual(r.etat.poses, []);
  assert.equal(r.etat.tentative, 2);
  assert.equal(r.etat.statut, 'en_cours');
  assert.equal(r.etat.essais[0].juste, false);
  assert.equal(r.etat.essais[0].positions[2].juste, false);
  assert.equal(r.etat.essais[0].positions[2].pose, pieceIntrus(demarrer()).g);
});

test('trois mauvaises réponses : révélation et trois lignes', () => {
  let e = demarrer();
  const faux = (x) => { const intr = x.plateau.filter(p => p.intrus); return intr.slice(0, 3).reduce((y, p) => poser(y, p.id), x); };
  let r;
  for (let i = 0; i < 3; i++) { r = verifier(faux(e)); e = r.etat; }
  assert.equal(r.resultat, 'revelation');
  assert.equal(e.statut, 'revelation');
  assert.equal(e.essais.length, 3);
  assert.deepEqual(e.essais.map(l => l.tentative), [1, 2, 3]);
});

test('accents : e accepté pour é quand exigerAccents est faux, refusé sinon', () => {
  const carteAccents = { id: 'été', mot: 'été', cubes: [{ g: 'é', son: 'e_ferme' }, { g: 't', son: 't' }, { g: 'é', son: 'e_ferme' }] };
  for (const [exiger, attendu] of [[false, 'juste'], [true, 'faux']]) {
    let e = demarrerJeu({ pack: { nom: 'x', cartes: [carteAccents] }, reglages: { ...REGLAGES, nbIntrus: 0, exigerAccents: exiger }, code: 'E1', rng: graine(2), maintenant });
    // plateau fabriqué à la main : l'élève a posé e, t, e (sans accent)
    e = { ...e, plateau: [{ id: 'a', g: 'e', son: 'e_ferme', intrus: false }, { id: 'b', g: 't', son: 't', intrus: false }, { id: 'c', g: 'e', son: 'e_ferme', intrus: false }] };
    e = poser(poser(poser(e, 'a'), 'b'), 'c');
    assert.equal(verifier(e).resultat, attendu, `exigerAccents=${exiger}`);
  }
});

test('retirer puis re-poser ; retirer sans rien : état identique ; vider', () => {
  let e = demarrer();
  assert.equal(retirer(e), e);
  e = poserMot(e, ['ch', 'a']);
  const r = retirer(e);
  assert.equal(r.poses.length, 1);
  assert.equal(poser(r, e.poses[1]).poses.length, 2);
  assert.deepEqual(vider(e).poses, []);
  assert.equal(vider(demarrer()).poses.length, 0);
});

test('aide graduée : écoute, indice, révélation', () => {
  const e0 = demarrer();
  const a1 = aider(e0);
  assert.equal(a1.etat.aide, 'ecoute');
  assert.deepEqual(a1.sons, ['ch', 'a']);
  const a2 = aider(a1.etat);
  assert.equal(a2.etat.aide, 'indice');
  assert.deepEqual(a2.sons, []);
  assert.deepEqual(a2.etat.indice, { position: 0, g: 'ch' });
  const a3 = aider(a2.etat);
  assert.equal(a3.etat.aide, 'revelation');
  assert.equal(a3.etat.statut, 'revelation');
  assert.equal(aider(a3.etat).etat, a3.etat);
});

test('indice : première position non correcte', () => {
  const e = poserMot(demarrer(), ['ch']);
  const a = aider(aider(e).etat);
  assert.deepEqual(a.etat.indice, { position: 1, g: 'a' });
});

test('la révélation demandée sans essai est enregistrée comme un échec', () => {
  const e = aider(aider(aider(demarrer()).etat).etat).etat;
  assert.equal(e.essais.length, 1);
  assert.equal(e.essais[0].juste, false);
  assert.equal(e.essais[0].aide, 'revelation');
  assert.ok(e.essais[0].positions.every(p => p.pose === null && p.juste === false));
});

test('suivant : ignoré en cours, avance après juste, fini après la dernière carte', () => {
  let e = demarrer();
  assert.equal(suivant(e), e);
  e = suivant(verifier(poserMot(e, ['ch', 'a', 't'])).etat);
  assert.equal(e.index, 1); assert.equal(e.statut, 'en_cours'); assert.equal(e.tentative, 1);
  assert.equal(e.aide, 'aucune'); assert.deepEqual(e.poses, []); assert.equal(e.indice, null);
  assert.equal(e.cartes[e.index].mot, 'été');
  const fin = { ...e, index: e.cartes.length - 1, statut: 'juste' };
  assert.equal(suivant(fin).statut, 'fini');
});

test('les fonctions ne modifient jamais l\'état reçu', () => {
  const e = geler(demarrer());
  const e2 = poser(e, piece(e, 'ch').id);
  geler(e2);
  retirer(e2); vider(e2); aider(e2);
  verifier(poserMot(e, ['ch', 'a', 't']));
  assert.deepEqual(e.poses, []);
  assert.deepEqual(e.essais, []);
});

test('sonsDuMot : sons de chaque cube dans l\'ordre, sons composés développés', () => {
  assert.deepEqual(sonsDuMot({ cubes: [{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }] }), ['ch', 'a']);
  assert.deepEqual(sonsDuMot({ cubes: [{ g: 'eil', son: 'e_ouvert+yod' }, { g: 'ill', son: 'ij' }] }), ['e_ouvert', 'yod', 'i', 'yod']);
});

test('mélange des cartes quand reglages.melanger et un rng sont fournis', () => {
  const ordres = new Set();
  for (let g = 1; g <= 20; g++) {
    ordres.add(demarrerJeu({ pack, reglages: { ...REGLAGES, melanger: true }, code: 'E1', rng: graine(g), maintenant }).cartes.map(c => c.mot).join());
  }
  assert.ok(ordres.size > 1);
});
