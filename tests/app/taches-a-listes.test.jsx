import { DIGRAPHES } from '../../src/jeu/modeA.js';
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { stockageEnvoyes } from '../../src/sync/envoi.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const TOKEN = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const PERSO = `#/jeu?t=${TOKEN}&e=E07&k=${'0123456789abcdef0123'}`;
const reponse = (status, corps) => ({ ok: status < 400, status, json: async () => corps });
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const fiche = id => fiches.find(f => f.id === id);

function monter({ mots, fetchMots }) {
  const tache = reponse(200, { pack: 'Semaine 3 + Révisions', mode_mot: 'sans', habillage: 'album', nb_intrus: 0, exiger_accents: false, mots });
  const supabase = { url: 'https://x.supabase.co', anonKey: 'cle', fetch: vi.fn(async url => (url.endsWith('/phono_lire_tache') ? tache : reponse(200, { recus: 0, ignores: 0 }))) };
  const appelsMots = [];
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const deps = {
    fetch: async url => { appelsMots.push(url); return fetchMots(url); }, stockage: stockageMemoire(), supabase, stockageEnvoyes: stockageEnvoyes({ storage: undefined }),
    jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, rng: graine(5), maintenant: () => '2026-11-15T10:00:00.000Z', hash: PERSO, base: '/'
  };
  return { user: userEvent.setup(), appelsMots, jouerFichier, ...render(<App deps={deps} />) };
}
const fichesOk = async url => (url.endsWith('/mots/fiches.json') ? reponse(200, fiches) : reponse(404, null));
const commencer = async user => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
};
const construire = async (user, id) => {
  // Blocs de lettres cochés par défaut : un graphème qui est un digraphe se pose d'un coup, les autres lettre par lettre.
  const blocs = new Set(Object.values(DIGRAPHES).flat());
  for (const c of fiche(id).cubes) for (const piece of (blocs.has(c.g) ? [c.g] : [...c.g])) await user.click(screen.getAllByRole('button', { name: piece })[0]);
  await user.click(screen.getByRole('button', { name: 'Vérifier' }));
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
};

describe('tâche à listes : côté élève', () => {
  it('charge les mots de la tâche par identifiant, dans l’ordre, depuis mots/ (aucun manifeste de pack)', async () => {
    const { user, appelsMots, jouerFichier } = monter({ mots: ['lune', 'chat'], fetchMots: fichesOk });
    await commencer(user);
    expect(appelsMots).toEqual(['/mots/fiches.json', '/mots/modeles.json']); // modeles.json : limites de palier (aucun ici)
    await user.click(screen.getByRole('button', { name: /^Écouter$/ }));
    expect(jouerFichier.mock.calls[0][0]).toMatch(/^\/mots\/audio\/.+\.mp3$/);
    await construire(user, 'lune');       // la première carte est « lune », comme dans la tâche
    await construire(user, 'chat');
    await screen.findByText(/Pack terminé/);
  });

  it('un mot retiré de la base est sauté, la tâche se joue quand même', async () => {
    const { user } = monter({ mots: ['chat', 'disparu'], fetchMots: fichesOk });
    await commencer(user);
    await construire(user, 'chat');
    await screen.findByText(/Pack terminé/);
  });

  it('fiches illisibles (réseau coupé) : message français sur l’écran d’accueil, pas d’écran blanc', async () => {
    const { user } = monter({ mots: ['chat'], fetchMots: async () => { throw new Error('offline'); } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByText("Les mots n'ont pas pu être chargés.")).toBeInTheDocument();
  });
});

describe('lien rapide : un modèle de liste se charge par identifiants (mots/modeles.json puis mots/fiches.json)', () => {
  const MODELES = [{ id: 'm-essai', titre: 'Mon modèle', mots: ['lune', 'chat'] }];
  const fetchModele = vi.fn(async url => (url.endsWith('/mots/modeles.json') ? reponse(200, MODELES) : url.endsWith('/mots/fiches.json') ? reponse(200, fiches) : reponse(404, null)));

  it('liste proposée à l’élève = les modèles ; le jeu joue ses mots dans l’ordre', async () => {
    fetchModele.mockClear();
    const user = userEvent.setup();
    render(<App deps={{ fetch: fetchModele, stockage: stockageMemoire(), jouerSons: vi.fn(), jouerFichier: vi.fn(async () => ({ manquants: [] })), rng: graine(5), maintenant: () => '2026-11-15T10:00:00.000Z', hash: '#/jeu?pack=m-essai', base: '/' }} />);
    expect(await screen.findByRole('option', { name: 'Mon modèle' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Mot à construire' });
    await construire(user, 'lune');
    await construire(user, 'chat');
    await screen.findByText(/Pack terminé/);
    expect(fetchModele.mock.calls.map(c => c[0])).toEqual(['/mots/modeles.json', '/mots/fiches.json']);
  });
});
