-- Run ONLY in the privileged SQL editor after creating a confirmed Auth user.
-- Replace the nil UUID with that user's Auth UUID. Never expose this as an RPC.
do $$
declare
  auth_id uuid := '00000000-0000-0000-0000-000000000000';
  member_id uuid;
  auth_email text;
begin
  if exists(select 1 from public.user_roles where role='admin') then
    raise exception 'Administrator already exists; use the application to add further administrators';
  end if;
  select email into auth_email from auth.users where id=auth_id and email_confirmed_at is not null;
  if auth_email is null then raise exception 'Create a confirmed Auth user and replace the placeholder UUID first'; end if;
  insert into public.profiles(user_id,full_name) values(auth_id,'Správca klubu') returning id into member_id;
  insert into public.member_details(profile_id,email) values(member_id,auth_email);
  insert into public.user_roles(profile_id,role) values(member_id,'admin');
end $$;
