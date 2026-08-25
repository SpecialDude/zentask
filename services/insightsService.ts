/**
 * Insights Service
 * Analyzes task patterns and generates productivity insights
 */

import { Task, TaskStatus } from '../types';
import { callGeminiProxy, extractGeminiText } from './geminiService';

export interface CarryOverPattern {
    reason: string;
    count: number;
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    taskTitles: string[];
    avgTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'unscheduled';
}

export interface CancellationPattern {
    reason: string;
    count: number;
    taskTitles: string[];
    avgDaysBeforeCancellation: number; // How long tasks lived before cancellation
}

export interface AbandonmentPattern {
    daysAbandoned: number; // How many days past due
    count: number;
    taskTitles: string[];
    commonPriorities: string[]; // Which priority levels get abandoned most
}

export interface ProductivityInsight {
    summary: string;
    patterns: CarryOverPattern[];
    cancellationPatterns: CancellationPattern[];
    abandonmentPatterns: AbandonmentPattern[];
    totalCarriedOver: number;
    totalCancelled: number;
    totalAbandoned: number;
    timeframe: string;
}

/**
 * Analyzes carry-over, cancellation, and abandonment patterns
 */
export const analyzeCarryOverPatterns = (
    tasks: Task[],
    daysBack: number = 7
): ProductivityInsight => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // --- 1. CARRY-OVER ANALYSIS ---
    const carriedOverTasks = tasks.filter(t =>
        t.carriedOverFrom &&
        t.carriedOverFrom >= cutoffStr &&
        !t.parentId
    );

    const carryOverPatterns: CarryOverPattern[] = [];
    if (carriedOverTasks.length > 0) {
        const reasonMap = new Map<string, Task[]>();
        carriedOverTasks.forEach(task => {
            const reason = task.carryOverReason || 'No reason given';
            if (!reasonMap.has(reason)) {
                reasonMap.set(reason, []);
            }
            reasonMap.get(reason)!.push(task);
        });

        reasonMap.forEach((tasksForReason, reason) => {
            const daysOfWeek = tasksForReason
                .map(t => new Date(t.carriedOverFrom!).getDay())
                .filter((day, index, self) => self.indexOf(day) === index)
                .sort((a, b) => a - b);

            const timeSlots = tasksForReason
                .filter(t => t.startTime)
                .map(t => {
                    const hour = parseInt(t.startTime!.split(':')[0]);
                    if (hour < 12) return 'morning';
                    if (hour < 17) return 'afternoon';
                    return 'evening';
                });

            const avgTimeSlot = timeSlots.length > 0
                ? (timeSlots.sort((a, b) =>
                    timeSlots.filter(v => v === a).length -
                    timeSlots.filter(v => v === b).length
                ).pop() as 'morning' | 'afternoon' | 'evening')
                : 'unscheduled';

            carryOverPatterns.push({
                reason,
                count: tasksForReason.length,
                daysOfWeek,
                taskTitles: tasksForReason.map(t => t.title).slice(0, 3),
                avgTimeSlot
            });
        });

        carryOverPatterns.sort((a, b) => b.count - a.count);
    }

    // --- 2. CANCELLATION ANALYSIS ---
    const cancelledTasks = tasks.filter(t =>
        t.status === TaskStatus.CANCELLED &&
        t.date >= cutoffStr &&
        !t.parentId
    );

    const cancellationPatterns: CancellationPattern[] = [];
    if (cancelledTasks.length > 0) {
        const cancelReasonMap = new Map<string, Task[]>();
        cancelledTasks.forEach(task => {
            const reason = task.cancelReason || 'No reason given';
            if (!cancelReasonMap.has(reason)) {
                cancelReasonMap.set(reason, []);
            }
            cancelReasonMap.get(reason)!.push(task);
        });

        cancelReasonMap.forEach((tasksForReason, reason) => {
            // Calculate average days before cancellation
            const daysBeforeCancellation = tasksForReason.map(t => {
                const created = new Date(t.createdAt);
                const updated = new Date(t.updatedAt);
                return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            });
            const avgDays = daysBeforeCancellation.length > 0
                ? Math.round(daysBeforeCancellation.reduce((a, b) => a + b, 0) / daysBeforeCancellation.length)
                : 0;

            cancellationPatterns.push({
                reason,
                count: tasksForReason.length,
                taskTitles: tasksForReason.map(t => t.title).slice(0, 3),
                avgDaysBeforeCancellation: avgDays
            });
        });

        cancellationPatterns.sort((a, b) => b.count - a.count);
    }

    // --- 3. ABANDONMENT ANALYSIS ---
    const abandonedTasks = tasks.filter(t =>
        t.date < today &&
        !t.parentId &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED &&
        !t.carriedOverTo
    );

    const abandonmentPatterns: AbandonmentPattern[] = [];
    if (abandonedTasks.length > 0) {
        // Group by days abandoned
        const daysAbandonedMap = new Map<number, Task[]>();
        abandonedTasks.forEach(task => {
            const taskDate = new Date(task.date);
            const todayDate = new Date(today);
            const daysOverdue = Math.floor((todayDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
            const bucket = daysOverdue <= 7 ? 7 : daysOverdue <= 30 ? 30 : 90;
            
            if (!daysAbandonedMap.has(bucket)) {
                daysAbandonedMap.set(bucket, []);
            }
            daysAbandonedMap.get(bucket)!.push(task);
        });

        daysAbandonedMap.forEach((tasksInBucket, days) => {
            const priorities = tasksInBucket
                .filter(t => t.priority)
                .map(t => t.priority!)
                .filter((p, i, self) => self.indexOf(p) === i);

            abandonmentPatterns.push({
                daysAbandoned: days,
                count: tasksInBucket.length,
                taskTitles: tasksInBucket.map(t => t.title).slice(0, 3),
                commonPriorities: priorities
            });
        });

        abandonmentPatterns.sort((a, b) => a.daysAbandoned - b.daysAbandoned);
    }

    // --- 4. GENERATE SUMMARY ---
    const totalIssues = carriedOverTasks.length + cancelledTasks.length + abandonedTasks.length;
    
    if (totalIssues === 0) {
        return {
            summary: `Great! No pushed, cancelled, or abandoned tasks in the last ${daysBack} days.`,
            patterns: [],
            cancellationPatterns: [],
            abandonmentPatterns: [],
            totalCarriedOver: 0,
            totalCancelled: 0,
            totalAbandoned: 0,
            timeframe: `${daysBack} days`
        };
    }

    return {
        summary: '', // Will be generated by AI
        patterns: carryOverPatterns,
        cancellationPatterns,
        abandonmentPatterns,
        totalCarriedOver: carriedOverTasks.length,
        totalCancelled: cancelledTasks.length,
        totalAbandoned: abandonedTasks.length,
        timeframe: `${daysBack} days`
    };
};

/**
 * Generates natural language insight using AI
 */
export const generateInsightText = async (
    insight: ProductivityInsight
): Promise<string> => {
    const totalIssues = insight.totalCarriedOver + insight.totalCancelled + insight.totalAbandoned;
    
    if (totalIssues === 0) {
        return insight.summary;
    }

    // Build comprehensive context for AI
    const contextParts: string[] = [];

    if (insight.patterns.length > 0) {
        const topCarryOver = insight.patterns[0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const daysStr = topCarryOver.daysOfWeek.map(d => dayNames[d]).join(', ');
        contextParts.push(`Pushed ${insight.totalCarriedOver} tasks (most: "${topCarryOver.reason}", ${topCarryOver.count}x on ${daysStr})`);
    }

    if (insight.cancellationPatterns.length > 0) {
        const topCancel = insight.cancellationPatterns[0];
        contextParts.push(`Cancelled ${insight.totalCancelled} tasks (most: "${topCancel.reason}", ${topCancel.count}x, avg ${topCancel.avgDaysBeforeCancellation} days after creation)`);
    }

    if (insight.abandonmentPatterns.length > 0) {
        const abandoned = insight.abandonmentPatterns[0];
        contextParts.push(`${insight.totalAbandoned} tasks left incomplete (${abandoned.count}x overdue by ${abandoned.daysAbandoned}+ days)`);
    }

    const prompt = `
You are a productivity coach analyzing task completion patterns.

This week's data:
${contextParts.join('\n')}

Write ONE conversational sentence (max 2 sentences if needed) that:
1. Highlights the main pattern concisely
2. Points out the most actionable insight
3. Feels observational and supportive, not judgmental
4. Prioritizes the biggest issue (pushed > cancelled > abandoned)

Examples:
- "You pushed 6 tasks this week, mostly 'no time' on Tue/Wed—your meeting-heavy days—and cancelled 3 tasks that turned out less urgent than expected."
- "Of 8 incomplete tasks, 4 were pushed with 'tired' as the reason, and 3 were cancelled within 2 days, suggesting you're over-scheduling."
- "You have 5 tasks sitting overdue for 7+ days, mostly low-priority items that might need cancellation or rescheduling."

Your insight (1-2 sentences max):`;

    try {
        const response = await callGeminiProxy({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
            }
        });
        const generatedText = extractGeminiText(response).trim();

        return generatedText || contextParts.join(', ');
    } catch (error) {
        console.error('Failed to generate AI insight:', error);
        // Fallback to structured template
        return contextParts.join('. ') + '.';
    }
};
