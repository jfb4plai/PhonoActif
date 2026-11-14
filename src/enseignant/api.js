// Accès aux données de l'espace enseignant. Le client Supabase est injecté (testable sans réseau).
import { codeValide } from '../app/code.js';
import { ecrireAdresse } from '../app/route.js';
import { resumerParLiaison } from '../jeu/essais.js';

const RESERVE = 'Réservé au master de la classe';

function verifier({ error }) {
  if (error) throw new Error(error.message);
}

export function genererJeton() {
  const octets = crypto.getRandomValues(new Uint8Array(12));
  return [...octets].map(o => o.toString(16).padStart(2, '0')).join('');
}

export function genererCodes(prefixe, n, debut = 1) {
  if (!Number.isInteger(n) || n < 1) throw new Error('nombre de codes invalide');
  if (!/^[A-Za-z0-9-]*$/.test(prefixe)) throw new Error('préfixe invalide : lettres, chiffres et tirets seulement');
  const largeur = Math.max(2, String(debut + n - 1).length);
  const codes = Array.from({ length: n }, (_, i) => `${prefixe}${String(debut + i).padStart(largeur, '0')}`);
  if (codes.some(c => !codeValide(c))) throw new Error('code trop long (12 caractères au plus)');
  return codes;
}

export const decouperCodes = texte => (typeof texte === 'string' ? texte.split(/[\s,;]+/).filter(Boolean) : []);

export const lienDeTache = (base, jeton) => ecrireAdresse(base, 'jeu', { jeton });

// Lien personnel d'un élève (audit S1) : la tâche + le code + la clé de l'élève. Sans la clé, le serveur refuse ses résultats.
export const lienEleve = (base, jeton, code, cle) => ecrireAdresse(base, 'jeu', { jeton, codeEleve: code, cle });

export function genererCle() {
  return [...crypto.getRandomValues(new Uint8Array(10))].map(o => o.toString(16).padStart(2, '0')).join('');
}

export async function liensEleves(client, classId, jeton, base) {
  const r = await client.from('phono_students').select('id, code, secret').eq('class_id', classId);
  verifier(r);
  return [...r.data].sort((a, b) => a.code.localeCompare(b.code)).map(e => ({ id: e.id, code: e.code, lien: lienEleve(base, jeton, e.code, e.secret) }));
}

// Change la clé d'un élève : son ancien lien ou QR ne fonctionne plus (à faire si un lien a été perdu ou transmis à quelqu'un d'autre).
export async function nouvelleCleEleve(client, id) {
  verifier(await client.from('phono_students').update({ secret: genererCle() }).eq('id', id));
}

export async function qrDeLien(lien) {
  const QR = await import('qrcode');
  return (QR.default || QR).toDataURL(lien, { margin: 1, width: 256 });
}

export async function creerClasse(client, nom, userId) {
  const n = typeof nom === 'string' ? nom.trim() : '';
  if (n.length < 1 || n.length > 60) throw new Error('Le nom de la classe doit faire de 1 à 60 caractères.');
  const r = await client.from('phono_classes').insert({ name: n, created_by: userId }).select('id, name').single();
  verifier(r);
  return r.data;
}

