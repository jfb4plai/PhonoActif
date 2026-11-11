import React, { useCallback, useEffect, useState } from 'react';
import {
  decouperCodes, genererCodes, ajouterEleves, creerTache, revoquerTache, qrDeLien, resultats, inviter, supprimerEleve
} from './api.js';

const PAS_DE_TACHE = { pack: '', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: false };

export default function Classe({ client, userId, classe, base, packs = [], onRetour, onSupprimer }) {
  const master = classe.role === 'master';
  const [lignes, setLignes] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [prefixe, setPrefixe] = useState('E');
  const [nb, setNb] = useState(20);
  const [refuses, setRefuses] = useState([]);
  const [tache, setTache] = useState({ ...PAS_DE_TACHE, pack: packs[0] || '' });
  const [lien, setLien] = useState(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const recharger = useCallback(async () => {
    try { setLignes(await resultats(client, classe.id)); } catch (e) { setMessage(e.message); }
  }, [client, classe.id]);
  useEffect(() => { recharger(); }, [recharger]);

  const agir = async fn => { setMessage(''); try { await fn(); } catch (e) { setMessage(e.message); } };

  const ajouter = () => agir(async () => {
    const r = await ajouterEleves(client, classe.id, decouperCodes(saisie));
    setRefuses(r.refuses); setSaisie('');
    setMessage(`${r.ajoutes.length} code(s) ajouté(s).`);
    await recharger();
  });
  const generer = () => agir(async () => { setSaisie(genererCodes(prefixe, Number(nb)).join(', ')); });
  const creer = () => agir(async () => {
    const t = await creerTache(client, classe.id, tache, userId, base);
    setLien({ ...t, qr: await qrDeLien(t.lien) });
  });
  const inviterCollegue = () => agir(async () => { await inviter(client, classe.id, email); setEmail(''); setMessage('Enseignant invité.'); });
  const retirer = id => agir(async () => { await supprimerEleve(client, id); await recharger(); });

  return (
    <section className="ens-carte">
      <button type="button" onClick={onRetour}>Retour aux classes</button>
      <h1>{classe.name}</h1>
      {message && <p role="status" className="ens-message">{message}</p>}

      <h2>Élèves</h2>
      <label htmlFor="ens-codes">Codes des élèves</label>
      <textarea id="ens-codes" placeholder="E01, E02, E03" value={saisie} onChange={e => setSaisie(e.target.value)} />
      <p className="aide">Un code, pas un nom. Garder la correspondance avec les élèves sur papier.</p>
      <div className="ens-actions">
        <button type="button" onClick={ajouter}>Ajouter les codes</button>
      </div>
      <label htmlFor="ens-prefixe">Préfixe pour générer des codes</label>
      <input id="ens-prefixe" value={prefixe} onChange={e => setPrefixe(e.target.value)} placeholder="E" />
      <label htmlFor="ens-nb">Nombre de codes</label>
      <input id="ens-nb" type="number" min="1" value={nb} onChange={e => setNb(e.target.value)} />
      <p className="aide">Remplit le champ ci-dessus avec E01, E02, … à relire avant d’ajouter.</p>
      <button type="button" onClick={generer}>Générer</button>
      {refuses.length > 0 && (
        <ul aria-label="Codes refusés">{refuses.map((r, i) => <li key={i}>{r.code} : {r.raison}</li>)}</ul>
      )}

      <h2>Tâche pour les élèves</h2>
      <label htmlFor="ens-pack">Pack de cartes</label>
      <input id="ens-pack" list="ens-packs" value={tache.pack} placeholder="demo" onChange={e => setTache(t => ({ ...t, pack: e.target.value }))} />
      <datalist id="ens-packs">{packs.map(p => <option key={p} value={p} />)}</datalist>
      <p className="aide">Nom du pack choisi par l’enseignant. Les élèves ouvriront ce pack avec le lien.</p>
      <button type="button" onClick={creer}>Créer le lien et le QR-code</button>
      {lien && (
        <div>
          <p>Lien : <a href={lien.lien}>{lien.lien}</a></p>
          <img src={lien.qr} alt="QR-code de la tâche" width="256" height="256" />
          <button type="button" onClick={() => agir(async () => { await revoquerTache(client, lien.id); setLien(null); setMessage('Lien révoqué.'); })}>Révoquer ce lien</button>
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
