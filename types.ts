
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

export type ViewType = 'LIST' | 'KANBAN' | 'DASHBOARD';

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
  createdAt: number;
  updatedAt: number;
}


