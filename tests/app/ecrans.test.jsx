import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../fixtures/lexique-extrait.json';
import { creerLexique, preparerPack } from '../../src/core/index.js';
import { stockageMemoire, stockageLocal } from '../../src/jeu/essais.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const lex = creerLexique(fixture);
const MANIFEST = preparerPack({ nom: 'essai', mots: ['chat', 'lune'], source: 's', licence: 'l', lexique: lex }).manifest;
const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const reponse = (corps, ok = true) => async () => ({ ok, status: ok ? 200 : 404, json: async () => corps });

function monter(plus = {}) {
  const stockage = plus.stockage || stockageMemoire();
  const jouerSons = plus.jouerSons || vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: reponse(MANIFEST), stockage, jouerSons, rng: graine(5), maintenant: () => '2026-11-11T10:00:00.000Z', hash: '#/jeu?pack=essai&mode=sans&habillage=album', base: '/', ...plus.deps };
  const user = userEvent.setup();
  const rendu = render(<App deps={deps} />);
  return { user, stockage, jouerSons, ...rendu };
}

async function commencer(user, code = 'E07') {
  await user.type(screen.getByLabelText(/Code de l.élève/), code);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
}
const taper = async (user, ...graphemes) => { for (const g of graphemes) await user.click(screen.getByRole('button', { name: g })); };

describe('Accueil', () => {
  it('« Commencer » reste désactivé tant que le code est invalide', async () => {
    const { user } = monter();
    const bouton = screen.getByRole('button', { name: 'Commencer' });
    const champ = screen.getByLabelText(/Code de l.élève/);
    expect(bouton).toBeDisabled();
    for (const mauvais of ['E 07', 'Étienne', 'ABCDEFGHIJKLM']) {
      await user.clear(champ); await user.type(champ, mauvais);
      expect(bouton, mauvais).toBeDisabled();
    }
    await user.clear(champ); await user.type(champ, 'E07');
    expect(bouton).toBeEnabled();
  });

  it('le champ du code explique : un code, pas un nom', () => {
    monter();
    expect(screen.getByText(/Un code, pas un nom/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('E07')).toBeInTheDocument();
  });

  it('le lien de tâche reflète les réglages', async () => {
    const { user } = monter();
    const lien = screen.getByLabelText(/Lien de la tâche/);
    expect(lien.value).toContain('mode=sans');
    await user.selectOptions(screen.getByLabelText(/Cartes/), 'avec');
    expect(lien.value).toContain('mode=avec');
    await user.selectOptions(screen.getByLabelText(/Habillage/), 'sobre');
    expect(lien.value).toContain('habillage=sobre');
  });

  it('l\'élément racine porte data-habillage', async () => {
    const { user, container } = monter();
    expect(container.querySelector('[data-habillage="album"]')).not.toBeNull();
    await user.selectOptions(screen.getByLabelText(/Habillage/), 'sobre');
    expect(container.querySelector('[data-habillage="sobre"]')).not.toBeNull();
  });

  it('pack introuvable : message clair pour l\'enseignant', async () => {
    const { user } = monter({ deps: { fetch: reponse({}, false), hash: '#/jeu?pack=zzz' } });
    await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pack « zzz » introuvable');
  });

  it('stockage refusé : avertissement pour l\'enseignant dès l\'accueil', () => {
    const refuse = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); }, removeItem: () => {} };
    monter({ stockage: stockageLocal({ storage: refuse }) });
    expect(screen.getByText(/ne sont pas conservés sur cet appareil/)).toBeInTheDocument();
  });

  it('adresse de carte inconnue : message attendu', async () => {
    const { user } = monter({ deps: { hash: '#/carte/essai/zzz' } });
    await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Cette carte n.existe pas dans ce pack/);
  });

  it('adresse de carte : une seule carte jouée', async () => {
    const { user } = monter({ deps: { hash: '#/carte/essai/chat' } });
    await commencer(user);
    expect(screen.getByText(/Carte 1 sur 1/)).toBeInTheDocument();
  });
});

