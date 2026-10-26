-- Expected version conflicts are HTTP 409, not transient PostgreSQL serialization failures.
-- Preserve the atomic batch, locks, RLS, audit, idempotency and existing RPC signature.
create or replace function public.save_attendance(p_event uuid,p_changes jsonb) returns jsonb
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
          raise exception 'Attendance changed concurrently' using errcode='PT409';
        end if;
        update public.attendance set status=wanted,reason=explanation
          where event_id=p_event and player_id=target returning * into saved;
      end if;
    else
      if expected<>0 then
        raise exception 'Attendance changed concurrently' using errcode='PT409';
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

