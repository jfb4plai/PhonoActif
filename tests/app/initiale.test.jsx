import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import modeles from '../../public/mots/modeles.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { lettreInitiale, VOYELLES_INITIALE } from '../../src/core/voyellesInitiale.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const reponse = corps => ({ ok: true, status: 200, json: async () => corps });
const servir = async url => reponse(url.endsWith('/mots/fiches.json') ? fiches : url.endsWith('/mots/modeles.json') ? modeles : null);

function monter(hash) {
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: servir, stockage, jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, rng: graine(7), maintenant: () => '2026-11-24T10:00:00.000Z', hash, base: '/' };
  return { user: userEvent.setup(), stockage, jouerFichier, ...render(<App deps={deps} />) };
}
const LIEN = '#/jeu?pack=maternelle-initiale&niveau=maternelle&e=E07';
const commencer = async user => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
};
// Le mot affiché est repéré par le nom de fichier de son image (le mot n'est jamais écrit à l'élève).
const carteCourante = () => { const m = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/); return fiches.find(f => f.id === decodeURIComponent(m[1])); };

describe('Maternelle : exercice « première lettre »', () => {
  it('le modèle publié ne contient que des mots utilisables (voyelle seule en première lettre, image)', () => {
    const m = modeles.find(x => x.id === 'maternelle-initiale');
    expect(m.niveau).toBe('maternelle');
    for (const id of m.mots) { const f = fiches.find(x => x.id === id); expect(lettreInitiale(f), id).not.toBeNull(); expect(f.image_sans_mot, id).toBeTruthy(); }
  });

  it('trois lettres majuscules, le mot est dit à l’arrivée, le mot n’est pas écrit', async () => {
    const { user, jouerFichier } = monter(LIEN);
    await commencer(user);
    expect(document.querySelector('main.jeu').className).toContain('jeu-maj');
    expect(screen.getAllByRole('button', { name: /^Lettre / })).toHaveLength(3);
    const c = carteCourante();
    expect(screen.queryByText(c.mot)).toBeNull();
    await waitFor(() => expect(jouerFichier).toHaveBeenCalled());
    expect(jouerFichier.mock.calls[0][0]).toBe(`/mots/${c.etats.at(-1).fichier}`);
  });

  it('bonne lettre : « Bravo », le son de la lettre puis le mot, un essai juste enregistré', async () => {
    const { user, jouerFichier, stockage } = monter(LIEN);
    await commencer(user);
    const c = carteCourante(); const cible = lettreInitiale(c);
    jouerFichier.mockClear();
    await user.click(screen.getByRole('button', { name: `Lettre ${cible}` }));
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
    await waitFor(() => expect(jouerFichier.mock.calls.map(x => x[0])).toEqual([`/mots/${VOYELLES_INITIALE[cible].fichier}`, `/mots/${c.etats.at(-1).fichier}`]));
    const essais = stockage.lire();
    expect(essais).toHaveLength(1);
    expect(essais[0]).toMatchObject({ carte: c.id, juste: true, tentative: 1, exercice: 'initiale', code: 'E07', positions: [{ pose: cible, juste: true }] });
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('deux mauvaises lettres : elles se grisent, puis la bonne est montrée ; deux essais faux enregistrés', async () => {
    const { user, stockage } = monter(LIEN);
    await commencer(user);
    const cible = lettreInitiale(carteCourante());
    const fausses = screen.getAllByRole('button', { name: /^Lettre / }).filter(b => b.getAttribute('aria-label') !== `Lettre ${cible}`);
    await user.click(fausses[0]);
    expect(fausses[0]).toBeDisabled();
    expect(screen.getByText(/Essayer encore/)).toBeInTheDocument();
    await user.click(fausses[1]);
    expect(screen.getByText(/C’est cette lettre/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Lettre ${cible}` })).toHaveAttribute('aria-pressed', 'true');
    expect(stockage.lire().map(l => l.juste)).toEqual([false, false]);
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('jamais a avec é parmi les trois lettres, sur toutes les cartes de la liste', async () => {
    const { user } = monter(LIEN);
    await commencer(user);
    const nb = modeles.find(x => x.id === 'maternelle-initiale').mots.length;
    for (let k = 0; k < nb; k++) {
      const noms = screen.getAllByRole('button', { name: /^Lettre / }).map(b => b.getAttribute('aria-label'));
      expect(noms.includes('Lettre a') && noms.includes('Lettre é'), noms.join()).toBe(false);
      await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(carteCourante())}` }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    await screen.findByText(/Pack terminé/);
  });
});

describe('Niveau choisi en premier', () => {
  it('maternelle : liste filtrée et options sans objet masquées ; primaire : tout est proposé', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Primaire/ })).toBeChecked());
    expect(screen.getByLabelText('Nombre de cubes en trop')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Maternelle : la première lettre/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeChecked();
    expect(screen.queryByLabelText('Nombre de cubes en trop')).toBeNull();
    expect(screen.queryByLabelText('Exiger les accents')).toBeNull();
    expect(screen.queryByLabelText('Lettre muette grisée')).toBeNull();
    expect(screen.getByLabelText('Lettres affichées')).toHaveValue('majuscules');
    expect(screen.getByRole('option', { name: /Maternelle : la première lettre/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /101 mots de P1/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Primaire/ }));
    expect(screen.getByLabelText('Nombre de cubes en trop')).toBeInTheDocument();
    expect(screen.getByLabelText('Lettres affichées')).toHaveValue('minuscules');
  });

  it('le lien rapide de maternelle contient niveau=maternelle et casse=majuscules', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    await user.selectOptions(screen.getByLabelText('Liste de mots'), 'maternelle-initiale');
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/niveau=maternelle/);
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/casse=majuscules/);
  });
});
