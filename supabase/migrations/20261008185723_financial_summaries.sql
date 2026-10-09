-- Aggregate inside PostgreSQL, before PostgREST applies its response row limit.
-- Invoker security preserves the existing live-profile and financial RLS rules.
create function public.finance_summary(p_charge_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with balances as (
    select c.amount_cents, c.due_date,
      coalesce((select sum(p.amount_cents) from public.payments p where p.charge_id = c.id), 0) as paid
    from public.charges c where p_charge_id is null or c.id = p_charge_id
  )
  select jsonb_build_object(
    'count', count(*),
    'charged', coalesce(sum(amount_cents), 0),
    'paid', coalesce(sum(paid), 0),
    'remaining', coalesce(sum(amount_cents - paid), 0),
    'overdue', coalesce(sum(amount_cents - paid) filter (
      where due_date < (current_timestamp at time zone 'Europe/Bratislava')::date
    ), 0)
  ) from balances
$$;

create index charges_page_idx on public.charges(due_date, id);
create index payments_page_idx on public.payments(charge_id, created_at desc, id desc);

-- Fixed-size keyset pages: the 26th row only indicates another page exists.
create function public.charge_page(p_after_due date, p_after_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with candidates as materialized (
    select c.id, c.player_id, c.label, c.amount_cents, c.due_date
    from public.charges c
    where (p_after_due is null and p_after_id is null)
      or (c.due_date, c.id) > (p_after_due, p_after_id)
    order by c.due_date, c.id limit 26
  ), page as (
    select c.*, (select p.full_name from public.profiles p where p.id = c.player_id) as full_name,
      c.amount_cents - coalesce((select sum(p.amount_cents) from public.payments p where p.charge_id = c.id), 0) as remaining
    from candidates c order by c.due_date, c.id limit 25
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.due_date, p.id) from page p), '[]'::jsonb),
    'has_more', (select count(*) > 25 from candidates)
  )
$$;

create function public.payment_page(p_charge_id uuid, p_before_created timestamptz, p_before_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with candidates as materialized (
    select p.id, p.amount_cents, p.note, p.created_at from public.payments p
    where p.charge_id = p_charge_id and (
      (p_before_created is null and p_before_id is null)
      or (p.created_at, p.id) < (p_before_created, p_before_id)
    ) order by p.created_at desc, p.id desc limit 26
  ), page as (
    select p.*, exists(select 1 from public.payments r where r.reverses_id = p.id) as reversed
    from candidates p order by p.created_at desc, p.id desc limit 25
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc, p.id desc) from page p), '[]'::jsonb),
    'has_more', (select count(*) > 25 from candidates)
  )
$$;

revoke all on function public.finance_summary(uuid), public.charge_page(date, uuid), public.payment_page(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.finance_summary(uuid), public.charge_page(date, uuid), public.payment_page(uuid, timestamptz, uuid) to authenticated;
