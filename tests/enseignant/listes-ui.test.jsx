import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/app/App.jsx';
import { fauxClient } from './fauxClient.js';

afterEach(cleanup);

const USER = { id: 'u-master', email: 'jf@ecole.be' };
const mot = (id, extra = {}) => ({ id, mot: id, ipa: id, nbSyllabes: 1, cubes: id.split(''), sons: id.split(''), image: true, phrase: true, syllabes: false, audio: `audio/${id}.mp3`, packs: ['p1-100'], ...extra });
const CATALOGUE = ['chat', 'lune', 'terre', 'maman', 'banane'].map(id => mot(id, id === 'banane' ? { nbSyllabes: 3, image: false } : {}));
const GRAND = Array.from({ length: 60 }, (_, i) => mot(`w${String(i).padStart(2, '0')}`));
const MODELES = [{ id: 'p1-100', titre: '100 mots de P1', mots: GRAND.map(m => m.id) }, { id: 'p1-20', titre: '20 mots', mots: ['chat', 'lune'] }];

function monter({ catalogue = CATALOGUE, modeles = MODELES.slice(1), listes = [], jouer = vi.fn() } = {}) {
  const client = fauxClient({ tables: { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: USER.id, role: 'master' }], phono_listes: listes } });
  client.auth = { getSession: async () => ({ data: { session: { user: USER } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: vi.fn(async () => {}) };
  render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', packs: [], catalogue, modeles, jouer } }} />);
  return { client, jouer };
}
const ouvrirClasse = async () => userEvent.click(await screen.findByRole('button', { name: '3P A' }));

describe('choix des listes dans la tâche', () => {
  it('partir d’un modèle : on coche un modèle, le total s’affiche, la tâche reçoit ses mots', async () => {
    const { client } = monter();
    await ouvrirClasse();
    expect(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' })).toBeDisabled();
    await userEvent.click(await screen.findByLabelText(/20 mots/));
    expect(screen.getByText('2 mots dans la tâche (maximum 200)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' }));
    await waitFor(() => expect(client.tables.phono_tasks[0].mots).toEqual(['chat', 'lune']));
    expect(client.tables.phono_tasks[0].listes_noms).toBe('20 mots');
  });

  it('révision : deux listes cochées sont fusionnées sans doublon', async () => {
    const { client } = monter({ listes: [{ id: 'l1', created_by: USER.id, name: 'Semaine 3', words: ['lune', 'terre'], updated_at: 't' }, { id: 'l2', created_by: USER.id, name: 'Semaine 2', words: ['chat', 'lune'], updated_at: 't' }] });
    await ouvrirClasse();
    await userEvent.click(await screen.findByLabelText(/Semaine 3/));
    await userEvent.click(screen.getByLabelText(/Semaine 2/));
    expect(screen.getByText('3 mots dans la tâche (maximum 200)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' }));
    await waitFor(() => expect(client.tables.phono_tasks[0].mots).toEqual(['lune', 'terre', 'chat']));
    expect(client.tables.phono_tasks[0].listes_noms).toBe('Semaine 3 + Semaine 2');
  });

  it('plus de 200 mots : message et bouton désactivé', async () => {
    const quatre = [0, 1, 2, 3, 4].map(k => ({ id: `l${k}`, created_by: USER.id, name: `Liste ${k}`, words: Array.from({ length: 50 }, (_, i) => `x${k}-${i}`), updated_at: 't' }));
    monter({ listes: quatre, catalogue: quatre.flatMap(l => l.words).map(id => mot(id)), modeles: [] }); // les mots absents du catalogue sont ignorés : on les y met
    await ouvrirClasse();
    for (const k of [0, 1, 2, 3, 4]) await userEvent.click(await screen.findByLabelText(new RegExp(`Liste ${k}`)));
    expect(screen.getByText(/250 mots dans la tâche/)).toBeInTheDocument();
    expect(screen.getByText(/Une tâche contient au plus 200 mots/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' })).toBeDisabled();
  });
});

describe('composer une liste', () => {
  const ouvrirEditeur = async () => { await ouvrirClasse(); await userEvent.click(await screen.findByRole('button', { name: 'Composer une liste' })); return screen.findByRole('region', { name: 'Composer une liste' }); };

  it('chaque champ a un label, un exemple et une aide ; le compteur part de 0 / 50', async () => {
    monter();
    const r = await ouvrirEditeur();
    const nom = within(r).getByLabelText('Nom de la liste');
    expect(nom.getAttribute('placeholder')).toMatch(/Semaine 3/);
    expect(within(r).getByText(/n’apparaît que pour vous/)).toBeInTheDocument();
    expect(within(r).getByLabelText('Chercher un mot').getAttribute('placeholder')).toMatch(/chat/);
    expect(within(r).getByText('0 / 50 mots')).toBeInTheDocument();
  });

  it('ajouter des mots depuis le catalogue, les retirer, enregistrer', async () => {
    const { client } = monter();
    const r = await ouvrirEditeur();
    await userEvent.type(within(r).getByLabelText('Nom de la liste'), 'Mes mots');
    await userEvent.click(within(r).getByLabelText('Choisir chat'));
    await userEvent.click(within(r).getByLabelText('Choisir terre'));
    expect(within(r).getByText('2 / 50 mots')).toBeInTheDocument();
    await userEvent.click(within(r).getByRole('button', { name: 'Retirer terre' }));
    expect(within(r).getByText('1 / 50 mots')).toBeInTheDocument();
    await userEvent.click(within(r).getByRole('button', { name: 'Enregistrer la liste' }));
    await waitFor(() => expect(client.tables.phono_listes).toHaveLength(1));
    expect(client.tables.phono_listes[0]).toMatchObject({ name: 'Mes mots', words: ['chat'], created_by: USER.id });
    expect(await screen.findByLabelText(/Mes mots/)).toBeInTheDocument();
  });

  it('chercher et filtrer : par texte, par nombre de syllabes, par image', async () => {
    monter();
    const r = await ouvrirEditeur();
    await userEvent.type(within(r).getByLabelText('Chercher un mot'), 'mam');
    expect(within(r).queryByLabelText('Choisir chat')).toBeNull();
    expect(within(r).getByLabelText('Choisir maman')).toBeInTheDocument();
    await userEvent.clear(within(r).getByLabelText('Chercher un mot'));
    await userEvent.selectOptions(within(r).getByLabelText('Nombre de syllabes'), '3');
    expect(within(r).getByLabelText('Choisir banane')).toBeInTheDocument();
    expect(within(r).queryByLabelText('Choisir chat')).toBeNull();
    await userEvent.selectOptions(within(r).getByLabelText('Nombre de syllabes'), 'toutes');
    await userEvent.selectOptions(within(r).getByLabelText('Image'), 'sans');
    expect(within(r).getAllByLabelText(/^Choisir /)).toHaveLength(1);
  });

  it('le bouton Écouter joue le fichier du mot', async () => {
    const { jouer } = monter();
    const r = await ouvrirEditeur();
    await userEvent.click(within(r).getByRole('button', { name: 'Écouter chat' }));
    expect(jouer).toHaveBeenCalledWith('https://x.test/mots/audio/chat.mp3');
  });

  it('au 51e mot : refusé avec « Une liste contient au plus 50 mots. »', async () => {
    monter({ catalogue: GRAND, modeles: [] });
    const r = await ouvrirEditeur();
    for (const m of GRAND.slice(0, 50)) await userEvent.click(within(r).getByLabelText(`Choisir ${m.id}`));
    expect(within(r).getByText('50 / 50 mots')).toBeInTheDocument();
    await userEvent.click(within(r).getByLabelText(`Choisir ${GRAND[50].id}`));
    expect(within(r).getByText('50 / 50 mots')).toBeInTheDocument();
    expect(within(r).getByText('Une liste contient au plus 50 mots.')).toBeInTheDocument();
  }, 60000);

  it('partir d’un modèle de plus de 50 mots : on doit en retirer, message explicite', async () => {
    const { client } = monter({ catalogue: GRAND, modeles: MODELES });
    const r = await ouvrirEditeur();
    await userEvent.type(within(r).getByLabelText('Nom de la liste'), 'Début');
    await userEvent.selectOptions(within(r).getByLabelText('Partir d’un modèle'), 'p1-100');
    expect(within(r).getByText('60 / 50 mots')).toBeInTheDocument();
    expect(within(r).getByText('Retirez 10 mots pour enregistrer.')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: 'Enregistrer la liste' })).toBeDisabled();
    for (let i = 0; i < 10; i++) await userEvent.click(within(r).getAllByRole('button', { name: /^Retirer / })[0]);
    expect(within(r).getByRole('button', { name: 'Enregistrer la liste' })).toBeEnabled();
    await userEvent.click(within(r).getByRole('button', { name: 'Enregistrer la liste' }));
    await waitFor(() => expect(client.tables.phono_listes).toHaveLength(1));
    expect(client.tables.phono_listes[0].words).toHaveLength(50);
  }, 60000);
});

describe('relecture : nom des tâches, suppression, modèle, catalogue en panne', () => {
  it('la liste des tâches montre les noms des listes (le libellé neutre « Liste » reste côté serveur)', async () => {
    monter();
    await ouvrirClasse();
    await userEvent.click(await screen.findByLabelText(/20 mots/));
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche et les liens des élèves' }));
    const titre = await screen.findByRole('heading', { name: 'Tâches de la classe' });
    await waitFor(() => expect(titre.nextElementSibling.textContent).toMatch(/20 mots : album/));
    expect(titre.nextElementSibling.textContent).not.toMatch(/Liste : album/);
  });

  it('supprimer une liste demande confirmation : refus = rien ne change, accord = supprimée', async () => {
    const { client } = monter({ listes: [{ id: 'l1', created_by: USER.id, name: 'À jeter', words: ['chat'], updated_at: 't' }] });
    await ouvrirClasse();
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    expect(confirmation).toHaveBeenCalledWith('Supprimer la liste « À jeter » ? Les tâches déjà données gardent leurs mots.');
    expect(client.tables.phono_listes).toHaveLength(1);
    confirmation.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(client.tables.phono_listes).toHaveLength(0));
    confirmation.mockRestore();
  });

  it('choisir de nouveau le même modèle après des retraits le recharge', async () => {
    monter({ modeles: MODELES.slice(1) });
    await ouvrirClasse();
    await userEvent.click(await screen.findByRole('button', { name: 'Composer une liste' }));
    const r = await screen.findByRole('region', { name: 'Composer une liste' });
    await userEvent.selectOptions(within(r).getByLabelText('Partir d’un modèle'), 'p1-20');
    expect(within(r).getByText('2 / 50 mots')).toBeInTheDocument();
    await userEvent.click(within(r).getByRole('button', { name: 'Retirer chat' }));
    expect(within(r).getByText('1 / 50 mots')).toBeInTheDocument();
    await userEvent.selectOptions(within(r).getByLabelText('Partir d’un modèle'), 'p1-20');
    expect(within(r).getByText('2 / 50 mots')).toBeInTheDocument();
  });

  it('catalogue en panne (réponse 500) : message français, pas un catalogue vide silencieux', async () => {
    const client = fauxClient({ tables: { phono_classes: [{ id: 'c1', name: '3P A' }], phono_class_members: [{ class_id: 'c1', user_id: USER.id, role: 'master' }] } });
    client.auth = { getSession: async () => ({ data: { session: { user: USER } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: vi.fn(async () => {}) };
    render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', packs: [], fetch: async () => ({ ok: false, status: 500, json: async () => [] }) } }} />);
    expect(await screen.findByText("Les mots n'ont pas pu être chargés.")).toBeInTheDocument();
  });
});
