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

function monter(manifest = MANIFEST, plusHash = '') {
  const stockage = stockageMemoire();
  const jouerFichier = vi.fn(async () => ({ manquants: [] }));
  const jouerSerie = vi.fn(async () => ({ manquants: [] }));
  const deps = { fetch: reponse(manifest), stockage, jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier, jouerSerie, rng: () => 0.5,
    maintenant: () => '2026-11-13T10:00:00.000Z', hash: `#/jeu?pack=essai-a&mode=sans&intrus=0&digraphes=0${plusHash}`, base: '/' };
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

  it('carte avec une image rangée dans un sous-dossier : cachée au départ, « Voir l’image » l’affiche, l’adresse garde la barre', async () => {
    const avecImage = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png' }] };
    const { user } = monter(avecImage);
    await commencer(user);
    expect(screen.queryByAltText('Image du mot à écrire')).toBeNull();
    expect(screen.getByText('Écouter le mot, puis le construire.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir l’image' }));
    const img = screen.getByAltText('Image du mot à écrire');
    expect(img.getAttribute('src')).toBe('/packs/essai-a/images/chat.png');
  });

  it('« Cacher l’image » la remet de côté', async () => {
    const avecImage = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png' }] };
    const { user } = monter(avecImage);
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Voir l’image' }));
    await user.click(screen.getByRole('button', { name: 'Cacher l’image' }));
    expect(screen.queryByAltText('Image du mot à écrire')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voir l’image' })).toBeInTheDocument();
  });

  it('pack sans image : aucun bouton image', async () => {
    const { user } = monter();
    await commencer(user);
    expect(screen.queryByRole('button', { name: /l’image/ })).toBeNull();
  });

  it('mention IA : image générée par IA signalée seulement quand l’image est montrée, voix de synthèse toujours', async () => {
    const ia = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png', licence: 'Image générée par IA (Canva), usage scolaire' }] };
    const { user } = monter(ia);
    await commencer(user);
    expect(screen.getByText('Voix de synthèse (Microsoft Azure).')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir l’image' }));
    expect(screen.getByText(/Image créée par une IA\. Voix de synthèse \(Microsoft Azure\)\./)).toBeInTheDocument();
  });

  it('pack sans image : seule la mention de voix de synthèse', async () => {
    const { user } = monter();
    await commencer(user);
    expect(screen.getByText('Voix de synthèse (Microsoft Azure).')).toBeInTheDocument();
  });

  it('vitesse de la voix : boutons visibles par défaut, départ à normale ; « Lente » ralentit « Écouter » à 0,75 ; l’écoute par syllabes garde ses valeurs', async () => {
    const { user, jouerFichier } = monter();
    await commencer(user);
    expect(screen.queryByRole('button', { name: 'Lente' })).toBeNull(); // replié par défaut
    await user.click(screen.getByRole('button', { name: /Vitesse de la voix : Normale/ }));
    expect(screen.getByRole('button', { name: 'Normale' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3');
    await user.click(screen.getByRole('button', { name: 'Lente' }));
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3', { vitesse: 0.75 });
    await user.click(screen.getByRole('button', { name: 'Très lente' }));
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3', { vitesse: 0.5 });
  });

  it('vitesse de la voix : la tâche donne la vitesse de départ, boutons encore là sans verrou', async () => {
    const { user, jouerFichier } = monter(MANIFEST, '&vitesse=50');
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /Vitesse de la voix : Très lente/ }));
    expect(screen.getByRole('button', { name: 'Très lente' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3', { vitesse: 0.5 });
  });

  it('vitesse de la voix verrouillée : pas de boutons, tous entendent la vitesse de la tâche', async () => {
    const { user, jouerFichier } = monter(MANIFEST, '&vitesse=75&verrou=1');
    await commencer(user);
    expect(screen.queryByRole('group', { name: 'Vitesse de la voix' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Vitesse de la voix/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/chat.mp3', { vitesse: 0.75 });
  });

  it('vitesse lente : « Écouter par syllabes » ne reçoit pas la vitesse (valeurs de JF inchangées)', async () => {
    const { user, jouerSerie } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] }, '&vitesse=50');
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /Écouter le mot par syllabes/ }));
    expect(jouerSerie).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ pauseMs: 500, vitesseDerniere: 0.75 }));
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

  it('écoute par syllabes : la syllabe lue est surlignée, un trait marque la coupure ; à la fin, la césure reste jusqu’au bouton « Masquer les césures »', async () => {
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
    // à la fin de l'écoute : plus de surlignage, mais la césure et la règle RESTENT jusqu'au bouton « Masquer les césures »
    expect(document.querySelectorAll('.zone .syl-active').length).toBe(0);
    expect(document.querySelectorAll('.zone .cesure').length).toBe(1);
    expect(document.querySelector('.regle-coupure')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Masquer les césures' }));
    expect(document.querySelectorAll('.zone .cesure').length).toBe(0);
    expect(document.querySelector('.regle-coupure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Masquer les césures' })).toBeNull();
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
    const deps = { fetch: reponse(index), stockage: stockageMemoire(), jouerSons: vi.fn(), rng: () => 0.5, maintenant: () => '2026-11-14T10:00:00.000Z', hash: '#/eleve', base: '/' };
    render(<App deps={deps} />);
    await screen.findByRole('option', { name: 'Pack d’essai' });
    const liste = screen.getByLabelText('Liste de mots');
    expect(liste.tagName).toBe('SELECT');
    expect([...liste.options].map(o => o.textContent)).toEqual(['Choisir une liste', '20 mots de P1 avec images', 'Pack d’essai']);
  });

  it('accueil : un pack venu d’un lien mais absent de la liste publique reste affiché comme choisi', async () => {
    const index = [{ id: 'p1-20-images', label: '20 mots de P1 avec images', visibilite: 'commun' }];
    const deps = { fetch: reponse(index), stockage: stockageMemoire(), jouerSons: vi.fn(), rng: () => 0.5, maintenant: () => '2026-11-14T10:00:00.000Z', hash: '#/carte/p1-illustre-2/oiseau', base: '/' };
    render(<App deps={deps} />);
    await screen.findByRole('option', { name: '20 mots de P1 avec images' });
    const liste = screen.getByLabelText('Liste de mots');
    expect(liste.value).toBe('p1-illustre-2');
    expect([...liste.options].map(o => o.textContent)).toContain('p1-illustre-2 (liste ouverte par lien)');
  });

  it('accueil : un pack choisi donne un lien et son QR-code, sans clic', async () => {
    const index = [{ id: 'p1-20-images', label: '20 mots de P1 avec images', visibilite: 'commun' }];
    const deps = { fetch: reponse(index), stockage: stockageMemoire(), jouerSons: vi.fn(), rng: () => 0.5, maintenant: () => '2026-11-14T10:00:00.000Z', hash: '#/lien', base: '/' };
    render(<App deps={deps} />);
    await screen.findByRole('option', { name: '20 mots de P1 avec images' });
    expect(screen.queryByAltText('QR-code du lien de la tâche')).toBeNull();
    await userEvent.setup().selectOptions(screen.getByLabelText('Liste de mots'), 'p1-20-images');
    const img = await screen.findByAltText('QR-code du lien de la tâche');
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });

  it('réglage syllabes « non » : jamais de bouton, même pour un mot de deux syllabes', async () => {
    const { user } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] }, '&syllabes=non');
    await commencer(user);
    expect(screen.queryByRole('button', { name: /par syllabes/ })).toBeNull();
  });

  it('réglage syllabes « aide » : pas de bouton au départ, il apparaît après un clic sur « Besoin d’aide ? »', async () => {
    const { user } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] }, '&syllabes=aide');
    await commencer(user);
    expect(screen.queryByRole('button', { name: /par syllabes/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Besoin d.aide/ }));
    expect(screen.getByRole('button', { name: /par syllabes/ })).toBeInTheDocument();
  });

  it('réglage syllabes « aide » : le bouton apparaît aussi après une erreur sur la carte', async () => {
    const { user } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] }, '&syllabes=aide');
    await commencer(user);
    for (const l of ['n', 'm', 'a', 'm', 'a']) await lettre(user, l);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Pas tout à fait/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /par syllabes/ })).toBeInTheDocument();
  });

  it('réglage syllabes « toujours » (par défaut) : le bouton est là dès le départ', async () => {
    const { user } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] });
    await commencer(user);
    expect(screen.getByRole('button', { name: /par syllabes/ })).toBeInTheDocument();
  });

  it('phrase explicative : sous le bouton pour un mot à syllabes, « une seule syllabe » pour un mot court, rien avec « non »', async () => {
    const { user } = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] });
    await commencer(user);
    expect(screen.getByText(/la voix dit une syllabe après l’autre/)).toBeInTheDocument();
    cleanup();
    const court = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], syllabes: [{ ipa: 'ʃa', fichier: 'audio/sha.mp3', cubes: 3 }] }] };
    const m2 = monter(court);
    await commencer(m2.user);
    expect(screen.getByText(/Ce mot n’a qu’une syllabe/)).toBeInTheDocument();
    cleanup();
    const m3 = monter({ ...MANIFEST, cartes: [MANIFEST.cartes[1]] }, '&syllabes=non');
    await commencer(m3.user);
    expect(document.querySelector('.aide-syllabes')).toBeNull();
  });

  it('phrase audio d’aide : bouton seulement si la carte a une phrase, lit le fichier, sans afficher le texte', async () => {
    const avecPhrase = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], phrase: 'Le chat dort sur le lit.', phraseAudio: 'audio/phrase-chat.mp3' }] };
    const { user, jouerFichier } = monter(avecPhrase);
    await commencer(user);
    await user.click(screen.getByRole('button', { name: /Écouter le mot dans une phrase/ }));
    expect(jouerFichier).toHaveBeenLastCalledWith('/packs/essai-a/audio/phrase-chat.mp3');
    expect(screen.queryByText(/Le chat dort/)).toBeNull();
    cleanup();
    const sans = monter();
    await commencer(sans.user);
    expect(screen.queryByRole('button', { name: /dans une phrase/ })).toBeNull();
  });
});

