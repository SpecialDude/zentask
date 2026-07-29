/**
 * Weekly Review Service
 * Aggregates weekly productivity data and generates review insights
 */

import { Task, TaskStatus, TaskPriority } from '../types';
import { analyzeCarryOverPatterns, ProductivityInsight } from './insightsService';

export interface WeeklyStats {
    totalTasks: number;
    completed: number;
    cancelled: number;
    carriedOver: number;
    stillPending: number;
    completionRate: number;
    highPriorityCompleted: number;
    highPriorityTotal: number;
}

export interface TaskGroup {
    title: string;
    tasks: Task[];
    count: number;
}

export interface WeeklyReviewData {
    weekStart: string;
    weekEnd: string;
    stats: WeeklyStats;
    insights: ProductivityInsight;
    highlights: TaskGroup; // Successfully completed important tasks
    pushedTasks: TaskGroup; // Tasks that were carried over
    abandonedTasks: TaskGroup; // Tasks that are still pending from last week
    upcomingTasks: TaskGroup; // Tasks scheduled for next week
}

/**
 * Gets the start and end dates for a given week
 */
export const getWeekBounds = (referenceDate: Date = new Date()): { start: Date; end: Date } => {
    const start = new Date(referenceDate);
    // Go to Sunday (start of week)
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    // Saturday (end of week)
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

/**
 * Gets week bounds for last week
 */
export const getLastWeekBounds = (): { start: Date; end: Date } => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return getWeekBounds(lastWeek);
};

/**
 * Aggregates weekly statistics
 */
export const calculateWeeklyStats = (tasks: Task[], weekStart: Date, weekEnd: Date): WeeklyStats => {
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    // Filter tasks within the week (by original date, not carry-over date)
    const weekTasks = tasks.filter(t => {
        const taskDate = t.carriedOverFrom || t.date;
        return taskDate >= startStr && taskDate <= endStr && !t.parentId;
    });

    const completed = weekTasks.filter(t => t.status === TaskStatus.COMPLETED);
    const cancelled = weekTasks.filter(t => t.status === TaskStatus.CANCELLED);
    const carriedOver = weekTasks.filter(t => t.carriedOverTo);
    const stillPending = weekTasks.filter(t =>
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED &&
        !t.carriedOverTo
    );

    const highPriorityTasks = weekTasks.filter(t =>
        t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT
    );
    const highPriorityCompleted = highPriorityTasks.filter(t => t.status === TaskStatus.COMPLETED);

    const completionRate = weekTasks.length > 0
        ? Math.round((completed.length / weekTasks.length) * 100)
        : 0;

    return {
        totalTasks: weekTasks.length,
        completed: completed.length,
        cancelled: cancelled.length,
        carriedOver: carriedOver.length,
        stillPending: stillPending.length,
        completionRate,
        highPriorityCompleted: highPriorityCompleted.length,
        highPriorityTotal: highPriorityTasks.length
    };
};

/**
 * Generates complete weekly review data
 */
export const generateWeeklyReview = (
    tasks: Task[],
    useLastWeek: boolean = false
): WeeklyReviewData => {
    const bounds = useLastWeek ? getLastWeekBounds() : getWeekBounds();
    const { start: weekStart, end: weekEnd } = bounds;

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    // Calculate stats
    const stats = calculateWeeklyStats(tasks, weekStart, weekEnd);

    // Analyze carry-over patterns (uses last 7 days from week end)
    const insights = analyzeCarryOverPatterns(tasks, 7);

    // Get highlights - completed high-value tasks
    const highlights: Task[] = tasks.filter(t => {
        const taskDate = t.carriedOverFrom || t.date;
        return taskDate >= startStr &&
            taskDate <= endStr &&
            !t.parentId &&
            t.status === TaskStatus.COMPLETED &&
            (t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT);
    }).sort((a, b) => {
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (priorityOrder[a.priority || 'LOW'] || 3) - (priorityOrder[b.priority || 'LOW'] || 3);
    }).slice(0, 5);

    // Get pushed tasks
    const pushedTasks: Task[] = tasks.filter(t => {
        const taskDate = t.carriedOverFrom || t.date;
        return taskDate >= startStr &&
            taskDate <= endStr &&
            !t.parentId &&
            t.carriedOverTo;
    }).sort((a, b) => (b.carriedOverTo || '').localeCompare(a.carriedOverTo || ''));

    // Get abandoned tasks (still pending from last week)
    const abandonedTasks: Task[] = tasks.filter(t => {
        const taskDate = t.date;
        return taskDate >= startStr &&
            taskDate <= endStr &&
            !t.parentId &&
            t.status !== TaskStatus.COMPLETED &&
            t.status !== TaskStatus.CANCELLED &&
            !t.carriedOverTo;
    });

    // Get upcoming tasks (next week)
    const nextWeekStart = new Date(weekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

    const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];
    const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0];

    const upcomingTasks: Task[] = tasks.filter(t =>
        t.date >= nextWeekStartStr &&
        t.date <= nextWeekEndStr &&
        !t.parentId &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED
    ).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

    return {
        weekStart: startStr,
        weekEnd: endStr,
        stats,
        insights,
        highlights: {
            title: 'Wins This Week',
            tasks: highlights,
            count: highlights.length
        },
        pushedTasks: {
            title: 'Tasks You Pushed',
            tasks: pushedTasks,
            count: pushedTasks.length
        },
        abandonedTasks: {
            title: 'Still Waiting',
            tasks: abandonedTasks,
            count: abandonedTasks.length
        },
        upcomingTasks: {
            title: 'Coming Up Next Week',
            tasks: upcomingTasks,
            count: upcomingTasks.length
        }
    };
};

/**
 * Generates a motivational summary based on weekly stats
 */
export const getWeeklySummary = (stats: WeeklyStats): string => {
    if (stats.totalTasks === 0) {
        return "No tasks scheduled this week. Time to plan ahead!";
    }

    if (stats.completionRate >= 80) {
        return `Outstanding week! You completed ${stats.completed} of ${stats.totalTasks} tasks (${stats.completionRate}%).`;
    }

    if (stats.completionRate >= 60) {
        return `Solid week! You completed ${stats.completed} of ${stats.totalTasks} tasks. Keep the momentum going.`;
    }

    if (stats.completionRate >= 40) {
        return `You completed ${stats.completed} of ${stats.totalTasks} tasks. Room for improvement—check your patterns below.`;
    }

    return `Challenging week. You completed ${stats.completed} of ${stats.totalTasks} tasks. Let's identify what got in the way.`;
};

/**
 * Gets a readable week label (e.g., "Dec 23 - Dec 29")
 */
export const getWeekLabel = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}`;
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};
