// Configuration publique de Supabase : adresse du projet et clé « anon » (publique par conception).
// Jamais de clé secrète ici. Variable manquante : null, et l'app reste utilisable hors ligne comme avant.
export function configurationSupabase(env) {
  const e = env || {};
  const url = typeof e.VITE_SUPABASE_URL === 'string' ? e.VITE_SUPABASE_URL.trim() : '';
  const anonKey = typeof e.VITE_SUPABASE_ANON_KEY === 'string' ? e.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (!url || !anonKey) return null;
  if (!/^https:\/\//.test(url) && !/^http:\/\/localhost(:\d+)?(\/|$)/.test(url)) return null;
  return { url, anonKey };
}
