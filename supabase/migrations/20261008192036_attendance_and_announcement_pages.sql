create index attendance_history_idx on public.attendance(updated_at desc,event_id desc,player_id desc);
create index announcements_page_idx on public.announcements(archived,important desc,created_at desc,id desc);

create function public.attendance_page(p_query text,p_player uuid,p_status text,p_at timestamptz,p_event uuid,p_cursor_player uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  with matching as materialized (
    select a.*, p.full_name, e.title, e.starts_at from public.attendance a
    left join public.profiles p on p.id=a.player_id left join public.events e on e.id=a.event_id
    where (p_player is null or a.player_id=p_player) and (p_status is null or a.status=p_status)
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
    'absent',(select count(*) from matching where status='absent'),
    'excused',(select count(*) from matching where status='excused')
  )
$$;

create function public.announcement_page(p_query text,p_archived boolean,p_important boolean,p_at timestamptz,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  with candidates as materialized (
    select a.* from public.announcements a where a.archived=p_archived
      and (coalesce(p_query,'')='' or strpos(lower(a.title || ' ' || a.body),lower(p_query))>0)
      and ((p_important is null and p_at is null and p_id is null)
        or (a.important,a.created_at,a.id)<(p_important,p_at,p_id))
    order by important desc,created_at desc,id desc limit 26
  ), page as (select * from candidates order by important desc,created_at desc,id desc limit 25)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by important desc,created_at desc,id desc) from page p),'[]'::jsonb),
    'has_more',(select count(*)>25 from candidates)
  )
$$;
revoke all on function public.attendance_page(text,uuid,text,timestamptz,uuid,uuid),public.announcement_page(text,boolean,boolean,timestamptz,uuid) from public,anon;
grant execute on function public.attendance_page(text,uuid,text,timestamptz,uuid,uuid),public.announcement_page(text,boolean,boolean,timestamptz,uuid) to authenticated;
