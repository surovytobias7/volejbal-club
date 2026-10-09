-- Optional installation in the trusted Supabase SQL console after migrations.
-- Enable Supabase Cron (pg_cron) first. No HTTP endpoint or application secret.
-- Re-running replaces only this named job. Never run as an application user.
do $$
declare previous_job bigint;
begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then
   raise exception 'Enable Supabase Cron before installing the reminder schedule';
 end if;
 for previous_job in select jobid from cron.job where jobname='volej-pending-attendance' loop
   perform cron.unschedule(previous_job);
 end loop;
 perform cron.schedule('volej-pending-attendance','0 * * * *',
   'select private.generate_pending_reminders(null,null,now());');
end $$;
