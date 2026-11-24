import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fiches from '../../public/mots/fiches.json';
import modeles from '../../public/mots/modeles.json';
import { stockageMemoire } from '../../src/jeu/essais.js';
import { lettreInitiale, VOYELLES_INITIALE } from '../../src/core/voyellesInitiale.js';
import App from '../../src/app/App.jsx';

afterEach(cleanup);

const graine = (g = 1) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const reponse = corps => ({ ok: true, status: 200, json: async () => corps });
const servir = async url => reponse(url.endsWith('/mots/fiches.json') ? fiches : url.endsWith('/mots/modeles.json') ? modeles : null);

function monter(hash) {
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: servir, stockage, jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, rng: graine(7), maintenant: () => '2026-11-24T10:00:00.000Z', hash, base: '/' };
  return { user: userEvent.setup(), stockage, jouerFichier, ...render(<App deps={deps} />) };
}
const LIEN = '#/jeu?pack=maternelle-initiale&niveau=maternelle&e=E07';
const commencer = async user => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
};
// Le mot affiché est repéré par le nom de fichier de son image (le mot n'est jamais écrit à l'élève).
const carteCourante = () => { const m = document.querySelector('.carte-jeu img').getAttribute('src').match(/images\/(.+)\.png$/); return fiches.find(f => f.id === decodeURIComponent(m[1])); };

