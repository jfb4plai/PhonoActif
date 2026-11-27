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

function monter(tacheServeur, hash = PERSO) {
  const envois = [];
  const supabase = { url: 'https://x.supabase.co', anonKey: 'cle', fetch: vi.fn(async (url, opts) => {
    if (url.endsWith('/phono_lire_tache')) return reponse(200, tacheServeur);
    envois.push(JSON.parse(opts.body)); return reponse(200, { recus: (JSON.parse(opts.body).p_lignes || []).length, ignores: 0 });
  }) };
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: async url => (url.endsWith('/mots/fiches.json') ? reponse(200, fiches) : reponse(404, null)), stockage, supabase, stockageEnvoyes: stockageEnvoyes({ storage: undefined }),
    jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, rng: graine(3), maintenant: () => '2026-11-24T10:00:00.000Z', hash, base: '/' };
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
    expect(await screen.findByText(/Bravo/, {}, { timeout: 4000 })).toBeInTheDocument(); // la félicitation vient après la lettre et le mot dits
    const [essai] = stockage.lire();
    expect(essai).toMatchObject({ juste: true, jeton: TOKEN, cle: '0123456789abcdef0123', positions: [{ pose: cible, juste: true }] });
  });

  it('serveur sans niveau (avant la migration) : le jeu de construction habituel', async () => {
    monter(serveur({}));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByRole('group', { name: 'Mot à construire' })).toBeInTheDocument();
  });

  it('lien « tableau » d’une tâche enregistrée (classe=1 + série) : pas de code, mots de la tâche, rien n’est envoyé au serveur', async () => {
    const { user, stockage, envois } = monter(serveur({ niveau: 'maternelle' }), `#/jeu?t=${TOKEN}&classe=1&graine=7&nb=2`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled()); // sans code
    expect(screen.queryByLabelText(/Code/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    expect(document.querySelector('main.jeu').className).toContain('jeu-classe');
    const id = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/)[1];
    await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(fiches.find(f => f.id === id))}` }));
    const [essai] = stockage.lire();
    expect(essai).toMatchObject({ code: 'CLASSE', jeton: null, juste: true });
    expect(essai.cle).toBeUndefined();
    expect(envois).toHaveLength(0);
  });

  it('lien sans classe=1 (lien général d’une tâche) : le code reste demandé', async () => {
    monter(serveur({ niveau: 'maternelle' }), `#/jeu?t=${TOKEN}`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeDisabled());
  });

  it('feuille d’une tâche enregistrée : les mots sont lus dans la tâche, même série que le tableau', async () => {
    monter(serveur({ niveau: 'maternelle' }), `#/feuille?t=${TOKEN}&graine=7&nb=2`);
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2); // ami et île : seuls mots de la tâche utilisables
    expect(screen.getByText(/Retour à l’espace enseignant/)).toBeInTheDocument();
  });

  it('lien « tableau » : en fin de liste, pas de bouton « Envoyer mes résultats » (rien n’est envoyé)', async () => {
    const { user } = monter(serveur({ niveau: 'maternelle' }), `#/jeu?t=${TOKEN}&classe=1&graine=7&nb=2`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    for (let k = 0; k < 2; k++) {
      const id = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/)[1];
      await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(fiches.find(f => f.id === id))}` }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    await screen.findByText(/carte\(s\) vue\(s\)/);
    expect(screen.queryByRole('button', { name: 'Envoyer mes résultats' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rejouer' })).toBeInTheDocument();
  });

  it('lien personnel d’un élève (tablette) : le bouton « Envoyer mes résultats » reste', async () => {
    const { user } = monter(serveur({ niveau: 'maternelle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    for (let k = 0; k < 2; k++) {
      const id = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/)[1];
      await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(fiches.find(f => f.id === id))}` }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    expect(await screen.findByRole('button', { name: 'Envoyer mes résultats' })).toBeInTheDocument();
  });
});
