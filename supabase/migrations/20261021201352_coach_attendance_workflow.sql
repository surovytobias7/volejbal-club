-- Extend the existing attendance record. NULL is explicitly unmarked, including
-- after a correction; retaining the row preserves its version and audit trail.
-- Losing the last club role must also close self/guardian reads with an old JWT.
create or replace function private.viewer() returns uuid
language sql stable security definer set search_path='' as $$
  select p.id from public.profiles p where p.user_id=(select auth.uid()) and p.active
    and exists(select 1 from public.user_roles r where r.profile_id=p.id)
$$;

alter table public.attendance drop constraint attendance_status_check;
alter table public.attendance alter column status drop not null;
alter table public.attendance add constraint attendance_status_check
  check(status in ('present','absent','late','excused'));
alter table public.attendance add column reason text not null default ''
  check(length(reason)<=200);
alter table public.attendance add column version integer not null default 1 check(version>0);
alter table public.attendance add constraint attendance_reason_status_check
  check(reason='' or status is not distinct from 'excused');

-- Identity cannot be moved by a direct API update. Provenance is database-owned.
create function private.guard_attendance() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  -- Also serialize direct Data API writes with cancellation/team reassignment.
  perform 1 from public.events where id=new.event_id and status<>'cancelled' for update;
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if (new.event_id,new.player_id) is distinct from (old.event_id,old.player_id) then
      raise exception 'Immutable attendance identity' using errcode='42501';
    end if;
    new.version:=old.version+1;
  else
    new.version:=1;
  end if;
  new.updated_by:=auth.uid();
  new.updated_at:=clock_timestamp();
  return new;
end $$;
create trigger guard_attendance before insert or update on public.attendance
  for each row execute function private.guard_attendance();
revoke all on function private.guard_attendance() from public,anon,authenticated;

create function private.guard_availability() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.event_id,new.player_id) is distinct from (old.event_id,old.player_id) then
    raise exception 'Immutable availability identity' using errcode='42501';
  end if;
  new.updated_by:=auth.uid();
  new.updated_at:=clock_timestamp();
  return new;
end $$;
create trigger guard_availability before insert or update on public.availability
  for each row execute function private.guard_availability();
revoke all on function private.guard_availability() from public,anon,authenticated;

-- Historical attendance remains editable by the CURRENT session's coaches/admin
-- after a player leaves. Only inserts require current active player membership.
drop policy attendance_update on public.attendance;
create policy attendance_update on public.attendance for update to authenticated
  using(private.manages_event(event_id))
  with check(private.manages_event(event_id) and updated_by=auth.uid()
    and exists(select 1 from public.events e where e.id=event_id and e.status<>'cancelled'));

-- Moving an event with private records to another team would expose its history.
create function private.guard_event_team() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.team_id is distinct from old.team_id and (
    exists(select 1 from public.attendance where event_id=old.id) or
    exists(select 1 from public.availability where event_id=old.id) or
    exists(select 1 from public.internal_notes where event_id=old.id)
  ) then raise exception 'Event with records cannot change team' using errcode='23514'; end if;
  return new;
end $$;
create trigger guard_event_team before update on public.events
  for each row execute function private.guard_event_team();
revoke all on function private.guard_event_team() from public,anon,authenticated;

