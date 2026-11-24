import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import modeles from '../../public/mots/modeles.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { serieInitiale } from '../../src/core/serieInitiale.js';
import { lettreInitiale } from '../../src/core/voyellesInitiale.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const reponse = corps => ({ ok: true, status: 200, json: async () => corps });
const servir = async url => reponse(url.endsWith('/mots/fiches.json') ? fiches : url.endsWith('/mots/modeles.json') ? modeles : null);
const monter = hash => {
  const deps = { fetch: servir, stockage: stockageMemoire(), jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier: vi.fn(async () => ({ manquants: [] })), maintenant: () => '2026-11-24T10:00:00.000Z', hash, base: '/' };
  return { user: userEvent.setup(), ...render(<App deps={deps} />) };
};
const cartesDuModele = modeles.find(m => m.id === 'maternelle-initiale').mots.map(id => fiches.find(f => f.id === id));
const SERIE = serieInitiale(cartesDuModele, 7, 6);
const BASE = '#/feuille?pack=maternelle-initiale&niveau=maternelle&graine=7&nb=6';

describe('feuille à imprimer (maternelle)', () => {
  it('feuille des élèves : 6 mots, 3 lettres par mot, même série que serieInitiale, espace prénom, aucun mot écrit', async () => {
    monter(BASE);
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(6);
    items.forEach((li, k) => {
      expect([...li.querySelectorAll('.feuille-lettre')].map(x => x.textContent)).toEqual(SERIE[k].lettres);
      expect(li.querySelector('img').getAttribute('src')).toContain(`/mots/images/${SERIE[k].carte.id}.png`);
      expect(li.querySelector('.feuille-mot')).toBeNull(); // le mot n'est pas écrit sur la feuille des élèves
    });
    expect(screen.getByText(/Prénom/)).toBeInTheDocument();
    expect(screen.getByText(/Entoure la première lettre du mot/)).toBeInTheDocument();
    expect(document.querySelectorAll('.feuille-lettre.juste')).toHaveLength(0);
  });

  it('corrigé : la bonne lettre est cerclée et le mot est écrit, pas d’espace prénom', async () => {
    monter(`${BASE}&corrige=1`);
    const items = await screen.findAllByRole('listitem');
    items.forEach((li, k) => {
      expect(li.querySelector('.feuille-lettre.juste').textContent).toBe(SERIE[k].cible);
      expect(li.querySelector('.feuille-mot').textContent).toBe(SERIE[k].carte.mot);
    });
    expect(screen.queryByText(/Prénom/)).toBeNull();
    expect(screen.getByText(/Voir la feuille des élèves/)).toBeInTheDocument();
  });

  it('sans liste : message clair', async () => {
    monter('#/feuille?niveau=maternelle&graine=7');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Aucune liste choisie/);
  });

  it('le tableau (TBI) montre la même série que la feuille, puis le bilan compte 6 mots', async () => {
    const { user } = monter(BASE.replace('#/feuille?', '#/jeu?') + '&classe=1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    for (let k = 0; k < 6; k++) {
      expect(document.querySelector('.carte-jeu img').getAttribute('src')).toContain(`/mots/images/${SERIE[k].carte.id}.png`);
      expect(screen.getAllByRole('button', { name: /^Lettre / }).map(b => b.getAttribute('aria-label').replace('Lettre ', ''))).toEqual(SERIE[k].lettres);
      await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(SERIE[k].carte)}` }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    expect(await screen.findByText(/6 carte\(s\) vue\(s\)/)).toBeInTheDocument();
  });
});

describe('lien rapide : série et feuille', () => {
  it('maternelle : nombre de mots, nouvelle série, liens vers la feuille et le corrigé avec la même graine', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeInTheDocument());
    expect(screen.queryByLabelText('Nombre de mots')).toBeNull(); // primaire : pas de série
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    await user.selectOptions(screen.getByLabelText('Liste de mots'), 'maternelle-initiale');
    expect(screen.getByLabelText('Nombre de mots')).toHaveValue('8');
    const feuille = () => screen.getByRole('link', { name: 'Imprimer la feuille' }).getAttribute('href');
    const graine = () => feuille().match(/graine=(\d+)/)[1];
    expect(feuille()).toMatch(/#\/feuille\?/);
    expect(feuille()).toMatch(/niveau=maternelle/);
    expect(feuille()).toMatch(/nb=8/);
    expect(screen.getByLabelText('Lien de la tâche').value).toContain(`graine=${graine()}`);
    expect(screen.getByRole('link', { name: 'Voir le corrigé' }).getAttribute('href')).toMatch(/corrige=1/);
    await user.selectOptions(screen.getByLabelText('Nombre de mots'), '12');
    expect(feuille()).toMatch(/nb=12/);
    const avant = graine();
    await user.click(screen.getByRole('button', { name: 'Nouvelle série' }));
    expect(graine()).not.toBe(avant);
  });
});