describe('Jeu', () => {
  it('bonne réponse : bravo, suivant, une ligne d\'essai enregistrée', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    await taper(user, 'ch', 'a', 't');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeInTheDocument();
    const lignes = stockage.lire();
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ code: 'E07', pack: 'essai', carte: 'chat', juste: true, tentative: 1 });
  });

  it('vérifier une zone incomplète : rien n\'est enregistré et on dit quoi faire', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    await taper(user, 'ch');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Poser tous les cubes/)).toBeInTheDocument();
    expect(stockage.lire()).toHaveLength(0);
  });

  it('mauvaise réponse : zone vidée, encouragement sans score', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    await taper(user, 'a', 'ch', 't');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Essayer encore/)).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Mot à construire' })).queryAllByRole('button')).toHaveLength(0);
    expect(stockage.lire()[0].juste).toBe(false);
    expect(document.body.textContent).not.toMatch(/score|point|%/i);
  });

  it('troisième échec : le mot attendu s\'affiche', async () => {
    const { user } = monter();
    await commencer(user);
    for (let i = 0; i < 3; i++) {
      await taper(user, 'a', 'ch', 't');
      await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    }
    expect(screen.getByText(/Voici le mot/)).toBeInTheDocument();
    expect(screen.getByText('chat', { selector: 'strong' })).toBeInTheDocument();
  });

  it('une pièce posée quitte le plateau : pas de doublon possible', async () => {
    const { user } = monter();
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'ch' }));
    expect(screen.queryByRole('button', { name: 'ch' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Mot à construire' })).getAllByRole('button')).toHaveLength(1);
  });

  it('retirer la dernière pièce la remet sur le plateau', async () => {
    const { user } = monter();
    await commencer(user);
    await taper(user, 'ch');
    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.getByRole('button', { name: 'ch' })).toBeInTheDocument();
  });

  it('mode avec mot ou sans mot : image différente', async () => {
    const { user, unmount } = monter({ deps: { hash: '#/jeu?pack=essai&mode=avec' } });
    await commencer(user);
    expect(screen.getByRole('img').getAttribute('src')).toContain('chat-mot.png');
    unmount();
    const m2 = monter({ deps: { hash: '#/jeu?pack=essai&mode=sans' } });
    await commencer(m2.user);
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/chat\.png$/);
  });

  it('son absent : aucun message d\'erreur côté élève', async () => {
    const jouerSons = vi.fn(async () => ({ manquants: ['ch'] }));
    const { user } = monter({ jouerSons });
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    await waitFor(() => expect(jouerSons).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toMatch(/absent|erreur|introuvable/i);
    // Neutre et sans réponse : l'élève comprend que le bouton marche mais qu'il n'y a pas de son
    expect(await screen.findByText('Pas de son pour le moment.')).toBeInTheDocument();
  });

  it('son disponible : pas de message « pas de son »', async () => {
    const { user } = monter({});
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText('Pas de son pour le moment.')).toBeNull();
  });

  it('stockage qui lève : le jeu continue', async () => {
    const refuse = { getItem: () => null, setItem: () => { throw new Error('plein'); }, removeItem: () => {} };
    const { user } = monter({ stockage: stockageLocal({ storage: refuse }) });
    await commencer(user);
    await taper(user, 'ch', 'a', 't');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
  });

  it('image introuvable : mode sans mot, pas de fuite de la réponse ; l\'enseignant est averti', async () => {
    const { user } = monter({ deps: { hash: '#/jeu?pack=essai&mode=sans' } });
    await commencer(user);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    await waitFor(() => expect(screen.queryByRole('img')).toBeNull());
    expect(screen.getByText(/Image absente/)).toBeInTheDocument();
    expect(screen.queryByText('chat', { selector: 'strong' })).toBeNull();
  });

  it('chaque cube posé : on entend tout ce qui est déposé, dans l’ordre de la zone', async () => {
    const jouerSons = vi.fn(async () => ({ manquants: [] }));
    const { user } = monter({ jouerSons });
    await commencer(user);
    await taper(user, 'ch');
    expect(jouerSons).toHaveBeenLastCalledWith(['ch']);
    await taper(user, 'a');
    expect(jouerSons).toHaveBeenLastCalledWith(['ch', 'a']);
    await taper(user, 't');
    expect(jouerSons).toHaveBeenLastCalledWith(['ch', 'a']);
  });

  it('aide : écouter joue les sons, puis indice', async () => {
    const jouerSons = vi.fn(async () => ({ manquants: [] }));
    const { user } = monter({ jouerSons });
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /Besoin d.aide/ }));
    expect(jouerSons).toHaveBeenCalledWith(['ch', 'a']);
    await user.click(screen.getByRole('button', { name: /Besoin d.aide/ }));
    expect(screen.getByText(/Commencer par/)).toBeInTheDocument();
  });

  it('fin du pack : bilan sans score, rejouer et retour', async () => {
    const { user } = monter({ deps: { hash: '#/carte/essai/chat' } });
    await commencer(user);
    await taper(user, 'ch', 'a', 't');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(await screen.findByText(/Pack terminé/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejouer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour à l.accueil/ })).toBeInTheDocument();
  });
});
