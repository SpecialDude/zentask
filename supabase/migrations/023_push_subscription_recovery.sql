-- Migration: Push Subscription Recovery
-- Adds deactivated_reason to distinguish why a subscription was turned off:
--   'user'  -> the user disabled notifications for this device in the UI
--   'gone'  -> FCM/push service rejected the endpoint (404/410), it must be re-registered
--   NULL    -> active (or active again after recovery)
-- The load-time reconcile only auto-recovers rows whose reason is 'gone' (or NULL),
-- never a deliberate 'user' disable.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;
