/* Journal des essais. LigneEssai et PositionEssai sont produites par session.js (verifier / aider).
   Stockage : sur l'appareil seulement (rien n'est envoyé nulle part). Aucune durée n'est enregistrée. */

const CLE_PAR_DEFAUT = 'phonoactif-essais-v1';

export function stockageMemoire() {
  let lignes = [];
  return {
    ajouter: l => { lignes.push(l); },
    lire: () => lignes.slice(),
    vider: () => { lignes = []; },
    persistant: false
  };
}

// Stockage du navigateur ; s'il est refusé, plein ou illisible, on continue en mémoire (persistant passe à false).
export function stockageLocal(options = {}) {
  const cle = options.cle || CLE_PAR_DEFAUT;
  let storage;
  try { storage = 'storage' in options ? options.storage : globalThis.localStorage; } catch (e) { storage = undefined; }
  let lignes = [];
  let persistant = !!storage;
  if (storage) {
    let brut = null;
    try { brut = storage.getItem(cle); } catch (e) { persistant = false; }
    if (brut) {
      try { const donnees = JSON.parse(brut); if (Array.isArray(donnees)) lignes = donnees; } catch (e) { lignes = []; }
    }
  }
  const ecrire = () => {
    if (!storage) return;
    try { storage.setItem(cle, JSON.stringify(lignes)); } catch (e) { persistant = false; }
  };
  return {
    ajouter: l => { lignes.push(l); ecrire(); },
    lire: () => lignes.slice(),
    vider: () => {
      lignes = [];
      if (!storage) return;
      try { storage.removeItem(cle); } catch (e) { persistant = false; }
    },
    get persistant() { return persistant; }
  };
}

export const exporterJson = lignes => JSON.stringify(lignes, null, 1);

const champ = v => (/[;"\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function exporterCsv(lignes) {
  const entete = 'date;code;pack;carte;mot;mode;tentative;juste;aide;positions';
  const corps = lignes.map(l => [
    l.date, l.code, l.pack, l.carte, l.mot, l.modeMot, l.tentative, l.juste ? 'oui' : 'non', l.aide,
    l.positions.map(p => `${p.liaison}:${p.pose === null ? '' : p.pose}:${p.juste ? 'ok' : 'ko'}`).join('|')
  ].map(champ).join(';'));
  return '\uFEFF' + [entete, ...corps].join('\r\n');
}

/* Par liaison graphème=son : essais du premier coup (tentative 1), réussites du premier coup,
   reprises (positions des tentatives suivantes) et graphèmes posés à la place (confusions). Comparaison exacte des chaînes. */
export function resumerParLiaison(lignes) {
  const parLiaison = new Map();
  const de = liaison => {
    if (!parLiaison.has(liaison)) parLiaison.set(liaison, { liaison, essais: 0, justesDuPremierCoup: 0, reprises: 0, confusions: {} });
    return parLiaison.get(liaison);
  };
  for (const l of lignes) {
    for (const p of l.positions) {
      const r = de(p.liaison);
      if (l.tentative === 1) { r.essais += 1; if (p.juste) r.justesDuPremierCoup += 1; } else r.reprises += 1;
      if (!p.juste && p.pose !== null) r.confusions[p.pose] = (r.confusions[p.pose] || 0) + 1;
    }
  }
  return [...parLiaison.values()].sort((a, b) => (a.liaison < b.liaison ? -1 : a.liaison > b.liaison ? 1 : 0));
}
