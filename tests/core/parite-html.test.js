// Parité entre le cœur ES et le bloc <script id="core"> du HTML d'origine.
// Lancer avec LILEMO_HTML=<chemin de "version phonémique.html">. Sans cette variable, le test est ignoré.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { segmenterAuto } from '../../src/core/index.js';

const MOTS = ['chat', 'bateau', 'lune', 'maman', 'animal', 'poule', 'pont', 'gnome', 'balle', 'cerise', 'rose', 'gomme', 'girafe',
  'bibi', 'papa', 'tomate', 'fourchette', 'oiseau', 'écolier', 'petit', 'chapeau', 'fille', 'bien', 'geai', 'sept', 'se',
  'garçon', 'wagon', 'kiwi', 'lapin'];

const chemin = process.env.LILEMO_HTML;

test('segmenterAuto identique au cœur du HTML d\'origine', { skip: !chemin || !fs.existsSync(chemin) }, () => {
  const html = fs.readFileSync(chemin, 'utf8');
  const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
  const m = { exports: {} };
  new Function('module', core)(m);
  // Le HTML d'origine nomme encore « e_muet » le son que le moteur appelle « schwa » (renommé le 2026-11-11).
  const ancien = mot => m.exports.segmenterAuto(mot).map(c => c.son === 'e_muet' ? { ...c, son: 'schwa' } : c);
  for (const mot of MOTS) assert.deepEqual(segmenterAuto(mot), ancien(mot), mot);
});
