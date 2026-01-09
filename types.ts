
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

export type ViewType = 'LIST' | 'KANBAN' | 'DASHBOARD' | 'SETTINGS' | 'LISTS';

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


export type ListType = 'bullet' | 'checkbox' | 'numbered';

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
  items: ListItem[];
  color?: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}
