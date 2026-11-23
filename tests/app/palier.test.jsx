import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../fixtures/lexique-extrait.json';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { stockageMemoire } from '../../src/jeu/essais.js';
import Jeu from '../../src/app/Jeu.jsx';

afterEach(cleanup);

const lex = creerLexique(fixture);
const BASE = preparerPack({ nom: 'essai', mots: ['chat', 'été', 'pain'], source: 's', licence: 'l', lexique: lex }).manifest;
const MOTS = ['chat', 'été', 'pain', 'chat', 'été'];
const cartes = MOTS.map((m, i) => ({ ...BASE.cartes.find(c => c.mot === m), id: `${m}-${i}` }));
const PALIERS = [
  { id: 'P1', difficulte: 'x', annonce: 'Annonce un', ids: [], debut: 0, fin: 1 },
  { id: 'P2', difficulte: 'y', annonce: 'Annonce deux', ids: [], debut: 2, fin: 3 },
  { id: 'P3', difficulte: 'z', annonce: 'Annonce trois', ids: [], debut: 4, fin: 4 },
];
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;

function monter({ paliers = PALIERS, tache = {} } = {}) {
  const user = userEvent.setup();
  const onFin = vi.fn();
  const pack = { ...BASE, cartes, ...(paliers ? { paliers } : {}) };
  const tacheComplete = { modeMot: 'sans', habillage: 'album', nbIntrus: 0, exigerAccents: false, commandes: 'completes', ...tache };
  const deps = { rng: graine(5), maintenant: () => 't', jouerSons: vi.fn(async () => ({ manquants: [] })) };
  render(<Jeu pack={pack} tache={tacheComplete} code="E07" stockage={stockageMemoire()} deps={deps} base="/" onFin={onFin} onAccueil={() => {}} onSignalement={() => {}} />);
  return { user, onFin };
}

// Joue la carte courante : pose les graphèmes du mot, vérifie, puis appuie sur « Suivant ».
async function jouerCarte(user, i) {
  for (const c of cartes[i].cubes) await user.click(screen.getAllByRole('button', { name: c.g, exact: true }).find(b => !b.disabled && b.className.includes('cube')));
  await user.click(screen.getByRole('button', { name: 'Vérifier' }));
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
}

describe('pause de fin de palier', () => {
  it('à la fin du palier : message neutre, aucune commande de l’élève, panneau de l’adulte avec l’annonce suivante', async () => {
    const { user } = monter();
    await jouerCarte(user, 0);
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    await jouerCarte(user, 1);
    expect(screen.getByText('On fait une pause.')).toBeTruthy();
    for (const nom of ['Vérifier', 'Suivant', 'Écouter', 'Retirer', 'Tout effacer', /Besoin d/]) expect(screen.queryByRole('button', { name: nom })).toBeNull();
    const continuer = screen.getByRole('button', { name: 'Continuer avec le palier suivant' });
    expect(document.activeElement).toBe(continuer);
    expect(screen.getByText(/Annonce deux/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Vitesse de la voix/ })).toBeTruthy();
  });

  it('« Continuer » affiche la première carte du palier suivant', async () => {
    const { user } = monter();
    await jouerCarte(user, 0); await jouerCarte(user, 1);
    await user.click(screen.getByRole('button', { name: 'Continuer avec le palier suivant' }));
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    expect(screen.getByText('Carte 3 sur 5')).toBeTruthy();
  });

  it('« Passer » saute le palier annoncé quand un palier le suit ; absent s’il n’y en a pas', async () => {
    const { user } = monter();
    await jouerCarte(user, 0); await jouerCarte(user, 1);
    await user.click(screen.getByRole('button', { name: 'Passer le palier suivant' }));
    expect(screen.getByText('Carte 5 sur 5')).toBeTruthy();
    cleanup();
    const b = monter({ paliers: PALIERS.slice(0, 2).map((p, i) => (i === 1 ? { ...p, debut: 2, fin: 4 } : p)) });
    await jouerCarte(b.user, 0); await jouerCarte(b.user, 1);
    expect(screen.getByRole('button', { name: 'Continuer avec le palier suivant' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Passer le palier suivant' })).toBeNull();
  });

  it('« Arrêter ici » termine le jeu avec le palier noté', async () => {
    const { user, onFin } = monter();
    await jouerCarte(user, 0); await jouerCarte(user, 1);
    await user.click(screen.getByRole('button', { name: 'Arrêter ici' }));
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(onFin.mock.calls[0][0].arret).toEqual({ apres: 'P1' });
  });

  it('commandes épurées et voix verrouillée : le panneau de l’adulte s’affiche quand même', async () => {
    const { user } = monter({ tache: { commandes: 'epure', vitesseVerrou: true } });
    for (const i of [0, 1]) {
      for (const c of cartes[i].cubes) await user.click(screen.getAllByRole('button', { name: c.g, exact: true }).find(b => !b.disabled && b.className.includes('cube')));
      await user.click(screen.getByRole('button', { name: 'Vérifier' }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    expect(screen.getByRole('button', { name: 'Arrêter ici' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuer avec le palier suivant' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Vitesse de la voix/ })).toBeNull();
  });

  it('sans paliers : « Suivant » avance comme avant, aucune pause', async () => {
    const { user } = monter({ paliers: null });
    await jouerCarte(user, 0); await jouerCarte(user, 1);
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    expect(screen.getByText('Carte 3 sur 5')).toBeTruthy();
  });
});
