create table public.charge_adjustments (
 id uuid primary key default gen_random_uuid(),
 charge_id uuid not null references public.charges(id),
 new_total_cents integer not null check(new_total_cents between 0 and 100000000),
 delta_cents integer not null default 0 check(delta_cents<>0),
 note text not null check(length(trim(note)) between 2 and 500),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index adjustments_charge_idx on public.charge_adjustments(charge_id,created_at desc,id desc);
alter table public.charge_adjustments enable row level security;
revoke all on public.charge_adjustments from public,anon,authenticated;
grant select,insert on public.charge_adjustments to authenticated;
create policy adjustment_read on public.charge_adjustments for select to authenticated using(exists(select 1 from public.charges c where c.id=charge_id));
create policy adjustment_insert on public.charge_adjustments for insert to authenticated with check(private.has_role('admin') and recorded_by=auth.uid());
create function private.validate_charge_adjustment() returns trigger language plpgsql security definer set search_path='' as $$
declare original integer; adjusted bigint; paid bigint;
begin
 if not private.has_role('admin') then raise exception 'Administrator required'; end if;
 select amount_cents into original from public.charges where id=new.charge_id for update;
 if not found then raise exception 'Charge not found'; end if;
 select original+coalesce(sum(delta_cents),0) into adjusted from public.charge_adjustments where charge_id=new.charge_id;
 select coalesce(sum(amount_cents),0) into paid from public.payments where charge_id=new.charge_id;
 if new.new_total_cents<paid then raise exception 'Reverse excess payments before reducing charge'; end if;
 new.delta_cents:=new.new_total_cents-adjusted;
 new.recorded_by:=auth.uid(); new.created_at:=now();
 return new;
end $$;
revoke all on function private.validate_charge_adjustment() from public,anon,authenticated;
create trigger validate_adjustment before insert on public.charge_adjustments for each row execute function private.validate_charge_adjustment();
create trigger audit_adjustment after insert on public.charge_adjustments for each row execute function private.audit_change();
create trigger notify_adjustment after insert on public.charge_adjustments for each row execute function private.notify_change();

create or replace function private.validate_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare total bigint; paid bigint; original public.payments;
begin
 if not private.has_role('admin') then raise exception 'Administrator required'; end if;
 select amount_cents into total from public.charges where id=new.charge_id for update;
 if not found then raise exception 'Charge not found'; end if;
 select total+coalesce(sum(delta_cents),0) into total from public.charge_adjustments where charge_id=new.charge_id;
 select coalesce(sum(amount_cents),0) into paid from public.payments where charge_id=new.charge_id;
 if new.reverses_id is not null then
  select * into original from public.payments where id=new.reverses_id;
  if original.id is null or original.charge_id<>new.charge_id or original.amount_cents<=0 or new.amount_cents<>-original.amount_cents then raise exception 'Invalid reversal'; end if;
 end if;
 if paid+new.amount_cents<0 or paid+new.amount_cents>total then raise exception 'Payment exceeds charge balance'; end if;
 return new;
end $$;

create or replace function public.finance_summary(p_charge_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with balances as (
  select c.amount_cents+coalesce((select sum(a.delta_cents) from public.charge_adjustments a where a.charge_id=c.id),0) as amount_cents,c.due_date,
   coalesce((select sum(p.amount_cents) from public.payments p where p.charge_id=c.id),0) as paid
  from public.charges c where p_charge_id is null or c.id=p_charge_id
 ) select jsonb_build_object('count',count(*),'charged',coalesce(sum(amount_cents),0),'paid',coalesce(sum(paid),0),'remaining',coalesce(sum(amount_cents-paid),0),
  'overdue',coalesce(sum(amount_cents-paid) filter(where due_date<(current_timestamp at time zone 'Europe/Bratislava')::date),0)) from balances
$$;
create or replace function public.charge_page(p_after_due date,p_after_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with candidates as materialized (
  select c.id,c.player_id,c.label,c.amount_cents,c.due_date from public.charges c
  where (p_after_due is null and p_after_id is null) or (c.due_date,c.id)>(p_after_due,p_after_id)
  order by due_date,id limit 26
 ), page as (
  select c.id,c.player_id,c.label,c.due_date,
   (select full_name from public.profiles where id=c.player_id) as full_name,
   c.amount_cents+coalesce((select sum(delta_cents) from public.charge_adjustments where charge_id=c.id),0) as amount_cents,
   c.amount_cents+coalesce((select sum(delta_cents) from public.charge_adjustments where charge_id=c.id),0)-coalesce((select sum(amount_cents) from public.payments where charge_id=c.id),0) as remaining
  from candidates c order by due_date,id limit 25
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by due_date,id) from page p),'[]'::jsonb),'has_more',(select count(*)>25 from candidates))
$$;
