import test from 'node:test';
import assert from 'node:assert/strict';
import { lireAdresse, ecrireAdresse, REGLAGES_PAR_DEFAUT, adresseParcoursTest, PARCOURS_TEST } from '../../src/app/route.js';

const TACHE = { pack: 'été', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true };
const hashDe = url => new URL(url).hash;

test('réglages par défaut', () => {
  assert.deepEqual(REGLAGES_PAR_DEFAUT, { modeMot: 'sans', habillage: 'album', nbIntrus: 3, exigerAccents: false, essaisMax: 3, syllabes: 'toujours', vitesse: 100, vitesseVerrou: false, muet: 'origine', digraphes: [2, 3, 4] });
});

test('aller-retour jeu avec un nom de pack accentué', () => {
  const url = ecrireAdresse('https://exemple.test/', 'jeu', TACHE);
  assert.equal(url, 'https://exemple.test/#/jeu?pack=%C3%A9t%C3%A9&mode=avec&habillage=sobre&intrus=2&accents=1&syllabes=toujours&vitesse=100&verrou=0');
  assert.deepEqual(lireAdresse(hashDe(url)), { ecran: 'jeu', tache: { ...TACHE, syllabes: 'toujours', vitesse: 100 } });
});

test('aller-retour carte', () => {
  const url = ecrireAdresse('https://exemple.test/', 'carte', TACHE, 'pêche-2');
  assert.deepEqual(lireAdresse(hashDe(url)), { ecran: 'carte', tache: { ...TACHE, syllabes: 'toujours', vitesse: 100 }, carte: 'pêche-2' });
});

test('la base avec ou sans barre finale donne la même adresse', () => {
  assert.equal(ecrireAdresse('https://exemple.test', 'jeu', TACHE), ecrireAdresse('https://exemple.test/', 'jeu', TACHE));
  assert.equal(ecrireAdresse('https://exemple.test/app', 'jeu', TACHE), ecrireAdresse('https://exemple.test/app/', 'jeu', TACHE));
});

test('accueil : hash vide, # et #/', () => {
  for (const h of ['', '#', '#/']) assert.deepEqual(lireAdresse(h), { ecran: 'accueil' }, JSON.stringify(h));
});

test('valeurs invalides ignorées champ par champ', () => {
  const r = lireAdresse('#/jeu?pack=p2&mode=xx&habillage=rose&intrus=-1&accents=oui');
  assert.deepEqual(r, { ecran: 'jeu', tache: { pack: 'p2' } });
  assert.deepEqual(lireAdresse('#/jeu?intrus=9&mode=sans').tache, { modeMot: 'sans' });
  assert.deepEqual(lireAdresse('#/jeu?intrus=0&accents=0').tache, { nbIntrus: 0, exigerAccents: false });
  assert.deepEqual(lireAdresse('#/jeu?intrus=2.5').tache, {});
});

test('paramètres dans le désordre acceptés', () => {
  assert.deepEqual(lireAdresse('#/jeu?accents=1&intrus=4&pack=p3&habillage=album&mode=sans').tache,
    { pack: 'p3', modeMot: 'sans', habillage: 'album', nbIntrus: 4, exigerAccents: true });
});

test('adresses inconnues', () => {
  for (const h of ['#/n-importe-quoi', '#/carte/p2', '#/carte//chat', '#/carte/p2/chat/extra', '#/jeu/extra', '#jeu', 'pas-un-hash', '#/carte/%E0%A4%A/chat']) {
    assert.equal(lireAdresse(h).ecran, 'inconnue', h);
  }
});

test('jeu sans paramètres', () => {
  assert.deepEqual(lireAdresse('#/jeu'), { ecran: 'jeu', tache: {} });
});

test('carte avec ses réglages dans la requête', () => {
  assert.deepEqual(lireAdresse('#/carte/p2/chat?mode=avec'), { ecran: 'carte', tache: { pack: 'p2', modeMot: 'avec' }, carte: 'chat' });
});

const JETON = 'a1b2c3d4e5f6a7b8c9d0e1f2';

