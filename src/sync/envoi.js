/* Envoi des essais vers Supabase (fonctions SQL phono_lire_tache et phono_envoyer_essais) avec la clé publique « anon ».
   L'envoi est idempotent : chaque ligne a un identifiant ; ce que le serveur confirme est marqué envoyé, le reste attend.
   Aucune donnée ne part sans jeton de tâche, code d'élève et clé personnelle (lien ou QR de l'élève). */

const CLE_ENVOYES = 'phonoactif-envoyes-v1';
const PAQUET = 100;

async function appeler(supabase, fonction, corps) {
  const chercher = supabase.fetch || globalThis.fetch;
  const url = `${supabase.url.replace(/\/+$/, '')}/rest/v1/rpc/${fonction}`;
  let reponse;
  try {
    reponse = await chercher(url, {
      method: 'POST',
      headers: { apikey: supabase.anonKey, Authorization: `Bearer ${supabase.anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps)
    });
  } catch (e) { return { reseau: true }; }
  let json = null;
  try { json = await reponse.json(); } catch (e) { json = null; }
  if (reponse.ok) return { ok: true, json };
  const message = json && typeof json.message === 'string' ? json.message : '';
  return { ok: false, status: reponse.status, message };
}

const pasDeReseau = r => r.reseau || (!r.ok && r.status >= 500);

export async function chargerTache(token, supabase) {
  const r = await appeler(supabase, 'phono_lire_tache', { p_token: token });
  if (pasDeReseau(r)) throw new Error('réseau');
  if (!r.ok) throw new Error(r.message.includes('tache_inconnue') ? 'tâche inconnue' : 'refusé');
  const j = r.json;
  const bon = j && typeof j.pack === 'string' && (j.mode_mot === 'avec' || j.mode_mot === 'sans') && (j.habillage === 'album' || j.habillage === 'sobre')
    && Number.isInteger(j.nb_intrus) && typeof j.exiger_accents === 'boolean';
  if (!bon) throw new Error('refusé');
  return { pack: j.pack, modeMot: j.mode_mot, habillage: j.habillage, nbIntrus: j.nb_intrus, exigerAccents: j.exiger_accents, syllabes: ['non', 'toujours', 'aide'].includes(j.syllabes) ? j.syllabes : 'toujours' }; // serveur sans le champ : comportement d'avant
}

const versServeur = l => ({ id: l.id, session: l.session, carte: l.carte, mot: l.mot, tentative: l.tentative, juste: l.juste, aide: l.aide, positions: l.positions, date: l.date });

export async function envoyerEssais({ lignes, dejaEnvoyes, token, code, cle, supabase }) {
  const attente = lignes.filter(l => !dejaEnvoyes.has(l.id));
  const ids = [];
  let envoyes = 0, erreur = null;
  for (let i = 0; i < attente.length && erreur === null; i += PAQUET) {
    const paquet = attente.slice(i, i + PAQUET);
    const r = await appeler(supabase, 'phono_envoyer_essais', { p_token: token, p_code: code, p_cle: cle, p_lignes: paquet.map(versServeur) });
    if (pasDeReseau(r)) { erreur = 'reseau'; break; }
    if (!r.ok) {
      erreur = r.message.includes('code_inconnu') ? 'code_inconnu' : r.message.includes('tache_inconnue') ? 'tache_inconnue' : r.message.includes('limite_atteinte') ? 'limite' : 'refuse'; // limite : les lignes restent en attente, nouvel essai plus tard
      break;
    }
    const j = r.json;
    if (!j || !Number.isInteger(j.recus) || !Number.isInteger(j.ignores) || j.recus + j.ignores !== paquet.length) { erreur = 'refuse'; break; }
    ids.push(...paquet.map(l => l.id));
    envoyes += paquet.length;
  }
  return { envoyes, restants: attente.length - ids.length, erreur, ids };
}

// Ids des lignes déjà confirmées par le serveur ; même tolérance aux pannes que stockageLocal.
export function stockageEnvoyes(options = {}) {
  const cle = options.cle || CLE_ENVOYES;
  let storage;
  try { storage = 'storage' in options ? options.storage : globalThis.localStorage; } catch (e) { storage = undefined; }
  let ids = new Set();
  if (storage) {
    try { const d = JSON.parse(storage.getItem(cle) || '[]'); if (Array.isArray(d)) ids = new Set(d.filter(x => typeof x === 'string')); } catch (e) { ids = new Set(); }
  }
  return {
    lire: () => new Set(ids),
    ajouter: nouveaux => {
      nouveaux.forEach(i => ids.add(i));
      if (!storage) return;
      try { storage.setItem(cle, JSON.stringify([...ids])); } catch (e) { /* mémoire seule */ }
    }
  };
}
