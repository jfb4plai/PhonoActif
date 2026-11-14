import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerTache, envoyerEssais, stockageEnvoyes } from '../../src/sync/envoi.js';

const TOKEN = 'a1'.repeat(12);
const ligne = i => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, session: 's-1', code: 'E01', pack: 'demo', carte: 'chat', mot: 'chat', modeMot: 'sans',
  tentative: 1, juste: true, aide: 'aucune', positions: [{ liaison: 'ch=ch', pose: 'ch', juste: true }], date: '2026-11-11T10:00:00.000Z'
});
const lignes = n => Array.from({ length: n }, (_, i) => ligne(i + 1));

// reponses : fonction (numéro d'appel, appel) -> { status, corps } ou une Error (réseau coupé)
function supa(reponses) {
  const appels = [];
  return {
    appels, url: 'https://x.supabase.co/', anonKey: 'cle-anon',
    fetch: async (u, init) => {
      appels.push({ u, init, corps: JSON.parse(init.body) });
      const r = reponses(appels.length, appels[appels.length - 1]);
      if (r instanceof Error) throw r;
      return { ok: r.status < 400, status: r.status, json: async () => r.corps };
    }
  };
}
const succes = (n, appel) => ({ status: 200, corps: { recus: appel.corps.p_lignes.length, ignores: 0 } });

