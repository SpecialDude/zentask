/**
 * Productivity statistics utilities
 * Powers streaks, Zen ranks, and completion milestones.
 */

import { Task, TaskStatus } from '../types';

export const TASK_MILESTONES = [100, 250, 500, 1000];

export interface ZenRank {
    title: string;
    emoji: string;
    minXp: number;
}

export const ZEN_RANKS: ZenRank[] = [
    { title: 'Focus Sprout', emoji: '🌱', minXp: 0 },
    { title: 'Flow Finder', emoji: '🍃', minXp: 50 },
    { title: 'Flow Rider', emoji: '🌊', minXp: 200 },
    { title: 'Momentum Master', emoji: '⚡', minXp: 500 },
    { title: 'Zen Master', emoji: '🧘', minXp: 1000 },
];

export const XP_PER_TASK = 10;

export interface ZenRankStats {
    completedCount: number;
    xp: number;
    rank: ZenRank;
    next: ZenRank | null;
    progressPct: number;
    xpToNext: number;
}

export const countAllCompleted = (tasks: Task[]): number =>
    tasks.reduce((n, t) => (t.status === TaskStatus.COMPLETED ? n + 1 : n), 0);

export const getZenRankStats = (tasks: Task[]): ZenRankStats => {
    const completedCount = countAllCompleted(tasks);
    const xp = completedCount * XP_PER_TASK;

    let idx = 0;
    ZEN_RANKS.forEach((r, i) => { if (xp >= r.minXp) idx = i; });
    const rank = ZEN_RANKS[idx];
    const next = ZEN_RANKS[idx + 1] || null;

    const progressPct = next
        ? Math.min(100, Math.round(((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100))
        : 100;

    return { completedCount, xp, rank, next, progressPct, xpToNext: next ? next.minXp - xp : 0 };
};

/**
 * Returns the milestone just crossed between two completion counts, if any.
 */
export const checkTaskMilestone = (prevCount: number, newCount: number): number | null => {
    for (const m of [...TASK_MILESTONES].sort((a, b) => b - a)) {
        if (newCount >= m && prevCount < m) return m;
    }
    return null;
};

/**
 * Consecutive days ending today (or yesterday, if today has none yet) that
 * each have at least one completed task.
 */
export const getCurrentStreak = (tasks: Task[]): number => {
    const completedDates = new Set(
        tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.date)
    );
    if (completedDates.size === 0) return 0;

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const cursor = new Date();
    if (!completedDates.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    while (completedDates.has(fmt(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
};
