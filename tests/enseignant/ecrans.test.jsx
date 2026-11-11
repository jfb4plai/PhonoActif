import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/app/App.jsx';
import { fauxClient } from './fauxClient.js';

afterEach(cleanup);

const USER = { id: 'u-master', email: 'jf@ecole.be' };

function avecAuth(client, { session = null, signIn } = {}) {
  let ecouteur = null;
  client.auth = {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: cb => { ecouteur = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: signIn || (async () => { ecouteur && ecouteur('SIGNED_IN', { user: USER }); return { error: null }; }),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {})
  };
  return client;
}

const monter = (client, hash = '#/enseignant') => render(<App deps={{ hash, enseignant: { client, base: 'https://x.test/', packs: ['demo'] } }} />);

const classeTables = role => ({
  phono_classes: [{ id: 'c1', name: '3P A' }],
  phono_class_members: [{ class_id: 'c1', user_id: USER.id, role }]
});

describe('espace enseignant', () => {
  it('sans session : formulaire de connexion avec aide, puis liste des classes après connexion', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }));
    monter(client);
    expect(await screen.findByLabelText('E-mail du compte PLAI')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('E-mail du compte PLAI'), 'jf@ecole.be');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('button', { name: '3P A' })).toBeTruthy();
  });

  it('connexion refusée : message en français', async () => {
    const client = avecAuth(fauxClient(), { signIn: async () => ({ error: { message: 'Invalid login credentials' } }) });
    monter(client);
    await userEvent.type(await screen.findByLabelText('E-mail du compte PLAI'), 'a@b.be');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/Connexion refusée/)).toBeTruthy();
  });

  it('mot de passe oublié sans e-mail : demande de saisir l’e-mail', async () => {
    const client = avecAuth(fauxClient());
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: 'Mot de passe oublié' }));
    expect(await screen.findByText(/Saisir d’abord l’e-mail/)).toBeTruthy();
    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('master : crée une classe, ajoute des codes avec refus expliqués, voit l’invitation', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.type(await screen.findByLabelText('Nom de la classe'), '5P B');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la classe' }));
    await waitFor(() => expect(client.tables.phono_classes.some(c => c.name === '5P B')).toBe(true));
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const champ = await screen.findByLabelText('Codes des élèves');
    expect(champ.getAttribute('placeholder')).toBe('E01, E02, E03');
    expect(screen.getByText('Un code, pas un nom. Garder la correspondance avec les élèves sur papier.')).toBeTruthy();
    await userEvent.type(champ, 'E01, E01, Étienne');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter les codes' }));
    expect(await screen.findByText('E01 : doublon dans la liste')).toBeTruthy();
    expect(screen.getByText('Étienne : code invalide')).toBeTruthy();
    expect(client.tables.phono_students.map(s => s.code)).toEqual(['E01']);
    expect(screen.getByLabelText('E-mail de l’enseignant')).toBeTruthy();
  });

  it('crée un lien de tâche avec QR-code', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    await userEvent.type(await screen.findByLabelText('Pack de cartes'), 'demo');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }));
    const img = await screen.findByAltText('QR-code de la tâche');
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(screen.getByText(/https:\/\/x\.test\/#\/jeu\?t=[a-f0-9]{24}/)).toBeTruthy();
  });

  it('invité : ni invitation, ni suppression, ni retrait d’élève', async () => {
    const client = avecAuth(fauxClient({ role: 'invite', tables: { ...classeTables('invite'), phono_students: [{ id: 's1', class_id: 'c1', code: 'E01' }] } }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: /3P A/ }));
    expect(await screen.findByText('E01')).toBeTruthy();
    expect(screen.queryByLabelText('E-mail de l’enseignant')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer la classe' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retirer E01' })).toBeNull();
  });

  it('service non configuré : message clair', () => {
    render(<App deps={{ hash: '#/enseignant', enseignant: { supabase: null } }} />);
    return screen.findByText(/service non configuré/);
  });
});
