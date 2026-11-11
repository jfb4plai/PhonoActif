import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lireAdresse, ecrireAdresse, REGLAGES_PAR_DEFAUT } from './route.js';
import { codeValide } from './code.js';
import { chargerPack } from './chargerPack.js';
import { jouerSons } from './audio.js';
import { stockageLocal, exporterJson, exporterCsv } from '../jeu/essais.js';
import { chargerTache, envoyerEssais, stockageEnvoyes } from '../sync/envoi.js';
import { configurationSupabase } from '../lib/supabase.js';
import Accueil from './Accueil.jsx';
import Jeu from './Jeu.jsx';
import Bilan from './Bilan.jsx';

function telecharger(nom, texte, type) {
  const url = URL.createObjectURL(new Blob([texte], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const TEXTES_ENVOI = {
  ok: 'Résultats envoyés',
  reseau: 'Pas de connexion : l’envoi se fera plus tard.',
  code_inconnu: 'Ce code n’est pas dans la classe : demander à l’enseignant.',
  tache_inconnue: 'Cette tâche n’existe plus.',
  refuse: 'L’envoi a été refusé : prévenir l’enseignant.'
};

// deps : injection pour les tests (fetch, stockage, stockageEnvoyes, supabase, jouerSons, rng, maintenant, hash, base)
const Enseignant = React.lazy(() => import('../enseignant/Enseignant.jsx'));

export default function App({ deps = {} }) {
  const enseignant = lireAdresse(deps.hash ?? window.location.hash).ecran === 'enseignant';
  if (enseignant) {
    return (
      <React.Suspense fallback={<p>Chargement…</p>}>
        <Enseignant deps={deps.enseignant || {}} />
      </React.Suspense>
    );
  }
  return <AppEleve deps={deps} />;
}

function AppEleve({ deps }) {
  const base = deps.base ?? (import.meta.env && import.meta.env.BASE_URL) ?? '/';
  const adresse = useRef(lireAdresse(deps.hash ?? window.location.hash)).current;
  const stockage = useRef(deps.stockage || stockageLocal()).current;
  const envoyes = useRef(deps.stockageEnvoyes || stockageEnvoyes()).current;
  const config = useRef(deps.supabase !== undefined ? deps.supabase : configurationSupabase(import.meta.env)).current;
  const jouer = deps.jouerSons || (ids => jouerSons(ids, { base: `${base}sons/` }));

  const jeton = adresse.tache && adresse.tache.jeton;
  const enLigne = !!jeton;

  const [tache, setTache] = useState({ ...REGLAGES_PAR_DEFAUT, pack: '', ...adresse.tache });
  const [etatTache, setEtatTache] = useState(enLigne ? (config ? 'chargement' : 'hors_service') : 'non');
  const [code, setCode] = useState('');
  const [vue, setVue] = useState('accueil');
  const [pack, setPack] = useState(null);
  const [cleJeu, setCleJeu] = useState(0);
  const [erreur, setErreur] = useState('');
  const [avertissementsPack, setAvertissementsPack] = useState([]);
  const [signalements, setSignalements] = useState({});
  const [messageEnvoi, setMessageEnvoi] = useState('');
  const [, rafraichir] = useState(0);

  useEffect(() => {
    if (!enLigne || !config) return undefined;
    let actif = true;
    chargerTache(jeton, config)
      .then(t => {
        if (!actif) return;
        setTache(x => ({ ...x, pack: t.pack, modeMot: t.modeMot, habillage: t.habillage, nbIntrus: t.nbIntrus, exigerAccents: t.exigerAccents }));
        setEtatTache('ok');
      })
      .catch(e => { if (actif) setEtatTache(e.message === 'tâche inconnue' ? 'inconnue' : e.message === 'réseau' ? 'reseau' : 'hors_service'); });
    return () => { actif = false; };
  }, [enLigne, jeton, config]);

  // Envoie ce qui attend, groupé par (jeton, code) : chaque ligne porte le jeton et le code avec lesquels elle a été jouée.
  const envoyerEnAttente = useCallback(async () => {
    const resume = { envoyes: 0, restants: 0, erreur: null };
    if (!config) return resume;
    const dejaEnvoyes = envoyes.lire();
    const groupes = new Map();
    for (const l of stockage.lire()) {
      if (!l.jeton || dejaEnvoyes.has(l.id)) continue;
      const cle = `${l.jeton}|${l.code}`;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(l);
    }
    for (const lignes of groupes.values()) {
      const r = await envoyerEssais({ lignes, dejaEnvoyes, token: lignes[0].jeton, code: lignes[0].code, supabase: config });
      envoyes.ajouter(r.ids);
      r.ids.forEach(i => dejaEnvoyes.add(i));
      resume.envoyes += r.envoyes; resume.restants += r.restants;
      if (r.erreur && !resume.erreur) resume.erreur = r.erreur;
    }
    rafraichir(n => n + 1);
    return resume;
  }, [config, envoyes, stockage]);

  // Envoi silencieux à l'ouverture et au retour du réseau
  useEffect(() => {
    if (!config) return undefined;
    envoyerEnAttente();
    const surRetour = () => { envoyerEnAttente(); };
    window.addEventListener('online', surRetour);
    return () => window.removeEventListener('online', surRetour);
  }, [config, envoyerEnAttente]);

  const surEnvoiManuel = async () => {
    const r = await envoyerEnAttente();
    setMessageEnvoi(TEXTES_ENVOI[r.erreur || 'ok']);
  };

  const signaler = (type, detail) => setSignalements(s => (s[`${type}:${detail}`] ? s : {
    ...s, [`${type}:${detail}`]: type === 'son' ? `Son sans fichier ou lecture refusée : ${detail}` : `Image introuvable : ${detail}`
  }));
  const avertissements = [...new Set([...avertissementsPack, ...Object.values(signalements)])];

  const carteUnique = adresse.ecran === 'carte' && adresse.tache && adresse.tache.pack === tache.pack;
  const origine = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : base;
  const lien = tache.pack ? ecrireAdresse(origine, carteUnique ? 'carte' : 'jeu', { ...tache, jeton: undefined }, adresse.carte) : '';
  const dejaEnvoyes = envoyes.lire();
  const enAttente = stockage.lire().filter(l => l.jeton && !dejaEnvoyes.has(l.id)).length;

  async function commencer() {
    if (!codeValide(code) || !tache.pack) return;
    if (enLigne && etatTache !== 'ok') return;
    setErreur('');
    try {
      const { pack: charge, avertissements: av } = await chargerPack(tache.pack, { base, fetch: deps.fetch });
      let utilise = charge;
      if (carteUnique) {
        const cartes = charge.cartes.filter(c => c.id === adresse.carte);
        if (cartes.length === 0) { setErreur('Cette carte n’existe pas dans ce pack.'); return; }
        utilise = { ...charge, cartes };
      }
      setAvertissementsPack(av);
      setPack(utilise);
      setCleJeu(k => k + 1);
      setVue('jeu');
    } catch (e) {
      setErreur(e.message);
    }
  }

  const surTache = patch => setTache(t => ({ ...t, ...patch }));

  return (
    <div className="app" data-habillage={tache.habillage}>
      {vue === 'accueil' && (
        <Accueil base={base} tache={tache} code={code} onCode={setCode} onTache={surTache} onCommencer={commencer} erreur={erreur}
          avertissements={avertissements} persistant={stockage.persistant} lien={lien} nbEssais={stockage.lire().length}
          enLigne={enLigne} etatTache={etatTache} peutEnvoyer={!!config} enAttente={enAttente} onEnvoyerAttente={surEnvoiManuel} messageEnvoi={messageEnvoi}
          onExportJson={() => telecharger('essais.json', exporterJson(stockage.lire()), 'application/json')}
          onExportCsv={() => telecharger('essais.csv', exporterCsv(stockage.lire()), 'text/csv;charset=utf-8')} />
      )}
      {vue === 'jeu' && pack && (
        <Jeu key={cleJeu} pack={pack} tache={tache} code={code} stockage={stockage} base={base}
          deps={{ jouerSons: jouer, rng: deps.rng, maintenant: deps.maintenant }}
          onFin={() => setVue('bilan')} onAccueil={() => setVue('accueil')} onSignalement={signaler} />
      )}
      {vue === 'bilan' && pack && (
        <Bilan nbCartes={pack.cartes.length} peutEnvoyer={enLigne && !!config} onEnvoyer={surEnvoiManuel} messageEnvoi={messageEnvoi}
          onRejouer={() => { setMessageEnvoi(''); setCleJeu(k => k + 1); setVue('jeu'); }} onAccueil={() => setVue('accueil')} />
      )}
    </div>
  );
}
