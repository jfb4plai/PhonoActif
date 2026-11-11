import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../fixtures/lexique-extrait.json';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { stockageEnvoyes } from '../../src/sync/envoi.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const TOKEN = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const lex = creerLexique(fixture);
const MANIFEST = preparerPack({ nom: 'essai', mots: ['chat'], source: 's', licence: 'l', lexique: lex }).manifest;
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const TACHE = { pack: 'essai', mode_mot: 'avec', habillage: 'sobre', nb_intrus: 2, exiger_accents: false };

const reponse = (status, corps) => ({ ok: status < 400, status, json: async () => corps });

// Faux Supabase : tache = réponse de phono_lire_tache ; envoi = (corps, numéro d'appel) => réponse ou Error
function fauxSupabase({ tache = reponse(200, TACHE), envoi } = {}) {
  const appels = { tache: 0, envoi: [] };
  const fetch = vi.fn(async (url, init) => {
    const corps = JSON.parse(init.body);
    if (url.endsWith('/phono_lire_tache')) { appels.tache++; return tache; }
    appels.envoi.push(corps);
    const r = envoi ? envoi(corps, appels.envoi.length) : reponse(200, { recus: corps.p_lignes.length, ignores: 0 });
    if (r instanceof Error) throw r;
    return r;
  });
  return { appels, config: { url: 'https://x.supabase.co', anonKey: 'cle', fetch } };
}

function monter({ hash = `#/jeu?t=${TOKEN}`, supa = fauxSupabase(), stockage = stockageMemoire(), envoyes } = {}) {
  const user = userEvent.setup();
  const deps = {
    fetch: async () => ({ ok: true, json: async () => MANIFEST }), stockage, supabase: supa.config, stockageEnvoyes: envoyes || stockageEnvoyes({ storage: undefined }),
    jouerSons: vi.fn(async () => ({ manquants: [] })), rng: graine(5), maintenant: () => '2026-11-11T10:00:00.000Z', hash, base: '/'
  };
  return { user, stockage, supa, ...render(<App deps={deps} />) };
}

async function jouerChat(user, code = 'E07') {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled === undefined || true);
  await user.type(screen.getByLabelText(/Code de l.élève/), code);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
  for (const g of ['ch', 'a', 't']) await user.click(screen.getByRole('button', { name: g }));
  await user.click(screen.getByRole('button', { name: 'Vérifier' }));
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
  await screen.findByText(/Pack terminé/);
}