describe('Mode A : la couleur grise suit la place, pas la pièce', () => {
  const ELLE = {
    nom: 'essai-a', mode: 'lettres',
    cartes: [{
      id: 'elle', mot: 'elle', lettres: ['e', 'l', 'l', 'e'],
      cubes: [{ g: 'e', son: 'ɛ' }, { g: 'l', son: 'l' }, { g: 'l', son: 'l' }, { g: 'e', son: '' }],
      etats: ['e', 'el', 'ell', 'elle'].map(l => ({ lettres: l, fichier: `audio/${l}.mp3` }))
    }]
  };
  it('le « e » grisé du plateau, posé en première place, devient normal ; le « e » posé en dernière place est gris', async () => {
    const { user } = monter(ELLE);
    await commencer(user);
    const plateau = () => screen.getAllByRole('button', { name: 'e' }).filter(b => !b.disabled && b.className.includes('cube'));
    const grise = plateau().find(b => b.className.split(' ').includes('m'));
    expect(grise).toBeTruthy(); // sur le plateau, le « e » muet est grisé (réglage « origine »)
    await user.click(grise);
    const posee = screen.getByRole('button', { name: 'Retirer e' });
    expect(posee.className.split(' ')).not.toContain('m'); // 1re place : le « e » se dit, il n'est pas gris
    await lettre(user, 'l'); await lettre(user, 'l'); await lettre(user, 'e');
    const poseesE = screen.getAllByRole('button', { name: 'Retirer e' });
    expect(poseesE[poseesE.length - 1].className.split(' ')).toContain('m'); // dernière place : muet, gris
  });
});

