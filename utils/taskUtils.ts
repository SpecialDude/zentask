/**
 * Task Utility Functions
 * 
 * Shared helper functions for task status, priority, and display logic.
 * These were previously duplicated across multiple components.
 */

import { TaskStatus, TaskPriority } from '../types';

// ==================== Status Utilities ====================

export interface StatusConfig {
    color: string;
    bgColor: string;
    label: string;
}

/**
 * Get the status indicator color for a task
 */
export const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
        case TaskStatus.COMPLETED: return 'bg-green-500';
        case TaskStatus.IN_PROGRESS: return 'bg-primary';
        case TaskStatus.CANCELLED: return 'bg-slate-400';
        default: return 'bg-slate-200 dark:bg-slate-700';
    }
};

/**
 * Get full status configuration including label and colors
 */
export const getStatusConfig = (status: TaskStatus): StatusConfig => {
    switch (status) {
        case TaskStatus.COMPLETED:
            return { color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Completed' };
        case TaskStatus.IN_PROGRESS:
            return { color: 'bg-primary', bgColor: 'bg-primary/10', label: 'In Progress' };
        case TaskStatus.CANCELLED:
            return { color: 'bg-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', label: 'Cancelled' };
        default:
            return { color: 'bg-slate-200 dark:bg-slate-700', bgColor: 'bg-slate-50 dark:bg-slate-800', label: 'To Do' };
    }
};

// ==================== Priority Utilities ====================

export interface PriorityConfig {
    label: string;
    bgColor: string;
    textColor: string;
}

/**
 * Get priority badge configuration
 */
export const getPriorityConfig = (priority?: TaskPriority): PriorityConfig | null => {
    switch (priority) {
        case TaskPriority.URGENT:
            return {
                label: '🔥 Urgent',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-600 dark:text-red-400'
            };
        case TaskPriority.HIGH:
            return {
                label: 'High',
                bgColor: 'bg-orange-100 dark:bg-orange-900/30',
                textColor: 'text-orange-600 dark:text-orange-400'
            };
        case TaskPriority.MEDIUM:
            return {
                label: 'Medium',
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                textColor: 'text-blue-600 dark:text-blue-400'
            };
        case TaskPriority.LOW:
            return {
                label: 'Low',
                bgColor: 'bg-slate-100 dark:bg-slate-700',
                textColor: 'text-slate-500'
            };
        default:
            return null;
    }
};

// ==================== Time Utilities ====================

/**
 * Get a human-readable relative time string
 */
export const getRelativeTimeString = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
};
