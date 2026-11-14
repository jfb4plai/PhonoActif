import React, { useEffect, useState } from 'react';
import { codeValide } from './code.js';
import Cadre from './Cadre.jsx';

const MESSAGES_TACHE = {
  inconnue: 'Cette tâche n’existe plus. Demander un nouveau lien à l’enseignant.',
  reseau: 'Pas de connexion : la tâche ne peut pas être chargée. Réessayer plus tard.',
  hors_service: 'Ce lien de tâche ne peut pas s’ouvrir sur cet appareil.'
};

export default function Accueil({
  base = '/', partie = 'eleve', tache, code, onCode, onTache, onCommencer, erreur, avertissements, persistant, lien, nbEssais, onExportJson, onExportCsv,
  packsListe = [], enLigne = false, lienPersonnel = false, etatTache = 'non', peutEnvoyer = false, enAttente = 0, onEnvoyerAttente, messageEnvoi = ''
}) {
  // QR-code du lien de tâche : calculé ici, sans réseau (bibliothèque chargée seulement quand il y a un lien)
  const [qr, setQr] = useState(null);
  useEffect(() => {
    let actif = true;
    if (!lien) { setQr(null); return undefined; }
    import('qrcode').then(m => (m.default || m).toDataURL(lien, { margin: 1, width: 256 })).then(u => { if (actif) setQr(u); }).catch(() => { if (actif) setQr(null); });
    return () => { actif = false; };
  }, [lien]);
  const messageTache = enLigne ? MESSAGES_TACHE[etatTache] : null;
  const alerte = erreur || messageTache;
  const bandeauPack = !enLigne && (
    <>
              <div className="plai-field">
                <label className="plai-label" htmlFor="pack">Pack de cartes</label>
                {packsListe.length > 0
                  ? (
                    <select id="pack" className="plai-input" value={tache.pack || ''} onChange={e => onTache({ pack: e.target.value })}>
                      <option value="">Choisir un pack</option>
                      {packsListe.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  )
                  : <input id="pack" className="plai-input" type="text" placeholder="demo" value={tache.pack || ''} onChange={e => onTache({ pack: e.target.value.trim() })} />}
                <p className="aide">Il décide des mots proposés à l’élève. Choisir un pack pour pouvoir commencer.</p>
              </div>
    </>
  );
  const blocEssais = (
    <section className="plai-section" aria-label="Mes essais sur cet appareil">
      <h2>Mes essais sur cet appareil</h2>
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
  );

  if (partie === 'lien') {
    return (
      <Cadre base={base} actif="enseignant">
        <main className="plai-container page">
          <h1 className="page-titre">Lien rapide, sans compte</h1>
          <p className="page-chapo">Pour un essai : choisir un pack et des réglages, puis copier le lien ou faire scanner le QR-code.</p>
          <p className="aide">Avec ce lien, <strong>rien n’est envoyé</strong> : les essais restent sur l’appareil de l’élève et s’exportent en fichier. Pour recevoir les résultats d’une classe, utiliser l’<a href="#/enseignant">espace enseignant</a> (<a href="#/mode-d-emploi">mode d’emploi</a>).</p>
          <section className="plai-section" aria-label="Réglages du lien">
            <h2>Réglages</h2>
            {bandeauPack}
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
                <label className="plai-label" htmlFor="syllabes">Écoute par syllabes</label>
                <select id="syllabes" className="plai-input" value={tache.syllabes || 'toujours'} onChange={e => onTache({ syllabes: e.target.value })}>
                  <option value="toujours">Proposée pour tous les mots de deux syllabes ou plus</option>
                  <option value="aide">Proposée seulement quand l’élève a du mal</option>
                  <option value="non">Jamais</option>
                </select>
                <p className="aide">Ce réglage ne lit rien tout seul : il rend le bouton « Écouter par syllabes » disponible. « Quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? ». Pas de bouton pour un mot d’une seule syllabe, ni dans un pack sans syllabes.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="lien">Lien de la tâche</label>
                <input id="lien" className="plai-input" type="text" readOnly value={lien} placeholder="Choisir un pack pour obtenir le lien" onFocus={e => e.target.select()} />
                {qr && <img src={qr} alt="QR-code du lien de la tâche" width="200" height="200" className="qr-accueil" />}
                <p className="aide">À copier ou à scanner : il ouvre ce pack avec ces réglages. Chaque élève saisit ensuite son code.</p>
              </div>
          </section>
        </main>
      </Cadre>
    );
  }

  return (
    <Cadre base={base} actif="eleve">
      <main className="plai-container accueil page">
        <section className="plai-section">
          <h1>Bonjour</h1>
          <div className="plai-field">
            <label className="plai-label" htmlFor="code">Code de l’élève</label>
            <input id="code" className="plai-input" type="text" placeholder="E07" value={code} onChange={e => onCode(e.target.value)} readOnly={lienPersonnel} autoComplete="off" maxLength={40} />
            <p className="aide">Un code, pas un nom. Lettres, chiffres et tiret, 12 au plus.{enLigne ? '' : ' Il reste sur cet appareil.'}</p>
          </div>
          {bandeauPack}
          {enLigne && (
            <aside role="note" aria-label="Tes données" className="plai-card">
              {lienPersonnel
                ? <p>Tes résultats sont envoyés à ton enseignant avec ton code. Ton nom n’est jamais demandé. <a href="#/donnees">Gestion des données</a></p>
                : <p>Ce lien n’est pas ton lien personnel : tes résultats restent sur cet appareil. Demander à ton enseignant ton lien ou ton QR-code.</p>}
            </aside>
          )}
          {alerte && <p role="alert" className="plai-error">{alerte}</p>}
          {enLigne && etatTache === 'chargement' && <p role="status" className="aide">Chargement de la tâche…</p>}
          <button type="button" className="plai-btn" disabled={!codeValide(code) || !tache.pack || (enLigne && etatTache !== 'ok')} onClick={onCommencer}>Commencer</button>
          {!enLigne && codeValide(code) && !tache.pack && <p className="aide">Choisir un pack de cartes.</p>}
        </section>
        {blocEssais}
        <p className="aide retour-accueil"><a href="#/">Retour à l’accueil</a> · <a href="#/enseignant">Je suis enseignant</a></p>
      </main>
    </Cadre>
  );
}