test('jeton de tâche : lu, écrit, et seul dans l\'adresse', () => {
  assert.deepEqual(lireAdresse(`#/jeu?t=${JETON}`), { ecran: 'jeu', tache: { jeton: JETON } });
  const url = ecrireAdresse('https://exemple.test/', 'jeu', { jeton: JETON, pack: 'demo', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true });
  assert.equal(url, `https://exemple.test/#/jeu?t=${JETON}`);
});

test('jeton mal formé ignoré', () => {
  for (const t of ['abc', 'A1B2C3D4E5F6A7B8C9D0E1F2', `${JETON}0`, 'zz'.repeat(12)]) {
    assert.deepEqual(lireAdresse(`#/jeu?t=${t}`), { ecran: 'jeu', tache: {} }, t);
  }
});

test('écran enseignant', () => {
  assert.deepEqual(lireAdresse('#/enseignant'), { ecran: 'enseignant' });
  assert.equal(lireAdresse('#/enseignant/extra').ecran, 'inconnue');
});

test('lien personnel d’un élève : code et clé lus ensemble, réécrits à l’identique', () => {
  const cle = '0123456789abcdef0123';
  const a = lireAdresse(`#/jeu?t=${'a'.repeat(24)}&e=E07&k=${cle}`);
  assert.equal(a.tache.codeEleve, 'E07'); assert.equal(a.tache.cle, cle); assert.equal(a.tache.jeton, 'a'.repeat(24));
  assert.equal(ecrireAdresse('https://x.test/', 'jeu', a.tache), `https://x.test/#/jeu?t=${'a'.repeat(24)}&e=E07&k=${cle}`);
});

test('lien personnel : clé ou code mal formé, ou un seul des deux : ignorés', () => {
  for (const q of ['&e=E07', '&k=0123456789abcdef0123', '&e=E07&k=court', '&e=E07&k=ZZZZZZZZZZZZZZZZZZZZ', '&e=a%20b&k=0123456789abcdef0123']) {
    const a = lireAdresse(`#/jeu?t=${'a'.repeat(24)}${q}`);
    assert.equal(a.tache.cle, undefined, q); assert.equal(a.tache.codeEleve, undefined, q);
  }
});

test('réglage « écoute par syllabes » : trois valeurs lues et réécrites, une valeur inconnue est ignorée', () => {
  for (const v of ['non', 'toujours', 'aide']) {
    const url = ecrireAdresse('https://exemple.test/', 'jeu', { ...TACHE, syllabes: v });
    assert.equal(lireAdresse(hashDe(url)).tache.syllabes, v);
  }
  assert.equal(lireAdresse('#/jeu?pack=x&syllabes=partout').tache.syllabes, undefined);
});

test('parcours test : liste et code proposés, réglages par défaut, code sans clé = simple préremplissage', () => {
  const adr = adresseParcoursTest();
  assert.ok(adr.startsWith('#/jeu?pack=p1-20-images'), adr);
  const a = lireAdresse(adr);
  assert.equal(a.ecran, 'jeu');
  assert.equal(a.tache.pack, PARCOURS_TEST.pack);
  assert.equal(a.tache.codePropose, 'E01');
  assert.equal(a.tache.cle, undefined);        // pas de clé : aucun envoi au serveur
  assert.equal(a.tache.codeEleve, undefined);
  // les réglages annoncés sur l'accueil sont bien les réglages par défaut
  assert.deepEqual({ m: a.tache.modeMot, h: a.tache.habillage, i: a.tache.nbIntrus, a: a.tache.exigerAccents, s: a.tache.syllabes, v: a.tache.vitesse, l: !!a.tache.vitesseVerrou },
    { m: 'sans', h: 'album', i: 3, a: false, s: 'toujours', v: 100, l: false });
});

