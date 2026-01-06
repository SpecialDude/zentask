
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const formatDuration = (minutes: number) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const getSubtasks = (tasks: any[], parentId: string, date?: string) => {
  return tasks.filter(t => t.parentId === parentId && (!date || t.date === date));
};

export const calculateAggregateProgress = (taskId: string, allTasks: any[]): number => {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return 0;
  
  const subtasks = allTasks.filter(t => t.parentId === taskId && t.date === task.date);
  if (subtasks.length === 0) return task.completion || 0;

  const totalProgress = subtasks.reduce((acc, sub) => acc + calculateAggregateProgress(sub.id, allTasks), 0);
  return Math.round(totalProgress / subtasks.length);
};

import { TaskStatus } from './types';

export const getStatusFromProgress = (progress: number): TaskStatus => {
  if (progress >= 100) return TaskStatus.COMPLETED;
  if (progress > 0) return TaskStatus.IN_PROGRESS;
  return TaskStatus.TODO;
};
