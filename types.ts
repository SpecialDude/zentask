
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  WEEKDAYS = 'WEEKDAYS'
}

export type ViewType = 'LIST' | 'KANBAN' | 'DASHBOARD' | 'SETTINGS' | 'LISTS' | 'ADMIN_FEEDBACK' | 'ADMIN_ANALYTICS' | 'INTEGRATIONS';

export interface AdminAnalyticsData {
  total_users: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_completion_rate: number;
  total_quick_lists: number;
  total_feedback: number;
}

export interface AdminAnalyticsTimeSeriesData {
  date: string;
  users_joined: number;
  tasks_created: number;
  tasks_completed: number;
  lists_created: number;
  feedback_submitted: number;
}

export interface CancelReasonData {
  reason: string;
  count: number;
}

export interface ChurnAnalyticsData {
  task_outcomes: {
    completed: number;
    cancelled: number;
    abandoned: number;
    carried_over: number;
  };
  user_retention: {
    active: number;
    churned: number;
  };
  cancel_reasons: CancelReasonData[];
}

// --- Jira Integration Types ---

export interface JiraConnection {
  id: string;
  user_id: string;
  cloud_id: string;
  site_name: string;
  atlassian_email: string;
  token_expires_at: string;
  created_at: string;
}

export interface JiraProject {
  id: string;
  user_id: string;
  connection_id: string;
  project_id: string;
  project_key: string;
  project_name: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  statusCategory: string;
  priority?: string;
  parentId?: string;
  parentKey?: string;
  issueType?: string;
}

export interface JiraTaskMapping {
  id: string;
  user_id: string;
  task_id: string;
  jira_project_id: string;
  jira_issue_id: string;
  jira_issue_key: string;
  jira_parent_id: string | null;
  jira_status: string;
  last_synced_at: string;
  created_at: string;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Task {
  id: string;
  user_id: string;
  parentId: string | null;
  categoryId?: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  completion: number; // 0 to 100
  date: string; // ISO String (YYYY-MM-DD)
  duration?: number; // Minutes
  startTime?: string; // HH:mm
  cancelReason?: string;
  carryOverReason?: string;
  carriedOverTo?: string; // Date string
  carriedOverFrom?: string; // Date string
  // Recurring task fields
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string; // ISO String (YYYY-MM-DD)
  recurringParentId?: string; // Original recurring task ID
  review?: string; // User feedback on completed tasks
  createdAt: number;
  updatedAt: number;
}


export type ListType = 'bullet' | 'checkbox' | 'numbered' | 'document';

// Block types for document mode
export type BlockType = 'paragraph' | 'heading' | 'bullet' | 'checkbox' | 'numbered' | 'blockquote' | 'divider';

// Block interface for document content
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;      // For checkbox blocks
  level?: 1 | 2 | 3;     // For headings (h1, h2, h3)
  indent?: number;        // 0-3 for nesting depth
  order: number;
}

export interface ListItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

export interface QuickList {
  id: string;
  user_id: string;
  title: string;
  type: ListType;
  items: ListItem[];      // For bullet/checkbox/numbered lists
  blocks?: Block[];       // For document type
  color?: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type FeedbackCategory = 'bug' | 'general' | 'question' | 'feature';

export interface Feedback {
  id: string;
  user_id?: string;
  category: FeedbackCategory;
  message: string;
  email?: string;
  created_at: string;
}

// =====================================================
// Push Notifications Types
// =====================================================

export enum NotificationType {
  TASK_REMINDER = 'task_reminder',
  MCP_TASK_CREATED = 'mcp_task_created',
  MCP_TASK_UPDATED = 'mcp_task_updated',
  MCP_TASK_DELETED = 'mcp_task_deleted',
  MCP_LIST_CREATED = 'mcp_list_created',
  MCP_LIST_UPDATED = 'mcp_list_updated',
  MCP_LIST_DELETED = 'mcp_list_deleted',
  MCP_CATEGORY_CREATED = 'mcp_category_created',
  MCP_CATEGORY_UPDATED = 'mcp_category_updated',
  MCP_CATEGORY_DELETED = 'mcp_category_deleted',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  device_name?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_notified_at?: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  reminder_minutes: number; // For task reminders
  quiet_hours_start?: string; // TIME format HH:MM:SS
  quiet_hours_end?: string; // TIME format HH:MM:SS
  created_at: string;
  updated_at: string;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  scheduled_for: string;
  status: NotificationStatus;
  attempts: number;
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  subscription_id?: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  error_message?: string;
  response_code?: number;
  created_at: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type: NotificationType;
    url?: string;
    taskId?: string;
    listId?: string;
    categoryId?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
