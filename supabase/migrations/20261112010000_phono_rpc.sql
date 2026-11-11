create function public.phono_lire_tache(p_token text) returns jsonb
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
    'exiger_accents', t.exiger_accents
  );
end;
$$;

create function public.phono_envoyer_essais(p_token text, p_code text, p_lignes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t public.phono_tasks%rowtype;
  v_student uuid;
  l jsonb;
  pos jsonb;
  v_date timestamptz;
  v_recus int := 0;
  v_n int;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{24}$' then
    raise exception 'tache_inconnue';
  end if;
  select * into t from public.phono_tasks where token = p_token and not revoked;
  if not found then
    raise exception 'tache_inconnue';
  end if;
  select id into v_student from public.phono_students where class_id = t.class_id and code = p_code;
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

revoke all on function public.phono_lire_tache(text), public.phono_envoyer_essais(text, text, jsonb) from public;
grant execute on function public.phono_lire_tache(text), public.phono_envoyer_essais(text, text, jsonb) to anon, authenticated, service_role;
