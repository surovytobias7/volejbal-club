-- RLS controls rows; these grants also minimize columns exposed by PostgREST.
revoke select on public.profiles,public.member_details,public.announcements from authenticated;
grant select(id,full_name,active,created_at) on public.profiles to authenticated;
grant select(profile_id,email,phone) on public.member_details to authenticated;
grant select(id,team_id,extra_team_ids,title,body,important,archived,author_id,author_name,created_at) on public.announcements to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name,active) on public.profiles to authenticated;

create function private.viewer_context() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',p.id,'name',p.full_name,
    'roles',(select jsonb_agg(r.role order by r.role) from public.user_roles r where r.profile_id=p.id),
    'can_finance',private.has_role('admin') or private.sees_finance(p.id) or
      (private.has_role('guardian') and exists(select 1 from public.guardian_players where guardian_id=p.id)))
  from public.profiles p where p.id=private.viewer()
$$;
create function public.viewer_context() returns jsonb
language sql stable security invoker set search_path='' as $$select private.viewer_context()$$;

create function private.member_private_details(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if (private.has_role('admin') or private.owns_player(p_id) or p_id=private.viewer()) is not true then
    raise exception 'Private details access denied' using errcode='42501';
  end if;
  return (select jsonb_build_object('birth_date',d.birth_date,'email',d.email,'phone',d.phone,
    'account_linked',case when private.has_role('admin') then p.user_id is not null else null end)
    from public.profiles p left join public.member_details d on d.profile_id=p.id where p.id=p_id);
end $$;
create function public.member_private_details(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select private.member_private_details(p_id)$$;

create function private.member_account_linked(p_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role('admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  return (select user_id is not null from public.profiles where id=p_id);
end $$;
create function private.link_member_account(p_id uuid,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role('admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_user is null then raise exception 'Identity required' using errcode='23514'; end if;
  update public.profiles set user_id=p_user where id=p_id and active and user_id is null;
  if not found then raise exception 'Active unlinked member required' using errcode='23514'; end if;
end $$;
create function public.link_member_account(p_id uuid,p_user uuid) returns void
language sql security invoker set search_path='' as $$select private.link_member_account(p_id,p_user)$$;

create function private.audit_actor_names(p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role('admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  if cardinality(p_ids)>26 then raise exception 'Too many actors' using errcode='22023'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',p.full_name))
    from public.profiles p where p.user_id=any(p_ids)),'[]'::jsonb);
end $$;
create function public.audit_actor_names(p_ids uuid[]) returns jsonb
language sql stable security invoker set search_path='' as $$select private.audit_actor_names(p_ids)$$;

create or replace function public.member_page(p_query text,p_after_name text,p_after_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  with matching as (
    select p.id,p.full_name,p.active
    from public.profiles p where (select private.has_role('admin') or private.has_role('coach'))
      and strpos(lower(p.full_name),lower(coalesce(p_query,'')))>0
  ), candidates as materialized (
    select * from matching p where (p_after_name is null and p_after_id is null)
      or (p.full_name,p.id)>(p_after_name,p_after_id)
    order by p.full_name,p.id limit 26
  ), page as (
    select p.*,case when (select private.has_role('admin')) then private.member_account_linked(p.id) else null end as account_linked,
      coalesce((select jsonb_agg(r.role order by r.role) from public.user_roles r where r.profile_id=p.id),'[]'::jsonb) as roles
    from candidates p order by p.full_name,p.id limit 25
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by p.full_name,p.id) from page p),'[]'::jsonb),
    'has_more',(select count(*)>25 from candidates),'total',(select count(*) from matching))
$$;

-- Only this bounded, explicitly scoped reader can inspect the hidden audience.
create function private.announcement_page(p_query text,p_archived boolean,p_important boolean,p_at timestamptz,p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  with candidates as materialized (
    select a.*,private.manages_announcement(a.team_id,a.extra_team_ids,a.recipient_ids) as can_manage
    from public.announcements a where private.sees_announcement(a.team_id,a.extra_team_ids,a.recipient_ids)
      and a.archived=p_archived and (coalesce(p_query,'')='' or strpos(lower(a.title||' '||a.body),lower(p_query))>0)
      and ((p_important is null and p_at is null and p_id is null) or (a.important,a.created_at,a.id)<(p_important,p_at,p_id))
    order by important desc,created_at desc,id desc limit 26
  ), page as (
    select id,team_id,extra_team_ids,title,body,important,archived,author_id,author_name,created_at,can_manage,
      case when cardinality(recipient_ids)>0 then 'people' when team_id is not null or cardinality(extra_team_ids)>0 then 'teams' else 'club' end as audience,
      case when can_manage then recipient_ids else '{}'::uuid[] end as recipient_ids
    from candidates order by important desc,created_at desc,id desc limit 25
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by important desc,created_at desc,id desc) from page p),'[]'::jsonb),
    'has_more',(select count(*)>25 from candidates))
$$;
create or replace function public.announcement_page(p_query text,p_archived boolean,p_important boolean,p_at timestamptz,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select private.announcement_page(p_query,p_archived,p_important,p_at,p_id)$$;
create function private.can_manage_announcement(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.announcements a where a.id=p_id
    and private.manages_announcement(a.team_id,a.extra_team_ids,a.recipient_ids))
$$;
create function public.can_manage_announcement(p_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$select private.can_manage_announcement(p_id)$$;

revoke all on function private.viewer_context(),private.member_private_details(uuid),private.member_account_linked(uuid),private.link_member_account(uuid,uuid),private.audit_actor_names(uuid[]),private.announcement_page(text,boolean,boolean,timestamptz,uuid),private.can_manage_announcement(uuid) from public,anon;
grant execute on function private.viewer_context(),private.member_private_details(uuid),private.member_account_linked(uuid),private.link_member_account(uuid,uuid),private.audit_actor_names(uuid[]),private.announcement_page(text,boolean,boolean,timestamptz,uuid),private.can_manage_announcement(uuid) to authenticated;
revoke all on function public.viewer_context(),public.member_private_details(uuid),public.link_member_account(uuid,uuid),public.audit_actor_names(uuid[]),public.can_manage_announcement(uuid) from public,anon;
grant execute on function public.viewer_context(),public.member_private_details(uuid),public.link_member_account(uuid,uuid),public.audit_actor_names(uuid[]),public.can_manage_announcement(uuid) to authenticated;
