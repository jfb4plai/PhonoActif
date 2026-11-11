import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { configurationSupabase } from '../lib/supabase.js';
import { creerClasse, lister, supprimerClasse } from './api.js';
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
        <Classe client={client} userId={utilisateur.id} classe={courante} base={base} packs={packs}
          onRetour={() => setCourante(null)} onSupprimer={supprimer} />
      ) : (
        <section className="ens-carte">
          <h1>Mes classes</h1>
          {message && <p role="status" className="ens-message">{message}</p>}
          <ul>
            {classes.map(c => (
              <li key={c.id}><button type="button" onClick={() => setCourante(c)}>{c.name}</button> {c.role === 'master' ? '' : '(invité)'}</li>
            ))}
          </ul>
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
