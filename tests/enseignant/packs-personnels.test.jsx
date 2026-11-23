import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/app/App.jsx';
import { fauxClient } from './fauxClient.js';

afterEach(cleanup);

const USER = { id: 'u-master', email: 'Jf@Ecole.be' };

function monter() {
  const client = fauxClient({ tables: { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: USER.id, role: 'master' }] } });
  client.auth = {
    getSession: async () => ({ data: { session: { user: USER } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: vi.fn(async () => {})
  };
  render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', packs: [], catalogue: [], modeles: [] } }} />);
}

// Les « packs personnels » ont été remplacés par les listes de l'enseignant (décision de JF, 2026-11-15) ; le modèle Excel reste la voie pour proposer de nouveaux mots.
describe('mots absents du catalogue', () => {
  it('un lien télécharge le modèle de pack, avec une phrase qui explique la validation', async () => {
    monter();
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    await userEvent.click(await screen.findByRole('tab', { name: 'Tâches' }));
    await userEvent.click(await screen.findByRole('button', { name: '+ Nouvelle tâche' }));
    const lien = await screen.findByRole('link', { name: /télécharger le modèle de cartes/ });
    expect(lien.getAttribute('href')).toBe('https://x.test/modeles/modele-pack-plai.xlsx');
    expect(lien.hasAttribute('download')).toBe(true);
    expect(screen.getByText(/Un mot qui n’est pas dans le catalogue/)).toBeTruthy();
  });
});
