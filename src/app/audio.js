/* Lecture des sons. Ne lève jamais : un fichier absent ou un refus du navigateur (lecture automatique bloquée)
   va dans `manquants`, l'élève ne voit rien. Un nouvel appel interrompt le précédent. */
let jeton = 0;

// Lit un fichier ; résout à true s'il a été lu jusqu'au bout, false s'il est absent ou refusé.
function lireUn(url, creerAudio) {
  return new Promise(fini => {
    let signale = false;
    const rate = () => { if (!signale) { signale = true; fini(false); } };
    let audio;
    try { audio = creerAudio(url); } catch (e) { return rate(); }
    audio.onended = () => { if (!signale) { signale = true; fini(true); } };
    audio.onerror = rate;
    let p;
    try { p = audio.play(); } catch (e) { return rate(); }
    if (p && typeof p.catch === 'function') p.catch(rate);
  });
}

// Un son par graphème : <base><id>.wav, joués l'un après l'autre.
export async function jouerSons(ids, options = {}) {
  const { base = '/sons/', extension = '.wav', creerAudio = url => new Audio(url) } = options;
  const mon = ++jeton;
  const manquants = [];
  for (const id of ids) {
    if (mon !== jeton) break;
    if (!(await lireUn(`${base}${encodeURIComponent(id)}${extension}`, creerAudio))) manquants.push(id);
  }
  return { manquants };
}

// Un fichier entier (par exemple le mot prononcé en une fois) à l'adresse donnée.
export async function jouerFichier(url, options = {}) {
  const { creerAudio = u => new Audio(u) } = options;
  ++jeton;
  return { manquants: (await lireUn(url, creerAudio)) ? [] : [url] };
}
