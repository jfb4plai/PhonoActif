/* Réglage de tâche « écoute par syllabes » : non (pas de bouton), toujours (bouton proposé pour les mots de deux syllabes ou plus),
   aide (bouton proposé seulement quand l'élève a du mal : après une erreur ou une demande d'aide).
   Ajout compatible : les tâches existantes reçoivent « toujours » (comportement actuel) ; un ancien client qui ne connaît pas le champ continue de fonctionner. */
alter table public.phono_tasks add column if not exists syllabes text not null default 'toujours';
alter table public.phono_tasks drop constraint if exists phono_tasks_syllabes_valeurs;
alter table public.phono_tasks add constraint phono_tasks_syllabes_valeurs check (syllabes in ('non', 'toujours', 'aide'));

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
    'syllabes', t.syllabes
  );
end;
$$;
