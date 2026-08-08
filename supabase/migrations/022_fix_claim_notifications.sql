-- Migration: Fix claim_notifications()
--
-- The original implementation did `UPDATE ... RETURNING id INTO claimed_ids`
-- where claimed_ids was declared uuid[]. Assigning a scalar uuid to an array
-- variable raises `malformed array literal`, so the RPC crashed whenever the
-- queue contained >= 1 pending row and nothing was ever claimed. This replaces
-- the function with a CTE-based version that aggregates the returned ids
-- correctly.

CREATE OR REPLACE FUNCTION claim_notifications(batch_size integer DEFAULT 100)
RETURNS SETOF notification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  WITH claimed AS (
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
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO claimed_ids
  FROM claimed;

  IF cardinality(claimed_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT nq.*
  FROM notification_queue nq
  WHERE nq.id = ANY(claimed_ids)
  ORDER BY nq.scheduled_for ASC;
END;
$$;