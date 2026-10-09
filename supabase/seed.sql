-- FICTIONAL DEVELOPMENT DATA ONLY. No login bypass and no embedded passwords.
-- Local Supabase db reset loads these records. Never seed a production project.
insert into public.profiles(id,full_name) values
 ('10000000-0000-4000-8000-000000000001','DEMO – Tréner Martin'),
 ('10000000-0000-4000-8000-000000000002','DEMO – Rodič Eva'),
 ('10000000-0000-4000-8000-000000000003','DEMO – Hráčka Nina'),
 ('10000000-0000-4000-8000-000000000004','DEMO – Hráčka Lea') on conflict do nothing;
insert into public.member_details(profile_id,birth_date) values
 ('10000000-0000-4000-8000-000000000001',null),
 ('10000000-0000-4000-8000-000000000002',null),
 ('10000000-0000-4000-8000-000000000003','2012-04-12'),
 ('10000000-0000-4000-8000-000000000004','2010-08-19') on conflict do nothing;
insert into public.user_roles values
 ('10000000-0000-4000-8000-000000000001','coach'),
 ('10000000-0000-4000-8000-000000000002','guardian'),
 ('10000000-0000-4000-8000-000000000003','player'),
 ('10000000-0000-4000-8000-000000000004','player') on conflict do nothing;
insert into public.teams(id,name,category,description) values
 ('20000000-0000-4000-8000-000000000001','DEMO – Kadetky U16','U16','Fiktívny vývojový tím.'),
 ('20000000-0000-4000-8000-000000000002','DEMO – Juniorky U18','U18','Fiktívny vývojový tím.') on conflict do nothing;
insert into public.team_memberships values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','coach'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','player'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','player') on conflict do nothing;
insert into public.guardian_players values
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'),
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004') on conflict do nothing;
insert into public.events(id,team_id,title,kind,starts_at,ends_at,venue) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DEMO – Tréning kadetiek','training',(current_date+1+time '17:00') at time zone 'Europe/Bratislava',(current_date+1+time '18:30') at time zone 'Europe/Bratislava','DEMO – Športová hala') on conflict do nothing;
insert into public.charges(id,player_id,label,amount_cents,due_date) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','DEMO – Mesačné členské',3500,current_date+14) on conflict do nothing;
