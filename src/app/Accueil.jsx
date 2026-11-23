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
                <label className="plai-label" htmlFor="pack">Liste de mots</label>
                {packsListe.length > 0
                  ? (
                    <select id="pack" className="plai-input" value={tache.pack || ''} onChange={e => onTache({ pack: e.target.value })}>
                      <option value="">Choisir une liste</option>
                      {packsListe.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      {/* pack venu d'un lien mais absent de la liste publique (pack en validation) : sans cette ligne, la liste afficherait « Choisir une liste » alors que le pack est retenu */}
                      {tache.pack && !packsListe.some(p => p.id === tache.pack) && <option value={tache.pack}>{tache.pack} (liste ouverte par lien)</option>}
                    </select>
                  )
                  : <input id="pack" className="plai-input" type="text" placeholder="demo" value={tache.pack || ''} onChange={e => onTache({ pack: e.target.value.trim() })} />}
                <p className="aide">Elle décide des mots proposés à l’élève. Choisir une liste pour pouvoir commencer.</p>
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
          <p className="page-chapo">Pour un essai : choisir une liste de mots et des réglages, puis copier le lien ou faire scanner le QR-code.</p>
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
              <fieldset className="plai-field">
                <legend className="plai-label">Pièces de plusieurs lettres (blocs)</legend>
                {[[2, 'ch, ou, on, an, oi…'], [3, 'eau, ain, ein, oin…'], [4, 'ouil, euil']].map(([n, ex]) => (
                  <label key={n} htmlFor={`dig${n}`} style={{ display: 'block' }}>
                    <input id={`dig${n}`} type="checkbox" checked={(tache.digraphes || []).includes(n)}
                      onChange={e => onTache({ digraphes: [...(tache.digraphes || []).filter(x => x !== n), ...(e.target.checked ? [n] : [])].sort() })} /> Blocs de {n} lettres ({ex})
                  </label>
                ))}
                <p className="aide">Case cochée : les lettres qui forment ce son (par exemple « ch » dans chat) sont une seule pièce à poser, ce qui aide à mémoriser l’association. Case vide : l’élève pose chaque lettre, donc il doit savoir lui-même qu’il faut « c » puis « h ». Par défaut tout est coché (P1). Pour les plus jeunes ou les élèves en difficulté, laisser coché ; pour les plus grands, décocher. Ce réglage est dans le lien rapide ; il n’est pas encore dans les tâches enregistrées de l’espace enseignant.</p>
              </fieldset>
              <div className="plai-field">
                <label className="plai-label" htmlFor="muet">Lettre muette grisée</label>
                <select id="muet" className="plai-input" value={tache.muet || 'origine'} onChange={e => onTache({ muet: e.target.value })}>
                  <option value="origine">Dès le plateau (l’élève voit quelle pièce est muette)</option>
                  <option value="depot">Seulement une fois posée (l’élève doit décider seul)</option>
                </select>
                <p className="aide">Dès le plateau : la pièce muette (le t de « chat ») est déjà grise, c’est une aide. Une fois posée : elle a d’abord la couleur d’une consonne ou d’une voyelle et ne devient grise qu’au dépôt, donc l’élève n’a pas d’indice avant de la poser. Dans les deux cas elle reste grise après le dépôt. Ce réglage est dans le lien rapide ; il n’est pas encore dans les tâches enregistrées de l’espace enseignant.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="syllabes">Écoute par syllabes</label>
                <select id="syllabes" className="plai-input" value={tache.syllabes || 'toujours'} onChange={e => onTache({ syllabes: e.target.value })}>
                  <option value="toujours">Proposée pour tous les mots de deux syllabes ou plus</option>
                  <option value="aide">Proposée seulement quand l’élève a du mal</option>
                  <option value="non">Jamais</option>
                </select>
                <p className="aide">Ce réglage ne lit rien tout seul : il rend le bouton « Écouter par syllabes » disponible. « Quand l’élève a du mal » : le bouton apparaît sur une carte après une erreur ou après un clic sur « Besoin d’aide ? ». Pas de bouton pour un mot d’une seule syllabe, ni pour un mot dont les syllabes ne sont pas encore préparées.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="vitesse">Vitesse de la voix</label>
                <select id="vitesse" className="plai-input" value={tache.vitesse || 100} onChange={e => onTache({ vitesse: Number(e.target.value) })}>
                  <option value={100}>Normale (100 %)</option>
                  <option value={75}>Lente (75 %)</option>
                  <option value={50}>Très lente (50 %)</option>
                </select>
                <label className="plai-label" htmlFor="verrou"><input id="verrou" type="checkbox" checked={!!tache.vitesseVerrou} onChange={e => onTache({ vitesseVerrou: e.target.checked })} /> Verrouiller cette vitesse</label>
                <p className="aide">Vitesse de départ pour les mots et les sons lus. Case vide : l’élève voit trois boutons (normale, lente, très lente) et peut en changer. Case cochée : pas de boutons, tous les élèves entendent cette vitesse. L’écoute par syllabes garde ses réglages propres.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="commandes">Commandes de l’élève</label>
                <select id="commandes" className="plai-input" value={tache.commandes || 'complet'} onChange={e => onTache({ commandes: e.target.value })}>
                  <option value="complet">Complètes : icônes avec texte, toutes les aides visibles</option>
                  <option value="epure">Épurées : icônes seules, l’essentiel (pour les élèves qui ne lisent pas encore)</option>
                </select>
                <p className="aide">Épurées : la voix lit le mot dès que la carte apparaît, l’écran ne garde que écouter, retirer, aide, image et vérifier ; un seul bouton à droite sert à vérifier puis à passer à la carte suivante ; la vitesse de la voix se règle par une seule icône (tortue). Ce réglage est dans le lien rapide ; il n’est pas encore dans les tâches enregistrées de l’espace enseignant.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="consignes">Consignes vocales</label>
                <select id="consignes" className="plai-input" value={tache.consignes || 'auto'} onChange={e => onTache({ consignes: e.target.value === 'auto' ? undefined : e.target.value })}>
                  <option value="auto">Automatique : oui avec les commandes épurées, non sinon</option>
                  <option value="voix">Oui : la voix dit quoi faire</option>
                  <option value="non">Non</option>
                </select>
                <p className="aide">Pour P1 à P3 : la voix dit la consigne au départ (« Écouter le mot. Puis poser les lettres dans l’ordre. »), puis, quand le mot est juste, un encouragement tiré au hasard (« Bravo ! », « Super ! », « Bien joué ! »…) ; quand il est faux, une phrase d’aide (« Presque ! On regarde ensemble. »…) puis le mot est rejoué ; enfin « Remplir toutes les cases, puis vérifier. » et « C’est fini. » au bon moment. L’élève qui ne lit pas encore n’a ainsi pas besoin des messages écrits. Les fichiers sont à générer une fois avec la voix (python essai-tts-ipa/generer-bibliotheque.py consignes) ; sans eux, la consigne reste silencieuse et le jeu continue. Ce réglage est dans le lien rapide ; il n’est pas encore dans les tâches enregistrées de l’espace enseignant.</p>
              </div>
              <div className="plai-field">
                <label className="plai-label" htmlFor="lien">Lien de la tâche</label>
                <input id="lien" className="plai-input" type="text" readOnly value={lien} placeholder="Choisir une liste pour obtenir le lien" onFocus={e => e.target.select()} />
                {qr && <img src={qr} alt="QR-code du lien de la tâche" width="200" height="200" className="qr-accueil" />}
                <p className="aide">À copier ou à scanner : il ouvre cette liste avec ces réglages. Chaque élève saisit ensuite son code.</p>
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
          {!enLigne && codeValide(code) && !tache.pack && <p className="aide">Choisir une liste de cartes.</p>}
        </section>
        {blocEssais}
        <p className="aide retour-accueil"><a href="#/">Retour à l’accueil</a> · <a href="#/enseignant">Je suis enseignant</a></p>
      </main>
    </Cadre>
  );
}
