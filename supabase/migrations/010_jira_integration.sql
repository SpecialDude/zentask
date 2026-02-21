-- Jira Integration tables
-- Supports multi-project sync per user with OAuth 2.0

-- 1. OAuth connection (one per user)
CREATE TABLE IF NOT EXISTS jira_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cloud_id TEXT NOT NULL,
  site_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  atlassian_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own jira connection"
  ON jira_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Jira projects (many per user, one per Jira project)
CREATE TABLE IF NOT EXISTS jira_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES jira_connections(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  project_key TEXT NOT NULL,
  project_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE jira_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own jira projects"
  ON jira_projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Task mappings (links ZenTask task ↔ Jira issue)
CREATE TABLE IF NOT EXISTS jira_task_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  jira_project_id UUID REFERENCES jira_projects(id) ON DELETE SET NULL,
  jira_issue_id TEXT NOT NULL,
  jira_issue_key TEXT NOT NULL,
  jira_parent_id TEXT,
  jira_status TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, jira_issue_id)
);

ALTER TABLE jira_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own jira task mappings"
  ON jira_task_mappings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by task_id (used on status change)
CREATE INDEX IF NOT EXISTS idx_jira_task_mappings_task_id
  ON jira_task_mappings(task_id);

-- Index for fast lookup by jira_issue_id (used during sync)
CREATE INDEX IF NOT EXISTS idx_jira_task_mappings_jira_issue
  ON jira_task_mappings(jira_issue_id);
