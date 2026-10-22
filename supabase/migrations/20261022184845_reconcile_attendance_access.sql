-- Reconcile the attendance workflow with the later access-integrity guards.
-- Keep one participation guard and one event ownership guard, preserving the
-- existing audit triggers. No records or historical migration files are changed.
create or replace function private.guard_participation() returns trigger
language plpgsql security definer set search_path='' as $$
declare session_status text;
begin
  if tg_op='UPDATE' and (new.event_id,new.player_id) is distinct from (old.event_id,old.player_id) then
    raise exception 'Immutable event and player' using errcode='23514';
  end if;
  select status into session_status from public.events where id=new.event_id for update;
  if session_status is null or session_status='cancelled' then
    raise exception 'Session unavailable' using errcode='42501';
  end if;
  if tg_table_name='attendance' then
    if not private.manages_event(new.event_id) or
      (tg_op='INSERT' and not private.event_player(new.event_id,new.player_id)) then
      raise exception 'Participation access denied' using errcode='42501';
    end if;
    -- Existing records may be corrected after membership/role/deactivation
    -- changes. Their identity stays fixed; new records require eligibility.
    if tg_op='UPDATE' then new.version:=old.version+1;
    else new.version:=1; end if;
  else
    if not private.event_player(new.event_id,new.player_id) or
      not private.owns_player(new.player_id) then
      raise exception 'Participation access denied' using errcode='42501';
    end if;
  end if;
  new.updated_by:=auth.uid();
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function private.guard_participation() from public,anon,authenticated;

drop trigger guard_attendance on public.attendance;
drop function private.guard_attendance();
drop trigger guard_availability on public.availability;
drop function private.guard_availability();
drop trigger guard_event_team on public.events;
drop function private.guard_event_team();
