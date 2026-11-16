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
  it('accueil : bouton « Parcours test » vers la liste par défaut avec E01 prérempli, réglages annoncés', async () => {
    monter('#/');
    const lien = screen.getByRole('link', { name: /Parcours test/ });
    expect(lien.getAttribute('href')).toMatch(/^#\/jeu\?pack=p1-20-images&.*&e=E01$/);
    expect(screen.getByText(/Réglages par défaut : cartes sans le mot écrit/)).toBeInTheDocument();
    cleanup();
    const { container } = monter(lien.getAttribute('href'));
    expect(await screen.findByLabelText(/Code de l’élève/)).toHaveValue('E01');
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Mes résultats sont envoyés/);
  });

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

  it('mode d’emploi, étape 4 : une tâche = une ou plusieurs listes de 1 à 50 mots (plus de « pack de cartes »)', () => {
    monter('#/mode-d-emploi');
    const etape = document.getElementById('etape4');
    expect(etape.textContent).toMatch(/Une tâche = une ou plusieurs listes de mots/);
    expect(etape.textContent).toMatch(/de 1 à 50 mots/);
    expect(etape.textContent).toMatch(/révision/);
    expect(etape.textContent).toMatch(/Composer une liste/);
    expect(etape.textContent).not.toMatch(/Pack de cartes/);
  });

  it('plus de mot « pack » dans le texte visible du mode d’emploi, de l’accueil élève ni de l’écran de lien rapide', () => {
    for (const hash of ['#/mode-d-emploi', '#/eleve', '#/lien']) {
      monter(hash);
      expect(document.body.textContent, hash).not.toMatch(/\bpacks?\b/i);
      cleanup();
    }
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

describe('mode d’emploi : délai d’affichage des résultats', () => {
  it('l’étape « Lire les résultats » dit quand les essais arrivent dans le tableau', () => {
    monter('#/mode-d-emploi');
    expect(screen.getByText(/juste après une carte jouée, le tableau peut encore afficher 0 essai/)).toBeInTheDocument();
  });
});
