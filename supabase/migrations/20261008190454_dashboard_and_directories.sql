-- Counts are calculated before PostgREST row limits, under the caller's RLS.
create function public.dashboard_summary(p_at timestamptz) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with upcoming as (
    select e.id, e.team_id from public.events e
    where e.status = 'scheduled' and e.starts_at >= p_at
    order by e.starts_at, e.id limit 5
  ), active_players as (
    select p.id from public.profiles p where p.active
      and exists(select 1 from public.user_roles r where r.profile_id = p.id and r.role = 'player')
  ), participation as (
    select count(*) as total, count(*) filter(where a.status = 'present') as present
    from public.attendance a
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

create index profiles_directory_idx on public.profiles(full_name, id);
create index teams_directory_idx on public.teams(archived, name, id);

-- Literal substring search: '%' and '_' in a person's name are not wildcards.
create function public.member_page(p_query text, p_after_name text, p_after_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with matching as (
    select p.id, p.full_name, p.active, p.user_id from public.profiles p
    where strpos(lower(p.full_name), lower(coalesce(p_query, ''))) > 0
  ), candidates as materialized (
    select * from matching p where (p_after_name is null and p_after_id is null)
      or (p.full_name, p.id) > (p_after_name, p_after_id)
    order by p.full_name, p.id limit 26
  ), page as (
    select p.*, coalesce((select jsonb_agg(r.role order by r.role) from public.user_roles r where r.profile_id = p.id), '[]'::jsonb) as roles
    from candidates p order by p.full_name, p.id limit 25
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.full_name, p.id) from page p), '[]'::jsonb),
    'has_more', (select count(*) > 25 from candidates),
    'total', (select count(*) from matching)
  )
$$;

create function public.team_page(p_archived boolean, p_after_name text, p_after_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with candidates as materialized (
    select t.id, t.name, t.category, t.description from public.teams t
    where t.archived = p_archived and ((p_after_name is null and p_after_id is null)
      or (t.name, t.id) > (p_after_name, p_after_id))
    order by t.name, t.id limit 26
  ), page as (
    select * from candidates order by name, id limit 25
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.name, p.id) from page p), '[]'::jsonb),
    'has_more', (select count(*) > 25 from candidates)
  )
$$;

revoke all on function public.dashboard_summary(timestamptz), public.member_page(text,text,uuid), public.team_page(boolean,text,uuid) from public, anon;
grant execute on function public.dashboard_summary(timestamptz), public.member_page(text,text,uuid), public.team_page(boolean,text,uuid) to authenticated;
