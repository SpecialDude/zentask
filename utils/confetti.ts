/**
 * Confetti celebration utilities
 *
 * Fires a multi-burst celebration when a day's tasks become fully cleared.
 * Respects the user's reduced-motion preference.
 */

import confetti from 'canvas-confetti';
import { Task, TaskStatus } from '../types';

const CELEBRATION_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899'];

/**
 * A day counts as cleared when it has at least one task and every task on it
 * is completed, cancelled, or carried over to another day.
 */
export const isDayFullyCleared = (dayTasks: Task[]): boolean =>
    dayTasks.length > 0 &&
    dayTasks.every(t =>
        t.status === TaskStatus.COMPLETED ||
        t.status === TaskStatus.CANCELLED ||
        !!t.carriedOverTo
    );

export const celebrateDayComplete = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Center burst
    confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 45,
        origin: { y: 0.6 },
        colors: CELEBRATION_COLORS,
    });

    // Side cannons join in after a beat
    window.setTimeout(() => {
        confetti({
            particleCount: 55,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.75 },
            colors: CELEBRATION_COLORS,
        });
        confetti({
            particleCount: 55,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.75 },
            colors: CELEBRATION_COLORS,
        });
    }, 250);
};

/**
 * Golden celebration for all-time completion milestones (100 / 250 / 500 / 1000).
 */
export const celebrateMilestone = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const golds = ['#fde68a', '#fbbf24', '#f59e0b', '#d97706'];

    confetti({
        particleCount: 140,
        spread: 100,
        startVelocity: 50,
        origin: { y: 0.55 },
        colors: golds,
        scalar: 1.15,
    });

    window.setTimeout(() => {
        confetti({
            particleCount: 70,
            angle: 60,
            spread: 65,
            origin: { x: 0, y: 0.75 },
            colors: golds,
        });
        confetti({
            particleCount: 70,
            angle: 120,
            spread: 65,
            origin: { x: 1, y: 0.75 },
            colors: golds,
        });
    }, 300);
};

/**
 * Small puff of confetti at an exact screen position (e.g. a Kanban drop).
 */
export const confettiPopAt = (clientX: number, clientY: number) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    confetti({
        particleCount: 28,
        spread: 45,
        startVelocity: 22,
        scalar: 0.75,
        ticks: 120,
        origin: {
            x: clientX / window.innerWidth,
            y: clientY / window.innerHeight,
        },
        colors: CELEBRATION_COLORS,
    });
};
