
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export type ViewType = 'LIST' | 'KANBAN';

export interface Task {
  id: string;
  user_id: string;
  parentId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  completion: number; // 0 to 100
  date: string; // ISO String (YYYY-MM-DD)
  duration?: number; // Minutes
  startTime?: string; // HH:mm
  cancelReason?: string;
  carryOverReason?: string;
  carriedOverTo?: string; // Date string
  carriedOverFrom?: string; // Date string
  createdAt: number;
  updatedAt: number;
}
