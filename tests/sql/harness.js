// Banc d'essai du SQL : PGlite (PostgreSQL en WebAssembly) avec les rôles et le schéma auth de Supabase simulés.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const DOSSIER_MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));

export const sqlDesMigrations = () => readdirSync(DOSSIER_MIGRATIONS).filter(f => f.endsWith('.sql')).sort()
  .map(f => ({ fichier: f, sql: readFileSync(path.join(DOSSIER_MIGRATIONS, f), 'utf8') }));

export async function baseDeTest() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  for (const m of sqlDesMigrations()) await db.exec(m.sql);
  return db;
}

export async function creerUtilisateur(db) {
  const id = crypto.randomUUID();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  return id;
}

// Exécute fn avec le rôle Postgres et l'identité (jeton) donnés, puis revient au rôle d'origine.
export async function comme(db, role, userId, fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claims', $1, false)", [userId ? JSON.stringify({ sub: userId }) : '']);
  try { return await fn(); } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}
