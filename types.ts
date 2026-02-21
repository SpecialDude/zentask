
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

export type ViewType = 'LIST' | 'KANBAN' | 'DASHBOARD' | 'SETTINGS' | 'LISTS' | 'ADMIN_FEEDBACK';

export interface Task {
  id: string;
  user_id: string;
  parentId: string | null;
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
