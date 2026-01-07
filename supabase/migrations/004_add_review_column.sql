-- Add review column for task feedback
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review TEXT;