export async function lister(client, userId) {
  const r = await client.from('phono_class_members').select('role, phono_classes(id, name)').eq('user_id', userId);
  verifier(r);
  return r.data.filter(m => m.phono_classes).map(m => ({ id: m.phono_classes.id, name: m.phono_classes.name, role: m.role }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function ajouterEleves(client, classId, codes) {
  const refuses = [], valides = [], vus = new Set();
  const existants = new Set();
  const r = await client.from('phono_students').select('code').eq('class_id', classId);
  verifier(r);
  r.data.forEach(s => existants.add(s.code));
  for (const code of codes) {
    if (!codeValide(code)) refuses.push({ code, raison: 'code invalide' });
    else if (existants.has(code)) refuses.push({ code, raison: 'déjà dans la classe' });
    else if (vus.has(code)) refuses.push({ code, raison: 'doublon dans la liste' });
    else { vus.add(code); valides.push(code); }
  }
  if (valides.length > 0) verifier(await client.from('phono_students').insert(valides.map(code => ({ class_id: classId, code }))));
  return { ajoutes: valides, refuses };
}

// Numéro suivant le plus grand numéro déjà pris par un code « préfixe + chiffres ».
export function prochainDebut(codesExistants, prefixe) {
  let max = 0;
  for (const c of codesExistants) {
    if (c.startsWith(prefixe) && /^\d+$/.test(c.slice(prefixe.length))) max = Math.max(max, Number(c.slice(prefixe.length)));
  }
  return max + 1;
}

export async function creerCodesAuto(client, classId, prefixe, n) {
  const existants = await client.from('phono_students').select('code').eq('class_id', classId);
  verifier(existants);
  const codes = genererCodes(prefixe, n, prochainDebut(existants.data.map(s => s.code), prefixe));
  return ajouterEleves(client, classId, codes);
}

export async function creerTache(client, classId, tache, userId, base) {
  if (!tache.pack) throw new Error('Choisir un pack.');
  const jeton = genererJeton();
  const r = await client.from('phono_tasks').insert({
    class_id: classId, token: jeton, pack: tache.pack, mode_mot: tache.modeMot, habillage: tache.habillage,
    nb_intrus: tache.nbIntrus, exiger_accents: tache.exigerAccents, created_by: userId
  }).select('id').single();
  verifier(r);
  return { id: r.data.id, jeton, lien: lienDeTache(base, jeton) };
}

export async function listerTaches(client, classId, base) {
  const r = await client.from('phono_tasks')
    .select('id, token, pack, mode_mot, habillage, nb_intrus, exiger_accents, revoked, created_at').eq('class_id', classId);
  verifier(r);
  return [...r.data].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map(t => ({
    id: t.id, jeton: t.token, pack: t.pack, modeMot: t.mode_mot, habillage: t.habillage, nbIntrus: t.nb_intrus,
    exigerAccents: t.exiger_accents, revoked: t.revoked, creee: t.created_at, lien: lienDeTache(base, t.token)
  }));
}

export const resumeTache = t => [
  t.habillage,
  t.modeMot === 'avec' ? 'avec le mot' : 'sans le mot',
  `${t.nbIntrus} cube${t.nbIntrus > 1 ? 's' : ''} en trop`,
  t.exigerAccents ? 'accents exigés' : 'accents non exigés'
].join(' · ');

export async function revoquerTache(client, id) {
  verifier(await client.from('phono_tasks').update({ revoked: true }).eq('id', id));
}

const enLigneEssai = a => ({ tentative: a.attempt, juste: a.correct, positions: a.positions });

export async function resultats(client, classId) {
  const eleves = await client.from('phono_students').select('id, code').eq('class_id', classId);
  verifier(eleves);
  const essais = await client.from('phono_attempts').select('*').eq('class_id', classId);
  verifier(essais);
  return [...eleves.data].sort((a, b) => a.code.localeCompare(b.code)).map(e => {
    const siens = essais.data.filter(a => a.student_id === e.id);
    const liaisons = resumerParLiaison(siens.map(enLigneEssai));
    const taux = l => (l.essais === 0 ? 0 : (l.essais - l.justesDuPremierCoup) / l.essais);
    const plusRatees = liaisons.filter(l => taux(l) > 0)
      .sort((a, b) => taux(b) - taux(a) || (a.liaison < b.liaison ? -1 : 1)).slice(0, 3);
    const derniereSeance = siens.reduce((m, a) => (m === null || a.played_at > m ? a.played_at : m), null);
    return { id: e.id, code: e.code, essais: siens.length, derniereSeance, liaisons, plusRatees };
  });
}

export async function inviter(client, classId, email) {
  const adresse = typeof email === 'string' ? email.trim() : '';
  if (!adresse) throw new Error('Saisir un e-mail.');
  const { error } = await client.rpc('phono_inviter', { p_class: classId, p_email: adresse });
  if (!error) return;
  if (error.message.includes('reserve_au_master')) throw new Error(RESERVE);
  if (error.message.includes('enseignant_inconnu')) throw new Error('Aucun enseignant PLAI avec cet e-mail : il doit d’abord se connecter une fois.');
  if (error.message.includes('deja_membre')) throw new Error('Cet enseignant est déjà dans la classe.');
  throw new Error(error.message);
}

async function supprimer(client, table, id) {
  const r = await client.from(table).delete().eq('id', id).select('id');
  verifier(r);
  if (r.data.length === 0) throw new Error(RESERVE);
}

export const supprimerEleve = (client, id) => supprimer(client, 'phono_students', id);
export const supprimerClasse = (client, id) => supprimer(client, 'phono_classes', id);
