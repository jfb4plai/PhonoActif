/* Lecture des sons (un son par graphème). Ne lève jamais : un son absent ou un refus du navigateur
   (lecture automatique bloquée) va dans `manquants`, l'élève ne voit rien. Un nouvel appel interrompt le précédent. */
let jeton = 0;

export async function jouerSons(ids, options = {}) {
  const { base = '/sons/', extension = '.wav', creerAudio = url => new Audio(url) } = options;
  const mon = ++jeton;
  const manquants = [];
  for (const id of ids) {
    if (mon !== jeton) break;
    await new Promise(fini => {
      let signale = false;
      const rate = () => { if (!signale) { signale = true; manquants.push(id); } fini(); };
      let audio;
      try { audio = creerAudio(`${base}${encodeURIComponent(id)}${extension}`); } catch (e) { return rate(); }
      audio.onended = () => fini();
      audio.onerror = rate;
      let p;
      try { p = audio.play(); } catch (e) { return rate(); }
      if (p && typeof p.catch === 'function') p.catch(rate);
    });
  }
  return { manquants };
}
