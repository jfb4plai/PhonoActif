/* Lecture des sons. Ne lève jamais : un fichier absent ou un refus du navigateur (lecture automatique bloquée)
   va dans `manquants`, l'élève ne voit rien. Un nouvel appel interrompt le précédent. */
let jeton = 0;

// Lit un fichier ; résout à true s'il a été lu jusqu'au bout, false s'il est absent ou refusé.
function lireUn(url, creerAudio, vitesse = 1) {
  return new Promise(fini => {
    let signale = false;
    const rate = () => { if (!signale) { signale = true; fini(false); } };
    let audio;
    try { audio = creerAudio(url); } catch (e) { return rate(); }
    audio.onended = () => { if (!signale) { signale = true; fini(true); } };
    audio.onerror = rate;
    if (vitesse !== 1) {
      // ralentissement sans changer la hauteur de la voix (comportement attendu des navigateurs récents : à écouter)
      try { audio.preservesPitch = true; audio.webkitPreservesPitch = true; audio.playbackRate = vitesse; } catch (e) { /* lecture à vitesse normale */ }
    }
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

/* Écoute « par syllabes » : les fichiers l'un après l'autre, avec un espace entre eux, la dernière syllabe ralentie.
   Valeurs choisies à l'oreille par JF (2026-11-13) : 500 ms et 75 % (voir REGLAGES_SYLLABES dans src/jeu/modeA.js). */
export async function jouerSerie(urls, options = {}) {
  const { pauseMs = 500, vitesseDerniere = 0.75, creerAudio = u => new Audio(u), attendre = ms => new Promise(r => setTimeout(r, ms)) } = options;
  const mon = ++jeton;
  const manquants = [];
  for (let i = 0; i < urls.length; i++) {
    if (mon !== jeton) break;
    const dernier = i === urls.length - 1;
    if (!(await lireUn(urls[i], creerAudio, dernier ? vitesseDerniere : 1))) manquants.push(urls[i]);
    if (!dernier && mon === jeton) await attendre(pauseMs);
  }
  return { manquants };
}
