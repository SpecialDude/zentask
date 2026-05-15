-- ==============================================
-- 1. CREATE TASK CATEGORIES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.task_categories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" BIGINT NOT NULL
);

-- ==============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON public.task_categories(user_id);

-- ==============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own categories
CREATE POLICY "Users can view own categories" 
  ON public.task_categories 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert own categories
CREATE POLICY "Users can insert own categories" 
  ON public.task_categories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own categories
CREATE POLICY "Users can update own categories" 
  ON public.task_categories 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can delete own categories
CREATE POLICY "Users can delete own categories" 
  ON public.task_categories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ==============================================
-- 4. UPDATE TASKS TABLE
-- ==============================================
ALTER TABLE public.tasks 
-- Drop constraint if it exists to allow re-running this script
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_categoryId_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_categoryId_fkey FOREIGN KEY ("categoryId") REFERENCES public.task_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks("categoryId");
