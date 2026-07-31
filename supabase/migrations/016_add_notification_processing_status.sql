-- Migration: Add 'processing' to the notification_status enum.
-- This lives in its own migration so the new value is committed before any
-- other migration can reference it (Postgres 55P04 rule: an enum value added
-- via ALTER TYPE cannot be used within the same transaction).
ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'processing';
