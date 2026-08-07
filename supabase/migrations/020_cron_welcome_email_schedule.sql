-- ==============================================
-- 020 - Cron schedule for welcome-email-sender
--
-- Production scheduling for Edge Functions on the
-- hosted platform uses pg_cron + pg_net (Supabase
-- Cron module), not cron.json (which only applies
-- locally with `supabase functions serve`).
--
-- - pg_cron runs `welcome-email-sender-job` every
--   minute, which POSTs to the welcome-email-sender
--   Edge Function so it drains welcome_email_queue.
-- - The function URL and publishable (anon) key are
--   stored in Supabase Vault so the token never sits
--   in plain text in the job command.
-- ==============================================

-- 1. Required extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- 2. Vault secrets for the invocation (idempotent)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret('https://hvdzprxwvpytxlwzcnic.supabase.co', 'project_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'publishable_key') then
    perform vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZHpwcnh3dnB5dHhsd3pjbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg5OTUsImV4cCI6MjA4MzI4NDk5NX0.-ny6DKfyODHATzoYADzly29IU3kO_TfPhY4l5c7FNXc', 'publishable_key');
  end if;
end $$;

-- 3. Cron job (cron.schedule upserts on the same job name)
select cron.schedule(
  'welcome-email-sender-job',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/welcome-email-sender',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
