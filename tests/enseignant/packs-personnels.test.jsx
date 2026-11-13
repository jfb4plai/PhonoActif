import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/app/App.jsx';
import { fauxClient } from './fauxClient.js';
import { empreinteCourriel } from '../../src/core/packAtelier.js';

afterEach(cleanup);

const USER = { id: 'u-master', email: 'Jf@Ecole.be' };
const PACKS = [
  { id: 'demo', label: 'Pack d’essai' },
  { id: 'commun-1', label: 'Animaux de la ferme', visibilite: 'commun' },
  { id: 'a-moi', label: 'Mes mots de 3B (personnel)', visibilite: 'prive', proprietaire: await empreinteCourriel('jf@ecole.be') },
  { id: 'a-autre', label: 'Pack privé d’un autre (personnel)', visibilite: 'prive', proprietaire: await empreinteCourriel('autre@ecole.be') }
];

function monter() {
  const client = fauxClient({ tables: { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: USER.id, role: 'master' }] } });
  client.auth = {
    getSession: async () => ({ data: { session: { user: USER } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: vi.fn(async () => {})
  };
  render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', packs: PACKS } }} />);
}

describe('packs personnels', () => {
  it('la liste des packs ne montre que les packs communs et ceux dont l’enseignant est propriétaire (adresse sans tenir compte de la casse)', async () => {
    monter();
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const select = await screen.findByLabelText('Pack de cartes');
    await waitFor(() => expect([...select.querySelectorAll('option')].map(o => o.textContent)).toEqual(['Pack d’essai', 'Animaux de la ferme', 'Mes mots de 3B (personnel)']));
    expect(screen.queryByText(/d’un autre/)).toBeNull();
  });

  it('un lien télécharge le modèle de pack, avec une phrase qui explique « personnel »', async () => {
    monter();
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const lien = await screen.findByRole('link', { name: /télécharger le modèle de pack/ });
    expect(lien.getAttribute('href')).toBe('https://x.test/modeles/modele-pack-plai.xlsx');
    expect(lien.hasAttribute('download')).toBe(true);
    expect(screen.getByText(/Un pack « personnel » n’apparaît que pour vous/)).toBeTruthy();
  });
});
