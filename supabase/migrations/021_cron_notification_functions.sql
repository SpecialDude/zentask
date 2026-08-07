-- ==============================================
-- 021 - Cron schedules for notification functions
--
-- process-notification-queue and
-- task-reminder-scheduler were deployed with a
-- cron.json, but that only schedules functions for
-- local development (`supabase functions serve`).
-- On the hosted platform, scheduling is done with
-- pg_cron + pg_net (see 020), so register both
-- functions here, every minute.
--
-- Reuses the project_url / publishable_key Vault
-- secrets created in migration 020.
-- ==============================================

-- 1. Process pending notifications (every minute)
select cron.schedule(
  'process-notification-queue-job',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 2. Queue task reminders (every minute)
select cron.schedule(
  'task-reminder-scheduler-job',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/task-reminder-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
