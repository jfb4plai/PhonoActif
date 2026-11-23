import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { DIGRAPHES } from '../../src/jeu/modeA.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const reponse = (status, corps) => ({ ok: status < 400, status, json: async () => corps });
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const fiche = id => fiches.find(f => f.id === id);

// Modèle à 3 paliers : [lune, chat] [pain, papa] [ami]
const MODELE = (mots = ['lune', 'chat', 'pain', 'papa', 'ami']) => ({
  id: 'pp', titre: 'Pack à paliers', mots,
  paliers: [
    { id: 'P1', difficulte: 'x', annonce: 'Annonce un', mots: ['lune', 'chat'] },
    { id: 'P2', difficulte: 'y', annonce: 'Annonce deux', mots: ['pain', 'papa'] },
    { id: 'P3', difficulte: 'z', annonce: 'Annonce trois', mots: ['ami'] },
  ],
});
const ORDINAIRE = { id: 'ord', titre: 'Liste ordinaire', mots: ['lune', 'chat', 'pain'] };

function monter({ modeles = [MODELE()], pack = 'pp', fichesServies = fiches } = {}) {
  const deps = {
    fetch: async url => (url.endsWith('/mots/modeles.json') ? reponse(200, modeles) : url.endsWith('/mots/fiches.json') ? reponse(200, fichesServies) : reponse(404, null)),
    stockage: stockageMemoire(), jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier: vi.fn(async () => ({ manquants: [] })),
    rng: graine(5), maintenant: () => '2026-11-23T10:00:00.000Z', hash: `#/jeu?pack=${pack}`, base: '/',
  };
  return { user: userEvent.setup(), ...render(<App deps={deps} />) };
}
const commencer = async user => {
  await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
};
const construire = async (user, id) => {
  const blocs = new Set(Object.values(DIGRAPHES).flat());
  for (const c of fiche(id).cubes) for (const piece of (blocs.has(c.g) ? [c.g] : [...c.g])) await user.click(screen.getAllByRole('button', { name: piece })[0]);
  await user.click(screen.getByRole('button', { name: 'Vérifier' }));
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
};

describe('pack à paliers : démarrage et bilan', () => {
  it('lien rapide : pause après le palier 1, « Arrêter ici » donne un bilan qui le dit', async () => {
    const { user } = monter();
    await commencer(user);
    await construire(user, 'lune');
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    await construire(user, 'chat');
    await screen.findByText('On fait une pause.');
    await user.click(screen.getByRole('button', { name: 'Arrêter ici' }));
    await screen.findByText(/Pack terminé/);
    expect(screen.getByText('Arrêté après le palier P1.')).toBeTruthy();
  });

  it('« Passer » : le bilan note le palier passé ; « Rejouer » repart au palier 1 sans cette mention', async () => {
    const { user } = monter();
    await commencer(user);
    await construire(user, 'lune'); await construire(user, 'chat');
    await user.click(await screen.findByRole('button', { name: 'Passer le palier suivant' }));
    await construire(user, 'ami');
    await screen.findByText(/Pack terminé/);
    expect(screen.getByText('Palier P2 passé par l’adulte.')).toBeTruthy();
    expect(screen.queryByText(/Arrêté après/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Rejouer' }));
    await screen.findByRole('group', { name: 'Mot à construire' });
    expect(screen.getByText('Carte 1 sur 5')).toBeTruthy();
    await construire(user, 'lune'); await construire(user, 'chat');
    await screen.findByText('On fait une pause.');
  });

  it('fin normale en continuant partout : aucune mention d’arrêt ni de palier passé', async () => {
    const { user } = monter();
    await commencer(user);
    await construire(user, 'lune'); await construire(user, 'chat');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec le palier suivant' }));
    await construire(user, 'pain'); await construire(user, 'papa');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec le palier suivant' }));
    await construire(user, 'ami');
    await screen.findByText(/Pack terminé/);
    expect(screen.queryByText(/Arrêté après|passé par l’adulte/)).toBeNull();
  });

  it('un mot du modèle absent de la base : paliers calculés sur les cartes chargées, aucune erreur', async () => {
    const sans = fiches.filter(f => f.id !== 'chat');
    const { user } = monter({ fichesServies: sans });
    await commencer(user);
    await construire(user, 'lune');
    await screen.findByText('On fait une pause.'); // le palier 1 n'a plus que « lune »
  });

  it('liste ordinaire : aucune pause', async () => {
    const { user } = monter({ modeles: [ORDINAIRE], pack: 'ord' });
    await commencer(user);
    await construire(user, 'lune'); await construire(user, 'chat');
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    expect(screen.getByText('Carte 3 sur 3')).toBeTruthy();
  });
});
