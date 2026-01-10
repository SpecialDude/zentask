-- Add blocks column for document type
ALTER TABLE quick_lists
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN quick_lists.type IS 'List type: bullet, checkbox, numbered, document';
COMMENT ON COLUMN quick_lists.blocks IS 'Block-based content for document type (nested structure)';
