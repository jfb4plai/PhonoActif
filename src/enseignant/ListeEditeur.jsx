import React, { useMemo, useState } from 'react';
import { LISTE_MAX } from '../core/liste.js';
import { enregistrerListe } from './listes.js';
import Catalogue from './Catalogue.jsx';

/* Composer une liste de 1 à 50 mots : nom, mots choisis dans le catalogue (ou depuis un modèle), ordre, enregistrement.
   Props : client, userId, catalogue, modeles, liste ({ id, nom, mots } pour modifier), jouer(url), base, onFini(liste), onAnnuler(). */
export default function ListeEditeur({ client, userId, catalogue, modeles = [], liste = null, jouer, base = '/', onFini, onAnnuler }) {
  const [nom, setNom] = useState(liste ? liste.nom : '');
  const [mots, setMots] = useState(liste ? liste.mots : []);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const ids = useMemo(() => new Set(catalogue.map(e => e.id)), [catalogue]);
  const parId = useMemo(() => new Map(catalogue.map(e => [e.id, e])), [catalogue]);
  const choisis = useMemo(() => new Set(mots), [mots]);
  const racine = String(base).replace(/\/+$/, '') + '/';
  const trop = mots.length - LISTE_MAX;

  const basculer = id => {
    setErreur('');
    if (choisis.has(id)) { setMots(m => m.filter(x => x !== id)); return; }
    if (mots.length >= LISTE_MAX) { setErreur(`Une liste contient au plus ${LISTE_MAX} mots.`); return; }
    setMots(m => [...m, id]);
  };
  const deplacer = (i, d) => setMots(m => { const c = [...m]; const j = i + d; if (j < 0 || j >= c.length) return m; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const partirDe = idModele => {
    setErreur('');
    const m = modeles.find(x => x.id === idModele);
    setMots(m ? m.mots.filter(x => ids.has(x)) : []);
  };
  const enregistrer = async () => {
    setErreur(''); setEnCours(true);
    try { onFini(await enregistrerListe(client, userId, { id: liste ? liste.id : undefined, nom, mots }, { catalogueIds: ids })); }
    catch (e) { setErreur(e.message); } finally { setEnCours(false); }
  };

  return (
    <section role="region" aria-label="Composer une liste" className="ens-editeur">
      <h3>Composer une liste</h3>
      <label htmlFor="liste-nom">Nom de la liste</label>
      <input id="liste-nom" value={nom} maxLength={60} onChange={e => setNom(e.target.value)} placeholder="ex. : Semaine 3 : les mots en an" />
      <p className="aide">Ce nom n’apparaît que pour vous. Il vous sert à retrouver la liste quand vous créez une tâche.</p>
      {modeles.length > 0 && (<>
        <label htmlFor="liste-modele">Partir d’un modèle</label>
        <select id="liste-modele" value="" onChange={e => partirDe(e.target.value)}>
          <option value="">Aucun : je choisis les mots un par un</option>
          {modeles.map(m => <option key={m.id} value={m.id}>{m.titre} ({m.mots.length} mots)</option>)}
        </select>
        <p className="aide">Un modèle est une liste prête. Remplace les mots déjà choisis ; on peut ensuite en retirer ou en ajouter.</p>
      </>)}
      <p role="status" className="ens-compteur"><strong>{mots.length} / {LISTE_MAX} mots</strong></p>
      {trop > 0 && <p role="alert">Retirez {trop} mot{trop > 1 ? 's' : ''} pour enregistrer.</p>}
      {mots.length > 0 && (
        <ol className="ens-liste-choisie" aria-label="Mots de la liste">
          {mots.map((id, i) => (
            <li key={id}>
              {parId.get(id) ? parId.get(id).mot : id}
              <button type="button" aria-label={`Retirer ${id}`} onClick={() => basculer(id)}>Retirer</button>
              <button type="button" aria-label={`Monter ${id}`} disabled={i === 0} onClick={() => deplacer(i, -1)}>↑</button>
              <button type="button" aria-label={`Descendre ${id}`} disabled={i === mots.length - 1} onClick={() => deplacer(i, 1)}>↓</button>
            </li>
          ))}
        </ol>
      )}
      <p className="aide">Les élèves jouent les mots dans cet ordre. Une liste contient de 1 à {LISTE_MAX} mots.</p>
      {erreur && <p role="alert" className="ens-message">{erreur}</p>}
      <Catalogue catalogue={catalogue} choisis={choisis} onBasculer={basculer} onEcouter={e => jouer && jouer(`${racine}mots/${e.audio}`)} />
      <button type="button" className="principal" disabled={enCours || mots.length < 1 || trop > 0} onClick={enregistrer}>Enregistrer la liste</button>
      <button type="button" onClick={onAnnuler}>Annuler</button>
    </section>
  );
}
