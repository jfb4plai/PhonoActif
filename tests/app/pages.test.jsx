import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within, act } from '@testing-library/react';
import App from '../../src/app/App.jsx';
import { lireAdresse } from '../../src/app/route.js';

afterEach(cleanup);
const monter = hash => render(<App deps={{ hash, base: '/', supabase: null, fetch: async () => ({ ok: true, json: async () => [] }) }} />);

describe('adresses des pages', () => {
  it('accueil du site et pages d’information', () => {
    expect(lireAdresse('').ecran).toBe('accueil');
    expect(lireAdresse('#/').ecran).toBe('accueil');
    expect(lireAdresse('#/eleve').ecran).toBe('eleve');
    expect(lireAdresse('#/lien?pack=x').tache.pack).toBe('x');
    expect(lireAdresse('#/mode-d-emploi').ecran).toBe('mode_emploi');
    expect(lireAdresse('#/donnees').ecran).toBe('donnees');
    expect(lireAdresse('#/apropos').ecran).toBe('apropos');
    expect(lireAdresse('#/etape1').ecran).toBe('inconnue');
  });
});

describe('pages du site', () => {
  it('accueil : deux portes visibles (élève, enseignant), accès aux informations', () => {
    monter('#/');
    expect(screen.getByRole('link', { name: /Je suis élève/ })).toHaveAttribute('href', '#/eleve');
    expect(screen.getByRole('link', { name: /Je suis enseignant/ })).toHaveAttribute('href', '#/enseignant');
    expect(screen.getAllByRole('link', { name: /Mode d’emploi/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Gestion des données/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/ne fait pas encore bien/)).toBeInTheDocument();
  });

  it.each(['#/', '#/eleve', '#/lien', '#/mode-d-emploi', '#/donnees', '#/apropos', '#/enseignant'])('%s : pied de page avec contact, données et crédits ; barre de navigation', async hash => {
    monter(hash);
    const pied = await screen.findByRole('contentinfo');
    expect(within(pied).getByRole('link', { name: 'jeanfrancois.beguin@ens.ecl.be' })).toHaveAttribute('href', 'mailto:jeanfrancois.beguin@ens.ecl.be');
    expect(within(pied).getByRole('link', { name: /Gestion des données/ })).toHaveAttribute('href', '#/donnees');
    expect(within(pied).getByRole('link', { name: /licences et crédits/ })).toHaveAttribute('href', '#/apropos');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('link', { name: 'Enseignant' })).toHaveAttribute('href', '#/enseignant');
    expect(within(nav).getByRole('link', { name: 'Mode d’emploi' })).toBeInTheDocument();
  });

  it('mode d’emploi : sept étapes, sommaire sans lien cassant l’adresse du site', () => {
    monter('#/mode-d-emploi');
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(screen.getByRole('heading', { level: 2, name: new RegExp(`^${n}\. `) })).toBeInTheDocument();
    expect(screen.getByText(/Liens et QR-codes personnels/)).toBeInTheDocument();
    expect(screen.getByText(/ne lit rien tout seul/)).toBeInTheDocument();
    expect(screen.getByText(/Phrase d’aide\./)).toBeInTheDocument();
    expect(screen.getByText(/Seulement quand l’élève a du mal/, { exact: false })).toBeInTheDocument();
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' });
    for (const a of within(sommaire).getAllByRole('link')) expect(a.getAttribute('href')).toBe('#/mode-d-emploi');
  });

  it('données : ce qui est enregistré, où, combien de temps, à qui s’adresser', () => {
    monter('#/donnees');
    for (const titre of ['Pour les élèves', 'Pour les enseignants', 'Où sont les données', 'Combien de temps', /Vos droits/, 'Sécurité']) {
      expect(screen.getByRole('heading', { level: 2, name: titre })).toBeInTheDocument();
    }
    expect(screen.getByText(/Aucun nom, aucun prénom/)).toBeInTheDocument();
    expect(screen.getByText(/purge annuelle est prévue/)).toBeInTheDocument();
  });

  it('un clic sur un lien du site change de page sans recharger (hashchange)', async () => {
    window.location.hash = '#/';
    render(<App deps={{ base: '/', supabase: null, fetch: async () => ({ ok: true, json: async () => [] }) }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'PhonoActif' })).toBeInTheDocument();
    await act(async () => { window.location.hash = '#/donnees'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(await screen.findByRole('heading', { level: 1, name: 'Gestion des données' })).toBeInTheDocument();
    window.location.hash = '';
  });
});
