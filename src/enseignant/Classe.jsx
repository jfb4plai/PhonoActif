import React, { useCallback, useEffect, useRef, useState } from 'react';
import { REGLAGES_PAR_DEFAUT } from '../app/route.js';
import { fusionnerListes, validerTache, TACHE_MAX } from '../core/liste.js';
import { listerListes, supprimerListe, dupliquerListe } from './listes.js';
import ListeEditeur from './ListeEditeur.jsx';
import { libelleLiaison, syntheseClasse, SYMBOLES, NOMS_ETATS } from './liaison.js';
import {
  decouperCodes, creerCodesAuto, ajouterEleves, creerTache, listerTaches, resumeTache, revoquerTache, qrDeLien, resultats, inviter, supprimerEleve, liensEleves, nouvelleCleEleve
} from './api.js';

const ETAPES = [[1, 'Les mots'], [2, 'Les réglages'], [3, 'Créer']];
const PAS_DE_TACHE = { modeMot: REGLAGES_PAR_DEFAUT.modeMot, habillage: REGLAGES_PAR_DEFAUT.habillage, nbIntrus: REGLAGES_PAR_DEFAUT.nbIntrus, exigerAccents: REGLAGES_PAR_DEFAUT.exigerAccents, syllabes: REGLAGES_PAR_DEFAUT.syllabes, vitesse: REGLAGES_PAR_DEFAUT.vitesse, vitesseVerrou: REGLAGES_PAR_DEFAUT.vitesseVerrou, consignes: 'auto' };

