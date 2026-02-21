-- Create admins table
create table admins (
  id uuid references auth.users(id) primary key,
  created_at timestamptz default now()
);

-- Enable RLS for admins table
alter table admins enable row level security;

-- Policy: Admins can select themselves
create policy "Admins can view their own record"
on admins for select
using (auth.uid() = id);

-- Update RLS for feedback table for Admin Access
create policy "Admins can view all feedback"
on feedback for select
using (
  exists (
    select 1 
    from admins 
    where admins.id = auth.uid()
  )
);