describe('tâche en ligne', () => {
  it('les réglages viennent de la tâche, pas de l\'écran : plus de champs enseignant', async () => {
    const { user, container } = monter();
    await waitFor(() => expect(container.querySelector('[data-habillage="sobre"]')).not.toBeNull());
    expect(screen.queryByLabelText(/Habillage/)).toBeNull();
    expect(screen.queryByLabelText(/Pack de cartes/)).toBeNull();
    await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Mot à construire' });
    expect(screen.getByRole('img').getAttribute('src')).toContain('chat-mot.png');
  });

  it('avertissement élève : les résultats partent chez l’enseignant avec le code, plus « reste sur cet appareil »', async () => {
    monter();
    const note = await screen.findByRole('note', { name: 'Tes données' });
    expect(note.textContent).toMatch(/Tes résultats sont envoyés à ton enseignant avec ton code/);
    expect(note.textContent).toMatch(/Ton nom n’est jamais demandé/);
    expect(document.body.textContent).not.toMatch(/reste sur cet appareil/);
  });

  it('tâche inconnue : message clair', async () => {
    monter({ supa: fauxSupabase({ tache: reponse(400, { message: 'tache_inconnue' }) }) });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Cette tâche n.existe plus/);
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeDisabled();
  });

  it('réseau coupé au chargement de la tâche : message sans terme technique', async () => {
    const supa = fauxSupabase();
    supa.config.fetch.mockImplementationOnce(async () => { throw new Error('Failed to fetch'); });
    monter({ supa });
    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent(/Pas de connexion/);
    expect(alerte.textContent).not.toMatch(/fetch|Error|500/);
  });

  it('sans configuration Supabase, un lien de tâche ne s\'ouvre pas mais l\'app ne plante pas', async () => {
    const user = userEvent.setup();
    render(<App deps={{ fetch: async () => ({ ok: true, json: async () => MANIFEST }), stockage: stockageMemoire(), supabase: null, hash: `#/jeu?t=${TOKEN}`, base: '/' }} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it('jouer une carte puis « Envoyer mes résultats » : appel avec le bon jeton, le bon code et la ligne d\'essai', async () => {
    const { user, supa } = monter();
    await jouerChat(user);
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    expect(await screen.findByText('Résultats envoyés')).toBeInTheDocument();
    expect(supa.appels.envoi).toHaveLength(1);
    const c = supa.appels.envoi[0];
    expect(c.p_token).toBe(TOKEN);
    expect(c.p_code).toBe('E07');
    expect(c.p_lignes).toHaveLength(1);
    expect(c.p_lignes[0]).toMatchObject({ carte: 'chat', mot: 'chat', juste: true, tentative: 1, aide: 'aucune' });
    expect(c.p_lignes[0].code).toBeUndefined();
    expect(c.p_lignes[0].jeton).toBeUndefined();
  });

  it('réseau coupé à l\'envoi : message doux, essais conservés, puis renvoi sans doublon', async () => {
    const supa = fauxSupabase({ envoi: (corps, n) => (n === 1 ? new Error('Failed to fetch') : reponse(200, { recus: corps.p_lignes.length, ignores: 0 })) });
    const { user, stockage } = monter({ supa });
    await jouerChat(user);
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    const msg = await screen.findByText(/l.envoi se fera plus tard/);
    expect(msg.textContent).not.toMatch(/fetch|Error|500|réseau/i);
    expect(stockage.lire()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    expect(await screen.findByText('Résultats envoyés')).toBeInTheDocument();
    expect(supa.appels.envoi).toHaveLength(2);
    expect(supa.appels.envoi[1].p_lignes[0].id).toBe(supa.appels.envoi[0].p_lignes[0].id);
  });

  it('une fois envoyé, un nouveau clic n\'envoie plus rien', async () => {
    const { user, supa } = monter();
    await jouerChat(user);
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    await screen.findByText('Résultats envoyés');
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    expect(supa.appels.envoi).toHaveLength(1);
  });

  it('code inconnu de la classe : message adapté', async () => {
    const supa = fauxSupabase({ envoi: () => reponse(400, { message: 'code_inconnu' }) });
    const { user } = monter({ supa });
    await jouerChat(user, 'Z99');
    await user.click(screen.getByRole('button', { name: 'Envoyer mes résultats' }));
    expect(await screen.findByText(/Ce code n.est pas dans la classe : demander à l.enseignant/)).toBeInTheDocument();
  });

  it('les essais en attente partent au retour du réseau, sans bouton', async () => {
    const supa = fauxSupabase();
    const stockage = stockageMemoire();
    stockage.ajouter({ id: '00000000-0000-4000-8000-000000000001', jeton: TOKEN, code: 'E07', session: 's', pack: 'essai', carte: 'chat', mot: 'chat', modeMot: 'avec', tentative: 1, juste: true, aide: 'aucune', positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }], date: '2026-11-11T10:00:00.000Z' });
    const { unmount } = monter({ supa, stockage });
    await waitFor(() => expect(supa.appels.envoi.length).toBeGreaterThanOrEqual(1));
    const avant = supa.appels.envoi.length;
    window.dispatchEvent(new Event('online'));
    await new Promise(r => setTimeout(r, 30));
    expect(supa.appels.envoi.length).toBe(avant);
    unmount();
  });

  it('retour du réseau : l\'événement online relance l\'envoi des lignes encore en attente', async () => {
    const supa = fauxSupabase({ envoi: (corps, n) => (n === 1 ? new Error('Failed to fetch') : reponse(200, { recus: corps.p_lignes.length, ignores: 0 })) });
    const stockage = stockageMemoire();
    stockage.ajouter({ id: '00000000-0000-4000-8000-000000000002', jeton: TOKEN, code: 'E07', session: 's', pack: 'essai', carte: 'chat', mot: 'chat', modeMot: 'avec', tentative: 1, juste: true, aide: 'aucune', positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }], date: '2026-11-11T10:00:00.000Z' });
    monter({ supa, stockage });
    await waitFor(() => expect(supa.appels.envoi).toHaveLength(1));
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(supa.appels.envoi).toHaveLength(2));
  });

  it('les lignes sans jeton (jeu hors ligne) ne partent jamais', async () => {
    const supa = fauxSupabase();
    const stockage = stockageMemoire();
    stockage.ajouter({ id: '00000000-0000-4000-8000-000000000003', jeton: null, code: 'E07', session: 's', pack: 'essai', carte: 'chat', mot: 'chat', modeMot: 'sans', tentative: 1, juste: true, aide: 'aucune', positions: [{ liaison: 'a=a', pose: 'a', juste: true }], date: '2026-11-11T10:00:00.000Z' });
    monter({ supa, stockage });
    await screen.findByLabelText(/Code de l.élève/);
    fireEvent(window, new Event('online'));
    await new Promise(r => setTimeout(r, 30));
    expect(supa.appels.envoi).toHaveLength(0);
  });

  it('l\'écran élève ne montre ni nom de classe ni identifiant interne', async () => {
    const { user } = monter();
    await jouerChat(user);
    expect(document.body.textContent).not.toMatch(/classe|[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});
