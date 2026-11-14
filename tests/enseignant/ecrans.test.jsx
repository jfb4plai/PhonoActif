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

const monter = (client, hash = '#/enseignant') => render(<App deps={{ hash, enseignant: { client, base: 'https://x.test/', packs: [{ id: 'demo', label: 'Pack d’essai (5 mots)' }, { id: 'second', label: 'Pack second' }] } }} />);

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
    expect(await screen.findByRole('heading', { name: '5P B' })).toBeTruthy();
    expect(screen.getByLabelText('Codes des élèves')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Retour aux classes' }));
    expect(await screen.findByRole('button', { name: /5P B/ })).toBeTruthy();
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const champ = await screen.findByLabelText('Codes des élèves');
    expect(champ.getAttribute('placeholder')).toBe('E01, E02, E03');
    expect(screen.getByText(/Un code, pas un nom.*correspondance avec les élèves sur papier/)).toBeTruthy();
    await userEvent.type(champ, 'E01, E01, Étienne');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter les codes' }));
    expect(await screen.findByText('E01 : doublon dans la liste')).toBeTruthy();
    expect(screen.getByText('Étienne : code invalide')).toBeTruthy();
    expect(client.tables.phono_students.map(s => s.code)).toEqual(['E01']);
    expect(screen.getByLabelText('E-mail de l’enseignant')).toBeTruthy();
  });

  it('codes : la création automatique vient d’abord, la saisie code par code est repliée en dessous', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const auto = await screen.findByRole('button', { name: 'Créer les codes automatiquement' });
    const manuel = screen.getByText('Saisir les codes un par un');
    expect(auto.compareDocumentPosition(manuel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(manuel.closest('details').open).toBe(false);
    expect(screen.queryByRole('button', { name: 'Générer' })).toBeNull();
    const nb = screen.getByLabelText('Nombre d’élèves');
    await userEvent.clear(nb); await userEvent.type(nb, '3');
    await userEvent.click(auto);
    await waitFor(() => expect(client.tables.phono_students.map(s => s.code)).toEqual(['E01', 'E02', 'E03']));
    expect(await screen.findByText('3 code(s) ajouté(s).')).toBeTruthy();
    await userEvent.click(auto);
    await waitFor(() => expect(client.tables.phono_students.length).toBe(6));
    expect(client.tables.phono_students.map(s => s.code)).toContain('E06');
  });

  it('liens et QR-codes personnels : un par élève, avec son code et sa clé', async () => {
    const tables = { ...classeTables('master'), phono_students: [{ id: 's1', class_id: 'c1', code: 'E01', secret: 'a'.repeat(20) }, { id: 's2', class_id: 'c1', code: 'E02', secret: 'b'.repeat(20) }],
      phono_tasks: [{ id: 't1', class_id: 'c1', token: 'a1'.repeat(12), pack: 'demo', mode_mot: 'sans', habillage: 'sobre', nb_intrus: 2, exiger_accents: false, revoked: false, created_at: '2026-11-14T10:00:00Z' }] };
    const client = avecAuth(fauxClient({ tables }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Liens et QR-codes personnels' }));
    const region = await screen.findByRole('region', { name: 'Liens personnels des élèves' });
    expect(await screen.findByAltText('QR-code personnel de E01')).toBeInTheDocument();
    expect(screen.getByAltText('QR-code personnel de E02')).toBeInTheDocument();
    expect(region.querySelector(`a[href$="&e=E01&k=${'a'.repeat(20)}"]`)).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Nouvelle clé pour E01' }));
    await waitFor(() => expect(client.tables.phono_students[0].secret).not.toBe('a'.repeat(20)));
    expect(client.tables.phono_students[1].secret).toBe('b'.repeat(20));
  });

  it('réglage « écoute par syllabes » : choisi dans la tâche, enregistré, rappelé dans le résumé', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const choix = await screen.findByLabelText('Écoute par syllabes');
    expect(choix).toHaveValue('toujours');
    expect(screen.getByText(/Ce réglage ne lit rien tout seul/)).toBeInTheDocument();
    await userEvent.selectOptions(choix, 'aide');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }));
    await waitFor(() => expect(client.tables.phono_tasks[0].syllabes).toBe('aide'));
    expect((await screen.findAllByText(/syllabes sur difficulté/)).length).toBeGreaterThan(0);
  });

  it('crée un lien de tâche avec QR-code', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const liste = await screen.findByLabelText('Pack de cartes');
    expect(liste.tagName).toBe('SELECT');
    expect([...liste.options].map(o => o.textContent)).toEqual(['Pack d’essai (5 mots)', 'Pack second']);
    await userEvent.selectOptions(liste, 'second');
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }));
    await waitFor(() => expect(client.tables.phono_tasks[0].pack).toBe('second'));
    const img = await screen.findByAltText('QR-code de la tâche');
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(screen.getAllByText(/https:\/\/x\.test\/#\/jeu\?t=[a-f0-9]{24}/).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Réglages de ce lien : album · avec le mot|Réglages de ce lien : album · sans le mot/)).toBeTruthy();
  });

  it('tâche : l’enseignant choisit habillage, cartes, cubes en trop et accents ; défauts = ceux de l’app élève', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    expect((await screen.findByLabelText('Habillage')).value).toBe('album');
    expect(screen.getByLabelText('Cartes avec ou sans le mot écrit').value).toBe('sans');
    expect(screen.getByLabelText('Nombre de cubes en trop').value).toBe('3');
    expect(screen.getByLabelText('Exiger les accents').checked).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }));
    await waitFor(() => expect(client.tables.phono_tasks.length).toBe(1));
    expect(client.tables.phono_tasks[0]).toMatchObject({ habillage: 'album', mode_mot: 'sans', nb_intrus: 3, exiger_accents: false });
    await userEvent.selectOptions(screen.getByLabelText('Habillage'), 'sobre');
    await userEvent.selectOptions(screen.getByLabelText('Cartes avec ou sans le mot écrit'), 'avec');
    await userEvent.selectOptions(screen.getByLabelText('Nombre de cubes en trop'), '1');
    await userEvent.click(screen.getByLabelText('Exiger les accents'));
    await userEvent.click(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }));
    await waitFor(() => expect(client.tables.phono_tasks.length).toBe(2));
    expect(client.tables.phono_tasks[1]).toMatchObject({ habillage: 'sobre', mode_mot: 'avec', nb_intrus: 1, exiger_accents: true });
  });

  it('tâches existantes : réglages visibles pour chacune, révocation possible', async () => {
    const tache = (id, extra = {}) => ({ id, class_id: 'c1', token: id.repeat(24).slice(0, 24), pack: 'demo', mode_mot: 'avec', habillage: 'sobre', nb_intrus: 2, exiger_accents: false, revoked: false, created_at: '2026-11-11T10:00:00Z', ...extra });
    const client = avecAuth(fauxClient({ tables: { ...classeTables('master'), phono_tasks: [tache('a'), tache('b', { revoked: true, created_at: '2026-11-09T10:00:00Z' })] } }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    expect((await screen.findAllByText(/sobre · avec le mot · 2 cubes en trop · accents non exigés/)).length).toBe(2);
    expect(screen.getByText(/révoquée/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Révoquer/ }).length).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: /Révoquer/ }));
    await waitFor(() => expect(client.tables.phono_tasks[0].revoked).toBe(true));
  });

  it('avertissement sur les données, visible sur la page de la classe', async () => {
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    monter(client);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const note = await screen.findByRole('note', { name: 'Données des élèves' });
    expect(note.textContent).toMatch(/code, jamais un nom/);
    expect(note.textContent).toMatch(/mot, ce que l’élève a posé, juste ou faux, l’aide, la date/);
    expect(note.textContent).toMatch(/enseignants de la classe/);
    expect(note.textContent).toMatch(/Supabase/);
    expect(note.textContent).toMatch(/purge annuelle.*pas encore en service/);
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

  it('sans liste fournie : lit packs/index.json ; sans pack publié, le choix est désactivé avec explication', async () => {
    const appels = [];
    const fetch = async url => { appels.push(url); return { ok: true, json: async () => [{ id: 'demo', label: 'Pack d’essai (5 mots)' }] }; };
    const client = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    render(<App deps={{ hash: '#/enseignant', enseignant: { client, base: 'https://x.test/', fetch } }} />);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    const liste = await screen.findByLabelText('Pack de cartes');
    await waitFor(() => expect([...liste.options].map(o => o.value)).toEqual(['demo']));
    expect(appels[0]).toMatch(/packs\/index\.json$/);
    cleanup();
    const vide = avecAuth(fauxClient({ tables: classeTables('master') }), { session: { user: USER } });
    render(<App deps={{ hash: '#/enseignant', enseignant: { client: vide, base: 'https://x.test/', packs: [] } }} />);
    await userEvent.click(await screen.findByRole('button', { name: '3P A' }));
    expect((await screen.findByLabelText('Pack de cartes')).disabled).toBe(true);
    expect(screen.getByText(/Aucun pack publié/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Créer le lien et le QR-code' }).disabled).toBe(true);
  });

  it('service non configuré : message clair', () => {
    render(<App deps={{ hash: '#/enseignant', enseignant: { supabase: null } }} />);
    return screen.findByText(/service non configuré/);
  });
});
