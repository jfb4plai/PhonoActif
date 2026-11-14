import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stockageMemoire } from '../../src/jeu/essais.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

// Pack « lettres » minimal : chat = c, h, a, t ; graphèmes finaux ch, a, t.
const MANIFEST = {
  nom: 'essai-a', mode: 'lettres',
  cartes: [{
    id: 'chat', mot: 'chat', lettres: ['c', 'h', 'a', 't'],
    cubes: [{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }],
    etats: [
      { lettres: 'c', fichier: 'audio/c.mp3' }, { lettres: 'ch', fichier: 'audio/ch.mp3' },
      { lettres: 'cha', fichier: 'audio/cha.mp3' }, { lettres: 'chat', fichier: 'audio/chat.mp3' }
    ]
  }, {
    id: 'maman', mot: 'maman', lettres: ['m', 'a', 'm', 'a', 'n'],
    cubes: [{ g: 'm', son: 'm' }, { g: 'a', son: 'a' }, { g: 'm', son: 'm' }, { g: 'an', son: 'an' }],
    etats: ['m', 'ma', 'mam', 'mama', 'maman'].map(l => ({ lettres: l, fichier: `audio/${l}.mp3` })),
    syllabes: [{ ipa: 'ma', fichier: 'audio/syl-ma.mp3', cubes: 2 }, { ipa: 'mɑ̃', fichier: 'audio/syl-man.mp3', cubes: 2 }]
  }]
};
const reponse = corps => async () => ({ ok: true, status: 200, json: async () => corps });

function monter(manifest = MANIFEST) {
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const jouerSerie = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: reponse(manifest), stockage, jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, jouerSerie, rng: () => 0.5,
    maintenant: () => '2026-11-13T10:00:00.000Z', hash: '#/jeu?pack=essai-a&mode=sans&intrus=0', base: '/' };
  const user = userEvent.setup();
  render(<App deps={deps} />);
  return { user, stockage, jouerFichier, jouerSerie };
}
async function commencer(user) {
  await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
}
const lettre = (user, l) => user.click(screen.getAllByRole('button', { name: l }).find(b => !b.disabled && b.className.includes('cube')));

