create index events_calendar_idx on public.events(starts_at,id);
create function public.calendar_page(p_from timestamptz,p_to timestamptz,p_team uuid,p_kind text,p_player uuid,p_after_at timestamptz,p_after_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with matching as (
  select e.* from public.events e where e.starts_at>=p_from and e.starts_at<p_to
   and (p_team is null or e.team_id=p_team) and (p_kind is null or e.kind=p_kind)
   and (p_player is null or exists(select 1 from public.team_memberships m join public.profiles p on p.id=m.profile_id
     join public.user_roles r on r.profile_id=p.id and r.role='player'
     where m.team_id=e.team_id and m.profile_id=p_player and m.kind='player'))
 ), candidates as materialized (
  select * from matching e where (p_after_at is null and p_after_id is null) or (e.starts_at,e.id)>(p_after_at,p_after_id)
  order by starts_at,id limit 51
 ), roster as materialized (
   select m.team_id,m.profile_id from public.team_memberships m join public.profiles p on p.id=m.profile_id and p.active
   join public.user_roles r on r.profile_id=p.id and r.role='player'
   where m.kind='player' and (p_player is null or m.profile_id=p_player)
     and m.team_id in (select team_id from candidates)
 ), page as (
  select e.*,(select t.name from public.teams t where t.id=e.team_id) as team_name,
    counts.participant_count,counts.pending_count
  from candidates e cross join lateral (
   select count(*) as participant_count,count(*) filter(where not exists(select 1 from public.availability a where a.event_id=e.id and a.player_id=m.profile_id)) as pending_count
   from roster m where m.team_id=e.team_id
  ) counts order by e.starts_at,e.id limit 50
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by starts_at,id) from page p),'[]'::jsonb),'has_more',(select count(*)>50 from candidates),'total',(select count(*) from matching))
$$;
revoke all on function public.calendar_page(timestamptz,timestamptz,uuid,text,uuid,timestamptz,uuid) from public,anon;
grant execute on function public.calendar_page(timestamptz,timestamptz,uuid,text,uuid,timestamptz,uuid) to authenticated;
