alter table public.announcements add column author_name text not null default '';
update public.announcements a set author_name=p.full_name from public.profiles p where p.id=a.author_id;
create function private.stamp_announcement_author() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' then
    select full_name into new.author_name from public.profiles where id=new.author_id;
  else
    new.author_id:=old.author_id;
    new.author_name:=old.author_name;
  end if;
  return new;
end $$;
create trigger stamp_author before insert or update on public.announcements for each row execute function private.stamp_announcement_author();
create trigger audit_change after insert or update or delete on public.announcements for each row execute function private.audit_change();
revoke execute on function private.stamp_announcement_author() from public,anon,authenticated;
