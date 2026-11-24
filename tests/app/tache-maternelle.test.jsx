import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { stockageEnvoyes } from '../../src/sync/envoi.js';
import { lettreInitiale } from '../../src/core/voyellesInitiale.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const TOKEN = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const PERSO = `#/jeu?t=${TOKEN}&e=E07&k=${'0123456789abcdef0123'}`;
const reponse = (status, corps) => ({ ok: status < 400, status, json: async () => corps });
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;

function monter(tacheServeur) {
  const envois = [];
  const supabase = { url: 'https://x.supabase.co', anonKey: 'cle', fetch: vi.fn(async (url, opts) => {
    if (url.endsWith('/phono_lire_tache')) return reponse(200, tacheServeur);
    envois.push(JSON.parse(opts.body)); return reponse(200, { recus: (JSON.parse(opts.body).p_lignes || []).length, ignores: 0 });
  }) };
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: async url => (url.endsWith('/mots/fiches.json') ? reponse(200, fiches) : reponse(404, null)), stockage, supabase, stockageEnvoyes: stockageEnvoyes({ storage: undefined }),
    jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, rng: graine(3), maintenant: () => '2026-11-24T10:00:00.000Z', hash: PERSO, base: '/' };
  return { user: userEvent.setup(), stockage, envois, jouerFichier, ...render(<App deps={deps} />) };
}
const serveur = plus => ({ pack: 'Liste', mode_mot: 'sans', habillage: 'sobre', nb_intrus: 3, exiger_accents: true, syllabes: 'toujours', vitesse: 100, vitesse_verrou: false, mots: ['ami', 'ile', 'chat', 'ours'], ...plus });

describe('tâche enregistrée de maternelle (côté élève)', () => {
  it('niveau maternelle : exercice « première lettre », majuscules, mots filtrés (ami et île seulement), essai prêt à envoyer', async () => {
    const { user, stockage } = monter(serveur({ niveau: 'maternelle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    expect(document.querySelector('main.jeu').className).toContain('jeu-maj');
    expect(screen.getByRole('img', { name: /Carte 1 sur 2/ })).toBeInTheDocument();
    const id = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/)[1];
    const cible = lettreInitiale(fiches.find(f => f.id === id));
    await user.click(screen.getByRole('button', { name: `Lettre ${cible}` }));
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
    const [essai] = stockage.lire();
    expect(essai).toMatchObject({ juste: true, jeton: TOKEN, cle: '0123456789abcdef0123', positions: [{ pose: cible, juste: true }] });
  });

  it('serveur sans niveau (avant la migration) : le jeu de construction habituel', async () => {
    monter(serveur({}));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByRole('group', { name: 'Mot à construire' })).toBeInTheDocument();
  });
});
