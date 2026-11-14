import test from 'node:test';
import assert from 'node:assert/strict';
import { stockageMemoire, stockageLocal, exporterJson, exporterCsv, resumerParLiaison } from '../../src/jeu/essais.js';

const ligne = (plus = {}) => ({
  session: 's-1', code: 'E07', pack: 'essai', carte: 'chat', mot: 'chat', modeMot: 'sans', tentative: 1, juste: true, aide: 'aucune',
  positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }, { liaison: 'a=a', pose: 'a', juste: true }, { liaison: 't=', pose: 't', juste: true }],
  date: '2026-11-11T10:00:00.000Z', ...plus
});
const fauxStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, _m: m };
};
const CLE = 'phonoactif-essais-v1';

test('stockage mémoire : ajouter, lire (copie), vider', () => {
  const s = stockageMemoire();
  s.ajouter(ligne());
  s.ajouter(ligne({ carte: 'lune' }));
  const lues = s.lire();
  assert.equal(lues.length, 2);
  lues.pop();
  assert.equal(s.lire().length, 2);
  s.vider();
  assert.deepEqual(s.lire(), []);
  assert.equal(s.persistant, false);
});

test('stockage local : écrit sous la clé et relit au second appel', () => {
  const st = fauxStorage();
  const a = stockageLocal({ storage: st });
  assert.equal(a.persistant, true);
  a.ajouter(ligne());
  assert.equal(JSON.parse(st._m.get(CLE)).length, 1);
  const b = stockageLocal({ storage: st });
  assert.deepEqual(b.lire(), [ligne()]);
  b.vider();
  assert.deepEqual(stockageLocal({ storage: st }).lire(), []);
});

test('stockage local : setItem qui lève, le jeu continue en mémoire', () => {
  const st = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const s = stockageLocal({ storage: st });
  s.ajouter(ligne());
  assert.equal(s.persistant, false);
  assert.equal(s.lire().length, 1);
});

test('stockage local : accès refusé dès le départ, contenu illisible ou pas un tableau', () => {
  const refuse = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); }, removeItem: () => {} };
  const s = stockageLocal({ storage: refuse });
  assert.equal(s.persistant, false);
  s.ajouter(ligne());
  assert.equal(s.lire().length, 1);
  assert.deepEqual(stockageLocal({ storage: fauxStorage({ [CLE]: 'pas du json' }) }).lire(), []);
  assert.deepEqual(stockageLocal({ storage: fauxStorage({ [CLE]: '{"a":1}' }) }).lire(), []);
});

test('stockage local : sans storage disponible, mémoire seule sans exception', () => {
  const s = stockageLocal({ storage: undefined });
  s.ajouter(ligne());
  assert.equal(s.lire().length, 1);
});

test('exporterJson se relit à l\'identique', () => {
  const lignes = [ligne(), ligne({ carte: 'lune', mot: 'lune' })];
  assert.deepEqual(JSON.parse(exporterJson(lignes)), lignes);
});

test('exporterCsv : BOM, en-tête exact, une ligne par essai', () => {
  const faux = ligne({ juste: false, tentative: 2, positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }, { liaison: 'a=a', pose: 'o', juste: false }, { liaison: 't=', pose: null, juste: false }] });
  const csv = exporterCsv([ligne(), faux]);
  assert.ok(csv.startsWith('﻿'));
  const l = csv.slice(1).split('\r\n');
  assert.equal(l.length, 3);
  assert.equal(l[0], 'date;code;pack;carte;mot;mode;tentative;juste;aide;positions');
  assert.equal(l[1], '2026-11-11T10:00:00.000Z;E07;essai;chat;chat;sans;1;oui;aucune;ch=ch:ch:ok|a=a:a:ok|t=:t:ok');
  assert.equal(l[2], '2026-11-11T10:00:00.000Z;E07;essai;chat;chat;sans;2;non;aucune;ch=ch:ch:ok|a=a:o:ko|t=::ko');
});

test('exporterCsv : liste vide, juste l\'en-tête', () => {
  assert.equal(exporterCsv([]), '﻿date;code;pack;carte;mot;mode;tentative;juste;aide;positions');
});

test('résumé par liaison : premier coup, reprises et confusions', () => {
  const pain1 = ligne({ carte: 'pain', mot: 'pain', positions: [{ liaison: 'p=p', pose: 'p', juste: true }, { liaison: 'ain=in', pose: 'a', juste: false }], juste: false });
  const pain2 = ligne({ carte: 'pain', mot: 'pain', tentative: 2, positions: [{ liaison: 'p=p', pose: 'p', juste: true }, { liaison: 'ain=in', pose: 'ain', juste: true }] });
  const sac = ligne({ carte: 'sac', mot: 'sac', juste: false, positions: [{ liaison: 's=s', pose: 'ch', juste: false }, { liaison: 'a=a', pose: 'a', juste: true }, { liaison: 'c=k', pose: 'c', juste: true }] });
  const r = resumerParLiaison([ligne(), pain1, pain2, sac]);
  const par = Object.fromEntries(r.map(x => [x.liaison, x]));
  assert.deepEqual(par['ch=ch'], { liaison: 'ch=ch', essais: 1, justesDuPremierCoup: 1, reprises: 0, confusions: {} });
  assert.deepEqual(par['p=p'], { liaison: 'p=p', essais: 1, justesDuPremierCoup: 1, reprises: 1, confusions: {} });
  assert.deepEqual(par['ain=in'], { liaison: 'ain=in', essais: 1, justesDuPremierCoup: 0, reprises: 1, confusions: { a: 1 } });
  assert.deepEqual(par['s=s'], { liaison: 's=s', essais: 1, justesDuPremierCoup: 0, reprises: 0, confusions: { ch: 1 } });
  assert.equal(par['a=a'].essais, 2);
  assert.deepEqual(r.map(x => x.liaison), [...r.map(x => x.liaison)].sort());
});

test('résumé : la casse compte, S et s sont deux liaisons', () => {
  const r = resumerParLiaison([ligne({ positions: [{ liaison: 'S=ch', pose: 'S', juste: true }, { liaison: 's=s', pose: 's', juste: true }] })]);
  assert.equal(r.length, 2);
});

test('résumé : liste vide', () => {
  assert.deepEqual(resumerParLiaison([]), []);
});

test('exporterJson : la clé personnelle de l’élève n’est jamais exportée', () => {
  const l = { id: 'x', code: 'E07', jeton: 'a'.repeat(24), cle: '0123456789abcdef0123', positions: [] };
  const sortie = exporterJson([l]);
  assert.ok(!sortie.includes('0123456789abcdef0123'));
  assert.equal(JSON.parse(sortie)[0].code, 'E07');
});