-- One transaction for a whole save. Lock the session before rows to serialize
-- saves with cancellation; then compare per-player versions to avoid lost edits.
create function public.save_attendance(p_event uuid,p_changes jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  session_status text;
  change jsonb;
  target uuid;
  expected integer;
  wanted text;
  explanation text;
  previous public.attendance;
  saved public.attendance;
  result jsonb:='[]'::jsonb;
begin
  if not private.manages_event(p_event) then
    raise exception 'Attendance access denied' using errcode='42501';
  end if;
  select status into session_status from public.events where id=p_event for update;
  if session_status is null or session_status='cancelled' then
    raise exception 'Session unavailable' using errcode='42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' then
    raise exception 'Invalid attendance batch' using errcode='22023';
  end if;
  if jsonb_array_length(p_changes) not between 1 and 1000 or
    (select count(distinct x->>'player_id') from jsonb_array_elements(p_changes) x)<>jsonb_array_length(p_changes)
  then raise exception 'Invalid attendance batch' using errcode='22023'; end if;
  for change in select value from jsonb_array_elements(p_changes) order by value->>'player_id' loop
    if not (change ?& array['player_id','status','reason','expected_version']) or
      jsonb_typeof(change->'reason')<>'string' or
      jsonb_typeof(change->'expected_version')<>'number'
    then raise exception 'Invalid attendance change' using errcode='22023'; end if;
    target:=(change->>'player_id')::uuid;
    wanted:=change->>'status';
    explanation:=btrim(change->>'reason');
    expected:=(change->>'expected_version')::integer;
    if expected<0 or length(explanation)>200 or
      (wanted is not null and wanted not in ('present','absent','late','excused')) or
      (explanation<>'' and wanted is distinct from 'excused')
    then raise exception 'Invalid attendance change' using errcode='22023'; end if;
    select * into previous from public.attendance
      where event_id=p_event and player_id=target for update;
    if found then
      if previous.status is not distinct from wanted and previous.reason=explanation then
        -- Safe retry after a lost acknowledgement: no duplicate audit/version.
        saved:=previous;
      else
        if previous.version<>expected then
          raise exception 'Attendance changed concurrently' using errcode='40001';
        end if;
        update public.attendance set status=wanted,reason=explanation
          where event_id=p_event and player_id=target returning * into saved;
      end if;
    else
      if expected<>0 then
        raise exception 'Attendance changed concurrently' using errcode='40001';
      end if;
      insert into public.attendance(event_id,player_id,status,reason)
        values(p_event,target,wanted,explanation) returning * into saved;
    end if;
    result:=result || jsonb_build_array(jsonb_build_object(
      'player_id',saved.player_id,'status',saved.status,'reason',saved.reason,
      'version',saved.version,'updated_at',saved.updated_at));
  end loop;
  return result;
end $$;
revoke all on function public.save_attendance(uuid,jsonb) from public,anon;
grant execute on function public.save_attendance(uuid,jsonb) to authenticated;

-- Reuse the roster API, including historical participants. RLS still controls
-- every row and aggregate: a player/guardian never receives a teammate's entry.
-- Only the display name of an existing attendance participant may outlive their
-- membership. This does not grant access to the departed player's profile.
create function private.attendance_player_name(p_event uuid,p_player uuid) returns text
language sql stable security definer set search_path='' as $$
  select p.full_name from public.profiles p where p.id=p_player
    and (private.manages_event(p_event) or private.owns_player(p_player))
    and exists(select 1 from public.attendance a where a.event_id=p_event and a.player_id=p_player)
$$;
revoke all on function private.attendance_player_name(uuid,uuid) from public,anon;
grant execute on function private.attendance_player_name(uuid,uuid) to authenticated;
create or replace function public.event_roster_page(p_event uuid,p_query text,p_name text,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with eligible as (
  select p.id from public.events e
  join public.team_memberships m on m.team_id=e.team_id and m.kind='player'
  join public.profiles p on p.id=m.profile_id and p.active
  where e.id=p_event and exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='player')
 ), participants as (
  select id from eligible union select player_id from public.attendance where event_id=p_event
 ), named as (
  select x.id as profile_id,coalesce(p.full_name,private.attendance_player_name(p_event,x.id),'Hráč mimo aktuálneho tímu') as full_name,
    coalesce(p.active,false) as active,exists(select 1 from eligible e where e.id=x.id) as current_member
  from participants x left join public.profiles p on p.id=x.id
 ), matching as (
  select * from named where strpos(lower(full_name),lower(coalesce(p_query,'')))>0
 ), candidates as materialized (
  select * from matching p where (p_name is null and p_id is null) or (p.full_name,p.profile_id)>(p_name,p_id)
  order by full_name,profile_id limit 26
 ), page as (
  select p.*,private.owns_player(p.profile_id) and p.current_member as can_respond,
    (select jsonb_build_object('response',a.response,'reason',a.reason) from public.availability a where a.event_id=p_event and a.player_id=p.profile_id) as availability,
    a.status as attendance,coalesce(a.reason,'') as attendance_reason,
    coalesce(a.version,0) as attendance_version,a.updated_at as attendance_updated_at
  from candidates p left join public.attendance a on a.event_id=p_event and a.player_id=p.profile_id
  order by full_name,profile_id limit 25
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by full_name,profile_id) from page p),'[]'::jsonb),
   'has_more',(select count(*)>25 from candidates),'total',(select count(*) from matching),'can_manage',private.manages_event(p_event))
$$;

