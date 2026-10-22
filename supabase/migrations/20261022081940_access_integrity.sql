-- Current database state, never cached JWT metadata, determines club access.
create or replace function private.viewer() returns uuid
language sql stable security definer set search_path='' as $$
  select p.id from public.profiles p
  where p.user_id=(select auth.uid()) and p.active
    and exists(select 1 from public.user_roles r where r.profile_id=p.id)
$$;

create or replace function private.owns_player(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.viewer() is not null and (
    (target=private.viewer() and private.has_role('player')) or
    (private.has_role('guardian') and exists(select 1 from public.guardian_players
      where guardian_id=private.viewer() and player_id=target))
  )
$$;
create or replace function private.sees_profile(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select target=private.viewer() or private.has_role('admin') or private.owns_player(target)
    or exists(select 1 from public.team_memberships m join public.user_roles r
      on r.profile_id=m.profile_id and r.role=m.kind
      where m.profile_id=target and private.coaches(m.team_id))
$$;
drop policy guardian_read on public.guardian_players;
create policy guardian_read on public.guardian_players for select to authenticated using(
  (guardian_id=private.viewer() and private.has_role('guardian')) or
  (player_id=private.viewer() and private.has_role('player'))
);

-- Caller-only predicates are statement-local init plans, not per-row lookups.
-- This keeps complete club aggregates fast without caching across requests.
do $$ declare t text; begin
  foreach t in array array['profiles','member_details','user_roles','club_settings','teams','team_memberships','guardian_players','fee_plans','charges'] loop
    execute format('alter policy admin_manage on public.%I using ((select private.has_role(''admin''))) with check ((select private.has_role(''admin'')))',t);
  end loop;
end $$;
alter policy role_read on public.user_roles using(profile_id=(select private.viewer()));
alter policy club_read on public.club_settings using((select private.viewer()) is not null);
alter policy event_read on public.events using((select private.has_role('admin')) or private.sees_team(team_id));
alter policy event_manage on public.events using((select private.has_role('admin')) or private.coaches(team_id))
  with check((select private.has_role('admin')) or private.coaches(team_id));
alter policy attendance_read on public.attendance using((select private.has_role('admin')) or private.manages_event(event_id) or private.owns_player(player_id));
alter policy availability_read on public.availability using((select private.has_role('admin')) or private.manages_event(event_id) or private.owns_player(player_id));

-- Serialize dependent writes with team changes. An event with private/history
-- records cannot change ownership, including when an administrator edits it.
create function private.protect_event_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.team_id is distinct from old.team_id and (
    exists(select 1 from public.availability where event_id=old.id) or
    exists(select 1 from public.attendance where event_id=old.id) or
    exists(select 1 from public.internal_notes where event_id=old.id)
  ) then raise exception 'Event with private records cannot change teams' using errcode='23514'; end if;
  return new;
end $$;
create trigger protect_event_scope before update of team_id on public.events
  for each row execute function private.protect_event_scope();

create function private.lock_record_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.event_id is not null then
    perform 1 from public.events where id=new.event_id for update;
    if not found then raise exception 'Event unavailable' using errcode='23503'; end if;
  end if;
  return new;
end $$;
create trigger a_lock_record_event before insert or update on public.internal_notes
  for each row execute function private.lock_record_event();

create function private.guard_participation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.event_id,new.player_id) is distinct from (old.event_id,old.player_id) then
    raise exception 'Immutable event and player' using errcode='23514';
  end if;
  perform 1 from public.events where id=new.event_id for update;
  if not private.event_player(new.event_id,new.player_id) or
    (tg_table_name='availability' and not private.owns_player(new.player_id)) or
    (tg_table_name='attendance' and not private.manages_event(new.event_id)) then
    raise exception 'Participation access denied' using errcode='42501';
  end if;
  new.updated_by:=auth.uid();
  new.updated_at:=clock_timestamp();
  return new;
end $$;
create trigger guard_participation before insert or update on public.availability
  for each row execute function private.guard_participation();
create trigger guard_participation before insert or update on public.attendance
  for each row execute function private.guard_participation();

create function private.stamp_payment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.recorded_by:=auth.uid(); new.created_at:=clock_timestamp();
  return new;
end $$;
create trigger stamp_payment before insert on public.payments for each row execute function private.stamp_payment();

-- Archive/history preservation; only relationship removal is a supported delete.
revoke delete on public.profiles,public.member_details,public.teams,public.club_settings,public.fee_plans from authenticated;
-- Both triggers previously called the same auditor for each announcement change.
drop trigger audit_announcements on public.announcements;
revoke all on function private.protect_event_scope(),private.lock_record_event(),private.guard_participation(),private.stamp_payment() from public,anon,authenticated;