export default function Classe({ client, userId, classe, base, catalogue = [], modeles = [], jouer, onRetour, onSupprimer }) {
  const master = classe.role === 'master';
  const [lignes, setLignes] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [prefixe, setPrefixe] = useState('E');
  const [nb, setNb] = useState(20);
  const [refuses, setRefuses] = useState([]);
  const [tache, setTache] = useState({ ...PAS_DE_TACHE });
  const [listes, setListes] = useState([]);     // listes de l'enseignant
  const [choix, setChoix] = useState([]);       // clés cochées, dans l'ordre : « l:<id> » (ma liste) ou « m:<id> » (modèle)
  const [editeur, setEditeur] = useState(null); // null | { liste } : éditeur de liste ouvert
  const catalogueIds = new Set(catalogue.map(e => e.id));
  const zonePerso = useRef(null);
  const zoneOnglets = useRef(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [onglet, setOnglet] = useState(null); // null = choix automatique : Résultats s'il y a des essais, sinon Élèves et codes
  const [etape, setEtape] = useState(0); // 0 = liste des tâches ; 1 à 3 = assistant « Nouvelle tâche »
  const [perso, setPerso] = useState(null); // liens personnels d'une tâche : { tache, items: [{ id, code, lien, qr }] }

  const recharger = useCallback(async () => {
    try { setLignes(await resultats(client, classe.id)); } catch (e) { setMessage(e.message); }
  }, [client, classe.id]);
  useEffect(() => { recharger(); }, [recharger]);
  const [taches, setTaches] = useState([]);
  const rechargerTaches = useCallback(async () => {
    try { setTaches(await listerTaches(client, classe.id, base)); } catch (e) { setMessage(e.message); }
  }, [client, classe.id, base]);
  useEffect(() => { rechargerTaches(); }, [rechargerTaches]);

  const rechargerListes = useCallback(async () => {
    try { setListes(await listerListes(client, userId)); } catch (e) { setMessage(e.message); }
  }, [client, userId]);
  useEffect(() => { rechargerListes(); }, [rechargerListes]);

  const agir = async fn => { setMessage(''); try { await fn(); } catch (e) { setMessage(e.message); } };

  const ajouter = () => agir(async () => {
    const r = await ajouterEleves(client, classe.id, decouperCodes(saisie));
    setRefuses(r.refuses); setSaisie('');
    setMessage(`${r.ajoutes.length} code(s) ajouté(s).`);
    await recharger();
  });
  const automatique = () => agir(async () => {
    const r = await creerCodesAuto(client, classe.id, prefixe, Number(nb));
    setRefuses(r.refuses);
    setMessage(`${r.ajoutes.length} code(s) ajouté(s).`);
    await recharger();
  });
  // Panneau des liens : les liens PERSONNELS des élèves d'abord (ce sont eux qui enregistrent les résultats) ; le lien général est replié dessous.
  const ouvrirPerso = async t => {
    const liens = await liensEleves(client, classe.id, t.jeton, base);
    const items = await Promise.all(liens.map(async l => ({ ...l, qr: await qrDeLien(l.lien) })));
    setPerso({ tache: t, items, general: { lien: t.lien, qr: await qrDeLien(t.lien) } });
  };
  // Sources cochées (mes listes ou modèles), dans l'ordre du clic ; les mots sont fusionnés sans doublon (révision).
  const sources = choix.map(cle => {
    const [genre, id] = [cle.slice(0, 1), cle.slice(2)];
    if (genre === 'l') { const l = listes.find(x => x.id === id); return l ? { nom: l.nom, mots: l.mots.filter(m => catalogueIds.has(m)) } : null; }
    const m = modeles.find(x => x.id === id);
    return m ? { nom: m.titre, mots: m.mots } : null;
  }).filter(Boolean);
  const motsTache = fusionnerListes(sources.map(x => x.mots));
  const nomsTache = sources.map(x => x.nom).join(' + ');
  const erreurTache = motsTache.length > 0 ? validerTache(motsTache).erreurs[0] : '';
  const basculerChoix = cle => setChoix(c => (c.includes(cle) ? c.filter(x => x !== cle) : [...c, cle]));
  const creer = () => agir(async () => {
    const t = await creerTache(client, classe.id, { ...tache, mots: motsTache, listesNoms: nomsTache }, userId, base);
    await rechargerTaches();
    await ouvrirPerso({ ...t, pack: nomsTache, resume: resumeTache(tache) });   // les liens des élèves s'affichent tout de suite, seuls
    setEtape(0);
  });
  const ouvrirAssistant = () => { setMessage(''); setChoix([]); setTache({ ...PAS_DE_TACHE }); setEditeur(null); setEtape(1); };
  const quitterAssistant = () => { setEditeur(null); setEtape(0); };
  const apresEnregistrement = async l => { setEditeur(null); await rechargerListes(); setChoix(c => (c.includes(`l:${l.id}`) ? c : [...c, `l:${l.id}`])); setMessage(`Liste « ${l.nom} » enregistrée.`); };
  const retirerListe = l => agir(async () => { if (!window.confirm(`Supprimer la liste « ${l.nom} » ? Les tâches déjà données gardent leurs mots.`)) return; await supprimerListe(client, l.id); setChoix(c => c.filter(x => x !== `l:${l.id}`)); await rechargerListes(); });
  const copierListe = l => agir(async () => { await dupliquerListe(client, userId, l, { catalogueIds }); await rechargerListes(); });
  const ouvrirDepuisListe = t => agir(() => ouvrirPerso({ ...t, resume: resumeTache(t) }));
  // à chaque changement d'étape ou d'écran, remonter en haut de l'onglet : l'enseignant voit toujours « Étape n sur 3 » et le bouton retour
  useEffect(() => { if (zoneOnglets.current && zoneOnglets.current.scrollIntoView && (etape || perso)) zoneOnglets.current.scrollIntoView({ block: 'start' }); }, [etape, !!perso]); // eslint-disable-line react-hooks/exhaustive-deps
  const changerCle = (t, id) => agir(async () => { await nouvelleCleEleve(client, id); await ouvrirPerso(t); setMessage('Nouvelle clé créée : l’ancien lien de cet élève ne fonctionne plus.'); });
  const revoquer = id => agir(async () => { await revoquerTache(client, id); setMessage('Lien révoqué.'); await rechargerTaches(); });
  const inviterCollegue = () => agir(async () => { await inviter(client, classe.id, email); setEmail(''); setMessage('Enseignant invité.'); });
  // Retrait d'un code : action définitive (le code et tous ses essais disparaissent), donc confirmation chiffrée, jamais un clic isolé (audit 2026-11-21).
  const retirer = l => agir(async () => {
    const q = `Retirer le code ${l.code} et ses ${l.essais} essai${l.essais > 1 ? 's' : ''} ? Cette action est définitive.`;
    if (!window.confirm(q)) return;
    await supprimerEleve(client, l.id); await recharger();
  });
  const synthese = syntheseClasse(lignes);
  const ongletActif = onglet || (lignes.some(l => l.essais > 0) ? 'resultats' : 'eleves');
  const ONGLETS = [['eleves', 'Élèves et codes'], ['taches', 'Tâches'], ['resultats', 'Résultats'], ...(master ? [['classe', 'Gérer la classe']] : [])];
  const panneau = id => ({ role: 'tabpanel', id: `ens-panneau-${id}`, 'aria-labelledby': `ens-onglet-${id}`, hidden: ongletActif !== id });

  return (
    <section className="ens-carte">
      <button type="button" onClick={onRetour}>Retour aux classes</button>
      <h1>{classe.name}</h1>
      {message && <p role="status" className="ens-message">{message}</p>}
      <div role="tablist" aria-label="Sections de la classe" className="ens-onglets" ref={zoneOnglets}>
        {ONGLETS.map(([id, nom]) => (
          <button key={id} type="button" role="tab" id={`ens-onglet-${id}`} aria-selected={ongletActif === id} aria-controls={`ens-panneau-${id}`} className={ongletActif === id ? 'ens-onglet actif' : 'ens-onglet'} onClick={() => setOnglet(id)}>{nom}</button>
        ))}
      </div>
      <div {...panneau('eleves')}>
      <h2>Les élèves de la classe</h2>
      {lignes.length === 0 ? (
        <>
          <p className="ens-rassure">Commencez ici : chaque élève jouera avec son propre code (E01, E02…), jamais avec son nom. Il suffit d’indiquer combien d’élèves a la classe.</p>
          <div className="ens-bloc">
        <label htmlFor="ens-nb">Combien d’élèves dans la classe ?</label>
        <input id="ens-nb" type="number" min="1" value={nb} onChange={e => setNb(e.target.value)} />
        <p className="aide">Un code sera créé par élève. Si la classe a déjà des codes, on ajoute à la suite.</p>
        <label htmlFor="ens-prefixe">Début des codes</label>
        <input id="ens-prefixe" value={prefixe} onChange={e => setPrefixe(e.target.value)} placeholder="E" />
        <p className="aide">Un code, pas un nom : E01, E02, E03… Garder la correspondance avec les élèves sur papier.</p>
        <button type="button" className="principal" onClick={automatique}>Créer les codes automatiquement</button>
        <details>
          <summary>Saisir les codes un par un</summary>
          <label htmlFor="ens-codes">Codes des élèves</label>
          <textarea id="ens-codes" placeholder="E01, E02, E03" value={saisie} onChange={e => setSaisie(e.target.value)} />
          <p className="aide">Séparer les codes par une virgule, un espace ou un retour à la ligne. Utile pour garder des codes déjà utilisés ailleurs (autres outils PLAI).</p>
          <button type="button" onClick={ajouter}>Ajouter les codes</button>
        </details>
          </div>
        </>
      ) : (
        <>
          <p role="status"><strong>{lignes.length} code{lignes.length > 1 ? 's' : ''} d’élève</strong> dans cette classe.</p>
          <ul className="ens-puces">{lignes.map(l => <li key={l.id}>{l.code}</li>)}</ul>
          <p className="ens-rassure">Étape suivante : créer une tâche pour vos élèves.</p>
          <button type="button" className="principal" onClick={() => setOnglet('taches')}>Aller aux tâches →</button>
          <details className="ens-ajout">
            <summary>Ajouter d’autres codes (nouvel élève)</summary>
          <label htmlFor="ens-nb">Combien d’élèves dans la classe ?</label>
          <input id="ens-nb" type="number" min="1" value={nb} onChange={e => setNb(e.target.value)} />
          <p className="aide">Un code sera créé par élève. Si la classe a déjà des codes, on ajoute à la suite.</p>
          <label htmlFor="ens-prefixe">Début des codes</label>
          <input id="ens-prefixe" value={prefixe} onChange={e => setPrefixe(e.target.value)} placeholder="E" />
          <p className="aide">Un code, pas un nom : E01, E02, E03… Garder la correspondance avec les élèves sur papier.</p>
          <button type="button" className="principal" onClick={automatique}>Créer les codes automatiquement</button>
          <details>
            <summary>Saisir les codes un par un</summary>
            <label htmlFor="ens-codes">Codes des élèves</label>
            <textarea id="ens-codes" placeholder="E01, E02, E03" value={saisie} onChange={e => setSaisie(e.target.value)} />
            <p className="aide">Séparer les codes par une virgule, un espace ou un retour à la ligne. Utile pour garder des codes déjà utilisés ailleurs (autres outils PLAI).</p>
            <button type="button" onClick={ajouter}>Ajouter les codes</button>
          </details>
          </details>
        </>
      )}
      {refuses.length > 0 && (
        <ul aria-label="Codes refusés">{refuses.map((r, i) => <li key={i}>{r.code} : {r.raison}</li>)}</ul>
      )}

      <aside role="note" aria-label="Données des élèves" className="ens-note">
        <strong>Données des élèves.</strong> Chaque élève est repéré par un code, jamais un nom : ne jamais mettre un nom, un prénom ou une date de naissance dans un code.
        Pour chaque essai sont enregistrés : le mot, ce que l’élève a posé, juste ou faux, l’aide, la date.
        Seuls les enseignants de la classe les lisent. Hébergement : Supabase, projet partagé du Pôle, région Europe.
        Durée de conservation : une purge annuelle est prévue, pas encore en service. Une version à valider par le DPO figure dans le registre de traitement.
      </aside>
      </div>

      <div {...panneau('taches')} className={perso ? 'ens-panneau-liens' : undefined}>
      {perso ? (
        <div className="liens-perso" role="region" aria-label="Liens personnels des élèves" ref={zonePerso}>
          <button type="button" className="hors-impression" onClick={() => setPerso(null)}>← Retour aux tâches</button>
          <h2>Liens et QR-codes des élèves</h2>
          <p><strong>{perso.tache.pack || perso.tache.listesNoms}</strong></p>
          {perso.tache.resume && <p className="aide">Réglages : {perso.tache.resume}</p>}
          {perso.items.length === 0 && (
            <div className="ens-rassure hors-impression" role="status">
              <p>La tâche est créée, mais la classe n’a pas encore de code d’élève : il n’y a donc aucun QR-code à imprimer pour l’instant.</p>
              <button type="button" className="principal" onClick={() => { setPerso(null); setOnglet('eleves'); }}>Créer les codes des élèves</button>
              <p className="aide">Ensuite, revenez dans « Tâches » et cliquez sur « Liens et QR-codes personnels » : la tâche vous attend.</p>
            </div>
          )}
          {perso.items.length > 0 && (<>
          <ol className="ens-etapes-liens hors-impression">
            <li>Imprimer cette page (bouton ci-dessous).</li>
            <li>Découper : un QR-code par élève.</li>
            <li>Remettre à chaque élève uniquement le sien.</li>
          </ol>
          <button type="button" className="principal" onClick={() => window.print()}>Imprimer les QR-codes</button>
          <p className="aide">Chaque lien ou QR-code contient le code et la clé d’un seul élève. Seuls les résultats envoyés avec la bonne clé sont enregistrés : un élève ne peut plus écrire sous le code d’un camarade. Ne pas les publier. Un lien perdu ou transmis à quelqu’un d’autre : « Nouvelle clé ».</p>
          </>)}
          <ul className="liens-perso-liste">
            {perso.items.map(i => (
              <li key={i.id}>
                <strong>{i.code}</strong>
                <img src={i.qr} alt={`QR-code personnel de ${i.code}`} width="160" height="160" />
                <a href={i.lien}>Lien de {i.code}</a>
                <button type="button" className="hors-impression" onClick={() => changerCle(perso.tache, i.id)}>Nouvelle clé pour {i.code}</button>
              </li>
            ))}
          </ul>
          <details className="hors-impression">
            <summary>Lien général de la tâche (pour essayer : les résultats ne sont pas enregistrés)</summary>
            <p>Lien de la tâche : <a href={perso.general.lien}>{perso.general.lien}</a></p>
            <img src={perso.general.qr} alt="QR-code de la tâche" width="200" height="200" />
            <p className="aide">Ce lien ouvre le jeu mais n’est pas personnel : l’élève qui l’utilise joue, sans que ses résultats soient enregistrés chez vous.</p>
          </details>
        </div>
      ) : etape ? (
        <div className="ens-assistant">
          <button type="button" onClick={quitterAssistant}>← Annuler et revenir aux tâches</button>
          <h2>Nouvelle tâche</h2>
          <ol className="ens-progression" aria-label="Étapes">
            {ETAPES.map(([n, nomEtape]) => (
              <li key={n} className={n === etape ? 'actuelle' : n < etape ? 'faite' : ''} aria-current={n === etape ? 'step' : undefined}>
                <span className="ens-rond" aria-hidden="true">{n < etape ? '✓' : n}</span> {nomEtape}
              </li>
            ))}
          </ol>
          <p role="status" className="ens-etape-titre">Étape {etape} sur 3</p>

          {etape === 1 && (<>
            <h3>Quels mots les élèves vont-ils jouer ? <span className="ens-badge">obligatoire</span></h3>
            {lignes.length === 0 && !editeur && <p className="ens-rassure">Cette classe n’a pas encore de codes d’élèves. Vous pouvez préparer la tâche maintenant, mais les liens personnels n’existeront qu’après la création des codes (onglet « Élèves et codes »).</p>}
            {!editeur && (
              <fieldset className="ens-listes">
                <legend>Mots de la tâche</legend>
                <p className="aide">Cochez une liste : les élèves jouent ses mots. Cochez-en plusieurs pour une révision : les mots en double sont retirés.</p>
                {listes.length === 0 && modeles.length === 0 && <p>Vous n’avez pas encore de liste. Composez-en une ci-dessous.</p>}
                {listes.length > 0 && <h4>Mes listes</h4>}
                {listes.map(l => (
                  <div key={l.id} className="ens-choix">
                    <label htmlFor={`ens-l-${l.id}`}><input id={`ens-l-${l.id}`} type="checkbox" checked={choix.includes(`l:${l.id}`)} onChange={() => basculerChoix(`l:${l.id}`)} /> {l.nom} ({l.mots.length} mots)</label>
                    <button type="button" onClick={() => setEditeur({ liste: l })}>Modifier</button>
                    <button type="button" onClick={() => copierListe(l)}>Copier</button>
                    <button type="button" className="danger" onClick={() => retirerListe(l)}>Supprimer</button>
                  </div>
                ))}
                {modeles.length > 0 && <h4>Modèles prêts</h4>}
                {modeles.map(m => (
                  <div key={m.id} className="ens-choix">
                    <label htmlFor={`ens-m-${m.id}`}><input id={`ens-m-${m.id}`} type="checkbox" checked={choix.includes(`m:${m.id}`)} onChange={() => basculerChoix(`m:${m.id}`)} /> {m.titre} ({m.mots.length} mots)</label>
                  </div>
                ))}
                <button type="button" onClick={() => setEditeur({ liste: null })}>Composer une liste</button>
                <p className="aide">Une liste contient de 1 à 50 mots, choisis par vous dans le catalogue. Un modèle sert de point de départ : on le coche tel quel, ou on le copie dans une liste pour le modifier.</p>
                <p role="status">{motsTache.length} mot{motsTache.length > 1 ? 's' : ''} dans la tâche (maximum {TACHE_MAX})</p>
                {erreurTache && <p role="alert" className="ens-message">{erreurTache}</p>}
              </fieldset>
            )}
            {editeur && <ListeEditeur key={editeur.liste ? editeur.liste.id : 'nouvelle'} client={client} userId={userId} catalogue={catalogue} modeles={modeles} liste={editeur.liste} jouer={jouer} base={base} onFini={apresEnregistrement} onAnnuler={() => setEditeur(null)} />}
            {!editeur && <p className="aide">Un mot qui n’est pas dans le catalogue ? Pour fabriquer des cartes avec vos propres mots et images : <a href={`${String(base).replace(/\/+$/, '')}/modeles/modele-pack-plai.xlsx`} download>télécharger le modèle de cartes (Excel)</a>, le remplir, puis l’envoyer à JF avec vos images. Les mots n’entrent dans le catalogue qu’après sa validation.</p>}
            {!editeur && motsTache.length === 0 && <p className="aide">Pour continuer : cochez au moins une liste.</p>}
          </>)}

          {etape === 2 && (<>
            <h3>Comment les élèves vont-ils jouer ? <span className="ens-badge facultatif">facultatif</span></h3>
            <p className="ens-rassure">Les réglages sont déjà bien choisis pour la plupart des classes. Vous pouvez passer directement à l’étape suivante.</p>
            <label htmlFor="ens-mode">Cartes avec ou sans le mot écrit</label>
            <select id="ens-mode" value={tache.modeMot} onChange={e => setTache(t => ({ ...t, modeMot: e.target.value }))}>
              <option value="sans">sans le mot : l’élève trouve le mot à l’oreille</option>
              <option value="avec">avec le mot : l’élève recopie le modèle</option>
            </select>
            <p className="aide">Change la face de la carte montrée : l’écriture se travaille de deux façons différentes.</p>
            <label htmlFor="ens-habillage">Habillage</label>
            <select id="ens-habillage" value={tache.habillage} onChange={e => setTache(t => ({ ...t, habillage: e.target.value }))}>
              <option value="album">album (P1 à P3)</option>
              <option value="sobre">sobre (P4 et au-delà)</option>
            </select>
            <p className="aide">Change les couleurs et les formes. Les mots restent toujours en Arial.</p>
            <label htmlFor="ens-intrus">Nombre de cubes en trop</label>
            <select id="ens-intrus" value={tache.nbIntrus} onChange={e => setTache(t => ({ ...t, nbIntrus: Number(e.target.value) }))}>
              {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="aide">Des cubes qui ne servent pas, pour que l’élève doive choisir. 0 rend la tâche plus facile.</p>
            <details>
              <summary>Plus de réglages (accents, syllabes, voix)</summary>
              <label htmlFor="ens-accents"><input id="ens-accents" type="checkbox" checked={tache.exigerAccents} onChange={e => setTache(t => ({ ...t, exigerAccents: e.target.checked }))} /> Exiger les accents</label>
              <p className="aide">Si la case est vide, « e » est accepté à la place de « é ».</p>
              <label htmlFor="ens-syllabes">Écoute par syllabes</label>
              <select id="ens-syllabes" value={tache.syllabes} onChange={e => setTache(t => ({ ...t, syllabes: e.target.value }))}>
                <option value="toujours">Proposée pour tous les mots de deux syllabes ou plus</option>
                <option value="aide">Proposée seulement quand l’élève a du mal</option>
                <option value="non">Jamais</option>
              </select>
              <p className="aide">Ce réglage ne lit rien tout seul : il rend le bouton « Écouter par syllabes » disponible. « Quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? ». Pas de bouton pour un mot d’une seule syllabe, ni pour un mot dont les syllabes ne sont pas encore préparées.</p>
              <label htmlFor="ens-vitesse">Vitesse de la voix</label>
              <select id="ens-vitesse" value={tache.vitesse} onChange={e => setTache(t => ({ ...t, vitesse: Number(e.target.value) }))}>
                <option value={100}>Normale (100 %)</option>
                <option value={75}>Lente (75 %)</option>
                <option value={50}>Très lente (50 %)</option>
              </select>
              <label htmlFor="ens-verrou"><input id="ens-verrou" type="checkbox" checked={tache.vitesseVerrou} onChange={e => setTache(t => ({ ...t, vitesseVerrou: e.target.checked }))} /> Verrouiller cette vitesse</label>
              <p className="aide">Vitesse de départ pour les mots et les sons lus. Case vide : l’élève voit trois boutons (normale, lente, très lente) et peut en changer. Case cochée : pas de boutons, tous les élèves entendent cette vitesse. L’écoute par syllabes garde ses réglages propres (500 ms, dernière syllabe à 75 %).</p>
              <label htmlFor="ens-consignes">Consignes vocales</label>
              <select id="ens-consignes" value={tache.consignes} onChange={e => setTache(t => ({ ...t, consignes: e.target.value }))}>
                <option value="auto">Automatique : pas de voix dans une tâche enregistrée</option>
                <option value="voix">Oui : la voix dit quoi faire</option>
                <option value="non">Non</option>
              </select>
              <p className="aide">Pour P1 à P3, élèves qui ne lisent pas encore : la voix dit la consigne au départ, un encouragement tiré au hasard quand le mot est juste (« Bravo ! », « Super ! »…), une phrase d’aide quand il est faux (« Presque ! On regarde ensemble. ») puis rejoue le mot. Sans ce réglage, l’élève n’entend que le mot et ses lettres : les messages écrits ne sont pas lus. « Automatique » revient à « Non » ici, car les commandes épurées ne sont pas encore réglables dans une tâche enregistrée.</p>
            </details>
          </>)}

          {etape === 3 && (<>
            <h3>Vérifier et créer</h3>
            <dl className="ens-recap">
              <dt>Mots</dt><dd>{nomsTache} : {motsTache.length} mot{motsTache.length > 1 ? 's' : ''}</dd>
              <dt>Réglages</dt><dd>{resumeTache(tache)}</dd>
            </dl>
            <p className="aide">Un lien et un QR-code personnels seront créés pour chaque élève de la classe. Ils s’afficheront juste après, prêts à imprimer.</p>
            {lignes.length === 0 && <p role="alert" className="ens-message">La classe n’a pas encore de code d’élève : aucun lien personnel ne sera créé. Créez d’abord les codes dans l’onglet « Élèves et codes ».</p>}
          </>)}

          <div className="ens-navigation">
            {etape === 1 && !editeur && <span className="ens-etat" role="status">{motsTache.length === 0 ? 'Cochez au moins une liste pour continuer.' : `${motsTache.length} mot${motsTache.length > 1 ? 's' : ''} choisi${motsTache.length > 1 ? 's' : ''}.`}</span>}
            {etape > 1 && !editeur && <button type="button" onClick={() => setEtape(etape - 1)}>← Retour</button>}
            {etape < 3 && !editeur && <button type="button" className="principal" disabled={motsTache.length === 0 || !!erreurTache} onClick={() => setEtape(etape + 1)}>Suivant →</button>}
            {etape === 3 && <button type="button" className="principal" onClick={creer} disabled={motsTache.length === 0 || !!erreurTache}>Créer la tâche et les liens des élèves</button>}
          </div>
        </div>
      ) : (
        <>
          <h2>Tâches pour les élèves</h2>
          <button type="button" className="principal" onClick={ouvrirAssistant}>+ Nouvelle tâche</button>
          {taches.length === 0 ? (
            <p className="ens-vide">Aucune tâche pour l’instant. Une tâche = une liste de mots que vos élèves vont jouer. Créez la première en 3 étapes : choisir les mots, régler (facultatif), imprimer les QR-codes.</p>
          ) : (
            <ul className="ens-taches">
              {taches.map(t => (
                <li key={t.id} className={t.revoked ? 'revoquee' : undefined}>
                  <strong>{t.listesNoms || t.pack}</strong>{t.creee ? ` · ${t.creee.slice(0, 10)}` : ''}{t.revoked ? ' · révoquée' : ''}
                  <br /><span className="aide">{resumeTache(t)}</span>
                  <br />
                  {!t.revoked && <button type="button" className="principal" onClick={() => ouvrirDepuisListe(t)}>Liens et QR-codes personnels</button>}
                  {!t.revoked && <button type="button" onClick={() => revoquer(t.id)}>Révoquer ce lien</button>}
                  {!t.revoked && <span className="aide"> Révoquer : les liens de cette tâche cessent de fonctionner.</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      </div>

      <div {...panneau('resultats')}>
      <h2>Résultats</h2>
      <button type="button" onClick={recharger}>Actualiser les résultats</button>
      {synthese.liaisons.length > 0 && (
        <section aria-label="Synthèse de la classe" className="ens-synthese">
          <h3>Ce que la classe rate le plus</h3>
          <ol>
            {synthese.liaisons.map(t => (
              <li key={t.liaison}><strong>{libelleLiaison(t.liaison)}</strong> : {t.nbDifficile} élève{t.nbDifficile > 1 ? 's' : ''} en difficulté, {t.nbConcernes} concerné{t.nbConcernes > 1 ? 's' : ''} sur {lignes.length} ({Math.round(t.taux * 100)} % de ratés au premier coup)</li>
            ))}
          </ol>
          <table className="ens-grille">
            <caption>Qui rate quoi, au premier coup</caption>
            <thead><tr><th scope="col">Code</th>{synthese.liaisons.map(t => <th key={t.liaison} scope="col">{libelleLiaison(t.liaison)}</th>)}</tr></thead>
            <tbody>
              {synthese.grille.map(g => (
                <tr key={g.id}>
                  <th scope="row">{g.code}</th>
                  {g.cellules.map((etat, i) => <td key={i} className={`st-${etat}`} aria-label={`${g.code}, ${libelleLiaison(synthese.liaisons[i].liaison)} : ${NOMS_ETATS[etat]}`}><span aria-hidden="true">{SYMBOLES[etat]}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="aide">✗ difficile (au moins la moitié des essais ratés au premier coup) · ~ fragile (quelques essais ratés) · ✓ acquis · – pas encore d’essai. Seuils provisoires, à confirmer par un·e spécialiste ; ils servent de repère pour choisir les mots à retravailler, pas de décision sur l’élève.</p>
        </section>
      )}
      <h3>Détail par élève</h3>
      <table>
        <thead><tr><th>Code</th><th>Essais</th><th>Dernière séance</th><th>À retravailler</th></tr></thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.id}>
              <td>{l.code}</td><td>{l.essais}</td>
              <td>{l.derniereSeance ? l.derniereSeance.slice(0, 10) : 'aucune'}</td>
              <td>{l.plusRatees.map(x => libelleLiaison(x.liaison)).join(', ') || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="aide">Les essais d’un élève n’apparaissent ici qu’après son « Envoyer mes résultats » au bilan de fin de liste, ou quand il rouvre la page élève avec son lien : juste après une carte jouée, le tableau peut encore afficher 0 essai. Rouvrir la classe pour actualiser.</p>
      <p className="aide">« À retravailler » : les trois liaisons lettres → son que l’élève rate le plus souvent au premier coup. Exemple pour « chat » : « ch → [ʃ] » (les lettres ch font le son « ch »), « a → [a] », « t → muet » (le t ne s’entend pas).</p>

      </div>

      {master && (
        <div {...panneau('classe')}>
          <h2>Retirer un code d’élève</h2>
          <p className="aide">Retire le code et tous ses essais, après confirmation. Utile pour un élève parti de la classe ou un code créé par erreur.</p>
          <ul className="ens-codes">
            {lignes.map(l => (
              <li key={l.id}>{l.code} ({l.essais} essai{l.essais > 1 ? 's' : ''}) <button type="button" className="danger" onClick={() => retirer(l)}>Retirer {l.code}</button></li>
            ))}
          </ul>
          <h2>Inviter un enseignant</h2>
          <label htmlFor="ens-invite">E-mail de l’enseignant</label>
          <input id="ens-invite" type="email" placeholder="collegue@ecole.be" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="aide">Il verra la même classe et les mêmes résultats. Il doit s’être connecté une fois à un outil PLAI.</p>
          <button type="button" onClick={inviterCollegue}>Inviter</button>
          <h2>Supprimer la classe</h2>
          <p className="aide">Supprime aussi les élèves et leurs résultats. Action définitive.</p>
          <button type="button" onClick={onSupprimer}>Supprimer la classe</button>
        </div>
      )}
    </section>
  );
}
