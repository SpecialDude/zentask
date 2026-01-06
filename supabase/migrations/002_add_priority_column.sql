-- ZenTask: Add Priority Column Migration
-- Run this if upgrading from an existing installation

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN priority TEXT;
  END IF;
END $$;

-- Valid priority values: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
-- Optional: Add a check constraint for valid values
-- ALTER TABLE public.tasks 
--   ADD CONSTRAINT valid_priority 
--   CHECK (priority IS NULL OR priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));
