/* Réglage de tâche « vitesse de la voix » : 100 (normale), 75 (lente), 50 (très lente), vitesse de départ des mots et des sons lus.
   vitesse_verrou : si vrai, l'élève n'a pas de boutons et entend la vitesse de la tâche ; sinon il peut changer de vitesse.
   Ajout compatible : les tâches existantes reçoivent 100 sans verrou (comportement actuel). NON APPLIQUÉE : accord de JF requis avant exécution. */
alter table public.phono_tasks add column if not exists vitesse integer not null default 100;
alter table public.phono_tasks add column if not exists vitesse_verrou boolean not null default false;
alter table public.phono_tasks drop constraint if exists phono_tasks_vitesse_valeurs;
alter table public.phono_tasks add constraint phono_tasks_vitesse_valeurs check (vitesse in (100, 75, 50));

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
    'vitesse_verrou', t.vitesse_verrou
  );
end;
$$;
