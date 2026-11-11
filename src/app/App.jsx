import React, { useRef, useState } from 'react';
import { lireAdresse, ecrireAdresse, REGLAGES_PAR_DEFAUT } from './route.js';
import { codeValide } from './code.js';
import { chargerPack } from './chargerPack.js';
import { jouerSons } from './audio.js';
import { stockageLocal, exporterJson, exporterCsv } from '../jeu/essais.js';
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

// deps : injection pour les tests (fetch, stockage, jouerSons, rng, maintenant, hash, base)
export default function App({ deps = {} }) {
  const base = deps.base ?? (import.meta.env && import.meta.env.BASE_URL) ?? '/';
  const adresse = useRef(lireAdresse(deps.hash ?? window.location.hash)).current;
  const stockage = useRef(deps.stockage || stockageLocal()).current;
  const jouer = deps.jouerSons || (ids => jouerSons(ids, { base: `${base}sons/` }));

  const [tache, setTache] = useState({ ...REGLAGES_PAR_DEFAUT, pack: '', ...adresse.tache });
  const [code, setCode] = useState('');
  const [vue, setVue] = useState('accueil');
  const [pack, setPack] = useState(null);
  const [cleJeu, setCleJeu] = useState(0);
  const [erreur, setErreur] = useState('');
  const [avertissementsPack, setAvertissementsPack] = useState([]);
  const [signalements, setSignalements] = useState({});

  const signaler = (type, detail) => setSignalements(s => (s[`${type}:${detail}`] ? s : {
    ...s, [`${type}:${detail}`]: type === 'son' ? `Son sans fichier ou lecture refusée : ${detail}` : `Image introuvable : ${detail}`
  }));
  const avertissements = [...new Set([...avertissementsPack, ...Object.values(signalements)])];

  const carteUnique = adresse.ecran === 'carte' && adresse.tache && adresse.tache.pack === tache.pack;
  const origine = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : base;
  const lien = tache.pack ? ecrireAdresse(origine, carteUnique ? 'carte' : 'jeu', tache, adresse.carte) : '';

  async function commencer() {
    if (!codeValide(code) || !tache.pack) return;
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
          onExportJson={() => telecharger('essais.json', exporterJson(stockage.lire()), 'application/json')}
          onExportCsv={() => telecharger('essais.csv', exporterCsv(stockage.lire()), 'text/csv;charset=utf-8')} />
      )}
      {vue === 'jeu' && pack && (
        <Jeu key={cleJeu} pack={pack} tache={tache} code={code} stockage={stockage} base={base}
          deps={{ jouerSons: jouer, rng: deps.rng, maintenant: deps.maintenant }}
          onFin={() => setVue('bilan')} onAccueil={() => setVue('accueil')} onSignalement={signaler} />
      )}
      {vue === 'bilan' && pack && (
        <Bilan nbCartes={pack.cartes.length} onRejouer={() => { setCleJeu(k => k + 1); setVue('jeu'); }} onAccueil={() => setVue('accueil')} />
      )}
    </div>
  );
}
