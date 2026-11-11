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
