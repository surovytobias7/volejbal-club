alter table public.notifications add column reminder_event_id uuid references public.events(id);
alter table public.notifications add column reminder_player_id uuid references public.profiles(id);
alter table public.notifications add constraint reminder_pair check((reminder_event_id is null)=(reminder_player_id is null));
create unique index reminder_once_idx on public.notifications(recipient_id,reminder_event_id,reminder_player_id);
create index reminder_player_idx on public.notifications(reminder_player_id);

-- Reminders stop being visible immediately after a response or scope change.
create policy reminder_current_scope on public.notifications as restrictive for all to authenticated
using(reminder_event_id is null or (
 private.owns_player(reminder_player_id) and private.event_player(reminder_event_id,reminder_player_id)
 and exists(select 1 from public.events e where e.id=reminder_event_id and e.status='scheduled' and e.starts_at>now())
 and not exists(select 1 from public.availability a where a.event_id=reminder_event_id and a.player_id=reminder_player_id)
)) with check(reminder_event_id is null or (
 private.owns_player(reminder_player_id) and private.event_player(reminder_event_id,reminder_player_id)
 and exists(select 1 from public.events e where e.id=reminder_event_id and e.status='scheduled' and e.starts_at>now())
 and not exists(select 1 from public.availability a where a.event_id=reminder_event_id and a.player_id=reminder_player_id)
));

-- Trusted job entry point. No untrusted role can invoke this bulk worker.
create function private.generate_pending_reminders(target_event uuid,target_recipient uuid,at_time timestamptz) returns integer
language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 insert into public.notifications(recipient_id,title,href,team_id,reminder_event_id,reminder_player_id)
 select recipient.id,'Potvrďte účasť: '||e.title||' · '||player.full_name,'/klub/kalendar/'||e.id,e.team_id,e.id,player.id
 from public.events e join public.teams t on t.id=e.team_id and not t.archived
 join public.team_memberships m on m.team_id=e.team_id and m.kind='player'
 join public.profiles player on player.id=m.profile_id and player.active
 join public.user_roles pr on pr.profile_id=player.id and pr.role='player'
 join public.profiles recipient on recipient.active and recipient.user_id is not null and (
   recipient.id=player.id or exists(select 1 from public.guardian_players g join public.user_roles gr on gr.profile_id=g.guardian_id and gr.role='guardian' where g.player_id=player.id and g.guardian_id=recipient.id)
 )
 where e.status='scheduled' and e.starts_at>at_time and e.starts_at<=at_time+interval '48 hours'
   and (target_event is null or e.id=target_event) and (target_recipient is null or recipient.id=target_recipient)
   and not exists(select 1 from public.availability a where a.event_id=e.id and a.player_id=player.id)
 on conflict(recipient_id,reminder_event_id,reminder_player_id) do nothing;
 get diagnostics inserted=row_count;
 return inserted;
end $$;
revoke all on function private.generate_pending_reminders(uuid,uuid,timestamptz) from public,anon,authenticated;
create function private.refresh_my_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare viewer uuid:=private.viewer();
begin
 if viewer is null then raise exception 'Active account required'; end if;
 return private.generate_pending_reminders(null,viewer,now());
end $$;
create function private.send_event_reminders(event_id uuid) returns integer language plpgsql security definer set search_path='' as $$
begin
 if not private.manages_event(event_id) then raise exception 'Event management required'; end if;
 return private.generate_pending_reminders(event_id,null,now());
end $$;
revoke all on function private.refresh_my_reminders(),private.send_event_reminders(uuid) from public,anon;
grant execute on function private.refresh_my_reminders(),private.send_event_reminders(uuid) to authenticated;
create function public.refresh_my_reminders() returns integer language sql security invoker set search_path='' as $$select private.refresh_my_reminders()$$;
create function public.send_event_reminders(p_event uuid) returns integer language sql security invoker set search_path='' as $$select private.send_event_reminders(p_event)$$;
revoke all on function public.refresh_my_reminders(),public.send_event_reminders(uuid) from public,anon;
grant execute on function public.refresh_my_reminders(),public.send_event_reminders(uuid) to authenticated;
