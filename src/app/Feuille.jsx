import React, { useEffect, useState } from 'react';
import './feuille.css';
import { chargerMots } from './chargerMots.js';
import { cartesInitiale } from './Initiale.jsx';
import { serieInitiale } from '../core/serieInitiale.js';
import { urlFichier } from './urlFichier.js';
import { ecrireAdresse } from './route.js';
import { chargerTache } from '../sync/envoi.js';
import { configurationSupabase } from '../lib/supabase.js';

/* Feuille à imprimer de l'exercice « première lettre » (maternelle) : pour chaque mot, l'image et trois lettres à entourer.
   Même série que l'écran du TBI quand le lien porte la même graine : les élèves répondent sur papier pendant qu'un élève répond au tableau (JF 2026-11-24).
   La version « corrigé » est pour l'enseignant : la bonne lettre est cerclée et le mot est écrit. Aucun nom d'élève n'est enregistré : la feuille est vierge. */
export default function Feuille({ base = '/', deps = {}, tache = {} }) {
  const [etat, setEtat] = useState({ statut: 'chargement' });
  const corrige = tache.corrige === true;
  const graine = Number.isInteger(tache.graine) ? tache.graine : 1;
  const nb = Number.isInteger(tache.nb) ? tache.nb : 8;

  useEffect(() => {
    let actif = true;
    const chercher = deps.fetch || globalThis.fetch;
    (async () => {
      try {
        let mots;
        if (tache.jeton) {
          // Tâche enregistrée par l'enseignant : les mots sont lus dans la tâche (même appel que le jeu élève).
          const config = deps.supabase !== undefined ? deps.supabase : configurationSupabase(import.meta.env);
          if (!config) throw new Error('Le service n’est pas disponible pour le moment : réessayer plus tard.');
          const t = await chargerTache(tache.jeton, config).catch(e => { throw new Error(e.message === 'tâche inconnue' ? 'Cette tâche n’existe pas ou a été révoquée.' : 'Impossible de lire la tâche pour le moment : réessayer plus tard.'); });
          mots = t.mots;
          if (!mots || mots.length === 0) throw new Error('Cette tâche ne contient aucun mot.');
        } else {
          if (!tache.pack) throw new Error('Aucune liste choisie : revenir au lien rapide et choisir « Maternelle : la première lettre ».');
          const r = await chercher(`${String(base).replace(/\/+$/, '')}/mots/modeles.json`);
          const modeles = r && r.ok ? await r.json() : [];
          const modele = Array.isArray(modeles) ? modeles.find(m => m.id === tache.pack && Array.isArray(m.mots)) : null;
          if (!modele) throw new Error('Cette liste de mots n’existe pas.');
          mots = modele.mots;
        }
        const { pack } = await chargerMots(mots, { base, fetch: chercher });
        const serie = serieInitiale(cartesInitiale(pack), graine, nb);
        if (serie.length === 0) throw new Error('Aucun mot de cette liste ne commence par une voyelle avec une image.');
        if (actif) setEtat({ statut: 'pret', pack, serie });
      } catch (e) { if (actif) setEtat({ statut: 'erreur', message: e.message }); }
    })();
    return () => { actif = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Liens de retour et de bascule vers le corrigé : mêmes réglages, autre page.
  const query = ecrireAdresse('', 'jeu', { ...tache, jeton: undefined }).split('#/jeu?')[1] || '';
  // Tâche enregistrée : retour aux tâches de la classe (espace enseignant) ; sinon retour au lien rapide.
  const versLien = tache.jeton ? '#/enseignant' : `#/lien?${query}`;
  const versFeuille = c => (tache.jeton ? ecrireAdresse('', 'feuille', { ...tache, corrige: !!c }).slice(1) : `#/feuille?${query}${c ? '&corrige=1' : ''}`);

  return (
    <main className={`feuille${corrige ? ' feuille-corrige' : ''}`}>
      <div className="feuille-ecran">
        <a href={versLien}>{tache.jeton ? '← Retour à l’espace enseignant' : '← Retour au lien rapide'}</a>
        <button type="button" className="plai-btn" onClick={() => window.print()} disabled={etat.statut !== 'pret'}>Imprimer cette page</button>
        <a href={versFeuille(!corrige)}>{corrige ? 'Voir la feuille des élèves' : 'Voir le corrigé (enseignant)'}</a>
        <p className="aide">{corrige ? 'Corrigé : à garder, ne pas distribuer.' : 'Feuille des élèves : imprimer en noir et blanc suffit. Pour la même série au tableau, ouvrir le lien du TBI avec la même graine (c’est le cas depuis le lien rapide).'}</p>
      </div>

      {etat.statut === 'chargement' && <p role="status">Préparation de la feuille…</p>}
      {etat.statut === 'erreur' && <p role="alert" className="plai-error">{etat.message}</p>}
      {etat.statut === 'pret' && (
        <>
          <header className="feuille-entete">
            <h1>{corrige ? 'Corrigé : la première lettre' : 'La première lettre'}</h1>
            {!corrige && <p className="feuille-nom">Prénom : ______________________ &nbsp; Date : ____________</p>}
            <p className="feuille-consigne">Regarder l’image. Entourer la première lettre du mot.</p>
          </header>
          <ol className="feuille-grille" aria-label="Mots de la feuille">
            {etat.serie.map(({ carte, cible, lettres }, k) => (
              <li key={carte.id} className="feuille-carte">
                <span className="feuille-num">{k + 1}</span>
                <img src={urlFichier(base, etat.pack, String(carte.image_sans_mot))} alt={corrige ? `Image : ${carte.mot}` : 'Image du mot'} />
                <div className="feuille-lettres">
                  {lettres.map(l => <span key={l} className={`feuille-lettre${corrige && l === cible ? ' juste' : ''}`}>{l}</span>)}
                </div>
                {corrige && <p className="feuille-mot">{carte.mot}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
