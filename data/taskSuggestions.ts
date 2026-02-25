/**
 * Task Suggestion Presets
 * 
 * Static array of recurring task ideas that users can quickly apply.
 * Each suggestion carries a recurrence pattern so tasks are created as recurring.
 */

import { TaskPriority, RecurrencePattern } from '../types';

export interface TaskSuggestion {
  id: string;
  emoji: string;
  label: string;
  getTitle: (isToday: boolean) => string;
  description: string;
  defaultTime: { today: string; ahead: string };
  defaultDuration: number; // minutes
  priority: TaskPriority;
  recurrencePattern: RecurrencePattern;
}

export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  {
    id: 'plan-tasks',
    emoji: '📋',
    label: 'Plan Tasks Ahead',
    getTitle: (isToday) => isToday ? "Plan & prepare tomorrow's tasks" : "Plan today's tasks",
    description: 'Set aside time to organise and prioritise your upcoming tasks.',
    defaultTime: { today: '20:00', ahead: '07:00' },
    defaultDuration: 30,
    priority: TaskPriority.MEDIUM,
    recurrencePattern: RecurrencePattern.DAILY,
  },
  {
    id: 'standup-prep',
    emoji: '🎯',
    label: 'Daily Standup Prep',
    getTitle: () => 'Standup prep — review priorities',
    description: "Review yesterday's progress and today's top priorities.",
    defaultTime: { today: '08:30', ahead: '08:30' },
    defaultDuration: 15,
    priority: TaskPriority.MEDIUM,
    recurrencePattern: RecurrencePattern.WEEKDAYS,
  },
  {
    id: 'eod-review',
    emoji: '📝',
    label: 'End-of-Day Review',
    getTitle: () => 'End-of-day review — reflect & log progress',
    description: 'Reflect on what was accomplished and capture any notes.',
    defaultTime: { today: '17:30', ahead: '17:30' },
    defaultDuration: 15,
    priority: TaskPriority.LOW,
    recurrencePattern: RecurrencePattern.WEEKDAYS,
  },
  {
    id: 'inbox-zero',
    emoji: '📬',
    label: 'Inbox Zero',
    getTitle: () => 'Inbox zero — process emails & messages',
    description: 'Triage and respond to pending emails and messages.',
    defaultTime: { today: '09:00', ahead: '09:00' },
    defaultDuration: 30,
    priority: TaskPriority.MEDIUM,
    recurrencePattern: RecurrencePattern.DAILY,
  },
  {
    id: 'weekly-review',
    emoji: '🔄',
    label: 'Weekly Review',
    getTitle: () => 'Weekly review — reflect on the week',
    description: 'Review the past week, identify wins and areas to improve.',
    defaultTime: { today: '16:00', ahead: '16:00' },
    defaultDuration: 45,
    priority: TaskPriority.MEDIUM,
    recurrencePattern: RecurrencePattern.WEEKLY,
  },
];
