import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cubesDepuisEntree, classeCube } from '../../src/core/index.js';

const entrees = JSON.parse(fs.readFileSync(new URL('../fixtures/lexique-extrait.json', import.meta.url), 'utf8'));
const entree = mot => entrees.find(e => e.ortho === mot);
const lire = mot => cubesDepuisEntree(entree(mot)).map(c => c.g + '=' + (c.son === null ? '?' : c.son)).join(' ');

test('écarts du cœur corrigés : ien, e de monosyllabe, geai, fille, sept', () => {
  assert.equal(lire('bien'), 'b=b i=yod en=in');
  assert.equal(lire('chien'), 'ch=ch i=yod en=in');
  assert.equal(lire('se'), 's=s e=schwa');
  assert.equal(lire('geai'), 'ge=j ai=e_ouvert');
  assert.equal(lire('fille'), 'f=f ill=ij e=');
  assert.equal(lire('sept'), 's=s e=e_ouvert p= t=t');
});

test('mots déjà corrects dans le cœur d\'origine', () => {
  assert.equal(lire('chat'), 'ch=ch a=a t=');
  assert.equal(lire('oiseau'), 'oi=oi s=z eau=o_ferme');
  assert.equal(lire('pain'), 'p=p ain=in');
  assert.equal(lire('lune'), 'l=l u=u n=n e=');
  assert.equal(lire('cerise'), 'c=s e=schwa r=r i=i s=z e=');
});

test('accents et consonnes doubles', () => {
  assert.equal(lire('très'), 't=t r=r è=e_ouvert s=');
  assert.equal(lire('été'), 'é=e_ferme t=t é=e_ferme');
  assert.equal(lire('pomme'), 'p=p o=o_ouvert mm=m e=');
});

test('séquence non prévue (gz) : cube inconnu à vérifier, sans exception', () => {
  const cubes = cubesDepuisEntree(entree('examen'));
  const x = cubes.find(c => c.g === 'x');
  assert.equal(x.son, null);
  assert.equal(x.aVerifier, true);
  assert.equal(cubes.filter(c => c.aVerifier).length, 1);
});

test('code inconnu (A) : cube inconnu à vérifier', () => {
  const cubes = cubesDepuisEntree(entree('zz'));
  assert.deepEqual(cubes, [{ g: 'zz', son: null, aVerifier: true }]);
});

test('classeCube d\'un son inconnu', () => {
  assert.equal(classeCube(null), 'inconnu');
});
