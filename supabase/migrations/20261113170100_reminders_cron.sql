-- Every 15 minutes pg_cron asks send-reminders to go. The function checks a shared secret,
-- kept in Vault as 'reminders_cron_secret' and in the function's secrets as CRON_SECRET.
-- Before running this: create the Vault secret (see docs/reminders.md); it never goes in git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://eqjdnozhirzvybnenzwt.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
