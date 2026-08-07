-- Migration: Add Push Notifications Support
-- Description: Creates tables for push subscriptions, preferences, queue, and logs
-- Note: all statements are idempotent so this migration can safely be re-applied
-- against a database that already contains the objects (e.g. a manually migrated
-- remote project).

-- =====================================================
-- 1. Create Notification Type Enum
-- =====================================================
DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'task_reminder',
    'mcp_task_created',
    'mcp_task_updated',
    'mcp_task_deleted',
    'mcp_list_created',
    'mcp_list_updated',
    'mcp_list_deleted',
    'mcp_category_created',
    'mcp_category_updated',
    'mcp_category_deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. Create Notification Status Enum
-- =====================================================
DO $$
BEGIN
  CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 3. Push Subscriptions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ
);

-- Indexes for push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS Policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. Notification Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  enabled BOOLEAN DEFAULT true,
  reminder_minutes INTEGER DEFAULT 15, -- Minutes before task start time (for task_reminder)
  quiet_hours_start TIME, -- e.g., 22:00
  quiet_hours_end TIME,   -- e.g., 08:00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- RLS Policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own preferences" ON notification_preferences;
CREATE POLICY "Users can delete their own preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. Notification Queue Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  tag TEXT, -- For grouping/replacing notifications
  data JSONB, -- Additional data like task_id, list_id, url, actions
  scheduled_for TIMESTAMPTZ NOT NULL,
  status notification_status DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Indexes for notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(notification_type);

-- RLS Policies for notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
CREATE POLICY "Users can view their own notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE are handled by Edge Functions with service role

-- =====================================================
-- 6. Notification Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status notification_status NOT NULL,
  error_message TEXT,
  response_code INTEGER, -- HTTP response code from push service
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);

-- RLS Policies for notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification logs" ON notification_log;
CREATE POLICY "Users can view their own notification logs"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. Create Default Preferences for Existing Users
-- =====================================================
INSERT INTO notification_preferences (user_id, notification_type, enabled, reminder_minutes)
SELECT 
  u.id,
  nt.type,
  CASE 
    WHEN nt.type = 'task_reminder' THEN true
    ELSE true -- Enable MCP notifications by default
  END as enabled,
  15 as reminder_minutes
FROM auth.users u
CROSS JOIN (
  SELECT unnest(enum_range(NULL::notification_type)) as type
) nt
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- =====================================================
-- 8. Function to Create Default Preferences for New Users
-- =====================================================
-- NOTE: SET search_path = public is required because this trigger fires during
-- auth signup, when the session runs as supabase_auth_admin whose search_path is
-- 'auth' (no public). Without pinning the search_path, the unqualified reference
-- to notification_preferences fails to resolve (SQLSTATE 42P01), breaking signup.
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, enabled, reminder_minutes)
  SELECT 
    NEW.id,
    unnest(enum_range(NULL::notification_type)),
    true,
    15
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default preferences for new users
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- 9. Helper Functions
-- =====================================================

-- Function to check if notification should be sent based on quiet hours
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
BEGIN
  -- Get quiet hours for this notification type
  SELECT quiet_hours_start, quiet_hours_end
  INTO v_quiet_start, v_quiet_end
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type;
  
  -- If no quiet hours set, not in quiet hours
  IF v_quiet_start IS NULL OR v_quiet_end IS NULL THEN
    RETURN false;
  END IF;
  
  v_current_time := p_check_time::TIME;
  
  -- Handle quiet hours that cross midnight
  IF v_quiet_start <= v_quiet_end THEN
    RETURN v_current_time >= v_quiet_start AND v_current_time < v_quiet_end;
  ELSE
    RETURN v_current_time >= v_quiet_start OR v_current_time < v_quiet_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_active_subscriptions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to deactivate expired subscription
CREATE OR REPLACE FUNCTION deactivate_subscription(p_subscription_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE push_subscriptions
  SET is_active = false, updated_at = NOW()
  WHERE id = p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 10. Cleanup Function (Run periodically via cron)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Archive/delete old notification queue entries (older than 30 days)
  DELETE FROM notification_queue
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('sent', 'failed', 'cancelled');
  
  -- Archive/delete old notification logs (older than 90 days)
  DELETE FROM notification_log
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Deactivate subscriptions not used in 60 days
  UPDATE push_subscriptions
  SET is_active = false, updated_at = NOW()
  WHERE last_notified_at < NOW() - INTERVAL '60 days'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscription details for each user device';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification types including quiet hours';
COMMENT ON TABLE notification_queue IS 'Queue of notifications to be sent, processed by Edge Function';
COMMENT ON TABLE notification_log IS 'Historical log of all sent notifications for analytics and debugging';

COMMENT ON FUNCTION is_in_quiet_hours IS 'Checks if current time is within user quiet hours for a notification type';
COMMENT ON FUNCTION get_active_subscriptions IS 'Returns all active push subscriptions for a user';
COMMENT ON FUNCTION deactivate_subscription IS 'Marks a subscription as inactive (expired/invalid)';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Removes old notification data to keep database clean';
