import React, { useCallback, useEffect, useState } from 'react';
import { REGLAGES_PAR_DEFAUT } from '../app/route.js';
import {
  decouperCodes, creerCodesAuto, ajouterEleves, creerTache, listerTaches, resumeTache, revoquerTache, qrDeLien, resultats, inviter, supprimerEleve, liensEleves, nouvelleCleEleve
} from './api.js';

const PAS_DE_TACHE = { pack: '', modeMot: REGLAGES_PAR_DEFAUT.modeMot, habillage: REGLAGES_PAR_DEFAUT.habillage, nbIntrus: REGLAGES_PAR_DEFAUT.nbIntrus, exigerAccents: REGLAGES_PAR_DEFAUT.exigerAccents, syllabes: REGLAGES_PAR_DEFAUT.syllabes };

export default function Classe({ client, userId, classe, base, packs = [], onRetour, onSupprimer }) {
  const master = classe.role === 'master';
  const [lignes, setLignes] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [prefixe, setPrefixe] = useState('E');
  const [nb, setNb] = useState(20);
  const [refuses, setRefuses] = useState([]);
  const [tache, setTache] = useState({ ...PAS_DE_TACHE, pack: packs[0] ? packs[0].id : '' });
  const [lien, setLien] = useState(null);
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
  const creer = () => agir(async () => {
    const t = await creerTache(client, classe.id, tache, userId, base);
    setLien({ ...t, qr: await qrDeLien(t.lien) });
    await rechargerTaches();
  });
  const ouvrirPerso = t => agir(async () => {
    const liens = await liensEleves(client, classe.id, t.jeton, base);
    setPerso({ tache: t, items: await Promise.all(liens.map(async l => ({ ...l, qr: await qrDeLien(l.lien) }))) });
  });
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
      <label htmlFor="ens-pack">Pack de cartes</label>
      <select id="ens-pack" value={tache.pack} disabled={packs.length === 0} onChange={e => setTache(t => ({ ...t, pack: e.target.value }))}>
        {packs.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
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
      <p className="aide">Ce réglage ne lit rien tout seul : il rend le bouton « Écouter par syllabes » disponible. « Quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? ». Pas de bouton pour un mot d’une seule syllabe, ni dans un pack sans syllabes.</p>
      <p className="aide">{packs.length === 0 ? 'Aucun pack publié pour l’instant.' : 'Les élèves qui ouvrent le lien jouent les cartes de ce pack.'}</p>
      <p className="aide">Un pack « personnel » n’apparaît que pour vous. Pour fabriquer le vôtre : <a href={`${String(base).replace(/\/+$/, '')}/modeles/modele-pack-plai.xlsx`} download>télécharger le modèle de pack (Excel)</a>, le remplir, puis l’envoyer à JF avec vos images.</p>
      <button type="button" onClick={creer} disabled={packs.length === 0}>Créer le lien et le QR-code</button>
      {lien && (
        <div>
          <p>Lien de la tâche : <a href={lien.lien}>{lien.lien}</a></p>
          <p className="aide">Ce lien ouvre le jeu mais n’est pas personnel : les résultats ne sont enregistrés que si l’élève utilise son lien ou son QR-code personnel (bouton « Liens et QR-codes personnels » dans la liste des tâches).</p>
          <img src={lien.qr} alt="QR-code de la tâche" width="256" height="256" />
          <p className="aide">Réglages de ce lien : {resumeTache(taches.find(x => x.id === lien.id) || { ...tache })}</p>
        </div>
      )}
      {taches.length > 0 && (
        <>
          <h3>Tâches de la classe</h3>
          <ul>
            {taches.map(t => (
              <li key={t.id}>
                {t.pack} : {resumeTache(t)}{t.creee ? ` (${t.creee.slice(0, 10)})` : ''}{t.revoked ? ' (révoquée)' : ''}
                <br /><a href={t.lien}>{t.lien}</a>
                {!t.revoked && <button type="button" onClick={() => ouvrirPerso(t)}>Liens et QR-codes personnels</button>}
                {!t.revoked && <button type="button" onClick={() => revoquer(t.id)}>Révoquer ce lien</button>}
              </li>
            ))}
          </ul>
        </>
      )}

      {perso && (
        <div className="liens-perso" role="region" aria-label="Liens personnels des élèves">
          <h3>Liens personnels : {perso.tache.pack}</h3>
          <p className="aide">Chaque lien ou QR-code contient le code et la clé d’un seul élève. Seuls les résultats envoyés avec la bonne clé sont enregistrés : un élève ne peut plus écrire sous le code d’un camarade. Remettre à chaque élève uniquement le sien (imprimer puis découper) et ne pas les publier. Un lien perdu ou transmis à quelqu’un d’autre : créer une nouvelle clé.</p>
          <button type="button" onClick={() => window.print()}>Imprimer</button>
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
        </div>
      )}

      <h2>Résultats</h2>
      <table>
        <thead><tr><th>Code</th><th>Essais</th><th>Dernière séance</th><th>À retravailler</th>{master && <th />}</tr></thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.id}>
              <td>{l.code}</td><td>{l.essais}</td>
              <td>{l.derniereSeance ? l.derniereSeance.slice(0, 10) : 'aucune'}</td>
              <td>{l.plusRatees.map(x => x.liaison).join(', ') || '-'}</td>
              {master && <td><button type="button" onClick={() => retirer(l.id)}>Retirer {l.code}</button></td>}
            </tr>
          ))}
        </tbody>
      </table>

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
