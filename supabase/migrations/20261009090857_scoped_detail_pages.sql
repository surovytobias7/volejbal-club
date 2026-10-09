create function public.event_roster_page(p_event uuid,p_query text,p_name text,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with matching as (
  select p.id as profile_id,p.full_name,p.active from public.events e
  join public.team_memberships m on m.team_id=e.team_id and m.kind='player'
  join public.profiles p on p.id=m.profile_id and p.active
  where e.id=p_event and exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='player')
   and strpos(lower(p.full_name),lower(coalesce(p_query,'')))>0
 ), candidates as materialized (
  select * from matching p where (p_name is null and p_id is null) or (p.full_name,p.profile_id)>(p_name,p_id)
  order by full_name,profile_id limit 26
 ), page as (
  select p.*,private.owns_player(p.profile_id) as can_respond,
    (select jsonb_build_object('response',a.response,'reason',a.reason) from public.availability a where a.event_id=p_event and a.player_id=p.profile_id) as availability,
    (select a.status from public.attendance a where a.event_id=p_event and a.player_id=p.profile_id) as attendance
  from candidates p order by full_name,profile_id limit 25
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by full_name,profile_id) from page p),'[]'::jsonb),
   'has_more',(select count(*)>25 from candidates),'total',(select count(*) from matching),'can_manage',private.manages_event(p_event))
$$;
create function public.team_roster_page(p_team uuid,p_query text,p_name text,p_id uuid,p_kind text) returns jsonb
language sql stable security invoker set search_path='' as $$
 with candidates as materialized (
  select m.profile_id,m.kind,p.full_name from public.team_memberships m join public.profiles p on p.id=m.profile_id
  where m.team_id=p_team and strpos(lower(p.full_name),lower(coalesce(p_query,'')))>0
   and ((p_name is null and p_id is null and p_kind is null) or (p.full_name,m.profile_id,m.kind)>(p_name,p_id,p_kind))
  order by p.full_name,m.profile_id,m.kind limit 26
 ), page as (select * from candidates order by full_name,profile_id,kind limit 25)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by full_name,profile_id,kind) from page p),'[]'::jsonb),'has_more',(select count(*)>25 from candidates))
$$;
revoke all on function public.event_roster_page(uuid,text,text,uuid),public.team_roster_page(uuid,text,text,uuid,text) from public,anon;
grant execute on function public.event_roster_page(uuid,text,text,uuid),public.team_roster_page(uuid,text,text,uuid,text) to authenticated;
