import React from 'react';
import { codeValide } from './code.js';

const MESSAGES_TACHE = {
  inconnue: 'Cette tâche n’existe plus. Demander un nouveau lien à l’enseignant.',
  reseau: 'Pas de connexion : la tâche ne peut pas être chargée. Réessayer plus tard.',
  hors_service: 'Ce lien de tâche ne peut pas s’ouvrir sur cet appareil.'
};

export default function Accueil({
  base = '/', tache, code, onCode, onTache, onCommencer, erreur, avertissements, persistant, lien, nbEssais, onExportJson, onExportCsv,
  enLigne = false, lienPersonnel = false, etatTache = 'non', peutEnvoyer = false, enAttente = 0, onEnvoyerAttente, messageEnvoi = ''
}) {
  const messageTache = enLigne ? MESSAGES_TACHE[etatTache] : null;
  const alerte = erreur || messageTache;
  return (
    <>
      <nav className="plai-nav">
        <span className="plai-nav-logo"><img className="logo-nav" src={`${base}plai-logo.jpg`} alt="PLAI" /> PhonoActif</span>
      </nav>
      <main className="plai-container accueil">
        <section className="plai-section">
          <h1>Bonjour</h1>
          <div className="plai-field">
            <label className="plai-label" htmlFor="code">Code de l’élève</label>
            <input id="code" className="plai-input" type="text" placeholder="E07" value={code} onChange={e => onCode(e.target.value)} readOnly={lienPersonnel} autoComplete="off" maxLength={40} />
            <p className="aide">Un code, pas un nom. Lettres, chiffres et tiret, 12 au plus.{enLigne ? '' : ' Il reste sur cet appareil.'}</p>
          </div>
          {enLigne && (
            <aside role="note" aria-label="Tes données" className="plai-card">
              {lienPersonnel
                ? <p>Tes résultats sont envoyés à ton enseignant avec ton code. Ton nom n’est jamais demandé.</p>
                : <p>Ce lien n’est pas ton lien personnel : tes résultats restent sur cet appareil. Demander à ton enseignant ton lien ou ton QR-code.</p>}
            </aside>
          )}
          {alerte && <p role="alert" className="plai-error">{alerte}</p>}
          {enLigne && etatTache === 'chargement' && <p role="status" className="aide">Chargement de la tâche…</p>}
          <button type="button" className="plai-btn" disabled={!codeValide(code) || !tache.pack || (enLigne && etatTache !== 'ok')} onClick={onCommencer}>Commencer</button>
          {!enLigne && codeValide(code) && !tache.pack && <p className="aide">Choisir un pack de cartes dans la zone Enseignant.</p>}
        </section>

        <section className="plai-section" aria-label="Enseignant">
          <h2>Enseignant</h2>
          {!enLigne && (
            <>
              <div className="plai-field">
                <label className="plai-label" htmlFor="pack">Pack de cartes</label>
                <input id="pack" className="plai-input" type="text" placeholder="demo" value={tache.pack || ''} onChange={e => onTache({ pack: e.target.value.trim() })} />
                <p className="aide">Nom du dossier du pack, dans « packs ». Il décide des mots proposés aux élèves.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="mode">Cartes</label>
                <select id="mode" className="plai-input" value={tache.modeMot} onChange={e => onTache({ modeMot: e.target.value })}>
                  <option value="sans">sans le mot : l’élève trouve le mot à l’oreille</option>
                  <option value="avec">avec le mot : l’élève recopie le modèle</option>
                </select>
                <p className="aide">Change la face de la carte montrée : l’écriture se travaille de deux façons différentes.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="habillage">Habillage</label>
                <select id="habillage" className="plai-input" value={tache.habillage} onChange={e => onTache({ habillage: e.target.value })}>
                  <option value="album">album (P1 à P3)</option>
                  <option value="sobre">sobre (P4 et au-delà)</option>
                </select>
                <p className="aide">Change les couleurs et les formes. Les mots restent toujours en Arial.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="intrus">Nombre de cubes en trop</label>
                <select id="intrus" className="plai-input" value={tache.nbIntrus} onChange={e => onTache({ nbIntrus: Number(e.target.value) })}>
                  {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <p className="aide">Des cubes qui ne servent pas, pour que l’élève doive choisir. 0 rend la tâche plus facile.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="accents"><input id="accents" type="checkbox" checked={tache.exigerAccents} onChange={e => onTache({ exigerAccents: e.target.checked })} /> Exiger les accents</label>
                <p className="aide">Si la case est vide, « e » est accepté à la place de « é ».</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="lien">Lien de la tâche</label>
                <input id="lien" className="plai-input" type="text" readOnly value={lien} placeholder="Choisir un pack pour obtenir le lien" onFocus={e => e.target.select()} />
                <p className="aide">À copier ou à transformer en QR : il ouvre ce pack avec ces réglages. Chaque élève saisit ensuite son code.</p>
              </div>
            </>
          )}

          {avertissements.length > 0 && (
            <div className="plai-card" aria-label="À vérifier">
              <h3>À vérifier</h3>
              <ul>{avertissements.map(a => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {!persistant && <p className="plai-banner">Les essais ne sont pas conservés sur cet appareil : le navigateur refuse la sauvegarde. Exporter les essais après chaque séance.</p>}
          <p className="aide">{nbEssais} essai(s) enregistré(s) sur cet appareil.</p>
          {peutEnvoyer && (
            <div className="actions">
              <button type="button" className="plai-btn-ghost" onClick={onEnvoyerAttente} disabled={enAttente === 0}>Envoyer les essais en attente ({enAttente})</button>
            </div>
          )}
          {messageEnvoi && <p role="status" className="aide">{messageEnvoi}</p>}
          <div className="actions">
            <button type="button" className="plai-btn-ghost" onClick={onExportJson} disabled={nbEssais === 0}>Exporter les essais (JSON)</button>
            <button type="button" className="plai-btn-ghost" onClick={onExportCsv} disabled={nbEssais === 0}>Exporter les essais (CSV)</button>
          </div>
        </section>
      </main>
      <footer className="plai-footer">
        <p><img className="logo-pied" src={`${base}plai-logo.jpg`} alt="PLAI" /></p>
        <p>Pôle Liégeois d’Accompagnement vers une École Inclusive</p>
      </footer>
    </>
  );
}
