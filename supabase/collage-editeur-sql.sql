create table public.phono_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.phono_class_members (
  class_id uuid not null references public.phono_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('master', 'invite')),
  created_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index phono_class_members_user on public.phono_class_members (user_id);

create table public.phono_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.phono_classes(id) on delete cascade,
  code text not null check (code ~ '^[A-Za-z0-9-]{1,12}$'),
  keep_history boolean not null default false,
  created_at timestamptz not null default now(),
  unique (class_id, code)
);

create table public.phono_tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.phono_classes(id) on delete cascade,
  token text not null unique check (token ~ '^[a-f0-9]{24}$'),
  pack text not null check (char_length(pack) between 1 and 60),
  mode_mot text not null check (mode_mot in ('avec', 'sans')),
  habillage text not null check (habillage in ('album', 'sobre')),
  nb_intrus int not null check (nb_intrus between 0 and 5),
  exiger_accents boolean not null default false,
  revoked boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index phono_tasks_class on public.phono_tasks (class_id);

create table public.phono_attempts (
  id uuid primary key,
  class_id uuid not null references public.phono_classes(id) on delete cascade,
  student_id uuid not null references public.phono_students(id) on delete cascade,
  task_id uuid not null references public.phono_tasks(id) on delete cascade,
  session text not null check (char_length(session) between 1 and 80),
  card text not null check (char_length(card) between 1 and 120),
  word text not null check (char_length(word) between 1 and 120),
  attempt int not null check (attempt between 1 and 20),
  correct boolean not null,
  help text not null check (help in ('aucune', 'ecoute', 'indice', 'revelation')),
  positions jsonb not null check (jsonb_typeof(positions) = 'array'),
  played_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index phono_attempts_student on public.phono_attempts (student_id, played_at);
create index phono_attempts_class on public.phono_attempts (class_id);

create function public.phono_is_member(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.phono_class_members m
    where m.class_id = p_class and m.user_id = auth.uid()
  )
$$;

create function public.phono_is_master(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.phono_class_members m
    where m.class_id = p_class and m.user_id = auth.uid() and m.role = 'master'
  )
$$;

create function public.phono_class_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.phono_class_members (class_id, user_id, role)
  values (new.id, new.created_by, 'master');
  return new;
end;
$$;

create trigger phono_class_creator after insert on public.phono_classes
for each row execute function public.phono_class_creator();

alter table public.phono_classes enable row level security;
alter table public.phono_class_members enable row level security;
alter table public.phono_students enable row level security;
alter table public.phono_tasks enable row level security;
alter table public.phono_attempts enable row level security;

create policy "phono classes lecture" on public.phono_classes
  for select to authenticated using (created_by = auth.uid() or public.phono_is_member(id));
create policy "phono classes creation" on public.phono_classes
  for insert to authenticated with check (created_by = auth.uid());
create policy "phono classes modification" on public.phono_classes
  for update to authenticated using (public.phono_is_member(id)) with check (public.phono_is_member(id));
create policy "phono classes suppression" on public.phono_classes
  for delete to authenticated using (public.phono_is_master(id));

create policy "phono membres lecture" on public.phono_class_members
  for select to authenticated using (public.phono_is_member(class_id));
create policy "phono membres invitation" on public.phono_class_members
  for insert to authenticated with check (public.phono_is_master(class_id) and role = 'invite');
create policy "phono membres retrait" on public.phono_class_members
  for delete to authenticated using (public.phono_is_master(class_id));

create policy "phono eleves lecture" on public.phono_students
  for select to authenticated using (public.phono_is_member(class_id));
create policy "phono eleves creation" on public.phono_students
  for insert to authenticated with check (public.phono_is_member(class_id));
create policy "phono eleves modification" on public.phono_students
  for update to authenticated using (public.phono_is_member(class_id)) with check (public.phono_is_member(class_id));
create policy "phono eleves suppression" on public.phono_students
  for delete to authenticated using (public.phono_is_master(class_id));

create policy "phono taches lecture" on public.phono_tasks
  for select to authenticated using (public.phono_is_member(class_id));
create policy "phono taches creation" on public.phono_tasks
  for insert to authenticated with check (public.phono_is_member(class_id) and created_by = auth.uid());
create policy "phono taches modification" on public.phono_tasks
  for update to authenticated using (public.phono_is_member(class_id)) with check (public.phono_is_member(class_id));
create policy "phono taches suppression" on public.phono_tasks
  for delete to authenticated using (public.phono_is_master(class_id));

create policy "phono essais lecture" on public.phono_attempts
  for select to authenticated using (public.phono_is_member(class_id));
create policy "phono essais suppression" on public.phono_attempts
  for delete to authenticated using (public.phono_is_master(class_id));

revoke all on table public.phono_classes, public.phono_class_members, public.phono_students, public.phono_tasks, public.phono_attempts from anon, public;
grant select, insert, update, delete on public.phono_classes to authenticated;
grant select, insert, delete on public.phono_class_members to authenticated;
grant select, insert, update, delete on public.phono_students to authenticated;
grant select, insert, update, delete on public.phono_tasks to authenticated;
grant select, delete on public.phono_attempts to authenticated;
grant all on public.phono_classes, public.phono_class_members, public.phono_students, public.phono_tasks, public.phono_attempts to service_role;

revoke all on function public.phono_is_member(uuid), public.phono_is_master(uuid), public.phono_class_creator() from public, anon;
grant execute on function public.phono_is_member(uuid), public.phono_is_master(uuid) to authenticated, service_role;
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
create function public.phono_inviter(p_class uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not public.phono_is_master(p_class) then
    raise exception 'reserve_au_master';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(coalesce(p_email, ''))) limit 1;
  if v_user is null then
    raise exception 'enseignant_inconnu';
  end if;
  if exists (select 1 from public.phono_class_members where class_id = p_class and user_id = v_user) then
    raise exception 'deja_membre';
  end if;
  insert into public.phono_class_members (class_id, user_id, role) values (p_class, v_user, 'invite');
end;
$$;

revoke all on function public.phono_inviter(uuid, text) from public, anon;
grant execute on function public.phono_inviter(uuid, text) to authenticated, service_role;
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
