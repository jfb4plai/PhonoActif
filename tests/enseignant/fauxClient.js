// Faux client Supabase en mémoire : juste assez de la chaîne from().select().eq()... pour tester src/enseignant/api.js.
// role « invite » simule les politiques du serveur : une suppression d'élève ou de classe ne touche aucune ligne.
export function fauxClient({ userId = 'u-master', role = 'master', tables = {}, rpcErreurs = {} } = {}) {
  const t = { phono_classes: [], phono_class_members: [], phono_students: [], phono_tasks: [], phono_attempts: [], ...tables };
  const rpcs = [];
  class Requete {
    constructor(table) { this.table = table; this.op = 'select'; this.filtres = []; this.payload = null; this.unique = false; this.cols = ''; this.retour = false; }
    select(cols = '') { this.cols = cols; if (this.op !== 'select') this.retour = true; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filtres.push(r => r[c] === v); return this; }
    in(c, vs) { this.filtres.push(r => vs.includes(r[c])); return this; }
    order() { return this; }
    limit() { return this; }
    single() { this.unique = true; return this; }
    then(res, rej) { return Promise.resolve(this.executer()).then(res, rej); }
    executer() {
      const lignes = t[this.table];
      const choisies = () => lignes.filter(r => this.filtres.every(f => f(r)));
      const rendre = rows => {
        if (this.unique) return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
        return { data: rows, error: null };
      };
      if (this.op === 'select') {
        let rows = choisies();
        if (this.table === 'phono_class_members' && this.cols.includes('phono_classes')) {
          rows = rows.map(m => ({ role: m.role, phono_classes: t.phono_classes.find(c => c.id === m.class_id) || null }));
        }
        return rendre(rows);
      }
      if (this.op === 'insert') {
        const ajouts = Array.isArray(this.payload) ? this.payload : [this.payload];
        const crees = [];
        for (const a of ajouts) {
          const ligne = { id: crypto.randomUUID(), ...a };
          if (this.table === 'phono_students' && lignes.some(r => r.class_id === ligne.class_id && r.code === ligne.code)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "phono_students_class_id_code_key"' } };
          }
          lignes.push(ligne); crees.push(ligne);
        }
        return this.retour ? rendre(crees) : { data: null, error: null };
      }
      if (this.op === 'update') {
        const rows = choisies();
        rows.forEach(r => Object.assign(r, this.payload));
        return this.retour ? rendre(rows) : { data: null, error: null };
      }
      const protege = role === 'invite' && ['phono_students', 'phono_classes'].includes(this.table);
      const rows = protege ? [] : choisies();
      rows.forEach(r => lignes.splice(lignes.indexOf(r), 1));
      return this.retour ? rendre(rows) : { data: null, error: null };
    }
  }
  return {
    tables: t, rpcs,
    from: table => new Requete(table),
    rpc: async (nom, args) => {
      rpcs.push({ nom, args });
      if (role !== 'master' && nom === 'phono_inviter') return { data: null, error: { message: 'reserve_au_master' } };
      if (rpcErreurs[nom]) return { data: null, error: { message: rpcErreurs[nom] } };
      return { data: null, error: null };
    },
    userId
  };
}
