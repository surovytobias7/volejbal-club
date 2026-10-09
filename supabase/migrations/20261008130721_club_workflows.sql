create function public.create_member(p_name text, p_email text, p_phone text, p_birth date, p_role text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare member_id uuid;
begin
  insert into public.profiles(full_name) values(p_name) returning id into member_id;
  insert into public.member_details(profile_id,email,phone,birth_date) values(member_id,p_email,p_phone,p_birth);
  insert into public.user_roles(profile_id,role) values(member_id,p_role);
  return member_id;
end $$;
create function public.edit_member(p_id uuid,p_name text,p_email text,p_phone text,p_birth date)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not private.has_role('admin') then raise exception 'Administrator required'; end if;
  update public.profiles set full_name=p_name where id=p_id;
  if not found then raise exception 'Member not found'; end if;
  update public.member_details set email=p_email,phone=p_phone,birth_date=p_birth where profile_id=p_id;
end $$;

-- This narrow definer routine is private; the public wrapper is an invoker.
create function private.update_own_profile(p_name text,p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare member_id uuid := private.viewer();
begin
  if member_id is null then raise exception 'Active account required'; end if;
  update public.profiles set full_name=p_name where id=member_id;
  insert into public.member_details(profile_id,phone) values(member_id,p_phone)
    on conflict(profile_id) do update set phone=excluded.phone;
end $$;
create function public.update_own_profile(p_name text,p_phone text) returns void
language sql security invoker set search_path = '' as $$select private.update_own_profile(p_name,p_phone)$$;

create function public.create_event_batch(p_events jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare series uuid; total integer; team uuid;
begin
  total := jsonb_array_length(p_events);
  if total < 1 or total > 52 then raise exception 'Invalid recurrence length'; end if;
  team := (p_events->0->>'team_id')::uuid;
  if exists(select 1 from jsonb_array_elements(p_events) e where (e->>'team_id')::uuid <> team) then raise exception 'Mixed teams'; end if;
  if total > 1 then insert into public.event_series(team_id,weeks) values(team,total) returning id into series; end if;
  insert into public.events(team_id,series_id,title,kind,description,venue,starts_at,ends_at,opponent,score,home)
    select team,series,e.title,e.kind,coalesce(e.description,''),e.venue,e.starts_at,e.ends_at,e.opponent,e.score,e.home
    from jsonb_to_recordset(p_events) as e(title text,kind text,description text,venue text,starts_at timestamptz,ends_at timestamptz,opponent text,score text,home boolean);
end $$;

create function private.validate_relationship() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'team_memberships' then
    if not exists(select 1 from public.user_roles where profile_id=new.profile_id and role=new.kind) then raise exception 'Member role required'; end if;
    if not exists(select 1 from public.profiles where id=new.profile_id and active) then raise exception 'Active member required'; end if;
  else
    if not exists(select 1 from public.user_roles where profile_id=new.guardian_id and role='guardian') or
       not exists(select 1 from public.user_roles where profile_id=new.player_id and role='player') then raise exception 'Guardian and player roles required'; end if;
  end if;
  return new;
end $$;
create trigger validate_membership before insert or update on public.team_memberships for each row execute function private.validate_relationship();
create trigger validate_guardian before insert or update on public.guardian_players for each row execute function private.validate_relationship();

-- Charges are append-only after issuance. Corrections use an explicitly audited
-- future charge-adjustment workflow, never an arbitrary mutable paid status.
revoke update, delete on public.charges from authenticated;
create function private.validate_charge() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.user_roles where profile_id=new.player_id and role='player') then raise exception 'Player role required'; end if;
  return new;
end $$;
create trigger validate_charge before insert on public.charges for each row execute function private.validate_charge();

-- Active users may edit only their name and phone through the narrow RPC.
-- Admins cannot deactivate/demote their own current account through the Data API.
create function private.protect_own_admin() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return coalesce(new,old); end if;
  if tg_table_name='profiles' and old.id=private.viewer() and old.active and not new.active then raise exception 'Cannot deactivate own account'; end if;
  if tg_table_name='user_roles' and old.profile_id=private.viewer() and old.role='admin' then raise exception 'Cannot remove own administrator role'; end if;
  return coalesce(new,old);
end $$;
create trigger protect_admin_profile before update on public.profiles for each row execute function private.protect_own_admin();
create trigger protect_admin_role before delete or update on public.user_roles for each row execute function private.protect_own_admin();

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_member(text,text,text,date,text), public.edit_member(uuid,text,text,text,date), public.create_event_batch(jsonb), public.update_own_profile(text,text) to authenticated;
revoke execute on function private.update_own_profile(text,text), private.validate_relationship(), private.validate_charge(), private.protect_own_admin() from public, anon, authenticated;
grant execute on function private.update_own_profile(text,text) to authenticated;
