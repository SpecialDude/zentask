-- Migration to add recurring task support
-- Run this in your Supabase SQL Editor

-- 1. ADD COLUMNS
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "recurrencePattern" TEXT,
ADD COLUMN IF NOT EXISTS "recurrenceEndDate" TEXT,
ADD COLUMN IF NOT EXISTS "recurringParentId" TEXT REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 2. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parent_id ON public.tasks("recurringParentId");
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks("isRecurring");

-- 3. VERIFICATION
-- SELECT "isRecurring", "recurrencePattern", "recurrenceEndDate", "recurringParentId" FROM public.tasks LIMIT 1;
