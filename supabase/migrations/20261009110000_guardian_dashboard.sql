-- Four children per page; aggregate their complete histories under caller RLS.
-- No guardian ID argument: even an admin only sees their own family links here.
create function public.guardian_dashboard(p_at timestamptz, p_after uuid) returns jsonb
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
      select jsonb_build_object('recorded', count(*), 'present', count(*) filter(where a.status = 'present'))
      from public.attendance a where a.player_id = c.id
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
revoke all on function public.guardian_dashboard(timestamptz,uuid) from public,anon;
grant execute on function public.guardian_dashboard(timestamptz,uuid) to authenticated;
