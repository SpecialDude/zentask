-- Analytics Time-Series RPC Function
-- This function aggregates usage statistics grouped by day over a specified period.

CREATE OR REPLACE FUNCTION get_admin_analytics_timeseries(days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  result json;
BEGIN
  -- 1. Security Check: Ensure caller is an admin
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- 2. Gather Statistics grouped by date
  WITH dates AS (
    SELECT date_trunc('day', dd)::date AS date
    FROM generate_series(
      current_date - (days - 1) * interval '1 day',
      current_date,
      '1 day'::interval
    ) dd
  ),
  user_stats AS (
    SELECT date_trunc('day', created_at)::date AS date, count(*) AS users_joined
    FROM auth.users
    WHERE created_at >= current_date - (days - 1) * interval '1 day'
    GROUP BY 1
  ),
  task_stats AS (
    SELECT 
      date_trunc('day', to_timestamp("createdAt" / 1000.0))::date AS date, 
      count(*) AS tasks_created,
      sum(case when status = 'COMPLETED' then 1 else 0 end) AS tasks_completed
    FROM public.tasks
    WHERE to_timestamp("createdAt" / 1000.0) >= current_date - (days - 1) * interval '1 day'
    GROUP BY 1
  ),
  quick_list_stats AS (
    SELECT date_trunc('day', to_timestamp("createdAt" / 1000.0))::date AS date, count(*) AS lists_created
    FROM public.quick_lists
    WHERE to_timestamp("createdAt" / 1000.0) >= current_date - (days - 1) * interval '1 day'
    GROUP BY 1
  ),
  feedback_stats AS (
    SELECT date_trunc('day', created_at)::date AS date, count(*) AS feedback_submitted
    FROM public.feedback
    WHERE created_at >= current_date - (days - 1) * interval '1 day'
    GROUP BY 1
  )
  -- 3. Combine and format as JSON
  SELECT json_agg(
    json_build_object(
      'date', d.date,
      'users_joined', COALESCE(u.users_joined, 0),
      'tasks_created', COALESCE(t.tasks_created, 0),
      'tasks_completed', COALESCE(t.tasks_completed, 0),
      'lists_created', COALESCE(q.lists_created, 0),
      'feedback_submitted', COALESCE(f.feedback_submitted, 0)
    ) ORDER BY d.date ASC
  ) INTO result
  FROM dates d
  LEFT JOIN user_stats u ON d.date = u.date
  LEFT JOIN task_stats t ON d.date = t.date
  LEFT JOIN quick_list_stats q ON d.date = q.date
  LEFT JOIN feedback_stats f ON d.date = f.date;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
