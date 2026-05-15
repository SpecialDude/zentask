-- Analytics Churn RPC Function
-- This function calculates task churn and user churn metrics.

CREATE OR REPLACE FUNCTION get_churn_analytics(inactivity_days integer DEFAULT 14)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  
  -- Task outcomes
  total_completed integer;
  total_cancelled integer;
  total_abandoned integer;
  total_carried_over integer;
  
  -- User retention
  active_users integer;
  churned_users integer;
  
  -- Cancel reasons
  cancel_reasons_json json;
  
  result json;
BEGIN
  -- 1. Security Check
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  -- 2. Task Outcomes
  -- Note: date field is stored as YYYY-MM-DD text
  SELECT 
    count(*) FILTER (WHERE status = 'COMPLETED') as comp,
    count(*) FILTER (WHERE status = 'CANCELLED') as canc,
    count(*) FILTER (WHERE status != 'COMPLETED' AND date < to_char(current_date, 'YYYY-MM-DD')) as aband,
    count(*) FILTER (WHERE "carriedOverTo" IS NOT NULL) as carr
  INTO 
    total_completed, 
    total_cancelled, 
    total_abandoned, 
    total_carried_over
  FROM public.tasks;

  -- 3. User Retention
  -- A user is active if they created a task recently
  WITH user_activity AS (
    SELECT 
      user_id,
      MAX(to_timestamp("createdAt" / 1000.0)) as last_activity
    FROM public.tasks
    GROUP BY user_id
  )
  SELECT 
    count(*) FILTER (WHERE last_activity >= current_date - (inactivity_days * interval '1 day')) as act,
    count(*) FILTER (WHERE last_activity < current_date - (inactivity_days * interval '1 day')) as churn
  INTO 
    active_users, 
    churned_users
  FROM user_activity;

  -- 4. Cancel Reasons
  SELECT COALESCE(json_agg(row_to_json(cr)), '[]'::json) INTO cancel_reasons_json
  FROM (
    SELECT COALESCE(NULLIF(trim("cancelReason"), ''), 'Unspecified') as reason, count(*) as count
    FROM public.tasks
    WHERE status = 'CANCELLED'
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  ) cr;

  -- 5. Build Result
  result := json_build_object(
    'task_outcomes', json_build_object(
      'completed', COALESCE(total_completed, 0),
      'cancelled', COALESCE(total_cancelled, 0),
      'abandoned', COALESCE(total_abandoned, 0),
      'carried_over', COALESCE(total_carried_over, 0)
    ),
    'user_retention', json_build_object(
      'active', COALESCE(active_users, 0),
      'churned', COALESCE(churned_users, 0)
    ),
    'cancel_reasons', cancel_reasons_json
  );

  RETURN result;
END;
$$;
