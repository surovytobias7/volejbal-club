-- Existing issued charges keep unknown periods; never infer dates from labels.
alter table public.charges
  add column period_start date,
  add column period_end date,
  add constraint charge_period_valid check (
    (period_start is null and period_end is null) or
    (period_start is not null and period_end is not null
      and isfinite(period_start) and isfinite(period_end)
      and period_start <= period_end)
  );

-- Serialize issuance against archival, including writes outside the UI.
create function private.validate_charge_plan() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.plan_id is not null then
    perform 1 from public.fee_plans
      where id = new.plan_id and not archived for share;
    if not found then
      raise exception 'Poplatkový plán nie je dostupný.';
    end if;
  end if;
  return new;
end $$;
create trigger validate_charge_plan before insert on public.charges
  for each row execute function private.validate_charge_plan();
create index fee_plans_archive_page_idx on public.fee_plans(archived, id);
