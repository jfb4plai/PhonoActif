import React, { useCallback, useEffect, useState } from 'react';
import { REGLAGES_PAR_DEFAUT } from '../app/route.js';
import {
  decouperCodes, creerCodesAuto, ajouterEleves, creerTache, listerTaches, resumeTache, revoquerTache, qrDeLien, resultats, inviter, supprimerEleve
} from './api.js';

const PAS_DE_TACHE = { pack: '', modeMot: REGLAGES_PAR_DEFAUT.modeMot, habillage: REGLAGES_PAR_DEFAUT.habillage, nbIntrus: REGLAGES_PAR_DEFAUT.nbIntrus, exigerAccents: REGLAGES_PAR_DEFAUT.exigerAccents };

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
      <p className="aide">{packs.length === 0 ? 'Aucun pack publié pour l’instant.' : 'Les élèves qui ouvrent le lien jouent les cartes de ce pack.'}</p>
      <button type="button" onClick={creer} disabled={packs.length === 0}>Créer le lien et le QR-code</button>
      {lien && (
        <div>
          <p>Lien : <a href={lien.lien}>{lien.lien}</a></p>
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
