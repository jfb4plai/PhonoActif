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
