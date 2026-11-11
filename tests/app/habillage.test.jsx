import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../fixtures/lexique-extrait.json';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { stockageMemoire } from '../../src/jeu/essais.js';
import App from '../../src/app/App.jsx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

afterEach(cleanup);

// Vitest ne rend pas le texte des CSS importés : on les lit sur le disque.
const lireCss = nom => readFileSync(join(process.cwd(), 'src', 'app', nom), 'utf8');
const jeuCss = lireCss('jeu.css');
const habillagesCss = lireCss('habillages.css');

const lex = creerLexique(fixture);
const MANIFEST = preparerPack({ nom: 'essai', mots: ['chat'], source: 's', licence: 'l', lexique: lex }).manifest;
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;

async function ecranDeJeu(habillage) {
  const user = userEvent.setup();
  const deps = { fetch: async () => ({ ok: true, json: async () => MANIFEST }), stockage: stockageMemoire(), jouerSons: vi.fn(async () => ({ manquants: [] })), rng: graine(5), hash: `#/jeu?pack=essai&habillage=${habillage}`, base: '/' };
  const rendu = render(<App deps={deps} />);
  await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
  return rendu;
}

// bloc de variables d'un habillage : { '--v': '#ff9c8f', ... }
function variables(selecteur) {
  const debut = habillagesCss.indexOf(selecteur);
  const bloc = habillagesCss.slice(habillagesCss.indexOf('{', debut) + 1, habillagesCss.indexOf('\n}', debut));
  const v = {};
  for (const m of bloc.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) v[m[1]] = m[2].trim();
  return v;
}
const hex = valeur => {
  const m = valeur.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (!m) return undefined;
  return m[1].length === 3 ? '#' + [...m[1]].map(c => c + c).join('') : '#' + m[1];
};
function luminance(h) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('habillages', () => {
  it('les deux fichiers CSS sont bien lus', () => {
    expect(jeuCss.length).toBeGreaterThan(500);
    expect(habillagesCss).toContain('[data-habillage="album"]');
    expect(habillagesCss).toContain('[data-habillage="sobre"]');
  });

  it('l\'écran de jeu porte data-habillage « album » puis « sobre »', async () => {
    const a = await ecranDeJeu('album');
    expect(a.container.querySelector('[data-habillage="album"]')).not.toBeNull();
    cleanup();
    const s = await ecranDeJeu('sobre');
    expect(s.container.querySelector('[data-habillage="sobre"]')).not.toBeNull();
  });

  it('aucune taille de texte inférieure à 16 px dans le CSS de l\'app', () => {
    for (const css of [jeuCss, habillagesCss]) {
      const tailles = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => Number(m[1]));
      expect(tailles.every(t => t >= 16), tailles.join(',')).toBe(true);
      expect(/font-size:\s*[\d.]+(rem|em|%)/.test(css)).toBe(false);
    }
  });

  it('jeu.css n\'écrit aucune couleur en dur : tout vient des variables d\'habillage', () => {
    expect(jeuCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(jeuCss).not.toMatch(/\brgb|hsl/);
  });

  it('les mots à lire sont en Arial', () => {
    expect(jeuCss).toMatch(/\.app \{[^}]*font-family: Arial/);
    expect(jeuCss).toMatch(/\.cube \{[^}]*font-family: Arial/);
  });

  it('aucune animation ni transition', () => {
    const sansCommentaires = jeuCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sansCommentaires).not.toMatch(/animation|@keyframes|transition/);
  });

  it('chaque variable utilisée par jeu.css est définie dans les deux habillages', () => {
    const utilisees = new Set([...jeuCss.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(m => m[1]));
    for (const sel of ['[data-habillage="album"]', '[data-habillage="sobre"]']) {
      const definies = variables(sel);
      for (const nom of utilisees) expect(definies[nom], `${sel} ${nom}`).toBeDefined();
    }
  });

  it('contraste du texte des cubes : au moins 3:1 (grand texte gras) sur voyelle, consonne et muet', () => {
    for (const sel of ['[data-habillage="album"]', '[data-habillage="sobre"]']) {
      const v = variables(sel);
      for (const fond of ['--v', '--c', '--m']) {
        const c = contraste(hex(v['--texte-cube']), hex(v[fond]));
        expect(c, `${sel} ${fond} : ${c.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('contraste du texte courant sur le fond : au moins 4,5:1', () => {
    for (const sel of ['[data-habillage="album"]', '[data-habillage="sobre"]']) {
      const v = variables(sel);
      const c = contraste(hex(v['--texte']), hex(v['--fond']));
      expect(c, `${sel} : ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
