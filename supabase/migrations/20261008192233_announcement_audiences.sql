alter table public.announcements add column extra_team_ids uuid[] not null default '{}';
alter table public.announcements add column recipient_ids uuid[] not null default '{}';
alter table public.announcements add constraint audience_size check(cardinality(extra_team_ids)<=50 and cardinality(recipient_ids)<=50);
alter table public.announcements add constraint audience_exclusive check(cardinality(recipient_ids)=0 or (team_id is null and cardinality(extra_team_ids)=0));

-- An internal recipient predicate also drives notification fanout. Not an API.
create function private.announcement_recipient(viewer uuid,team uuid,extra uuid[],recipients uuid[]) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=viewer and p.active) and (
   exists(select 1 from public.user_roles r where r.profile_id=viewer and r.role='admin')
   or (cardinality(recipients)>0 and viewer=any(recipients))
   or (cardinality(recipients)=0 and (
     (team is null and cardinality(extra)=0)
     or exists(select 1 from public.team_memberships m join public.user_roles r on r.profile_id=m.profile_id and r.role=m.kind
       where (m.team_id=team or m.team_id=any(extra)) and (m.profile_id=viewer or exists(
         select 1 from public.guardian_players g join public.user_roles gr on gr.profile_id=g.guardian_id and gr.role='guardian'
         where g.guardian_id=viewer and g.player_id=m.profile_id)))
   ))
 )
$$;
revoke all on function private.announcement_recipient(uuid,uuid,uuid[],uuid[]) from public,anon,authenticated;
create function private.sees_announcement(team uuid,extra uuid[],recipients uuid[]) returns boolean
language sql stable security definer set search_path='' as $$
 select private.announcement_recipient(private.viewer(),team,extra,recipients)
$$;
create function private.manages_announcement(team uuid,extra uuid[],recipients uuid[]) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_role('admin') or (cardinality(recipients)=0 and (team is not null or cardinality(extra)>0)
   and (team is null or private.coaches(team)) and not exists(select 1 from unnest(extra) t where not private.coaches(t)))
$$;
revoke all on function private.sees_announcement(uuid,uuid[],uuid[]),private.manages_announcement(uuid,uuid[],uuid[]) from public,anon;
grant execute on function private.sees_announcement(uuid,uuid[],uuid[]),private.manages_announcement(uuid,uuid[],uuid[]) to authenticated;
create function private.validate_announcement_audience() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from unnest(new.extra_team_ids) t where t is null or not exists(select 1 from public.teams where id=t))
   or exists(select 1 from unnest(new.recipient_ids) p where p is null or not exists(select 1 from public.profiles where id=p)) then
   raise exception 'Invalid audience';
 end if;
 return new;
end $$;
revoke all on function private.validate_announcement_audience() from public,anon,authenticated;
create trigger validate_announcement_audience before insert or update on public.announcements for each row execute function private.validate_announcement_audience();
drop policy announcement_read on public.announcements;
drop policy announcement_insert on public.announcements;
drop policy announcement_update on public.announcements;
create policy announcement_read on public.announcements for select to authenticated using(private.sees_announcement(team_id,extra_team_ids,recipient_ids));
create policy announcement_insert on public.announcements for insert to authenticated with check(author_id=private.viewer() and private.manages_announcement(team_id,extra_team_ids,recipient_ids));
create policy announcement_update on public.announcements for update to authenticated using(private.manages_announcement(team_id,extra_team_ids,recipient_ids)) with check(private.manages_announcement(team_id,extra_team_ids,recipient_ids));

alter table public.notifications add column announcement_id uuid references public.announcements(id);
create index notification_announcement_idx on public.notifications(announcement_id);
create unique index notification_announcement_recipient_idx on public.notifications(announcement_id,recipient_id);
-- Keep old rows, but hide legacy announcement notifications without a source ID.
create policy notification_announcement_scope on public.notifications as restrictive for all to authenticated
 using(href<>'/klub/oznamy' or exists(select 1 from public.announcements a where a.id=announcement_id))
 with check(href<>'/klub/oznamy' or exists(select 1 from public.announcements a where a.id=announcement_id));
create function private.notify_announcement_audience() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(recipient_id,title,href,announcement_id)
 select p.id,'Nový oznam: '||new.title,'/klub/oznamy',new.id from public.profiles p
 where p.active and p.user_id is not null and private.announcement_recipient(p.id,new.team_id,new.extra_team_ids,new.recipient_ids)
 on conflict(announcement_id,recipient_id) do nothing;
 return new;
end $$;
revoke all on function private.notify_announcement_audience() from public,anon,authenticated;
drop trigger notify_announcement on public.announcements;
create trigger notify_announcement after insert on public.announcements for each row execute function private.notify_announcement_audience();
create trigger notify_announcement_new_audience after update of team_id,extra_team_ids,recipient_ids on public.announcements for each row execute function private.notify_announcement_audience();
create trigger audit_announcements after insert or update or delete on public.announcements for each row execute function private.audit_change();

create function public.selector_options(p_kind text,p_query text,p_after_label text,p_after_id uuid,p_ids uuid[]) returns jsonb
language sql stable security invoker set search_path='' as $$
 with options as (
   select p.id,p.full_name as label from public.profiles p where p.active and (
     p_kind='members' or (p_kind in ('players','coaches','guardians') and exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role=case p_kind when 'players' then 'player' when 'coaches' then 'coach' else 'guardian' end)))
   union all select t.id,t.name from public.teams t where not t.archived and (p_kind='teams' or (p_kind='managed-teams' and private.coaches(t.id)))
   union all select f.id,f.name from public.fee_plans f where not f.archived and p_kind='plans'
 ), candidates as materialized (
   select * from options o where (p_ids is null or (cardinality(p_ids)<=50 and o.id=any(p_ids)))
    and strpos(lower(o.label),lower(coalesce(p_query,'')))>0
    and ((p_after_label is null and p_after_id is null) or (o.label,o.id)>(p_after_label,p_after_id))
   order by o.label,o.id limit case when p_ids is null then 26 else 50 end
 ), page as (select * from candidates order by label,id limit case when p_ids is null then 25 else 50 end)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by label,id) from page p),'[]'::jsonb),'has_more',p_ids is null and (select count(*)>25 from candidates))
$$;
revoke all on function public.selector_options(text,text,text,uuid,uuid[]) from public,anon;
grant execute on function public.selector_options(text,text,text,uuid,uuid[]) to authenticated;

create or replace function public.announcement_page(p_query text,p_archived boolean,p_important boolean,p_at timestamptz,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with candidates as materialized (
  select a.*,private.manages_announcement(a.team_id,a.extra_team_ids,a.recipient_ids) as can_manage
  from public.announcements a where a.archived=p_archived
   and (coalesce(p_query,'')='' or strpos(lower(a.title||' '||a.body),lower(p_query))>0)
   and ((p_important is null and p_at is null and p_id is null) or (a.important,a.created_at,a.id)<(p_important,p_at,p_id))
  order by important desc,created_at desc,id desc limit 26
 ), page as (select * from candidates order by important desc,created_at desc,id desc limit 25)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by important desc,created_at desc,id desc) from page p),'[]'::jsonb),'has_more',(select count(*)>25 from candidates))
$$;
