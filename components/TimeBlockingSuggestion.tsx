import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import { ProductivityInsight } from '../services/insightsService';
import { detectBlockingOpportunities, generateTimeBlockRecommendations, assignTasksToBlocks } from '../services/timeBlockingService';

interface TimeBlockingSuggestionProps {
    tasks: Task[];
    insights: ProductivityInsight;
    onAssignTime: (taskId: string, startTime: string, duration: number) => void;
    onDismiss: () => void;
}

const TimeBlockingSuggestion: React.FC<TimeBlockingSuggestionProps> = ({
    tasks,
    insights,
    onAssignTime,
    onDismiss
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    const opportunity = useMemo(() => 
        detectBlockingOpportunities(tasks, insights),
        [tasks, insights]
    );

    const suggestedTasks = useMemo(() =>
        tasks.filter(t => opportunity.taskIds.includes(t.id)),
        [tasks, opportunity.taskIds]
    );

    if (!opportunity.shouldSuggest) {
        return null;
    }

    const handleToggleTask = (taskId: string) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTasks.size === suggestedTasks.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(suggestedTasks.map(t => t.id)));
        }
    };

    const handleBlockTime = () => {
        const tasksToBlock = suggestedTasks.filter(t => selectedTasks.has(t.id));
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const assignments = assignTasksToBlocks(tasksToBlock, tomorrowStr, insights);

        assignments.forEach(({ task, suggestedTime, duration }) => {
            onAssignTime(task.id, suggestedTime, duration);
        });

        setSelectedTasks(new Set());
        setIsExpanded(false);
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200 dark:border-indigo-900/50 rounded-[2rem] overflow-hidden shadow-lg">
            {/* Header */}
            <div 
                className="p-6 cursor-pointer hover:bg-white/30 dark:hover:bg-black/10 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-black text-indigo-900 dark:text-indigo-200">Time-Blocking Suggestion</h3>
                                <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-bold rounded-full">
                                    AI
                                </span>
                            </div>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                {opportunity.reason}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDismiss();
                            }}
                            className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
                            title="Dismiss"
                        >
                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
                        >
                            <svg
                                className={`w-5 h-5 text-indigo-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-indigo-200 dark:border-indigo-900/50 pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                            Select tasks to block time for:
                        </h4>
                        <button
                            onClick={handleSelectAll}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {selectedTasks.size === suggestedTasks.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {suggestedTasks.map(task => {
                            const recommendation = generateTimeBlockRecommendations(task, tasks, insights);
                            const topSlot = recommendation.suggestedSlots[0];

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTasks.has(task.id)
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600'
                                        : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-800'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedTasks.has(task.id)}
                                            onChange={() => handleToggleTask(task.id)}
                                            className="mt-1 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                                {task.title}
                                            </h5>
                                            {topSlot && (
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                    Suggested: Tomorrow at {topSlot.startTime} ({topSlot.duration}min)
                                                    <span className="text-slate-500 dark:text-slate-400 ml-1">
                                                        • {topSlot.reasons[0]}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedTasks.size > 0 && (
                        <button
                            onClick={handleBlockTime}
                            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                            Block Time for {selectedTasks.size} {selectedTasks.size === 1 ? 'Task' : 'Tasks'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TimeBlockingSuggestion;
