import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { configurationSupabase } from '../lib/supabase.js';
import { packsVisibles, empreinteCourriel } from '../core/packAtelier.js';
import { creerClasse, lister, supprimerClasse, resultats, listerTaches } from './api.js';
import Connexion from './Connexion.jsx';
import Classe from './Classe.jsx';
import './enseignant.css';

// deps : client (Supabase injecté pour les tests), base, packs
export default function Enseignant({ deps = {} }) {
  const [client] = useState(() => {
    if (deps.client) return deps.client;
    const c = deps.supabase !== undefined ? deps.supabase : configurationSupabase(import.meta.env);
    return c ? createClient(c.url, c.anonKey) : null;
  });
  const base = deps.base ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/');
  const [utilisateur, setUtilisateur] = useState(null);
  const [pret, setPret] = useState(false);
  const [classes, setClasses] = useState([]);
  const [aSupprimer, setASupprimer] = useState(null); // { classe, nbEleves, nbEssais, nbTaches } : avertissement en attente de confirmation
  const [courante, setCourante] = useState(null);
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState('');
  // Packs publiés : liste fournie (tests) ou lue dans packs/index.json
  const [packs, setPacks] = useState(deps.packs || null);

  useEffect(() => {
    if (deps.packs) return undefined;
    let actif = true;
    const racine = base.replace(/\/+$/, '') + '/';
    (deps.fetch || fetch)(`${racine}packs/index.json`)
      .then(r => (r.ok ? r.json() : []))
      .then(l => { if (actif) setPacks(Array.isArray(l) ? l.filter(p => p && p.id && p.label) : []); })
      .catch(() => { if (actif) setPacks([]); });
    return () => { actif = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!client) return undefined;
    let actif = true;
    client.auth.getSession().then(({ data }) => { if (actif) { setUtilisateur(data.session ? data.session.user : null); setPret(true); } });
    const { data } = client.auth.onAuthStateChange((_evt, session) => setUtilisateur(session ? session.user : null));
    return () => { actif = false; data.subscription.unsubscribe(); };
  }, [client]);

  // Les packs personnels sont reconnus par une empreinte de l'adresse e-mail, jamais par l'adresse elle-même
  const [empreinte, setEmpreinte] = useState('');
  useEffect(() => {
    let actif = true;
    if (utilisateur && utilisateur.email) empreinteCourriel(utilisateur.email).then(e => { if (actif) setEmpreinte(e); }).catch(() => {});
    else setEmpreinte('');
    return () => { actif = false; };
  }, [utilisateur]);

  const charger = async () => {
    try { setClasses(await lister(client, utilisateur.id)); } catch (e) { setMessage(e.message); }
  };
  useEffect(() => { if (client && utilisateur) charger(); }, [client, utilisateur]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!client) return <main className="ens"><p>Espace enseignant indisponible : service non configuré.</p></main>;
  if (!pret || packs === null) return <main className="ens"><p>Chargement…</p></main>;
  if (!utilisateur) return <main className="ens"><Connexion auth={client.auth} redirection={base} /></main>;

  async function ajouterClasse() {
    setMessage('');
    try {
      const c = await creerClasse(client, nom, utilisateur.id);
      setNom(''); await charger();
      setCourante({ id: c.id, name: c.name, role: 'master' });
    } catch (e) { setMessage(e.message); }
  }

  // Suppression depuis la liste : d'abord un avertissement chiffré (codes, essais, tâches), puis une confirmation explicite
  async function demanderSuppression(c) {
    setMessage('');
    try {
      const lignes = await resultats(client, c.id);
      const taches = await listerTaches(client, c.id, base);
      setASupprimer({ classe: c, nbEleves: lignes.length, nbEssais: lignes.reduce((t, l) => t + l.essais, 0), nbTaches: taches.length });
    } catch (e) { setMessage(e.message); }
  }
  async function confirmerSuppression() {
    const c = aSupprimer.classe;
    try {
      await supprimerClasse(client, c.id);
      setASupprimer(null); await charger();
      setMessage(`La classe « ${c.name} » est supprimée.`);
    } catch (e) { setMessage(e.message); }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la classe « ${courante.name} », ses élèves et leurs résultats ? Cette action est définitive.`)) return;
    try { await supprimerClasse(client, courante.id); setCourante(null); await charger(); } catch (e) { setMessage(e.message); }
  }

  return (
    <main className="ens">
      <p>
        {utilisateur.email} <button type="button" onClick={() => client.auth.signOut()}>Se déconnecter</button>
      </p>
      {courante ? (
        <Classe client={client} userId={utilisateur.id} classe={courante} base={base} packs={packsVisibles(packs, empreinte)}
          onRetour={() => setCourante(null)} onSupprimer={supprimer} />
      ) : (
        <section className="ens-carte">
          <h1>Mes classes</h1>
          {message && <p role="status" className="ens-message">{message}</p>}
          <ul>
            {classes.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => setCourante(c)}>{c.name}</button> {c.role === 'master' ? '' : '(invité)'}
                {c.role === 'master' && <button type="button" className="danger" aria-label={`Supprimer la classe ${c.name}`} onClick={() => demanderSuppression(c)}>Supprimer</button>}
              </li>
            ))}
          </ul>
          {aSupprimer && (
            <div role="alertdialog" aria-labelledby="ens-supp-titre" className="ens-alerte">
              <h2 id="ens-supp-titre">Supprimer la classe « {aSupprimer.classe.name} » ?</h2>
              <p><strong>Cette action est définitive : rien ne pourra être récupéré.</strong> Seront supprimés :</p>
              <ul>
                <li>{aSupprimer.nbEleves} code{aSupprimer.nbEleves > 1 ? 's' : ''} d’élève</li>
                <li>{aSupprimer.nbEssais} essai{aSupprimer.nbEssais > 1 ? 's' : ''} enregistré{aSupprimer.nbEssais > 1 ? 's' : ''}</li>
                <li>{aSupprimer.nbTaches} tâche{aSupprimer.nbTaches > 1 ? 's' : ''}, dont les liens et QR-codes déjà remis aux élèves cesseront de fonctionner</li>
              </ul>
              <p>Les enseignants invités dans cette classe perdront aussi l’accès. Si vous voulez garder les résultats, ouvrez la classe et notez-les avant de supprimer.</p>
              <button type="button" className="danger" onClick={confirmerSuppression}>Oui, supprimer définitivement la classe</button>
              <button type="button" onClick={() => setASupprimer(null)}>Annuler</button>
            </div>
          )}
          {classes.length === 0 ? <p>Aucune classe pour l’instant.</p> : <p className="aide">Cliquer sur le nom d’une classe pour l’ouvrir : élèves, tâches, résultats.</p>}
          <label htmlFor="ens-nom">Nom de la classe</label>
          <input id="ens-nom" value={nom} placeholder="3P A, école de Fléron" onChange={e => setNom(e.target.value)} />
          <p className="aide">Visible seulement par les enseignants de la classe. Ne pas y mettre de nom d’élève.</p>
          <button type="button" onClick={ajouterClasse}>Créer la classe</button>
        </section>
      )}
    </main>
  );
}