-- Unmarked corrections are excluded from history totals. Late counts as attended.
create or replace function public.attendance_page(p_query text,p_player uuid,p_status text,p_at timestamptz,p_event uuid,p_cursor_player uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  with matching as materialized (
    select a.*, p.full_name, e.title, e.starts_at from public.attendance a
    left join public.profiles p on p.id=a.player_id left join public.events e on e.id=a.event_id
    where a.status is not null and (p_player is null or a.player_id=p_player) and (p_status is null or a.status=p_status)
      and (coalesce(p_query,'')='' or strpos(lower(p.full_name),lower(p_query))>0)
  ), candidates as (
    select * from matching a where (p_at is null and p_event is null and p_cursor_player is null)
      or (a.updated_at,a.event_id,a.player_id)<(p_at,p_event,p_cursor_player)
    order by updated_at desc,event_id desc,player_id desc limit 26
  ), page as (select * from candidates order by updated_at desc,event_id desc,player_id desc limit 25)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by updated_at desc,event_id desc,player_id desc) from page p),'[]'::jsonb),
    'has_more',(select count(*)>25 from candidates),
    'total',(select count(*) from matching),
    'present',(select count(*) from matching where status='present'),
    'late',(select count(*) from matching where status='late'),
    'absent',(select count(*) from matching where status='absent'),
    'excused',(select count(*) from matching where status='excused')
  )
$$;

create or replace function public.dashboard_summary(p_at timestamptz) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with upcoming as (
    select e.id, e.team_id from public.events e
    where e.status = 'scheduled' and e.starts_at >= p_at
    order by e.starts_at, e.id limit 5
  ), active_players as (
    select p.id from public.profiles p where p.active
      and exists(select 1 from public.user_roles r where r.profile_id = p.id and r.role = 'player')
  ), participation as (
    select count(*) as total, count(*) filter(where a.status in ('present','late')) as present
    from public.attendance a where a.status is not null
  )
  select jsonb_build_object(
    'team_count', (select count(*) from public.teams where not archived),
    'player_count', (select count(*) from active_players),
    'event_count', (select count(*) from public.events where status = 'scheduled' and starts_at >= p_at),
    'pending_count', (
      select count(*) from upcoming e join public.team_memberships m on m.team_id = e.team_id and m.kind = 'player'
      join active_players p on p.id = m.profile_id
      where not exists(select 1 from public.availability a where a.event_id = e.id and a.player_id = p.id)
    ),
    'participation', (select round(100.0 * present / nullif(total, 0)) from participation)
  )
$$;

-- Four children per page; aggregate their complete histories under caller RLS.
-- No guardian ID argument: even an admin only sees their own family links here.
create or replace function public.guardian_dashboard(p_at timestamptz, p_after uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with children as materialized (
    select p.id, p.full_name from public.guardian_players g
    join public.profiles p on p.id = g.player_id and p.active
    where g.guardian_id = (select private.viewer())
      and exists(select 1 from public.user_roles r where r.profile_id = p.id and r.role = 'player')
  ), candidates as materialized (
    select * from children where p_after is null or id > p_after order by id limit 5
  ), page as (
    select * from candidates order by id limit 4
  ), details as (
    select c.*, (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at,
        'venue', e.venue, 'response', (select a.response from public.availability a where a.event_id = e.id and a.player_id = c.id))
      from public.events e join public.teams t on t.id = e.team_id and not t.archived
      where e.status = 'scheduled' and e.starts_at >= p_at
        and exists(select 1 from public.team_memberships m where m.team_id = e.team_id and m.profile_id = c.id and m.kind = 'player')
      order by e.starts_at, e.id limit 1
    ) as next_event, (
      select jsonb_build_object('recorded', count(*), 'present', count(*) filter(where a.status in ('present','late')))
      from public.attendance a where a.player_id = c.id and a.status is not null
    ) as attendance, (
      select coalesce(sum(ch.amount_cents
        + coalesce((select sum(a.delta_cents) from public.charge_adjustments a where a.charge_id = ch.id), 0)
        - coalesce((select sum(p.amount_cents) from public.payments p where p.charge_id = ch.id), 0)), 0)
      from public.charges ch where ch.player_id = c.id
    ) as remaining
    from page c
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from details d), '[]'::jsonb),
    'has_more', (select count(*) > 4 from candidates),
    'total', (select count(*) from children)
  )
$$;
