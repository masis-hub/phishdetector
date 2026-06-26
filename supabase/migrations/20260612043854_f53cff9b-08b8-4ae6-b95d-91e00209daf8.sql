do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-scheduled-campaigns-every-minute') then
    perform cron.unschedule('process-scheduled-campaigns-every-minute');
  end if;
end $$;

select cron.schedule(
  'process-scheduled-campaigns-every-minute',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://woxnmcbkeojbkozovgry.supabase.co/functions/v1/process-scheduled-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'email_queue_service_role_key'
      )
    ),
    body := jsonb_build_object('time', now())
  );
  $cron$
);