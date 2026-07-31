-- Migration: Push Notification Reliability & Robustness
-- Note: the 'processing' enum value is added in migration 016
-- (016_add_notification_processing_status.sql) so it is committed before
-- this migration can use it.
--
-- 1. claimed_at timestamp so queued notifications are claimed atomically
--    (prevents duplicate sends from overlapping cron runs) and recoverable
--    (stale claims are reclaimed after 10 minutes).
-- 2. claim_notifications(): atomically claims the next batch of due notifications.
-- 3. Makes is_in_quiet_hours() timezone-aware (reads auth.users metadata).
-- 4. next_allowed_time(): earliest time a notification may be delivered,
--    used to defer notifications that land inside quiet hours.

-- Timestamp used to detect stale claims for crash recovery.
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Index to make claiming fast.
CREATE INDEX IF NOT EXISTS idx_notification_queue_claim
  ON notification_queue (status, scheduled_for)
  WHERE status IN ('pending', 'processing');

-- Atomically claim the next batch of due notifications.
-- Rows are locked with FOR UPDATE SKIP LOCKED so concurrent cron invocations
-- can never claim the same notification twice (no duplicate deliveries).
-- Claims older than 10 minutes are considered stale and can be reclaimed.
CREATE OR REPLACE FUNCTION claim_notifications(batch_size integer DEFAULT 100)
RETURNS SETOF notification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_ids uuid[];
BEGIN
  UPDATE notification_queue
  SET status = 'processing', claimed_at = NOW()
  WHERE id IN (
    SELECT id
    FROM notification_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND attempts < 3
      AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '10 minutes')
    ORDER BY scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO claimed_ids;

  RETURN QUERY
  SELECT nq.*
  FROM notification_queue nq
  WHERE nq.id = ANY(claimed_ids)
  ORDER BY nq.scheduled_for ASC;
END;
$$;

-- Timezone-aware rewrite of is_in_quiet_hours().
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_user_id UUID,
  p_notification_type notification_type,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_current_time TIME;
  v_timezone TEXT;
BEGIN
  SELECT quiet_hours_start, quiet_hours_end
  INTO v_quiet_start, v_quiet_end
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type;

  IF v_quiet_start IS NULL OR v_quiet_end IS NULL THEN
    RETURN false;
  END IF;

  SELECT raw_user_meta_data->>'timezone'
  INTO v_timezone
  FROM auth.users
  WHERE id = p_user_id;

  IF v_timezone IS NULL OR v_timezone = '' THEN
    v_timezone := 'UTC';
  END IF;

  v_current_time := (p_check_time AT TIME ZONE v_timezone)::time;

  -- Handle quiet hours that cross midnight
  IF v_quiet_start <= v_quiet_end THEN
    RETURN v_current_time >= v_quiet_start AND v_current_time < v_quiet_end;
  ELSE
    RETURN v_current_time >= v_quiet_start OR v_current_time < v_quiet_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Earliest timestamptz at which a notification of this type may be delivered.
-- Returns p_now when not in quiet hours, otherwise the end of the current
-- quiet-hours window (computed in the user's timezone).
CREATE OR REPLACE FUNCTION next_allowed_time(
  p_user_id UUID,
  p_notification_type notification_type,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_current TIME;
  v_timezone TEXT;
  v_next TIMESTAMPTZ;
BEGIN
  SELECT quiet_hours_start, quiet_hours_end
  INTO v_quiet_start, v_quiet_end
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type;

  IF v_quiet_start IS NULL OR v_quiet_end IS NULL THEN
    RETURN p_now;
  END IF;

  SELECT raw_user_meta_data->>'timezone'
  INTO v_timezone
  FROM auth.users
  WHERE id = p_user_id;

  IF v_timezone IS NULL OR v_timezone = '' THEN
    v_timezone := 'UTC';
  END IF;

  v_current := (p_now AT TIME ZONE v_timezone)::time;

  -- Not currently in quiet hours -> allowed right now.
  IF NOT (
    CASE
      WHEN v_quiet_start <= v_quiet_end THEN v_current >= v_quiet_start AND v_current < v_quiet_end
      ELSE v_current >= v_quiet_start OR v_current < v_quiet_end
    END
  ) THEN
    RETURN p_now;
  END IF;

  -- End of quiet hours today (in the user's local zone).
  v_next := (
    date_trunc('day', p_now AT TIME ZONE v_timezone) + (v_quiet_end - TIME '00:00')
  ) AT TIME ZONE v_timezone;

  -- Quiet hours cross midnight: if we're already past the start, the end is tomorrow.
  IF v_quiet_start > v_quiet_end AND v_current >= v_quiet_start THEN
    v_next := v_next + INTERVAL '1 day';
  END IF;

  IF v_next <= p_now THEN
    v_next := v_next + INTERVAL '1 day';
  END IF;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
