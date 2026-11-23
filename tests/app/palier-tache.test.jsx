import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { stockageEnvoyes } from '../../src/sync/envoi.js';
import { DIGRAPHES } from '../../src/jeu/modeA.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const TOKEN = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const PERSO = `#/jeu?t=${TOKEN}&e=E07&k=${'0123456789abcdef0123'}`;
const reponse = (status, corps) => ({ ok: status < 400, status, json: async () => corps });
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const fiche = id => fiches.find(f => f.id === id);
const MODELES = [{ id: 'pp', titre: 'Pack à paliers', mots: ['lune', 'chat', 'pain'], paliers: [
  { id: 'P1', difficulte: 'x', annonce: 'Annonce un', mots: ['lune', 'chat'] }, { id: 'P2', difficulte: 'y', annonce: 'Annonce deux', mots: ['pain'] }] }];

function monter({ fetchModeles }) {
  const tache = reponse(200, { pack: 'Ma tâche', mode_mot: 'sans', habillage: 'album', nb_intrus: 0, exiger_accents: false, mots: ['lune', 'chat', 'pain'] });
  const supabase = { url: 'https://x.supabase.co', anonKey: 'cle', fetch: vi.fn(async url => (url.endsWith('/phono_lire_tache') ? tache : reponse(200, { recus: 0, ignores: 0 }))) };
  const deps = {
    fetch: async url => (url.endsWith('/mots/fiches.json') ? reponse(200, fiches) : fetchModeles(url)),
    stockage: stockageMemoire(), supabase, stockageEnvoyes: stockageEnvoyes({ storage: undefined }),
    jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier: vi.fn(async () => ({ manquants: [] })), rng: graine(5), maintenant: () => 't', hash: PERSO, base: '/',
  };
  return { user: userEvent.setup(), ...render(<App deps={deps} />) };
}
const commencer = async user => {
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

describe('tâche d’enseignant en ligne : pause de fin de palier', () => {
  it('la liste de la tâche suit un modèle à paliers : pause après le palier 1', async () => {
    const { user } = monter({ fetchModeles: async () => reponse(200, MODELES) });
    await commencer(user);
    await construire(user, 'lune'); await construire(user, 'chat');
    await screen.findByText('On fait une pause.');
    expect(screen.getByText(/Annonce deux/)).toBeTruthy();
  });

  it('modeles.json illisible : la tâche se joue sans pause, sans erreur', async () => {
    const { user } = monter({ fetchModeles: async () => { throw new Error('offline'); } });
    await commencer(user);
    await construire(user, 'lune'); await construire(user, 'chat');
    expect(screen.queryByText('On fait une pause.')).toBeNull();
    expect(screen.getByText('Carte 3 sur 3')).toBeTruthy();
  });
});
