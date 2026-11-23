import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stockageMemoire } from '../../src/jeu/essais.js';
import App from '../../src/app/App.jsx';
import { consignesActives, urlConsigne, choisirVariante, variantesConsigne } from '../../src/app/consignes.js';

afterEach(cleanup);

const MANIFEST = {
  nom: 'essai-a', mode: 'lettres',
  cartes: [{
    id: 'chat', mot: 'chat', lettres: ['c', 'h', 'a', 't'],
    cubes: [{ g: 'ch', son: 'ch' }, { g: 'a', son: 'a' }, { g: 't', son: '' }],
    etats: ['c', 'ch', 'cha', 'chat'].map(l => ({ lettres: l, fichier: `audio/${l}.mp3` }))
  }]
};

function monter(plusHash, manquants = []) {
  const jouerFichier = vi.fn(async url => ({ manquants: manquants.includes(url) ? [url] : [] }));
  const deps = { fetch: async () => ({ ok: true, status: 200, json: async () => MANIFEST }), stockage: stockageMemoire(), jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier,
    jouerSerie: vi.fn(async () => ({ manquants: [] })), rng: () => 0.5, maintenant: () => '2026-11-21T10:00:00.000Z', hash: `#/jeu?pack=essai-a&mode=sans&intrus=0&digraphes=0${plusHash}`, base: '/' };
  const user = userEvent.setup();
  render(<App deps={deps} />);
  return { user, jouerFichier };
}
async function commencer(user) {
  await user.type(screen.getByLabelText(/Code de l.élève/), 'E07');
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  await screen.findByRole('group', { name: 'Mot à construire' });
}
const lettre = (user, l) => user.click(screen.getAllByRole('button', { name: l }).find(b => !b.disabled && b.className.includes('cube')));
const urls = f => f.mock.calls.map(c => c[0]);

describe('consignes vocales', () => {
  it('réglage : automatique = oui seulement avec les commandes épurées ; « voix » et « non » forcent', () => {
    expect(consignesActives({})).toBe(false);
    expect(consignesActives({ commandes: 'epure' })).toBe(true);
    expect(consignesActives({ commandes: 'epure', consignes: 'non' })).toBe(false);
    expect(consignesActives({ commandes: 'complet', consignes: 'voix' })).toBe(true);
    expect(urlConsigne('https://x.test/', 'juste')).toBe('https://x.test/consignes/juste.mp3');
  });

  it('sans réglage : aucune consigne jouée', async () => {
    const { user, jouerFichier } = monter('');
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(urls(jouerFichier).some(u => u.includes('/consignes/'))).toBe(false);
  });

  it('consignes=voix : consigne de départ, puis « incomplet », « faux » et « juste » au bon moment', async () => {
    const { user, jouerFichier } = monter('&consignes=voix');
    await commencer(user);
    await waitFor(() => expect(urls(jouerFichier)).toContain('/consignes/debut.mp3'));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(urls(jouerFichier).at(-1)).toBe('/consignes/incomplet.mp3');
    for (const l of ['c', 'a', 'h', 't']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(urls(jouerFichier).at(-1)).toMatch(/^\/consignes\/faux(_\d)?\.mp3$/);
    // Après la consigne d'erreur : pause, puis le mot est rejoué (état final de la carte).
    await waitFor(() => expect(urls(jouerFichier).at(-1)).toBe('/packs/essai-a/audio/chat.mp3'), { timeout: 3000 });
    // Option B (2026-11-23) : le c, juste, reste verrouillé ; les autres pièces retournent au bac.
    expect(screen.getByRole('button', { name: 'Tout effacer' })).toBeDisabled();
    for (const l of ['h', 'a', 't']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(urls(jouerFichier).at(-1)).toMatch(/^\/consignes\/juste(_\d)?\.mp3$/);
  });

  it('un geste de l’élève pendant la pause annule le rejeu du mot', async () => {
    const { user, jouerFichier } = monter('&consignes=voix');
    await commencer(user);
    for (const l of ['c', 'a', 'h', 't']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    await waitFor(() => expect(urls(jouerFichier).some(u => /faux/.test(u))).toBe(true));
    await lettre(user, 'h'); // geste : la pause de 700 ms ne doit plus rejouer le mot
    await new Promise(r => setTimeout(r, 1000));
    expect(urls(jouerFichier).filter(u => u === '/packs/essai-a/audio/chat.mp3')).toHaveLength(0);
  });

  it('variantes : jamais la même deux fois de suite, toutes atteignables', () => {
    expect(variantesConsigne('juste')).toEqual(['juste', 'juste_2', 'juste_3', 'juste_4', 'juste_5']);
    expect(variantesConsigne('faux')).toEqual(['faux', 'faux_2', 'faux_3']);
    let d; const vus = new Set();
    for (let i = 0; i < 40; i++) { const v = choisirVariante('juste', d, () => (i * 0.137) % 1); expect(v).not.toBe(d); vus.add(v); d = v; }
    expect(vus.size).toBe(5);
    expect(choisirVariante('inconnue', undefined, () => 0.5)).toBe('inconnue');
  });

  it('fichier de consigne absent : aucun message « Pas de son » devant l\'élève', async () => {
    const { user } = monter('&consignes=voix', ['/consignes/incomplet.mp3', '/consignes/debut.mp3']);
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.queryByText('Pas de son pour le moment.')).toBeNull();
  });

  it('commandes épurées : consigne de départ puis lecture du mot (dans cet ordre)', async () => {
    const { user, jouerFichier } = monter('&commandes=epure');
    await commencer(user);
    // Silence de 1,5 s entre la consigne et le mot : le mot ne suit pas immédiatement.
    await waitFor(() => expect(urls(jouerFichier)).toEqual(['/consignes/debut.mp3']));
    await waitFor(() => expect(urls(jouerFichier)).toEqual(['/consignes/debut.mp3', '/packs/essai-a/audio/chat.mp3']), { timeout: 3000 });
  });
});
