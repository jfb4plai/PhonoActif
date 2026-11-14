/* Audit S1 (2026-11-14) : protéger l'écriture anonyme des essais.
   1. Clé personnelle par élève (colonne secret) : le lien ou le QR personnel de l'élève la contient ; sans elle, connaître le code (E07) ne suffit plus.
      L'ancienne fonction à 3 paramètres est supprimée : sinon elle resterait appelable sans clé. Le message d'erreur est le même pour un code
      inconnu et une clé fausse (code_inconnu).
   2. Limite de débit : 300 lignes neuves par heure et par élève, 3000 par tâche, comptées sur received_at (deux index).
   La clé est lisible par les membres de la classe (politique de lecture des élèves) et modifiable par eux : changer la valeur révoque un lien personnel. */
alter table public.phono_students add column if not exists secret text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
alter table public.phono_students drop constraint if exists phono_students_secret_format;
alter table public.phono_students add constraint phono_students_secret_format check (secret ~ '^[a-f0-9]{20}$');
create index if not exists phono_attempts_recus_eleve on public.phono_attempts (student_id, received_at);
create index if not exists phono_attempts_recus_tache on public.phono_attempts (task_id, received_at);

drop function if exists public.phono_envoyer_essais(text, text, jsonb);

create function public.phono_envoyer_essais(p_token text, p_code text, p_cle text, p_lignes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t public.phono_tasks%rowtype;
  v_student uuid;
  l jsonb;
  pos jsonb;
  v_date timestamptz;
  v_recus int := 0;
  v_n int;
  v_neuves int;
  v_eleve_h int;
  v_tache_h int;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{24}$' then
    raise exception 'tache_inconnue';
  end if;
  select * into t from public.phono_tasks where token = p_token and not revoked;
  if not found then
    raise exception 'tache_inconnue';
  end if;
  select id into v_student from public.phono_students where class_id = t.class_id and code = p_code and secret = p_cle;
  if v_student is null then
    raise exception 'code_inconnu';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) > 200 then
    raise exception 'charge_invalide';
  end if;

  for l in select value from jsonb_array_elements(p_lignes) loop
    if jsonb_typeof(l) is distinct from 'object' then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'id') is distinct from 'string' or (l ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'session') is distinct from 'string' or char_length(l ->> 'session') not between 1 and 80 then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'carte') is distinct from 'string' or char_length(l ->> 'carte') not between 1 and 120 then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'mot') is distinct from 'string' or char_length(l ->> 'mot') not between 1 and 120 then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'tentative') is distinct from 'number' or (l ->> 'tentative') !~ '^[0-9]{1,2}$' then
      raise exception 'charge_invalide';
    end if;
    if (l ->> 'tentative')::int not between 1 and 20 then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'juste') is distinct from 'boolean' then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'aide') is distinct from 'string' or (l ->> 'aide') not in ('aucune', 'ecoute', 'indice', 'revelation') then
      raise exception 'charge_invalide';
    end if;
    if jsonb_typeof(l -> 'positions') is distinct from 'array' or jsonb_array_length(l -> 'positions') not between 1 and 40 then
      raise exception 'charge_invalide';
    end if;
    for pos in select value from jsonb_array_elements(l -> 'positions') loop
      if jsonb_typeof(pos) is distinct from 'object' then
        raise exception 'charge_invalide';
      end if;
      if jsonb_typeof(pos -> 'liaison') is distinct from 'string' or char_length(pos ->> 'liaison') not between 1 and 60 then
        raise exception 'charge_invalide';
      end if;
      if jsonb_typeof(pos -> 'juste') is distinct from 'boolean' then
        raise exception 'charge_invalide';
      end if;
      if coalesce(jsonb_typeof(pos -> 'pose'), 'absent') not in ('string', 'null') then
        raise exception 'charge_invalide';
      end if;
      if jsonb_typeof(pos -> 'pose') = 'string' and char_length(pos ->> 'pose') > 12 then
        raise exception 'charge_invalide';
      end if;
    end loop;
    if jsonb_typeof(l -> 'date') is distinct from 'string' then
      raise exception 'charge_invalide';
    end if;
    begin
      v_date := (l ->> 'date')::timestamptz;
    exception when others then
      raise exception 'charge_invalide';
    end;
  end loop;

/* Limites de débit (audit S1) : seules les lignes NOUVELLES comptent (renvoyer des lignes déjà reçues ne coûte rien).
   Un élève : au plus 300 lignes neuves par heure (une séance normale en produit moins de 100) ; une tâche : 3000 par heure. */
  select count(*) into v_neuves from jsonb_array_elements(p_lignes) e
    where not exists (select 1 from public.phono_attempts a where a.id = (e.value ->> 'id')::uuid);
  select count(*) into v_eleve_h from public.phono_attempts where student_id = v_student and received_at > now() - interval '1 hour';
  select count(*) into v_tache_h from public.phono_attempts where task_id = t.id and received_at > now() - interval '1 hour';
  if v_eleve_h + v_neuves > 300 or v_tache_h + v_neuves > 3000 then
    raise exception 'limite_atteinte';
  end if;

  for l in select value from jsonb_array_elements(p_lignes) loop
    insert into public.phono_attempts (id, class_id, student_id, task_id, session, card, word, attempt, correct, help, positions, played_at)
    values (
      (l ->> 'id')::uuid, t.class_id, v_student, t.id, l ->> 'session', l ->> 'carte', l ->> 'mot',
      (l ->> 'tentative')::int, (l ->> 'juste')::boolean, l ->> 'aide', l -> 'positions', (l ->> 'date')::timestamptz
    )
    on conflict (id) do nothing;
    get diagnostics v_n = row_count;
    v_recus := v_recus + v_n;
  end loop;

  return jsonb_build_object('recus', v_recus, 'ignores', jsonb_array_length(p_lignes) - v_recus);
end;
$$;

revoke all on function public.phono_envoyer_essais(text, text, text, jsonb) from public;
grant execute on function public.phono_envoyer_essais(text, text, text, jsonb) to anon, authenticated, service_role;
