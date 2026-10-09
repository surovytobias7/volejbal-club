-- PostgreSQL resolves record fields when preparing an expression. Boolean AND
-- does not protect references to fields absent from a different trigger table.
create or replace function private.protect_own_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return coalesce(new,old); end if;
  if tg_table_name = 'profiles' then
    if old.id = private.viewer() and old.active and not new.active then
      raise exception 'Cannot deactivate own account';
    end if;
  elsif tg_table_name = 'user_roles' then
    if old.profile_id = private.viewer() and old.role = 'admin' then
      raise exception 'Cannot remove own administrator role';
    end if;
  end if;
  return coalesce(new,old);
end $$;