describe('Mode A : lecture de ce qui est posé', () => {
  it('chaque lettre posée lit la chaîne posée jusque-là', async () => {
    const { user, jouerFichier } = monter();
    await commencer(user);
    await lettre(user, 'c'); await lettre(user, 'h'); await lettre(user, 'a');
    expect(jouerFichier.mock.calls.map(c => c[0])).toEqual(['/packs/essai-a/audio/c.mp3', '/packs/essai-a/audio/ch.mp3', '/packs/essai-a/audio/cha.mp3']);
  });

  it('chaîne hors du mot : pas de fichier joué, message honnête', async () => {
    const { user, jouerFichier } = monter();
    await commencer(user);
    await lettre(user, 'h');
    expect(jouerFichier).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Pas de son pour le moment.');
  });

  it('« Écouter » lit le mot entier (dernier état)', async () => {
    const { user, jouerFichier } = monter();
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3');
  });

  it('pack sans image : consigne écrite, aucun signalement d\'image', async () => {
    const { user } = monter();
    await commencer(user);
    expect(screen.getByText('Écouter le mot, puis le construire.')).toBeInTheDocument();
    expect(screen.queryByText(/Image introuvable/)).toBeNull();
  });

  it('mot juste : bravo et suivi en graphèmes-sons (ch, a, t)', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    for (const l of ['c', 'h', 'a', 't']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText('Bravo !')).toBeInTheDocument();
    const l = stockage.lire()[0];
    expect(l.juste).toBe(true);
    expect(l.positions).toEqual([
      { liaison: 'ch=ch', pose: 'ch', juste: true },
      { liaison: 'a=a', pose: 'a', juste: true },
      { liaison: 't=', pose: 't', juste: true }
    ]);
  });

  it('mot faux (c, a, h, t) : le suivi montre quelle liaison est fausse', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    for (const l of ['c', 'a', 'h', 't']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Pas tout à fait/)).toBeInTheDocument();
    const l = stockage.lire()[0];
    expect(l.juste).toBe(false);
    expect(l.positions.map(p => p.juste)).toEqual([false, false, true]);
  });

  it('carte avec une image rangée dans un sous-dossier : l’adresse de l’image garde la barre', async () => {
    const avecImage = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png' }] };
    const { user } = monter(avecImage);
    await commencer(user);
    const img = screen.getByAltText('Image du mot à écrire');
    expect(img.getAttribute('src')).toBe('/packs/essai-a/images/chat.png');
  });

  it('mention IA : image générée par IA et voix de synthèse signalées', async () => {
    const ia = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png', licence: 'Image générée par IA (Canva), usage scolaire' }] };
    const { user } = monter(ia);
    await commencer(user);
    expect(screen.getByText(/Image créée par une IA\. Voix de synthèse \(Microsoft Azure\)\./)).toBeInTheDocument();
  });

  it('pack sans image : seule la mention de voix de synthèse', async () => {
    const { user } = monter();
    await commencer(user);
    expect(screen.getByText('Voix de synthèse (Microsoft Azure).')).toBeInTheDocument();
  });

  it('mot d’une seule syllabe : pas de bouton « Écouter par syllabes »', async () => {
    const { user } = monter();
    await commencer(user);
    expect(screen.queryByRole('button', { name: /par syllabes/ })).toBeNull();
  });

  it('mot de deux syllabes : le bouton joue les syllabes en série avec les réglages de JF (500 ms, dernière syllabe à 75 %)', async () => {
    const { user, jouerSerie, jouerFichier } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] });
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /Écouter le mot par syllabes/ }));
    expect(jouerSerie).toHaveBeenCalledTimes(1);
    expect(jouerSerie).toHaveBeenCalledWith(['/packs/essai-a/audio/syl-ma.mp3', '/packs/essai-a/audio/syl-man.mp3'], expect.objectContaining({ pauseMs: 500, vitesseDerniere: 0.75 }));
    expect(jouerFichier).not.toHaveBeenCalled();
  });

  it('écoute par syllabes : la syllabe lue est surlignée, un trait marque la coupure, rien de tout cela hors écoute', async () => {
    const { user, jouerSerie } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] });
    const vues = [];
    jouerSerie.mockImplementation(async (urls, o) => {
      for (const i of [0, 1]) { o.onDebut(i); await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); vues.push(document.querySelectorAll('.zone .syl-active').length + '/' + document.querySelectorAll('.zone .cesure').length + '/' + (document.querySelector('.regle-coupure') ? 'regle' : '')); }
      o.onDebut(null);
      return { manquants: [] };
    });
    await commencer(user);
    for (const l of ['m', 'a', 'm']) await lettre(user, l);
    expect(document.querySelectorAll('.zone .cesure').length).toBe(0);
    await user.click(screen.getByRole('button', { name: /par syllabes/ }));
    expect(vues).toEqual(['2/1/regle', '3/1/regle']); // « ma » : 2 lettres posées surlignées ; « man » : la lettre posée (m) + 2 cases vides
    expect(document.querySelectorAll('.zone .syl-active').length).toBe(0);
    expect(document.querySelectorAll('.zone .cesure').length).toBe(0);
    expect(document.querySelector('.regle-coupure')).toBeNull();
  });

  it('écoute par syllabes sans le nombre de cubes dans le manifeste (ancien pack) : lecture normale, pas de surlignage', async () => {
    const ancien = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[1], syllabes: MANIFEST.cartes[1].syllabes.map(({ ipa, fichier }) => ({ ipa, fichier })) }] };
    const { user, jouerSerie } = monter(ancien);
    jouerSerie.mockImplementation(async (urls, o) => { o.onDebut(0); await new Promise(r => setTimeout(r, 0)); expect(document.querySelectorAll('.zone .syl-active').length).toBe(0); return { manquants: [] }; });
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /par syllabes/ }));
    expect(jouerSerie).toHaveBeenCalledTimes(1);
  });

  it('syllabes dont un fichier manque : message « Pas de son pour le moment »', async () => {
    const { user, jouerSerie } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] });
    jouerSerie.mockResolvedValueOnce({ manquants: ['/packs/essai-a/audio/syl-man.mp3'] });
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /par syllabes/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Pas de son pour le moment.');
  });

  it('accueil sans lien : les packs publiés sont proposés dans une liste (packs personnels exclus), plus de nom à taper', async () => {
    const index = [{ id: 'p1-20-images', label: '20 mots de P1 avec images', visibilite: 'commun' }, { id: 'demo', label: 'Pack d’essai' }, { id: 'perso', label: 'Pack personnel', visibilite: 'prive' }];
    const deps = { fetch: reponse(index), stockage: stockageMemoire(), jouerSons: vi.fn(), rng: () => 0.5, maintenant: () => '2026-11-14T10:00:00.000Z', hash: '', base: '/' };
    render(<App deps={deps} />);
    await screen.findByRole('option', { name: 'Pack d’essai' });
    const liste = screen.getByLabelText('Pack de cartes');
    expect(liste.tagName).toBe('SELECT');
    expect([...liste.options].map(o => o.textContent)).toEqual(['Choisir un pack', '20 mots de P1 avec images', 'Pack d’essai']);
  });
});
