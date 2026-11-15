/* Listes de mots de l'enseignant et tâches à listes (décisions de JF, 2026-11-15, spécification docs/superpowers/specs/2026-11-15-base-de-mots-et-listes-design.md).
   - phono_listes : une liste = 1 à 50 identifiants de mots, propre à UN enseignant (RLS created_by = auth.uid()), réutilisable dans toutes ses classes.
   - phono_tasks.mots : instantané des mots de la tâche à sa création (0 à 200 ; plusieurs listes fusionnées pour les révisions). La colonne `pack` devient une étiquette libre (nom des listes).
   - phono_lire_tache renvoie aussi `mots`.
   - Décision 4 de JF : les liens existants n'ont jamais été partagés ; les anciennes tâches sont supprimées (leurs essais de test par cascade).
   APPLIQUÉE le 2026-11-15 par JF (éditeur SQL du tableau de bord, projet RetroActif) ; historique marqué appliqué par `supabase migration repair`. Elle a supprimé les tâches et essais existants.
   ORDRE DE MISE EN LIGNE : le code qui écrit `mots` et lit `phono_listes` peut maintenant être poussé. */

delete from public.phono_tasks;

/* Identifiants de mots : ASCII minuscule, chiffres et tirets ; pas de doublon. Vrai pour un tableau vide (les bornes de taille sont des contraintes séparées). */
create function public.phono_ids_valides(p text[]) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(bool_and(w ~ '^[a-z0-9-]{1,60}$'), true) and count(distinct w) = count(*) from unnest(p) as w
$$;

create table public.phono_listes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  words text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phono_listes_nb_mots check (cardinality(words) between 1 and 50),
  constraint phono_listes_ids check (public.phono_ids_valides(words))
);
create index phono_listes_proprietaire on public.phono_listes (created_by);

alter table public.phono_listes enable row level security;
create policy "phono listes lecture" on public.phono_listes for select to authenticated using (created_by = auth.uid());
create policy "phono listes creation" on public.phono_listes for insert to authenticated with check (created_by = auth.uid());
create policy "phono listes modification" on public.phono_listes for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "phono listes suppression" on public.phono_listes for delete to authenticated using (created_by = auth.uid());

revoke all on table public.phono_listes from anon, public;
grant select, insert, update, delete on public.phono_listes to authenticated;
grant all on public.phono_listes to service_role;

alter table public.phono_tasks add column mots text[] not null default '{}';
alter table public.phono_tasks add column listes_noms text;
alter table public.phono_tasks add constraint phono_tasks_nb_mots check (cardinality(mots) <= 200);
alter table public.phono_tasks add constraint phono_tasks_ids check (public.phono_ids_valides(mots));
alter table public.phono_tasks add constraint phono_tasks_listes_noms check (listes_noms is null or char_length(listes_noms) <= 300);

create or replace function public.phono_lire_tache(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t public.phono_tasks%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{24}$' then
    raise exception 'tache_inconnue';
  end if;
  select * into t from public.phono_tasks where token = p_token and not revoked;
  if not found then
    raise exception 'tache_inconnue';
  end if;
  return jsonb_build_object(
    'pack', t.pack,
    'mode_mot', t.mode_mot,
    'habillage', t.habillage,
    'nb_intrus', t.nb_intrus,
    'exiger_accents', t.exiger_accents,
    'syllabes', t.syllabes,
    'vitesse', t.vitesse,
    'vitesse_verrou', t.vitesse_verrou,
    'mots', to_jsonb(t.mots)
  );
end;
$$;