describe('Guidage par étapes et pièces verrouillées (2026-11-23)', () => {
  const guides = () => [...document.querySelectorAll('button.guide')].map(b => b.textContent.trim());

  it('un seul bouton agrandi à la fois : Écouter, puis Vérifier quand les cases sont pleines, puis Suivant', async () => {
    const { user } = monter();
    await commencer(user);
    expect(guides()).toEqual(['Écouter']);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(guides()).toEqual([]);
    await lettre(user, 'c'); await lettre(user, 'h'); await lettre(user, 'a');
    expect(guides()).toEqual([]);
    await lettre(user, 't');
    expect(guides()).toEqual(['Vérifier']);
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(guides()).toEqual(['Suivant']);
  });

  it('erreur : les pièces justes de gauche à droite restent verrouillées, Écouter regrandit, puis la correction aboutit', async () => {
    const { user } = monter();
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    await lettre(user, 'c'); await lettre(user, 'h'); await lettre(user, 't'); await lettre(user, 'a'); // c, h justes ; t à la place de a : faux
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Pas tout à fait/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'c : juste, verrouillé' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'h : juste, verrouillé' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Retirer t$/ })).toBeNull(); // le t fautif est retourné au bac
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeDisabled(); // rien à retirer hors des pièces verrouillées
    expect(screen.getByRole('button', { name: 'Tout effacer' })).toBeDisabled();
    expect(guides()).toEqual(['Écouter']);
    await lettre(user, 'a'); await lettre(user, 't');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(guides()).toEqual(['Suivant']);
  });
});