describe('Maternelle : exercice « première lettre »', () => {
  it('le modèle publié ne contient que des mots utilisables (voyelle seule en première lettre, image)', () => {
    const m = modeles.find(x => x.id === 'maternelle-initiale');
    expect(m.niveau).toBe('maternelle');
    for (const id of m.mots) { const f = fiches.find(x => x.id === id); expect(lettreInitiale(f), id).not.toBeNull(); expect(f.image_sans_mot, id).toBeTruthy(); }
  });

  it('trois lettres majuscules, le mot est dit à l’arrivée, le mot n’est pas écrit', async () => {
    const { user, jouerFichier } = monter(LIEN);
    await commencer(user);
    expect(document.querySelector('main.jeu').className).toContain('jeu-maj');
    expect(screen.getAllByRole('button', { name: /^Lettre / })).toHaveLength(3);
    const c = carteCourante();
    expect(screen.queryByText(c.mot)).toBeNull();
    await waitFor(() => expect(jouerFichier).toHaveBeenCalled());
    expect(jouerFichier.mock.calls[0][0]).toBe(`/mots/${c.etats.at(-1).fichier}`);
  });

  it('consignes=non : pas de « Bravo » vocal, la lettre puis le mot seulement', async () => {
    const { user, jouerFichier } = monter(`${LIEN}&consignes=non`);
    await commencer(user);
    const c = carteCourante(); const cible = lettreInitiale(c);
    jouerFichier.mockClear();
    await user.click(screen.getByRole('button', { name: `Lettre ${cible}` }));
    await waitFor(() => expect(jouerFichier.mock.calls.map(x => x[0])).toEqual([`/mots/${VOYELLES_INITIALE[cible].fichier}`, `/mots/${c.etats.at(-1).fichier}`]));
  });

  it('bonne lettre : « Bravo », le son de la lettre puis le mot, un essai juste enregistré', async () => {
    const { user, jouerFichier, stockage } = monter(LIEN);
    await commencer(user);
    const c = carteCourante(); const cible = lettreInitiale(c);
    jouerFichier.mockClear();
    await user.click(screen.getByRole('button', { name: `Lettre ${cible}` }));
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
    await waitFor(() => expect(jouerFichier.mock.calls.map(x => x[0])).toEqual([expect.stringMatching(/^\/consignes\/juste(_\d)?\.mp3$/), `/mots/${VOYELLES_INITIALE[cible].fichier}`, `/mots/${c.etats.at(-1).fichier}`]));
    const essais = stockage.lire();
    expect(essais).toHaveLength(1);
    expect(essais[0]).toMatchObject({ carte: c.id, juste: true, tentative: 1, exercice: 'initiale', code: 'CLASSE', positions: [{ pose: cible, juste: true }] }); // mode classe (défaut de la maternelle) : code « CLASSE »
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('mauvaise lettre : son de la lettre, message vocal « faux », puis le mot rejoué, à la vitesse choisie', async () => {
    const { user, jouerFichier } = monter(`${LIEN}&vitesse=75`);
    await commencer(user);
    const c = carteCourante(); const cible = lettreInitiale(c);
    const fausse = screen.getAllByRole('button', { name: /^Lettre / }).find(b => b.getAttribute('aria-label') !== `Lettre ${cible}`);
    const v = fausse.getAttribute('aria-label').replace('Lettre ', '');
    jouerFichier.mockClear();
    await user.click(fausse);
    await waitFor(() => expect(jouerFichier.mock.calls.map(x => x[0])).toEqual([`/mots/${VOYELLES_INITIALE[v].fichier}`, expect.stringMatching(/^\/consignes\/faux(_\d)?\.mp3$/), `/mots/${c.etats.at(-1).fichier}`]), { timeout: 3000 });
    expect(jouerFichier.mock.calls[1][1]).toEqual({ vitesse: 0.75 }); // le message est dit à la vitesse de la voix choisie
  });

  it('deux mauvaises lettres : elles se grisent, la bonne n’est pas révélée, l’élève la choisit lui-même (essai 3)', async () => {
    const { user, stockage } = monter(LIEN);
    await commencer(user);
    const cible = lettreInitiale(carteCourante());
    const fausses = screen.getAllByRole('button', { name: /^Lettre / }).filter(b => b.getAttribute('aria-label') !== `Lettre ${cible}`);
    await user.click(fausses[0]);
    expect(fausses[0]).toBeDisabled();
    expect(screen.getByText(/Essayer encore/)).toBeInTheDocument();
    await user.click(fausses[1]);
    expect(screen.queryByText(/C’est cette lettre/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
    const bonne = screen.getByRole('button', { name: `Lettre ${cible}` });
    expect(bonne).toBeEnabled();
    expect(bonne).toHaveAttribute('aria-pressed', 'false');
    await user.click(bonne);
    expect(screen.getByText(/Bravo/)).toBeInTheDocument();
    expect(stockage.lire().map(l => [l.tentative, l.juste])).toEqual([[1, false], [2, false], [3, true]]);
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('réussite : fête en grand (grande étoile, gros confettis)', async () => {
    const { user } = monter(LIEN);
    await commencer(user);
    await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(carteCourante())}` }));
    expect(document.querySelector('.bravo-grand .etoile-grande')).not.toBeNull();
    expect(document.querySelectorAll('.confettis-grands .conf').length).toBeGreaterThanOrEqual(24);
  });

  it('l’ordre des mots change d’un départ à l’autre (tirage au sort, pas toujours le même)', async () => {
    const premiers = new Set();
    for (let k = 1; k <= 12; k++) {
      const deps = { fetch: servir, stockage: stockageMemoire(), jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier: vi.fn(async () => ({ manquants: [] })), maintenant: () => '2026-11-24T10:00:00.000Z', hash: LIEN, base: '/' };
      const user = userEvent.setup();
      render(<App deps={deps} />);
      await commencer(user);
      premiers.add(carteCourante().id);
      cleanup();
    }
    expect(premiers.size).toBeGreaterThan(2);
  });

  it('jamais a avec é parmi les trois lettres, sur toutes les cartes de la liste', async () => {
    const { user } = monter(LIEN);
    await commencer(user);
    const nb = modeles.find(x => x.id === 'maternelle-initiale').mots.length;
    for (let k = 0; k < nb; k++) {
      const noms = screen.getAllByRole('button', { name: /^Lettre / }).map(b => b.getAttribute('aria-label'));
      expect(noms.includes('Lettre a') && noms.includes('Lettre é'), noms.join()).toBe(false);
      await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(carteCourante())}` }));
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
    }
    await screen.findByText(/Pack terminé/);
  });
});

describe('Maternelle : mode classe (TBI) et mode élèves', () => {
  it('mode classe (défaut) : aucun code demandé, Commencer actif dès que la liste est choisie, affichage agrandi', async () => {
    const { user } = monter('#/jeu?pack=maternelle-initiale&niveau=maternelle');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled());
    expect(screen.queryByLabelText(/Code de l’élève/)).toBeNull();
    expect(screen.getByRole('radio', { name: /Toute la classe, au tableau/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    expect(document.querySelector('main.jeu').className).toContain('jeu-classe');
  });

  it('mode élèves (classe=0) : le code est demandé et Commencer reste fermé sans code', async () => {
    const { user, stockage } = monter('#/jeu?pack=maternelle-initiale&niveau=maternelle&classe=0');
    await waitFor(() => expect(screen.getByLabelText(/Code de l’élève/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeDisabled();
    await user.type(screen.getByLabelText(/Code de l’élève/), 'E07');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await screen.findByRole('group', { name: 'Choisir la première lettre du mot' });
    expect(document.querySelector('main.jeu').className).not.toContain('jeu-classe');
    const c = carteCourante();
    await user.click(screen.getByRole('button', { name: `Lettre ${lettreInitiale(c)}` }));
    expect(stockage.lire()[0].code).toBe('E07');
  });

  it('on bascule entre « toute la classe » et « chaque élève » ; le lien rapide dit lequel', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeInTheDocument());
    expect(screen.queryByRole('radio', { name: /Toute la classe/ })).toBeNull(); // primaire : pas de choix « qui joue »
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    await user.selectOptions(screen.getByLabelText('Liste de mots'), 'maternelle-initiale');
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/classe=1/);
    await user.click(screen.getByRole('radio', { name: /Chaque élève/ }));
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/classe=0/);
  });
});

describe('Niveau choisi en premier', () => {
  it('maternelle : liste filtrée et options sans objet masquées ; primaire : tout est proposé', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Primaire/ })).toBeChecked());
    expect(screen.getByLabelText('Nombre de cubes en trop')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Maternelle : la première lettre/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeChecked();
    expect(screen.queryByLabelText('Nombre de cubes en trop')).toBeNull();
    expect(screen.queryByLabelText('Exiger les accents')).toBeNull();
    expect(screen.queryByLabelText('Lettre muette grisée')).toBeNull();
    expect(screen.getByLabelText('Lettres affichées')).toHaveValue('majuscules');
    expect(screen.getByRole('option', { name: /Maternelle : la première lettre/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /101 mots de P1/ })).toBeNull();
    await user.click(screen.getByRole('radio', { name: /Primaire/ }));
    expect(screen.getByLabelText('Nombre de cubes en trop')).toBeInTheDocument();
    expect(screen.getByLabelText('Lettres affichées')).toHaveValue('minuscules');
  });

  it('le lien rapide de maternelle contient niveau=maternelle et casse=majuscules', async () => {
    const { user } = monter('#/lien');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Maternelle/ })).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: /Maternelle/ }));
    await user.selectOptions(screen.getByLabelText('Liste de mots'), 'maternelle-initiale');
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/niveau=maternelle/);
    expect(screen.getByLabelText('Lien de la tâche').value).toMatch(/casse=majuscules/);
  });
});