test('muet : « depot » lu et écrit, « origine » = défaut absent de l\'adresse, valeur inconnue ignorée', () => {
  assert.equal(lireAdresse('#/jeu?pack=p&muet=depot').tache.muet, 'depot');
  assert.equal(lireAdresse('#/jeu?pack=p&muet=origine').tache.muet, 'origine');
  assert.equal(lireAdresse('#/jeu?pack=p&muet=zzz').tache.muet, undefined);
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', muet: 'depot' }).includes('muet=depot'));
  assert.ok(!ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p' }).includes('muet'));
});

test('digraphes : longueurs lues (2-3), valeurs hors 2 à 4 ignorées, écrites seulement si cochées', () => {
  assert.deepEqual(lireAdresse('#/jeu?pack=p&digraphes=2-3').tache.digraphes, [2, 3]);
  assert.deepEqual(lireAdresse('#/jeu?pack=p&digraphes=0').tache.digraphes, []);
  assert.deepEqual(lireAdresse('#/jeu?pack=p&digraphes=9-4-x').tache.digraphes, [4]);
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', digraphes: [2, 4] }).includes('digraphes=2-4'));
  assert.ok(!ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p' }).includes('digraphes')); // défaut = tous les blocs, absent de l'adresse
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', digraphes: [] }).includes('digraphes=0'));
});

test('commandes : « epure » lu et écrit, « complet » = défaut absent de l\'adresse, valeur inconnue ignorée', () => {
  assert.equal(lireAdresse('#/jeu?pack=p&commandes=epure').tache.commandes, 'epure');
  assert.equal(lireAdresse('#/jeu?pack=p&commandes=complet').tache.commandes, 'complet');
  assert.equal(lireAdresse('#/jeu?pack=p&commandes=zzz').tache.commandes, undefined);
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', commandes: 'epure' }).includes('commandes=epure'));
  assert.ok(!ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', commandes: 'complet' }).includes('commandes'));
});

test('consignes : « voix » et « non » lus et écrits, absent = automatique, valeur inconnue ignorée', () => {
  assert.equal(lireAdresse('#/jeu?pack=p&consignes=voix').tache.consignes, 'voix');
  assert.equal(lireAdresse('#/jeu?pack=p&consignes=non').tache.consignes, 'non');
  assert.equal(lireAdresse('#/jeu?pack=p&consignes=zzz').tache.consignes, undefined);
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', consignes: 'voix' }).includes('consignes=voix'));
  assert.ok(!ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p' }).includes('consignes'));
});

test('casse : « majuscules » lue et écrite, « minuscules » = défaut absent de l\'adresse, valeur inconnue ignorée', () => {
  assert.equal(lireAdresse('#/jeu?pack=p&casse=majuscules').tache.casse, 'majuscules');
  assert.equal(lireAdresse('#/jeu?pack=p&casse=minuscules').tache.casse, 'minuscules');
  assert.equal(lireAdresse('#/jeu?pack=p&casse=zzz').tache.casse, undefined);
  assert.ok(ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', casse: 'majuscules' }).includes('casse=majuscules'));
  assert.ok(!ecrireAdresse('', 'jeu', { ...REGLAGES_PAR_DEFAUT, pack: 'p', casse: 'minuscules' }).includes('casse='));
});

test("niveau : maternelle lue et écrite, primaire = défaut absent, valeur inconnue ignorée ; en maternelle casse=minuscules est écrite", () => {
  assert.equal(lireAdresse("#/jeu?pack=p&niveau=maternelle").tache.niveau, "maternelle");
  assert.equal(lireAdresse("#/jeu?pack=p&niveau=zzz").tache.niveau, undefined);
  assert.ok(ecrireAdresse("", "jeu", { ...REGLAGES_PAR_DEFAUT, pack: "p", niveau: "maternelle", casse: "majuscules" }).includes("niveau=maternelle"));
  assert.ok(!ecrireAdresse("", "jeu", { ...REGLAGES_PAR_DEFAUT, pack: "p", niveau: "primaire" }).includes("niveau="));
  assert.ok(ecrireAdresse("", "jeu", { ...REGLAGES_PAR_DEFAUT, pack: "p", niveau: "maternelle", casse: "minuscules" }).includes("casse=minuscules"));
});
