-- Scope uses current roles and memberships, including for the original author.
create function private.can_access_internal_notes(p_player uuid, p_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.viewer() is not null and (
    (p_player is not null and p_event is null and exists (
      select 1 from public.profiles p where p.id = p_player
        and exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='player')
        and (private.has_role('admin') or (
          p.active and private.has_role('coach') and exists(
            select 1 from public.team_memberships m
            where m.profile_id=p.id and m.kind='player' and private.coaches(m.team_id)
          )
        ))
    )) or
    (p_event is not null and p_player is null and exists (
      select 1 from public.events e where e.id=p_event and e.kind='training'
        and private.coaches(e.team_id)
    ))
  )
$$;
revoke all on function private.can_access_internal_notes(uuid,uuid) from public,anon;
grant execute on function private.can_access_internal_notes(uuid,uuid) to authenticated;

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id),
  event_id uuid references public.events(id),
  body text not null check(length(body)<=4000 and length(btrim(body,E' \t\n\r'))>0),
  author_id uuid not null default private.viewer() references public.profiles(id),
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check(version>0),
  check(num_nonnulls(player_id,event_id)=1)
);
create index internal_notes_player_page_idx on public.internal_notes(player_id,created_at desc,id desc) where player_id is not null;
create index internal_notes_event_page_idx on public.internal_notes(event_id,created_at desc,id desc) where event_id is not null;
create index internal_notes_author_idx on public.internal_notes(author_id);
alter table public.internal_notes enable row level security;
revoke all on public.internal_notes from public,anon,authenticated;
grant select on public.internal_notes to authenticated;
grant insert(player_id,event_id,body),update(body) on public.internal_notes to authenticated;
create policy internal_notes_read on public.internal_notes for select to authenticated
  using(private.can_access_internal_notes(player_id,event_id));
create policy internal_notes_create on public.internal_notes for insert to authenticated
  with check(private.can_access_internal_notes(player_id,event_id) and author_id=private.viewer());
create policy internal_notes_edit on public.internal_notes for update to authenticated
  using(private.can_access_internal_notes(player_id,event_id) and (author_id=private.viewer() or private.has_role('admin')))
  with check(private.can_access_internal_notes(player_id,event_id) and (author_id=private.viewer() or private.has_role('admin')));

create function private.guard_internal_note() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not private.can_access_internal_notes(new.player_id,new.event_id) then
    raise exception 'Internal note access denied' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    if new.author_id is distinct from private.viewer() then
      raise exception 'Invalid note author' using errcode='42501';
    end if;
    select full_name into new.author_name from public.profiles where id=private.viewer();
    new.created_at:=clock_timestamp();
    new.updated_at:=new.created_at;
    new.version:=1;
  else
    if not (old.author_id=private.viewer() or private.has_role('admin')) or
      (new.id,new.player_id,new.event_id,new.author_id,new.author_name,new.created_at,new.updated_at,new.version)
      is distinct from
      (old.id,old.player_id,old.event_id,old.author_id,old.author_name,old.created_at,old.updated_at,old.version)
    then raise exception 'Immutable note provenance' using errcode='42501'; end if;
    new.updated_at:=clock_timestamp();
    new.version:=old.version+1;
  end if;
  return new;
end $$;
revoke all on function private.guard_internal_note() from public,anon,authenticated;
create trigger guard_internal_note before insert or update on public.internal_notes
  for each row execute function private.guard_internal_note();
create trigger audit_change after insert or update on public.internal_notes
  for each row execute function private.audit_change();

create function public.can_access_internal_notes(p_player uuid,p_event uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select private.can_access_internal_notes(p_player,p_event)
$$;
create function public.internal_notes_page(p_player uuid,p_event uuid,p_before_at timestamptz,p_before_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  with candidates as materialized (
    select n.* from public.internal_notes n
    where ((p_event is null and n.player_id=p_player) or (p_player is null and n.event_id=p_event))
      and ((p_before_at is null and p_before_id is null) or (n.created_at,n.id)<(p_before_at,p_before_id))
    order by n.created_at desc,n.id desc limit 26
  ), page as (
    select n.*, (private.has_role('admin') or n.author_id=private.viewer()) as can_edit
    from candidates n order by n.created_at desc,n.id desc limit 25
  ) select jsonb_build_object(
    'can_write',private.can_access_internal_notes(p_player,p_event),
    'items',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id desc) from page n),'[]'::jsonb),
    'has_more',(select count(*)>25 from candidates)
  )
$$;
revoke all on function public.can_access_internal_notes(uuid,uuid),public.internal_notes_page(uuid,uuid,timestamptz,uuid) from public,anon;
grant execute on function public.can_access_internal_notes(uuid,uuid),public.internal_notes_page(uuid,uuid,timestamptz,uuid) to authenticated;
