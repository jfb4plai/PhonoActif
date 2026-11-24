import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/app/App.jsx';
import { fauxClient } from './fauxClient.js';

afterEach(cleanup);

const USER = { id: 'u-master', email: 'jf@ecole.be' };
function avecAuth(client, { session = null } = {}) {
  let ecouteur = null;
  client.auth = {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: cb => { ecouteur = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async () => { ecouteur && ecouteur('SIGNED_IN', { user: USER }); return { error: null }; },
    resetPasswordForEmail: vi.fn(async () => ({ error: null })), signOut: vi.fn(async () => {})
  };
  return client;
}
const mot = (id, cubes, image = true) => ({ id, mot: id, ipa: id, nbSyllabes: 1, cubes, sons: cubes, image, phrase: true, syllabes: false, audio: `audio/${id}.mp3`, packs: [] });
// ami, île (voyelle seule + image) ; chat (consonne) ; eau (digraphe « eau » en première lettre : cube « eau ») ; ours sans image
const CATALOGUE = [mot('ami', ['a', 'm', 'i']), mot('ile', ['î', 'l', 'e']), mot('chat', ['ch', 'a', 't']), mot('eau', ['eau']), mot('ours', ['ou', 'r', 's'], false)];
const MODELES = [
  { id: 'primaire-demo', titre: 'Pack primaire d’essai', mots: ['chat'] },
  { id: 'mat-demo', titre: 'Pack maternelle d’essai', niveau: 'maternelle', mots: ['ami', 'ile', 'chat', 'eau', 'ours'] }
];
const monter = client => render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', packs: [], catalogue: CATALOGUE, modeles: MODELES } }} />);
const classeTables = { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: USER.id, role: 'master' }] };

async function ouvrirAssistant() {
  const client = avecAuth(fauxClient({ tables: classeTables }), { session: { user: USER } });
  monter(client);
  await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
  await userEvent.click(await screen.findByRole('tab', { name: 'Tâches' }));
  await userEvent.click(await screen.findByRole('button', { name: '+ Nouvelle tâche' }));
  return client;
}

describe('niveau dans les tâches (espace enseignant)', () => {
  it('le niveau est le premier choix de l’assistant, primaire par défaut', async () => {
    await ouvrirAssistant();
    expect(await screen.findByRole('radio', { name: /Primaire/ })).toBeChecked();
    expect(screen.getByLabelText(/Pack primaire d’essai/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Pack maternelle d’essai/)).toBeNull();
  });

  it('maternelle : modèles du niveau, mots inutilisables retirés, réglages réduits, niveau enregistré', async () => {
    const client = await ouvrirAssistant();
    await userEvent.click(await screen.findByRole('radio', { name: /Maternelle/ }));
    expect(screen.queryByLabelText(/Pack primaire d’essai/)).toBeNull();
    await userEvent.click(await screen.findByLabelText(/Pack maternelle d’essai/));
    expect(screen.getByText(/2 mots dans la tâche/)).toBeInTheDocument(); // ami et île seulement
    expect(screen.getByText(/3 mots retirés/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(screen.queryByLabelText('Nombre de cubes en trop')).toBeNull();
    expect(screen.queryByLabelText('Exiger les accents')).toBeNull();
    expect(screen.getByLabelText('Vitesse de la voix')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(screen.getAllByText(/maternelle : première lettre/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' })); // tableau + feuille par défaut : pas de liens d'élèves
    await waitFor(() => expect(client.tables.phono_tasks).toHaveLength(1));
    expect(client.tables.phono_tasks[0].niveau).toBe('maternelle');
    expect(client.tables.phono_tasks[0].mots).toEqual(['ami', 'ile']);
  });

  it('maternelle : façon de répondre (tableau + feuille par défaut), série enregistrée, liens du tableau et de la feuille dans la liste, nouvelle série', async () => {
    const client = await ouvrirAssistant();
    await userEvent.click(await screen.findByRole('radio', { name: /Maternelle/ }));
    await userEvent.click(await screen.findByLabelText(/Pack maternelle d’essai/));
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(screen.getByRole('checkbox', { name: /Au tableau \(TBI\)/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /feuille à imprimer/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Sur tablette/ })).not.toBeChecked();
    await userEvent.selectOptions(screen.getByLabelText('Nombre de mots de la série'), '6');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));
    await waitFor(() => expect(client.tables.phono_tasks).toHaveLength(1));
    const ligne = client.tables.phono_tasks[0];
    expect(Number.isInteger(ligne.serie_graine)).toBe(true);
    expect(ligne.serie_nb).toBe(6);
    const tbi = await screen.findByRole('link', { name: 'Ouvrir au tableau (TBI)' });
    expect(tbi.getAttribute('href')).toBe(`https://x.test/#/jeu?t=${ligne.token}&classe=1&graine=${ligne.serie_graine}&nb=6`);
    expect(screen.getByRole('link', { name: 'Imprimer la feuille' }).getAttribute('href')).toBe(`https://x.test/#/feuille?t=${ligne.token}&graine=${ligne.serie_graine}&nb=6`);
    expect(screen.getByRole('link', { name: 'Voir le corrigé' }).getAttribute('href')).toMatch(/corrige=1$/);
    const avant = ligne.serie_graine;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Nouvelle série' }));
    await waitFor(() => expect(client.tables.phono_tasks[0].serie_graine).not.toBe(avant));
  });

  it('maternelle : au moins une façon de répondre ; avec tablette, les liens des élèves sont créés comme avant', async () => {
    const client = await ouvrirAssistant();
    await userEvent.click(await screen.findByRole('radio', { name: /Maternelle/ }));
    await userEvent.click(await screen.findByLabelText(/Pack maternelle d’essai/));
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Au tableau \(TBI\)/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /feuille à imprimer/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Cocher au moins une façon de répondre/);
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /Sur tablette/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' }));
    await waitFor(() => expect(client.tables.phono_tasks).toHaveLength(1));
    expect(await screen.findByRole('heading', { name: /Liens et QR-codes des élèves/ })).toBeInTheDocument();
  });

  it('primaire : le niveau n’est pas envoyé au serveur (la migration du niveau n’est pas nécessaire)', async () => {
    const client = await ouvrirAssistant();
    await userEvent.click(await screen.findByLabelText(/Pack primaire d’essai/));
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(screen.getByLabelText('Nombre de cubes en trop')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' }));
    await waitFor(() => expect(client.tables.phono_tasks).toHaveLength(1));
    expect('niveau' in client.tables.phono_tasks[0]).toBe(false);
  });

  it('maternelle sans liste cochée : la consigne « cochez au moins une liste » reste affichée', async () => {
    await ouvrirAssistant();
    await userEvent.click(await screen.findByRole('radio', { name: /Maternelle/ }));
    // aucune liste cochée : pas d'erreur ; on coche le modèle puis on le décoche : rien à créer
    expect(screen.getByText(/Pour continuer : cochez au moins une liste/)).toBeInTheDocument();
  });
});
