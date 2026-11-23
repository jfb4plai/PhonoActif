// Limites de palier du pack progressif, calculées sur les identifiants réellement chargés.

export function paliersPourMots(ids, modeles) {
  const pos = new Map(ids.map((id, i) => [id, i]));
  for (const m of modeles || []) {
    if (!Array.isArray(m.paliers)) continue;
    const groupes = [];
    for (const p of m.paliers) {
      const presents = (p.mots || []).filter((id) => pos.has(id));
      if (!presents.length) continue;
      groupes.push({ id: p.id, difficulte: p.difficulte, annonce: p.annonce || '', ids: presents });
    }
    if (groupes.length < 2) continue;
    // Les positions doivent croître et chaque palier doit être contigu.
    let ok = true;
    let suivant = 0;
    for (const g of groupes) {
      const idx = g.ids.map((id) => pos.get(id));
      for (const i of idx) {
        if (i !== suivant) ok = false;
        suivant = i + 1;
      }
      g.debut = idx[0];
      g.fin = idx[idx.length - 1];
    }
    if (ok) return groupes;
  }
  return null;
}

export function numeroDePalier(paliers, index) {
  return (paliers || []).findIndex((p) => index >= p.debut && index <= p.fin);
}

export function estFinDePalier(paliers, index) {
  if (!paliers) return false;
  const n = numeroDePalier(paliers, index);
  return n >= 0 && n < paliers.length - 1 && paliers[n].fin === index;
}
