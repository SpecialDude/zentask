-- Create feedback table
create table feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id), -- Optional: null for non-authenticated users
  category text not null check (category in ('bug', 'general', 'question', 'feature')),
  message text not null,
  email text, -- Optional: for follow-ups
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table feedback enable row level security;

-- Policy: Allow anyone (anon + auth) to insert feedback
create policy "Enable insert for all users"
on feedback for insert
with check (true);

-- Policy: Allow users to see their own feedback (optional, good for history if implemented later)
create policy "Enable select for own feedback"
on feedback for select
using (auth.uid() = user_id);
