-- ==============================================
-- 019 - Welcome email after email confirmation
--
-- Enqueues a welcome email when a user confirms
-- their email address (auth.users email_confirmed_at
-- transition NULL -> non-NULL). A cron edge function
-- (welcome-email-sender) drains the queue and sends
-- the email via Resend.
-- ==============================================

-- 1. Queue table (one welcome email per user, deduped via unique user_id)
create table if not exists public.welcome_email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  unique (user_id)
);

-- 2. Trigger function: enqueue once when the email is first confirmed
create or replace function public.enqueue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    insert into public.welcome_email_queue (user_id, email, display_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- 3. Trigger
drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
after update on auth.users
for each row
execute function public.enqueue_welcome_email();
