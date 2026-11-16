import React, { useCallback, useEffect, useRef, useState } from 'react';
import { REGLAGES_PAR_DEFAUT } from '../app/route.js';
import { fusionnerListes, validerTache, TACHE_MAX } from '../core/liste.js';
import { listerListes, supprimerListe, dupliquerListe } from './listes.js';
import ListeEditeur from './ListeEditeur.jsx';
import { libelleLiaison } from './liaison.js';
import {
  decouperCodes, creerCodesAuto, ajouterEleves, creerTache, listerTaches, resumeTache, revoquerTache, qrDeLien, resultats, inviter, supprimerEleve, liensEleves, nouvelleCleEleve
} from './api.js';

const PAS_DE_TACHE = { modeMot: REGLAGES_PAR_DEFAUT.modeMot, habillage: REGLAGES_PAR_DEFAUT.habillage, nbIntrus: REGLAGES_PAR_DEFAUT.nbIntrus, exigerAccents: REGLAGES_PAR_DEFAUT.exigerAccents, syllabes: REGLAGES_PAR_DEFAUT.syllabes, vitesse: REGLAGES_PAR_DEFAUT.vitesse, vitesseVerrou: REGLAGES_PAR_DEFAUT.vitesseVerrou };

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
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
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
    await ouvrirPerso({ ...t, pack: nomsTache, resume: resumeTache(tache) });   // les liens des élèves s'affichent tout de suite
  });
  const apresEnregistrement = async l => { setEditeur(null); await rechargerListes(); setChoix(c => (c.includes(`l:${l.id}`) ? c : [...c, `l:${l.id}`])); setMessage(`Liste « ${l.nom} » enregistrée.`); };
  const retirerListe = l => agir(async () => { if (!window.confirm(`Supprimer la liste « ${l.nom} » ? Les tâches déjà données gardent leurs mots.`)) return; await supprimerListe(client, l.id); setChoix(c => c.filter(x => x !== `l:${l.id}`)); await rechargerListes(); });
  const copierListe = l => agir(async () => { await dupliquerListe(client, userId, l, { catalogueIds }); await rechargerListes(); });
  const ouvrirDepuisListe = t => agir(() => ouvrirPerso({ ...t, resume: resumeTache(t) }));
  useEffect(() => { if (perso && zonePerso.current && zonePerso.current.scrollIntoView) zonePerso.current.scrollIntoView({ block: 'start' }); }, [perso && perso.tache && perso.tache.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const changerCle = (t, id) => agir(async () => { await nouvelleCleEleve(client, id); await ouvrirPerso(t); setMessage('Nouvelle clé créée : l’ancien lien de cet élève ne fonctionne plus.'); });
  const revoquer = id => agir(async () => { await revoquerTache(client, id); setMessage('Lien révoqué.'); await rechargerTaches(); });
  const inviterCollegue = () => agir(async () => { await inviter(client, classe.id, email); setEmail(''); setMessage('Enseignant invité.'); });
  const retirer = id => agir(async () => { await supprimerEleve(client, id); await recharger(); });

  return (
    <section className="ens-carte">
      <button type="button" onClick={onRetour}>Retour aux classes</button>
      <h1>{classe.name}</h1>
      {message && <p role="status" className="ens-message">{message}</p>}
      <aside role="note" aria-label="Données des élèves" className="ens-note">
        <strong>Données des élèves.</strong> Chaque élève est repéré par un code, jamais un nom : ne jamais mettre un nom, un prénom ou une date de naissance dans un code.
        Pour chaque essai sont enregistrés : le mot, ce que l’élève a posé, juste ou faux, l’aide, la date.
        Seuls les enseignants de la classe les lisent. Hébergement : Supabase, projet partagé du Pôle, région Europe.
        Durée de conservation : une purge annuelle est prévue, pas encore en service. Une version à valider par le DPO figure dans le registre de traitement.
      </aside>
      <label htmlFor="ens-nb">Nombre d’élèves</label>
      <input id="ens-nb" type="number" min="1" value={nb} onChange={e => setNb(e.target.value)} />
      <label htmlFor="ens-prefixe">Début des codes</label>
      <input id="ens-prefixe" value={prefixe} onChange={e => setPrefixe(e.target.value)} placeholder="E" />
      <p className="aide">Un code, pas un nom : E01, E02, E03… Si la classe a déjà des codes, la suite est numérotée à partir du dernier. Garder la correspondance avec les élèves sur papier.</p>
      <button type="button" onClick={automatique}>Créer les codes automatiquement</button>
      <details>
        <summary>Saisir les codes un par un</summary>
        <label htmlFor="ens-codes">Codes des élèves</label>
        <textarea id="ens-codes" placeholder="E01, E02, E03" value={saisie} onChange={e => setSaisie(e.target.value)} />
        <p className="aide">Séparer les codes par une virgule, un espace ou un retour à la ligne. Utile pour garder des codes déjà utilisés ailleurs (autres outils PLAI).</p>
        <button type="button" onClick={ajouter}>Ajouter les codes</button>
      </details>
      {refuses.length > 0 && (
        <ul aria-label="Codes refusés">{refuses.map((r, i) => <li key={i}>{r.code} : {r.raison}</li>)}</ul>
      )}

      <h2>Tâche pour les élèves</h2>
      <fieldset className="ens-listes">
        <legend>Mots de la tâche</legend>
        <p className="aide">Cochez une liste : les élèves jouent ses mots. Cochez-en plusieurs pour une révision : les mots en double sont retirés.</p>
        {listes.length > 0 && <h3>Mes listes</h3>}
        {listes.map(l => (
          <div key={l.id} className="ens-choix">
            <label htmlFor={`ens-l-${l.id}`}><input id={`ens-l-${l.id}`} type="checkbox" checked={choix.includes(`l:${l.id}`)} onChange={() => basculerChoix(`l:${l.id}`)} /> {l.nom} ({l.mots.length} mots)</label>
            <button type="button" onClick={() => setEditeur({ liste: l })}>Modifier</button>
            <button type="button" onClick={() => copierListe(l)}>Copier</button>
            <button type="button" className="danger" onClick={() => retirerListe(l)}>Supprimer</button>
          </div>
        ))}
        {modeles.length > 0 && <h3>Modèles prêts</h3>}
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
      {editeur && <ListeEditeur key={editeur.liste ? editeur.liste.id : 'nouvelle'} client={client} userId={userId} catalogue={catalogue} modeles={modeles} liste={editeur.liste} jouer={jouer} base={base} onFini={apresEnregistrement} onAnnuler={() => setEditeur(null)} />}
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
      <p className="aide">Un mot qui n’est pas dans le catalogue ? Pour fabriquer des cartes avec vos propres mots et images : <a href={`${String(base).replace(/\/+$/, '')}/modeles/modele-pack-plai.xlsx`} download>télécharger le modèle de cartes (Excel)</a>, le remplir, puis l’envoyer à JF avec vos images. Les mots n’entrent dans le catalogue qu’après sa validation.</p>
      <button type="button" className="principal" onClick={creer} disabled={motsTache.length === 0 || !!erreurTache}>Créer la tâche et les liens des élèves</button>
      <p className="aide">La tâche est créée, puis le lien et le QR-code de chaque élève s’affichent juste en dessous : ce sont eux qu’il faut remettre aux élèves.</p>

      {perso && (
        <div className="liens-perso" role="region" aria-label="Liens personnels des élèves" ref={zonePerso}>
          <h3>Liens et QR-codes des élèves : {perso.tache.pack}</h3>
          {perso.tache.resume && <p className="aide">Réglages : {perso.tache.resume}</p>}
          <p className="aide">Chaque lien ou QR-code contient le code et la clé d’un seul élève. Seuls les résultats envoyés avec la bonne clé sont enregistrés : un élève ne peut plus écrire sous le code d’un camarade. Remettre à chaque élève uniquement le sien (imprimer puis découper) et ne pas les publier. Un lien perdu ou transmis à quelqu’un d’autre : « Nouvelle clé ».</p>
          <button type="button" className="principal" onClick={() => window.print()}>Imprimer les QR-codes</button>
          <button type="button" onClick={() => setPerso(null)}>Fermer</button>
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
      )}
      {taches.length > 0 && (
        <>
          <h3>Tâches de la classe</h3>
          <ul>
            {taches.map(t => (
              <li key={t.id}>
                {t.listesNoms || t.pack} : {resumeTache(t)}{t.creee ? ` (${t.creee.slice(0, 10)})` : ''}{t.revoked ? ' (révoquée)' : ''}
                <br />
                {!t.revoked && <button type="button" className="principal" onClick={() => ouvrirDepuisListe(t)}>Liens et QR-codes personnels</button>}
                {!t.revoked && <button type="button" onClick={() => revoquer(t.id)}>Révoquer ce lien</button>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Résultats</h2>
      <table>
        <thead><tr><th>Code</th><th>Essais</th><th>Dernière séance</th><th>À retravailler</th>{master && <th />}</tr></thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.id}>
              <td>{l.code}</td><td>{l.essais}</td>
              <td>{l.derniereSeance ? l.derniereSeance.slice(0, 10) : 'aucune'}</td>
              <td>{l.plusRatees.map(x => libelleLiaison(x.liaison)).join(', ') || '-'}</td>
              {master && <td><button type="button" onClick={() => retirer(l.id)}>Retirer {l.code}</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="aide">Les essais d’un élève n’apparaissent ici qu’après son « Envoyer mes résultats » au bilan de fin de liste, ou quand il rouvre la page élève avec son lien : juste après une carte jouée, le tableau peut encore afficher 0 essai. Rouvrir la classe pour actualiser.</p>
      <p className="aide">« À retravailler » : les trois liaisons lettres → son que l’élève rate le plus souvent au premier coup. Exemple pour « chat » : « ch → [ʃ] » (les lettres ch font le son « ch »), « a → [a] », « t → muet » (le t ne s’entend pas).</p>

      {master && (
        <>
          <h2>Inviter un enseignant</h2>
          <label htmlFor="ens-invite">E-mail de l’enseignant</label>
          <input id="ens-invite" type="email" placeholder="collegue@ecole.be" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="aide">Il verra la même classe et les mêmes résultats. Il doit s’être connecté une fois à un outil PLAI.</p>
          <button type="button" onClick={inviterCollegue}>Inviter</button>
          <h2>Supprimer la classe</h2>
          <p className="aide">Supprime aussi les élèves et leurs résultats. Action définitive.</p>
          <button type="button" onClick={onSupprimer}>Supprimer la classe</button>
        </>
      )}
    </section>
  );
}
