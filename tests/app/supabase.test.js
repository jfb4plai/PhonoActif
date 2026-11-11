import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationSupabase } from '../../src/lib/supabase.js';

test('configuration complète : adresse et clé publique', () => {
  assert.deepEqual(configurationSupabase({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'cle' }), { url: 'https://x.supabase.co', anonKey: 'cle' });
});

test('variable manquante, vide ou adresse non https : null (l\'app reste utilisable hors ligne)', () => {
  assert.equal(configurationSupabase({}), null);
  assert.equal(configurationSupabase({ VITE_SUPABASE_URL: 'https://x.supabase.co' }), null);
  assert.equal(configurationSupabase({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'cle' }), null);
  assert.equal(configurationSupabase({ VITE_SUPABASE_URL: 'http://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'cle' }), null);
  assert.equal(configurationSupabase(undefined), null);
});

test('l\'adresse locale http://localhost est acceptée pour le développement', () => {
  assert.deepEqual(configurationSupabase({ VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'cle' }), { url: 'http://localhost:54321', anonKey: 'cle' });
});
