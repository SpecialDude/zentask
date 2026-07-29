/**
 * Time Blocking Service
 * Generates intelligent time-block recommendations based on task patterns
 */

import { Task, TaskPriority, TaskStatus } from '../types';
import { analyzeCarryOverPatterns, ProductivityInsight } from './insightsService';

export interface TimeBlock {
    id: string;
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
    taskId?: string;    // Assigned task
    suggested?: boolean; // AI-suggested block
    reason?: string;    // Why this block was suggested
}

export interface DaySchedule {
    date: string;
    blocks: TimeBlock[];
    availableSlots: TimeSlot[];
    tasks: Task[];
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    duration: number; // minutes
    score: number;    // 0-100, how good this slot is based on patterns
    reasons: string[]; // Why this slot is recommended
}

export interface TimeBlockRecommendation {
    task: Task;
    suggestedSlots: TimeSlot[];
    avoidDays: number[]; // Days of week to avoid (based on patterns)
    preferredDays: number[]; // Days of week that work best
    reasoning: string;
}

/**
 * Generates time slots for a day (15-minute intervals)
 */
export const generateTimeSlots = (
    workStart: string = '09:00',
    workEnd: string = '17:00'
): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = workStart.split(':').map(Number);
    const [endHour, endMin] = workEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
        const hour = Math.floor(minutes / 60);
        const min = minutes % 60;
        const nextHour = Math.floor((minutes + 15) / 60);
        const nextMin = (minutes + 15) % 60;

        slots.push({
            startTime: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
            endTime: `${nextHour.toString().padStart(2, '0')}:${nextMin.toString().padStart(2, '0')}`,
            duration: 15,
            score: 50, // Default score, will be adjusted based on patterns
            reasons: []
        });
    }

    return slots;
};

/**
 * Finds available time slots for a given day
 */
