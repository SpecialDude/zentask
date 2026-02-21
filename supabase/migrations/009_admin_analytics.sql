-- Analytics RPC Function
-- This function aggregates usage statistics across the platform.
-- It is set as SECURITY DEFINER so it can count rows across tables regardless of RLS,
-- but restricts execution only to users who exist in the `admins` table.

CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  total_users integer;
  total_tasks integer;
  completed_tasks integer;
  task_completion_rate numeric;
  total_quick_lists integer;
  total_feedback integer;
  result json;
BEGIN
  -- 1. Security Check: Ensure caller is an admin
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- 2. Gather Statistics
  SELECT count(*) INTO total_users FROM auth.users;
  SELECT count(*) INTO total_tasks FROM public.tasks;
  SELECT count(*) INTO completed_tasks FROM public.tasks WHERE status = 'COMPLETED';
  
  -- Calculate completion rate safely (avoid division by zero)
  IF total_tasks > 0 THEN
    task_completion_rate := ROUND((completed_tasks::numeric / total_tasks::numeric) * 100, 2);
  ELSE
    task_completion_rate := 0;
  END IF;

  SELECT count(*) INTO total_quick_lists FROM public.quick_lists;
  SELECT count(*) INTO total_feedback FROM public.feedback;

  -- 3. Build JSON response
  result := json_build_object(
    'total_users', total_users,
    'total_tasks', total_tasks,
    'tasks_completed', completed_tasks,
    'tasks_completion_rate', task_completion_rate,
    'total_quick_lists', total_quick_lists,
    'total_feedback', total_feedback
  );

  RETURN result;
END;
$$;