describe('Mesure d’usage de « Voir l’image » (2026-11-23)', () => {
  const avecImage = { ...MANIFEST, cartes: [{ ...MANIFEST.cartes[0], image_sans_mot: 'images/chat.png' }] };
  const verifierMot = async (user, mot) => { for (const l of mot) await lettre(user, l); await user.click(screen.getByRole('button', { name: 'Vérifier' })); };

  it('image proposée mais jamais ouverte : « non_vue »', async () => {
    const { user, stockage } = monter(avecImage);
    await commencer(user);
    await verifierMot(user, ['c', 'h', 'a', 't']);
    expect(stockage.lire().map(l => l.image)).toEqual(['non_vue']);
  });

  it('image ouverte puis recachée avant l’essai : « vue » (l’ouverture est gardée pour la carte)', async () => {
    const { user, stockage } = monter(avecImage);
    await commencer(user);
    await user.click(screen.getByRole('button', { name: 'Voir l’image' }));
    await user.click(screen.getByRole('button', { name: 'Cacher l’image' }));
    await verifierMot(user, ['c', 'h', 'a', 't']);
    expect(stockage.lire().map(l => l.image)).toEqual(['vue']);
  });

  it('ouverte après une première erreur : « non_vue » puis « vue » sur les essais suivants', async () => {
    const { user, stockage } = monter(avecImage);
    await commencer(user);
    await verifierMot(user, ['c', 'a', 'h', 't']); // faux : c reste verrouillé
    await user.click(screen.getByRole('button', { name: 'Voir l’image' }));
    await verifierMot(user, ['h', 'a', 't']);
    expect(stockage.lire().map(l => [l.tentative, l.juste, l.image])).toEqual([[1, false, 'non_vue'], [2, true, 'vue']]);
  });

  it('pack sans image : « sans »', async () => {
    const { user, stockage } = monter();
    await commencer(user);
    await verifierMot(user, ['c', 'h', 'a', 't']);
    expect(stockage.lire().map(l => l.image)).toEqual(['sans']);
  });

  it('l’accueil résume l’usage sur l’appareil, rien si aucune carte n’avait d’image', async () => {
    const ligne = (carte, tentative, image) => ({ session: 's1', carte, tentative, image, juste: true, positions: [] });
    const stockage = stockageMemoire();
    [ligne('a', 1, 'vue'), ligne('b', 1, 'non_vue'), ligne('b', 2, 'vue'), ligne('c', 1, 'non_vue'), ligne('d', 1, 'sans')].forEach(l => stockage.ajouter(l));
    const deps = { fetch: reponse(MANIFEST), stockage, jouerSons: vi.fn(async () => ({ manquants: [] })), jouerFichier: vi.fn(async () => ({ manquants: [] })), jouerSerie: vi.fn(async () => ({ manquants: [] })),
      rng: () => 0.5, maintenant: () => '2026-11-13T10:00:00.000Z', hash: '#/jeu?pack=essai-a&mode=sans&intrus=0&digraphes=0', base: '/' };
    render(<App deps={deps} />);
    expect(await screen.findByTestId('usage-image')).toHaveTextContent('Image proposée sur 3 carte(s) : ouverte avant le premier essai sur 1, après une erreur sur 1, jamais sur 1.');
    cleanup();
    const vide = stockageMemoire();
    vide.ajouter(ligne('d', 1, 'sans'));
    render(<App deps={{ ...deps, stockage: vide }} />);
    await screen.findByText(/essai\(s\) enregistré\(s\)/);
    expect(screen.queryByTestId('usage-image')).toBeNull();
  });
});

