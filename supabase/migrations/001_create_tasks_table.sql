-- ZenTask Database Schema Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ==============================================
-- 1. CREATE TASKS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "parentId" TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT,
  completion INTEGER DEFAULT 0,
  date TEXT NOT NULL,
  duration INTEGER,
  "startTime" TEXT,
  "cancelReason" TEXT,
  "carryOverReason" TEXT,
  "carriedOverTo" TEXT,
  "carriedOverFrom" TEXT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

-- ==============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks("parentId");
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date);

-- ==============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. CREATE RLS POLICIES
-- Users can only access their own tasks
-- ==============================================

-- Policy: Users can SELECT their own tasks
CREATE POLICY "Users can view own tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own tasks
CREATE POLICY "Users can insert own tasks" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own tasks
CREATE POLICY "Users can update own tasks" 
  ON public.tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can DELETE their own tasks
CREATE POLICY "Users can delete own tasks" 
  ON public.tasks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ==============================================
-- 5. VERIFICATION QUERIES
-- Run these after migration to verify setup
-- ==============================================

-- Check table exists:
-- SELECT * FROM public.tasks LIMIT 1;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tasks';

-- Check policies exist:
-- SELECT policyname FROM pg_policies WHERE tablename = 'tasks';