export const findAvailableSlots = (
    date: string,
    tasks: Task[],
    minDuration: number = 30
): TimeSlot[] => {
    const dayTasks = tasks.filter(t => 
        t.date === date && 
        t.startTime && 
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED
    );

    const allSlots = generateTimeSlots();
    const blockedTimes = new Set<string>();

    // Mark blocked times
    dayTasks.forEach(task => {
        if (task.startTime && task.duration) {
            const [hour, min] = task.startTime.split(':').map(Number);
            const startMinutes = hour * 60 + min;
            const endMinutes = startMinutes + task.duration;

            for (let m = startMinutes; m < endMinutes; m += 15) {
                const h = Math.floor(m / 60);
                const mm = m % 60;
                blockedTimes.add(`${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
            }
        }
    });

    // Filter to available slots
    const availableSlots = allSlots.filter(slot => !blockedTimes.has(slot.startTime));

    // Consolidate into blocks of minimum duration
    const consolidatedSlots: TimeSlot[] = [];
    let currentBlock: TimeSlot | null = null;

    availableSlots.forEach(slot => {
        if (!currentBlock) {
            currentBlock = { ...slot };
        } else {
            const currentEnd = currentBlock.endTime;
            if (currentEnd === slot.startTime) {
                // Extend current block
                currentBlock.endTime = slot.endTime;
                currentBlock.duration += 15;
            } else {
                // Save current block if it meets minimum duration
                if (currentBlock.duration >= minDuration) {
                    consolidatedSlots.push(currentBlock);
                }
                currentBlock = { ...slot };
            }
        }
    });

    // Don't forget last block
    if (currentBlock && currentBlock.duration >= minDuration) {
        consolidatedSlots.push(currentBlock);
    }

    return consolidatedSlots;
};

/**
 * Scores time slots based on historical success patterns
 */
export const scoreTimeSlots = (
    slots: TimeSlot[],
    tasks: Task[],
    insights: ProductivityInsight
): TimeSlot[] => {
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED && t.startTime);
    const failedTasks = tasks.filter(t => 
        (t.carriedOverFrom || t.status === TaskStatus.CANCELLED) && 
        t.startTime
    );

    return slots.map(slot => {
        let score = 50; // Start neutral
        const reasons: string[] = [];

        const slotHour = parseInt(slot.startTime.split(':')[0]);

        // Boost score for times when tasks succeed
        completedTasks.forEach(task => {
            const taskHour = parseInt(task.startTime!.split(':')[0]);
            if (Math.abs(taskHour - slotHour) <= 1) {
                score += 5;
                if (score > 50 && !reasons.includes('Previous success at this time')) {
                    reasons.push('Previous success at this time');
                }
            }
        });

        // Reduce score for times when tasks fail
        failedTasks.forEach(task => {
            const taskHour = parseInt(task.startTime!.split(':')[0]);
            if (Math.abs(taskHour - slotHour) <= 1) {
                score -= 8;
                if (score < 50 && !reasons.includes('Tasks often slip at this time')) {
                    reasons.push('Tasks often slip at this time');
                }
            }
        });

        // Boost morning slots for deep work if user is morning person
        const morningSuccessRate = completedTasks.filter(t => {
            const h = parseInt(t.startTime!.split(':')[0]);
            return h >= 8 && h < 12;
        }).length / Math.max(completedTasks.length, 1);

        if (slotHour >= 8 && slotHour < 12 && morningSuccessRate > 0.6) {
            score += 10;
            reasons.push('Your morning success rate is high');
        }

        // Reduce score for late afternoon (common energy dip)
        if (slotHour >= 14 && slotHour < 16 && failedTasks.length > 0) {
            const afternoonFailRate = failedTasks.filter(t => {
                const h = parseInt(t.startTime!.split(':')[0]);
                return h >= 14 && h < 16;
            }).length / failedTasks.length;

            if (afternoonFailRate > 0.4) {
                score -= 15;
                reasons.push('Post-lunch dip zone');
            }
        }

        // Boost early morning for focus work
        if (slotHour >= 9 && slotHour < 11 && slot.duration >= 60) {
            score += 5;
            reasons.push('Prime focus time');
        }

        // Ensure score stays in range
        score = Math.max(0, Math.min(100, score));

        return {
            ...slot,
            score,
            reasons: reasons.length > 0 ? reasons : ['Available time slot']
        };
    });
};

/**
 * Generates time-blocking recommendations for a task
 */
export const generateTimeBlockRecommendations = (
    task: Task,
    allTasks: Task[],
    insights: ProductivityInsight
): TimeBlockRecommendation => {
    const today = new Date().toISOString().split('T')[0];
    
    // Analyze which days to avoid based on carry-over patterns
    const avoidDays: number[] = [];
    insights.patterns.forEach(pattern => {
        if (pattern.count >= 3) { // Significant pattern
            avoidDays.push(...pattern.daysOfWeek);
        }
    });

    // Find preferred days (inverse of avoid days)
    const preferredDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !avoidDays.includes(d));

    // Find next preferred day
    const nextPreferredDate = (() => {
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + i);
            if (preferredDays.includes(checkDate.getDay())) {
                return checkDate.toISOString().split('T')[0];
            }
        }
        return today;
    })();

    // Get available slots for that day
    const availableSlots = findAvailableSlots(nextPreferredDate, allTasks);
    const scoredSlots = scoreTimeSlots(availableSlots, allTasks, insights);

    // Sort by score and take top 3
    const topSlots = scoredSlots
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    // Generate reasoning
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const avoidDaysStr = avoidDays.map(d => dayNames[d]).join(', ');
    
    let reasoning = '';
    if (avoidDays.length > 0) {
        reasoning = `Based on your patterns, avoid ${avoidDaysStr}. `;
    }
    if (topSlots.length > 0) {
        reasoning += `Best time: ${topSlots[0].startTime} (${topSlots[0].reasons[0] || 'available'}).`;
    }

    return {
        task,
        suggestedSlots: topSlots,
        avoidDays,
        preferredDays,
        reasoning: reasoning || 'No strong patterns yet—any time works!'
    };
};

/**
 * Bulk assigns tasks to time blocks
 */
export const assignTasksToBlocks = (
    tasks: Task[],
    date: string,
    insights: ProductivityInsight
): Array<{ task: Task; suggestedTime: string; duration: number }> => {
    const assignments: Array<{ task: Task; suggestedTime: string; duration: number }> = [];
    const availableSlots = findAvailableSlots(date, tasks);
    const scoredSlots = scoreTimeSlots(availableSlots, tasks, insights);

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (priorityOrder[a.priority || 'LOW'] || 3) - (priorityOrder[b.priority || 'LOW'] || 3);
    });

    let currentSlotIndex = 0;

    sortedTasks.forEach(task => {
        const taskDuration = task.duration || 60; // Default 1 hour
        
        // Find a slot that can fit this task
        for (let i = currentSlotIndex; i < scoredSlots.length; i++) {
            const slot = scoredSlots[i];
            if (slot.duration >= taskDuration) {
                assignments.push({
                    task,
                    suggestedTime: slot.startTime,
                    duration: taskDuration
                });
                
                // Update available slots (reduce duration)
                slot.duration -= taskDuration;
                const [hour, min] = slot.startTime.split(':').map(Number);
                const newStartMinutes = hour * 60 + min + taskDuration;
                const newHour = Math.floor(newStartMinutes / 60);
                const newMin = newStartMinutes % 60;
                slot.startTime = `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
                
                if (slot.duration < 30) {
                    currentSlotIndex = i + 1;
                }
                
                break;
            }
        }
    });

    return assignments;
};

/**
 * Detects time-blocking opportunities (when to suggest blocking)
 */
export const detectBlockingOpportunities = (
    tasks: Task[],
    insights: ProductivityInsight
): { shouldSuggest: boolean; reason: string; taskIds: string[] } => {
    // Trigger 1: Multiple tasks pushed with "no time" reason
    const noTimePattern = insights.patterns.find(p => 
        p.reason.toLowerCase().includes('time') && p.count >= 3
    );

    if (noTimePattern) {
        const noTimeTasks = tasks.filter(t => 
            t.carriedOverFrom && 
            t.carryOverReason?.toLowerCase().includes('time')
        ).slice(0, 5);

        return {
            shouldSuggest: true,
            reason: `You've pushed ${noTimePattern.count} tasks due to "no time". Want to block time for these?`,
            taskIds: noTimeTasks.map(t => t.id)
        };
    }

    // Trigger 2: High-priority tasks without time blocks
    const unscheduledHighPriority = tasks.filter(t => 
        !t.startTime &&
        (t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT) &&
        t.status === TaskStatus.TODO
    );

    if (unscheduledHighPriority.length >= 3) {
        return {
            shouldSuggest: true,
            reason: `You have ${unscheduledHighPriority.length} high-priority tasks without time blocks.`,
            taskIds: unscheduledHighPriority.map(t => t.id).slice(0, 5)
        };
    }

    // Trigger 3: Abandoned tasks (could benefit from dedicated time)
    if (insights.totalAbandoned >= 3) {
        const abandonedTasks = tasks.filter(t => {
            const today = new Date().toISOString().split('T')[0];
            return t.date < today && 
                   t.status === TaskStatus.TODO && 
                   !t.carriedOverTo;
        });

        return {
            shouldSuggest: true,
            reason: `${insights.totalAbandoned} tasks are overdue. Block time to catch up?`,
            taskIds: abandonedTasks.map(t => t.id).slice(0, 5)
        };
    }

    return {
        shouldSuggest: false,
        reason: '',
        taskIds: []
    };
};