test('chargerTache : adresse, en-têtes et corps exacts, réponse en camelCase', async () => {
  const s = supa(() => ({ status: 200, corps: { pack: 'demo', mode_mot: 'avec', habillage: 'sobre', nb_intrus: 2, exiger_accents: true } }));
  const t = await chargerTache(TOKEN, s);
  assert.deepEqual(t, { pack: 'demo', modeMot: 'avec', habillage: 'sobre', nbIntrus: 2, exigerAccents: true });
  const a = s.appels[0];
  assert.equal(a.u, 'https://x.supabase.co/rest/v1/rpc/phono_lire_tache');
  assert.equal(a.init.method, 'POST');
  assert.equal(a.init.headers.apikey, 'cle-anon');
  assert.equal(a.init.headers.Authorization, 'Bearer cle-anon');
  assert.equal(a.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(a.corps, { p_token: TOKEN });
});

test('chargerTache : tâche inconnue, réseau coupé, réponse inattendue', async () => {
  await assert.rejects(chargerTache(TOKEN, supa(() => ({ status: 400, corps: { message: 'tache_inconnue' } }))), /tâche inconnue/);
  await assert.rejects(chargerTache(TOKEN, supa(() => new Error('réseau coupé'))), /réseau/);
  await assert.rejects(chargerTache(TOKEN, supa(() => ({ status: 503, corps: {} }))), /réseau/);
  await assert.rejects(chargerTache(TOKEN, supa(() => ({ status: 200, corps: { pack: 42 } }))), /refusé/);
});

test('envoyerEssais : 230 lignes dont 20 déjà envoyées, trois paquets de 100, 100 et 10', async () => {
  const s = supa(succes);
  const tout = lignes(230);
  const deja = new Set(tout.slice(0, 20).map(l => l.id));
  const r = await envoyerEssais({ lignes: tout, dejaEnvoyes: deja, token: TOKEN, code: 'E01', cle: 'cle-eleve', supabase: s });
  assert.deepEqual(s.appels.map(a => a.corps.p_lignes.length), [100, 100, 10]);
  assert.equal(r.envoyes, 210); assert.equal(r.restants, 0); assert.equal(r.erreur, null); assert.equal(r.ids.length, 210);
  assert.ok(s.appels.every(a => a.corps.p_token === TOKEN && a.corps.p_code === 'E01' && a.corps.p_cle === 'cle-eleve'));
});

test('envoyerEssais : seuls les champs attendus par le serveur partent', async () => {
  const s = supa(succes);
  await envoyerEssais({ lignes: lignes(1), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: s });
  assert.deepEqual(Object.keys(s.appels[0].corps.p_lignes[0]).sort(), ['aide', 'carte', 'date', 'id', 'juste', 'mot', 'positions', 'session', 'tentative']);
});

test('envoyerEssais : réseau coupé au deuxième paquet, le premier est marqué envoyé', async () => {
  const s = supa((n, a) => (n === 2 ? new Error('coupé') : succes(n, a)));
  const r = await envoyerEssais({ lignes: lignes(230), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: s });
  assert.equal(r.erreur, 'reseau'); assert.equal(r.envoyes, 100); assert.equal(r.ids.length, 100); assert.equal(r.restants, 130);
});

test('envoyerEssais : erreur 500 : même comportement, rien de marqué', async () => {
  const r = await envoyerEssais({ lignes: lignes(5), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: supa(() => ({ status: 500, corps: {} })) });
  assert.equal(r.erreur, 'reseau'); assert.equal(r.envoyes, 0); assert.deepEqual(r.ids, []); assert.equal(r.restants, 5);
});

test('envoyerEssais : code inconnu ou tâche inconnue, pas de réessai, rien de marqué', async () => {
  for (const [message, erreur] of [['code_inconnu', 'code_inconnu'], ['tache_inconnue', 'tache_inconnue'], ['charge_invalide', 'refuse'], ['limite_atteinte', 'limite']]) {
    const s = supa(() => ({ status: 400, corps: { message } }));
    const r = await envoyerEssais({ lignes: lignes(250), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: s });
    assert.equal(r.erreur, erreur, message);
    assert.equal(s.appels.length, 1);
    assert.deepEqual(r.ids, []); assert.equal(r.restants, 250);
  }
});

test('envoyerEssais : réponse inattendue : refusé, rien de marqué', async () => {
  const r = await envoyerEssais({ lignes: lignes(3), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: supa(() => ({ status: 200, corps: { bizarre: true } })) });
  assert.equal(r.erreur, 'refuse'); assert.deepEqual(r.ids, []);
});

test('envoyerEssais : relancer avec les ids ajoutés n\'envoie plus rien', async () => {
  const s = supa(succes);
  const tout = lignes(3);
  const r1 = await envoyerEssais({ lignes: tout, dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: s });
  const r2 = await envoyerEssais({ lignes: tout, dejaEnvoyes: new Set(r1.ids), token: TOKEN, code: 'E01', supabase: s });
  assert.equal(s.appels.length, 1);
  assert.deepEqual({ envoyes: r2.envoyes, restants: r2.restants, erreur: r2.erreur }, { envoyes: 0, restants: 0, erreur: null });
});

test('envoyerEssais : serveur qui a déjà reçu des lignes (ignores) : elles sont bien marquées envoyées', async () => {
  const s = supa(() => ({ status: 200, corps: { recus: 1, ignores: 2 } }));
  const r = await envoyerEssais({ lignes: lignes(3), dejaEnvoyes: new Set(), token: TOKEN, code: 'E01', supabase: s });
  assert.equal(r.ids.length, 3); assert.equal(r.restants, 0);
});

test('stockageEnvoyes : persiste sous la clé, relu au second appel', () => {
  const m = new Map();
  const storage = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } };
  const a = stockageEnvoyes({ storage });
  a.ajouter(['x', 'y']);
  assert.deepEqual([...stockageEnvoyes({ storage }).lire()].sort(), ['x', 'y']);
  assert.ok(m.has('phonoactif-envoyes-v1'));
});

test('stockageEnvoyes : stockage qui lève, contenu illisible, absent : fonctionne en mémoire', () => {
  const casse = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); }, removeItem: () => {} };
  const a = stockageEnvoyes({ storage: casse });
  a.ajouter(['x']);
  assert.deepEqual([...a.lire()], ['x']);
  const illisible = { getItem: () => 'pas du json', setItem: () => {}, removeItem: () => {} };
  assert.equal(stockageEnvoyes({ storage: illisible }).lire().size, 0);
  const b = stockageEnvoyes({ storage: undefined });
  b.ajouter(['z']);
  assert.ok(b.lire().has('z'));
});
