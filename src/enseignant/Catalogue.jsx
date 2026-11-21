import React, { useMemo, useState } from 'react';

const normaliser = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Catalogue des mots publiés (public/mots/catalogue.json) : recherche, filtres, écoute, choix par case à cocher.
   catalogue = [{ id, mot, ipa, nbSyllabes, cubes, image, phrase, syllabes, audio }] ; choisis = Set d'identifiants ; onBasculer(id) ; onEcouter(entree). */
export default function Catalogue({ catalogue, choisis, onBasculer, onEcouter }) {
  const [q, setQ] = useState('');
  const [syll, setSyll] = useState('toutes');
  const [image, setImage] = useState('toutes');
  const [lecture, setLecture] = useState('toutes');
  const sansLecture = catalogue.every(e => !e.lecture); // fiches.json absent : pas de filtre proposé
  const visibles = useMemo(() => {
    const t = normaliser(q.trim());
    return catalogue.filter(e => {
      if (t && !normaliser(e.mot).includes(t) && !e.cubes.some(g => normaliser(g) === t)) return false;
      if (syll !== 'toutes' && (syll === '3' ? e.nbSyllabes < 3 : e.nbSyllabes !== Number(syll))) return false;
      if (image === 'avec' && !e.image) return false;
      if (image === 'sans' && e.image) return false;
      if (lecture === 'reguliere' && !(e.lecture && e.lecture.reguliere)) return false;
      if (lecture === 'finale' && !(e.lecture && e.lecture.niveau === 'finale')) return false;
      if (lecture === 'irreguliere' && !(e.lecture && e.lecture.niveau === 'irreguliere')) return false;
      return true;
    });
  }, [catalogue, q, syll, image, lecture]);
  return (
    <div className="ens-catalogue">
      <label htmlFor="cat-q">Chercher un mot</label>
      <input id="cat-q" value={q} onChange={e => setQ(e.target.value)} placeholder="ex. : chat, an, ou" />
      <p className="aide">Tapez un morceau du mot (« mai ») ou un groupe de lettres qui se lit d’un seul son (« an », « ou »). Les accents ne comptent pas.</p>
      <label htmlFor="cat-syll">Nombre de syllabes</label>
      <select id="cat-syll" value={syll} onChange={e => setSyll(e.target.value)}>
        <option value="toutes">Toutes</option><option value="1">1 syllabe</option><option value="2">2 syllabes</option><option value="3">3 syllabes et plus</option>
      </select>
      <label htmlFor="cat-image">Image</label>
      <select id="cat-image" value={image} onChange={e => setImage(e.target.value)}>
        <option value="toutes">Avec ou sans image</option><option value="avec">Avec image</option><option value="sans">Sans image</option>
      </select>
      {!sansLecture && (
        <>
          <label htmlFor="cat-lecture">Lecture du mot</label>
          <select id="cat-lecture" value={lecture} onChange={e => setLecture(e.target.value)}>
            <option value="toutes">Tous les mots</option>
            <option value="reguliere">Se lit lettre par lettre (régulière)</option>
            <option value="finale">Une seule lettre muette, à la fin (chat, petit)</option>
            <option value="irreguliere">À mémoriser (plusieurs irrégularités, ou muette au milieu)</option>
          </select>
          <p className="aide">« Se lit lettre par lettre » : chaque groupe de lettres se lit comme d’habitude et aucune lettre n’est muette ; le mot s’assemble, il convient au travail de décodage. « Une seule lettre muette, à la fin » : le mot se décode, sauf la dernière lettre qui ne se dit pas (le « t » de « chat »). « À mémoriser » : lettre muette au milieu, plusieurs irrégularités ou son inhabituel (« elle », « avec », « bien ») ; ces mots s’apprennent plutôt par cœur. Classement calculé par règle, pas par une IA ; à vous de décider quels mots garder.</p>
        </>
      )}
      <p className="aide" role="status">{visibles.length} mot{visibles.length > 1 ? 's' : ''} affiché{visibles.length > 1 ? 's' : ''} sur {catalogue.length}.</p>
      <ul className="ens-catalogue-liste">
        {visibles.map(e => (
          <li key={e.id}>
            <input type="checkbox" aria-label={`Choisir ${e.mot}`} checked={choisis.has(e.id)} onChange={() => onBasculer(e.id)} />
            <strong>{e.mot}</strong>
            <span className="aide"> {e.nbSyllabes} syll. · {e.image ? 'image' : 'sans image'} · {e.phrase ? 'phrase' : 'sans phrase'}{e.syllabes ? ' · syllabes' : ''}{e.lecture ? (e.lecture.niveau === 'finale' ? ' · muette finale' : e.lecture.reguliere ? ' · lettre par lettre' : ' · à mémoriser') : ''}</span>
            {e.audio && <button type="button" aria-label={`Écouter ${e.mot}`} onClick={() => onEcouter(e)}>Écouter</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
