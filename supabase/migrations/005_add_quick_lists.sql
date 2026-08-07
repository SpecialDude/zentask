-- Create quick_lists table
CREATE TABLE IF NOT EXISTS quick_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bullet', 'checkbox', 'numbered'
  items JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  pinned BOOLEAN DEFAULT false,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

-- Enable RLS
ALTER TABLE quick_lists ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can create their own lists" ON quick_lists;
CREATE POLICY "Users can create their own lists"
  ON quick_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own lists" ON quick_lists;
CREATE POLICY "Users can view their own lists"
  ON quick_lists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lists" ON quick_lists;
CREATE POLICY "Users can update their own lists"
  ON quick_lists FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lists" ON quick_lists;
CREATE POLICY "Users can delete their own lists"
  ON quick_lists FOR DELETE
  USING (auth.uid() = user_id);
