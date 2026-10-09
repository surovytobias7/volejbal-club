-- One club. Auth identities are separate from member records so minors need no login.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (length(full_name) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.member_details (
  profile_id uuid primary key references public.profiles(id),
  birth_date date check (birth_date >= date '1900-01-01' and birth_date <= current_date),
  email text check (length(email) <= 254),
  phone text check (length(phone) <= 40)
);
create table public.user_roles (
  profile_id uuid references public.profiles(id),
  role text check (role in ('admin','coach','player','guardian')),
  primary key(profile_id, role)
);
create table public.club_settings (
  id boolean primary key default true check(id),
  name text not null default 'Volej klub' check(length(name) between 2 and 100),
  email text not null default '',
  phone text not null default '',
  venue text not null default '',
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  categories text[] not null default array['U14','U16','U18','Seniori'],
  timezone text not null default 'Europe/Bratislava' check(timezone = 'Europe/Bratislava')
);
insert into public.club_settings(id) values(true);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 100),
  category text not null check(length(category) between 1 and 50),
  description text not null default '' check(length(description) <= 2000),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.team_memberships (
  team_id uuid references public.teams(id),
  profile_id uuid references public.profiles(id),
  kind text not null check(kind in ('coach','player')),
  primary key(team_id, profile_id, kind)
);
create index memberships_profile_idx on public.team_memberships(profile_id, team_id);
create table public.guardian_players (
  guardian_id uuid references public.profiles(id),
  player_id uuid references public.profiles(id),
  primary key(guardian_id, player_id),
  check(guardian_id <> player_id)
);
create index guardians_player_idx on public.guardian_players(player_id);
create table public.event_series (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  weeks integer not null check(weeks between 2 and 52),
  created_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  series_id uuid references public.event_series(id),
  title text not null check(length(title) between 2 and 140),
  kind text not null check(kind in ('training','match','tournament','meeting','other')),
  description text not null default '' check(length(description) <= 5000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null check(length(venue) between 1 and 200),
  status text not null default 'scheduled' check(status in ('scheduled','cancelled','completed')),
  opponent text check(length(opponent) <= 120),
  home boolean,
  score text check(length(score) <= 40),
  created_at timestamptz not null default now(),
  check(ends_at > starts_at and ends_at <= starts_at + interval '7 days'),
  check(kind = 'match' or (opponent is null and home is null and score is null))
);
create index events_team_start_idx on public.events(team_id, starts_at);
create index events_series_idx on public.events(series_id);
create index series_team_idx on public.event_series(team_id);
create table public.availability (
  event_id uuid references public.events(id),
  player_id uuid references public.profiles(id),
  response text not null check(response in ('yes','no','maybe')),
  reason text not null default '' check(length(reason) <= 500),
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(event_id, player_id)
);
create table public.attendance (
  event_id uuid references public.events(id),
  player_id uuid references public.profiles(id),
  status text not null check(status in ('present','absent','excused')),
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(event_id, player_id)
);
create index availability_player_idx on public.availability(player_id);
create index attendance_player_idx on public.attendance(player_id);
create index availability_actor_idx on public.availability(updated_by);
create index attendance_actor_idx on public.attendance(updated_by);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id),
  title text not null check(length(title) between 2 and 140),
  body text not null check(length(body) between 1 and 10000),
  important boolean not null default false,
  archived boolean not null default false,
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index announcements_team_idx on public.announcements(team_id, created_at);
create index announcements_author_idx on public.announcements(author_id);
create table public.fee_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 120),
  amount_cents integer not null check(amount_cents between 1 and 100000000),
  archived boolean not null default false
);
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id),
  plan_id uuid references public.fee_plans(id),
  label text not null check(length(label) between 2 and 160),
  amount_cents integer not null check(amount_cents between 1 and 100000000),
  due_date date not null,
  created_at timestamptz not null default now()
);
create index charges_player_idx on public.charges(player_id, due_date);
create index charges_plan_idx on public.charges(plan_id);
-- Append-only ledger. A correction reverses a previous entry; it never erases history.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id),
  amount_cents integer not null check(amount_cents <> 0 and abs(amount_cents::bigint) <= 100000000),
  note text not null check(length(note) between 2 and 500),
  reverses_id uuid unique references public.payments(id),
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  provider text not null default 'manual' check(provider = 'manual'),
  check((amount_cents > 0 and reverses_id is null) or (amount_cents < 0 and reverses_id is not null))
);
create index payments_charge_idx on public.payments(charge_id);
create index payments_actor_idx on public.payments(recorded_by);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  title text not null,
  href text not null check(href ~ '^/klub/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  table_name text not null,
  operation text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_actor_idx on public.audit_logs(actor_id, created_at);

-- Definer predicates avoid recursive policies. They live outside the exposed API
-- schema, use fully qualified names, and derive identity solely from auth.uid().
create function private.viewer() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles where user_id = (select auth.uid()) and active
$$;
create function private.has_role(wanted text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where profile_id = private.viewer() and role = wanted)
$$;
create function private.owns_player(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.viewer() is not null and (target = private.viewer() or
    (private.has_role('guardian') and exists(select 1 from public.guardian_players where guardian_id = private.viewer() and player_id = target)))
$$;
create function private.coaches(team uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or (private.has_role('coach') and exists(
    select 1 from public.team_memberships where team_id = team and profile_id = private.viewer() and kind = 'coach'))
$$;
create function private.sees_team(team uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.coaches(team) or exists(select 1 from public.team_memberships where team_id = team and kind = 'player' and private.owns_player(profile_id))
$$;
create function private.sees_profile(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or private.owns_player(target) or exists(
    select 1 from public.team_memberships where profile_id = target and private.coaches(team_id))
$$;
create function private.sees_finance(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin') or (private.has_role('guardian') and exists(
    select 1 from public.guardian_players where guardian_id = private.viewer() and player_id = target)) or
    (target = private.viewer() and private.has_role('player') and exists(
      select 1 from public.member_details where profile_id = target and birth_date <= (current_date - interval '18 years')::date))
$$;
create function private.event_player(event uuid, player uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.events e join public.team_memberships m on m.team_id = e.team_id
    join public.profiles p on p.id = m.profile_id
    where e.id = event and m.profile_id = player and m.kind = 'player' and p.active and e.status <> 'cancelled')
$$;
create function private.manages_event(event uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.events where id = event and private.coaches(team_id))
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','member_details','user_roles','club_settings','teams','team_memberships','guardian_players','event_series','events','availability','attendance','announcements','fee_plans','charges','payments','notifications','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['profiles','member_details','user_roles','club_settings','teams','team_memberships','guardian_players','fee_plans','charges'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_manage on public.%I for all to authenticated using (private.has_role(''admin'')) with check (private.has_role(''admin''))', t);
  end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using(private.sees_profile(id));
create policy details_read on public.member_details for select to authenticated using(private.sees_profile(profile_id));
create policy role_read on public.user_roles for select to authenticated using(profile_id = private.viewer());
create policy club_read on public.club_settings for select to authenticated using(private.viewer() is not null);
create policy team_read on public.teams for select to authenticated using(private.sees_team(id));
-- Players/parents see their own membership, never the full roster.
create policy membership_read on public.team_memberships for select to authenticated using(private.coaches(team_id) or private.owns_player(profile_id));
create policy guardian_read on public.guardian_players for select to authenticated using(guardian_id = private.viewer() or player_id = private.viewer());
grant insert, update on public.events, public.event_series, public.availability, public.attendance, public.announcements to authenticated;
create policy series_read on public.event_series for select to authenticated using(private.sees_team(team_id));
create policy series_manage on public.event_series for all to authenticated using(private.coaches(team_id)) with check(private.coaches(team_id));
create policy event_read on public.events for select to authenticated using(private.sees_team(team_id));
create policy event_manage on public.events for all to authenticated using(private.coaches(team_id)) with check(private.coaches(team_id));
create policy availability_read on public.availability for select to authenticated using(private.manages_event(event_id) or private.owns_player(player_id));
create policy availability_insert on public.availability for insert to authenticated with check(private.owns_player(player_id) and private.event_player(event_id, player_id) and updated_by = auth.uid());
create policy availability_update on public.availability for update to authenticated using(private.owns_player(player_id)) with check(private.owns_player(player_id) and private.event_player(event_id, player_id) and updated_by = auth.uid());
create policy attendance_read on public.attendance for select to authenticated using(private.manages_event(event_id) or private.owns_player(player_id));
create policy attendance_insert on public.attendance for insert to authenticated with check(private.manages_event(event_id) and private.event_player(event_id,player_id) and updated_by = auth.uid());
create policy attendance_update on public.attendance for update to authenticated using(private.manages_event(event_id)) with check(private.manages_event(event_id) and private.event_player(event_id,player_id) and updated_by = auth.uid());
create policy announcement_read on public.announcements for select to authenticated using(private.viewer() is not null and (team_id is null or private.sees_team(team_id)));
create policy announcement_insert on public.announcements for insert to authenticated with check(author_id = private.viewer() and (private.has_role('admin') or (team_id is not null and private.coaches(team_id))));
create policy announcement_update on public.announcements for update to authenticated using(private.has_role('admin') or (team_id is not null and private.coaches(team_id))) with check(private.has_role('admin') or (team_id is not null and private.coaches(team_id)));
create policy charge_read on public.charges for select to authenticated using(private.sees_finance(player_id));
create policy payment_read on public.payments for select to authenticated using(exists(select 1 from public.charges c where c.id = charge_id and private.sees_finance(c.player_id)));
grant insert on public.payments to authenticated;
create policy payment_insert on public.payments for insert to authenticated with check(private.has_role('admin') and recorded_by = auth.uid());
create policy notification_read on public.notifications for select to authenticated using(recipient_id = private.viewer());
grant update(read_at) on public.notifications to authenticated;
create policy notification_update on public.notifications for update to authenticated using(recipient_id = private.viewer()) with check(recipient_id = private.viewer());
create policy audit_read on public.audit_logs for select to authenticated using(private.has_role('admin'));

create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs(actor_id, table_name, operation, record_id, old_data, new_data)
  values(auth.uid(), tg_table_name, tg_op, coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'profile_id'),
    case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','member_details','user_roles','teams','team_memberships','guardian_players','events','attendance','fee_plans','charges','payments','club_settings'] loop
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()', t);
  end loop;
end $$;

create function private.validate_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare total integer; paid bigint; original public.payments;
begin
  if not private.has_role('admin') then raise exception 'Administrator required'; end if;
  -- Serializes all payments for this charge, preventing concurrent overpayment.
  select amount_cents into total from public.charges where id = new.charge_id for update;
  select coalesce(sum(amount_cents),0) into paid from public.payments where charge_id = new.charge_id;
  if new.reverses_id is not null then
    select * into original from public.payments where id = new.reverses_id;
    if original.id is null or original.charge_id <> new.charge_id or original.amount_cents <= 0 or new.amount_cents <> -original.amount_cents then
      raise exception 'Invalid reversal';
    end if;
  end if;
  if paid + new.amount_cents < 0 or paid + new.amount_cents > total then raise exception 'Payment exceeds charge balance'; end if;
  return new;
end $$;
create trigger validate_payment before insert on public.payments for each row execute function private.validate_payment();

create function private.notify_change() returns trigger language plpgsql security definer set search_path = '' as $$
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
  insert into public.notifications(recipient_id,title,href)
  select p.id, message, link from public.profiles p where p.active and p.user_id is not null and (
    (target_player is not null and (
      exists(select 1 from public.guardian_players g where g.guardian_id=p.id and g.player_id=target_player)
      or (p.id=target_player and exists(select 1 from public.member_details d where d.profile_id=p.id and d.birth_date <= (current_date - interval '18 years')::date))))
    or (target_player is null and (target_team is null or exists(select 1 from public.team_memberships m where m.team_id=target_team and (m.profile_id=p.id or exists(select 1 from public.guardian_players g where g.guardian_id=p.id and g.player_id=m.profile_id))))));
  return new;
end $$;
create trigger notify_announcement after insert on public.announcements for each row execute function private.notify_change();
create trigger notify_event after update of starts_at, ends_at, venue, status on public.events for each row execute function private.notify_change();
create trigger notify_charge after insert on public.charges for each row execute function private.notify_change();
create trigger notify_payment after insert on public.payments for each row execute function private.notify_change();

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.viewer(), private.has_role(text), private.owns_player(uuid), private.coaches(uuid), private.sees_team(uuid), private.sees_profile(uuid), private.sees_finance(uuid), private.event_player(uuid,uuid), private.manages_event(uuid) to authenticated;
