alter table public.notifications add column team_id uuid references public.teams(id);
alter table public.notifications add column player_id uuid references public.profiles(id);
create index notification_team_idx on public.notifications(team_id);
create index notification_player_idx on public.notifications(player_id);

-- Resolve the scope of pre-existing notifications without trusting caller input.
update public.notifications n set team_id=e.team_id from public.events e where n.href='/klub/kalendar/'||e.id;
-- Old announcement notifications lack source IDs, so suppress them rather than
-- risk retaining private team titles after a membership is revoked.
delete from public.notifications where href='/klub/oznamy';
delete from public.notifications where href='/klub/platby';

create or replace function private.notify_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare target_team uuid; target_player uuid; message text; link text;
begin
  if tg_table_name = 'announcements' then
    target_team := new.team_id; message := 'Nový oznam: ' || new.title; link := '/klub/oznamy';
  elsif tg_table_name = 'events' then
    target_team := new.team_id; message := case when new.status = 'cancelled' then 'Zrušená udalosť: ' else 'Zmena udalosti: ' end || new.title; link := '/klub/kalendar/' || new.id;
  elsif tg_table_name = 'charges' then
    target_player := new.player_id; message := 'Nový členský poplatok'; link := '/klub/platby';
  else
    select player_id into target_player from public.charges where id = new.charge_id;
    message := 'Aktualizácia platby'; link := '/klub/platby';
  end if;
  insert into public.notifications(recipient_id,title,href,team_id,player_id)
  select p.id, message, link, target_team, target_player from public.profiles p where p.active and p.user_id is not null and (
    (target_player is not null and (
      exists(select 1 from public.guardian_players g join public.user_roles r on r.profile_id=g.guardian_id and r.role='guardian' where g.guardian_id=p.id and g.player_id=target_player)
      or (p.id=target_player and exists(select 1 from public.member_details d join public.user_roles r on r.profile_id=d.profile_id and r.role='player' where d.profile_id=p.id and d.birth_date <= (current_date - interval '18 years')::date))))
    or (target_player is null and (target_team is null or exists(select 1 from public.team_memberships m join public.user_roles r on r.profile_id=m.profile_id and r.role=m.kind where m.team_id=target_team and (m.profile_id=p.id or exists(select 1 from public.guardian_players g join public.user_roles gr on gr.profile_id=g.guardian_id and gr.role='guardian' where g.guardian_id=p.id and g.player_id=m.profile_id))))));
  return new;
end $$;
drop policy notification_read on public.notifications;
drop policy notification_update on public.notifications;
create policy notification_read on public.notifications for select to authenticated using(
  recipient_id=private.viewer() and (team_id is null or private.sees_team(team_id)) and (player_id is null or private.sees_finance(player_id))
);
create policy notification_update on public.notifications for update to authenticated using(
  recipient_id=private.viewer() and (team_id is null or private.sees_team(team_id)) and (player_id is null or private.sees_finance(player_id))
) with check(recipient_id=private.viewer() and (team_id is null or private.sees_team(team_id)) and (player_id is null or private.sees_finance(player_id)));

create or replace function private.sees_team(team uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.coaches(team) or exists(select 1 from public.team_memberships m join public.user_roles r on r.profile_id=m.profile_id and r.role='player' where m.team_id=team and m.kind='player' and private.owns_player(m.profile_id))
$$;
create or replace function private.event_player(event uuid, player uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.events e join public.team_memberships m on m.team_id=e.team_id
    join public.profiles p on p.id=m.profile_id join public.user_roles r on r.profile_id=p.id and r.role='player'
    where e.id=event and m.profile_id=player and m.kind='player' and p.active and e.status<>'cancelled')
$$;
-- Coaches may see only the player role of profiles they are allowed to coach.
-- Other role combinations remain visible only to the subject and administrators.
create policy coach_player_role_read on public.user_roles for select to authenticated using(role='player' and private.sees_profile(profile_id));

create function private.validate_event_series() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.series_id is not null and not exists(select 1 from public.event_series where id=new.series_id and team_id=new.team_id) then raise exception 'Series team mismatch'; end if;
  return new;
end $$;
create trigger validate_event_series before insert or update on public.events for each row execute function private.validate_event_series();
revoke execute on function private.validate_event_series() from public, anon, authenticated;
