import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { generateWeeklyReview, getWeeklySummary, getWeekLabel } from '../services/weeklyReviewService';

interface WeeklyReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onBulkReschedule?: (taskIds: string[], newDate: string) => void;
}

const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
    isOpen,
    onClose,
    tasks,
    onTaskClick,
    onBulkReschedule
}) => {
    const [useLastWeek, setUseLastWeek] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    const reviewData = useMemo(() =>
        generateWeeklyReview(tasks, useLastWeek),
        [tasks, useLastWeek]
    );

    const summary = useMemo(() =>
        getWeeklySummary(reviewData.stats),
        [reviewData.stats]
    );

    const weekLabel = getWeekLabel(reviewData.weekStart, reviewData.weekEnd);

    if (!isOpen) return null;

    const handleTaskSelect = (taskId: string) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleSelectAllPushed = () => {
        if (selectedTasks.size === reviewData.pushedTasks.tasks.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(reviewData.pushedTasks.tasks.map(t => t.id)));
        }
    };

    const handleBulkReschedule = () => {
        if (selectedTasks.size === 0 || !onBulkReschedule) return;

        // Default to next Monday
        const nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
        const dateStr = nextMonday.toISOString().split('T')[0];

        onBulkReschedule(Array.from(selectedTasks), dateStr);
        setSelectedTasks(new Set());
    };

    const TaskMiniCard = ({ task, selectable = false }: { task: Task; selectable?: boolean }) => (
        <div
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${selectable
                ? 'cursor-pointer hover:border-purple-400 dark:hover:border-purple-500'
                : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
                } ${selectable && selectedTasks.has(task.id)
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
            onClick={() => selectable ? handleTaskSelect(task.id) : onTaskClick(task)}
        >
            {selectable && (
                <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => handleTaskSelect(task.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    onClick={(e) => e.stopPropagation()}
                />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {task.priority && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === TaskPriority.URGENT ? 'bg-red-500' :
                            task.priority === TaskPriority.HIGH ? 'bg-orange-500' :
                                task.priority === TaskPriority.MEDIUM ? 'bg-blue-500' : 'bg-slate-400'
                            }`} />
                    )}
                    <h5 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {task.title}
                    </h5>
                </div>
                {task.carryOverReason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reason: "{task.carryOverReason}"
                    </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                    {new Date(task.carriedOverFrom || task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {task.carriedOverTo && ` → ${new Date(task.carriedOverTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Weekly Review</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{weekLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setUseLastWeek(false)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${!useLastWeek
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setUseLastWeek(true)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${useLastWeek
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Last Week
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary Stats */}
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
                        <h3 className="text-lg font-bold mb-3">Week at a Glance</h3>
                        <p className="text-purple-100 mb-4">{summary}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-3xl font-black">{reviewData.stats.completed}</div>
                                <div className="text-xs text-purple-200 uppercase tracking-wider">Completed</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black">{reviewData.stats.carriedOver}</div>
                                <div className="text-xs text-purple-200 uppercase tracking-wider">Pushed</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black">{reviewData.stats.completionRate}%</div>
                                <div className="text-xs text-purple-200 uppercase tracking-wider">Success Rate</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black">
                                    {reviewData.stats.highPriorityCompleted}/{reviewData.stats.highPriorityTotal}
                                </div>
                                <div className="text-xs text-purple-200 uppercase tracking-wider">High Priority</div>
                            </div>
                        </div>
                    </div>

                    {/* Insights */}
                    {reviewData.insights.totalCarriedOver > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-1">Pattern Detected</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        {reviewData.insights.patterns[0]?.reason && (
                                            `Most common reason for pushing: "${reviewData.insights.patterns[0].reason}" (${reviewData.insights.patterns[0].count} tasks)`
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wins */}
                    {reviewData.highlights.count > 0 && (
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="text-2xl">🏆</span>
                                {reviewData.highlights.title}
                            </h4>
                            <div className="space-y-2">
                                {reviewData.highlights.tasks.map(task => (
                                    <TaskMiniCard key={task.id} task={task} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pushed Tasks */}
                    {reviewData.pushedTasks.count > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-2xl">📋</span>
                                    {reviewData.pushedTasks.title}
                                </h4>
                                {onBulkReschedule && (
                                    <button
                                        onClick={handleSelectAllPushed}
                                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                    >
                                        {selectedTasks.size === reviewData.pushedTasks.tasks.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {reviewData.pushedTasks.tasks.map(task => (
                                    <TaskMiniCard key={task.id} task={task} selectable={!!onBulkReschedule} />
                                ))}
                            </div>
                            {onBulkReschedule && selectedTasks.size > 0 && (
                                <button
                                    onClick={handleBulkReschedule}
                                    className="mt-3 w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors"
                                >
                                    Reschedule {selectedTasks.size} {selectedTasks.size === 1 ? 'Task' : 'Tasks'} to Next Monday
                                </button>
                            )}
                        </div>
                    )}

                    {/* Abandoned Tasks */}
                    {reviewData.abandonedTasks.count > 0 && (
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="text-2xl">⏳</span>
                                {reviewData.abandonedTasks.title}
                            </h4>
                            <div className="space-y-2">
                                {reviewData.abandonedTasks.tasks.slice(0, 5).map(task => (
                                    <TaskMiniCard key={task.id} task={task} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming */}
                    {reviewData.upcomingTasks.count > 0 && (
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="text-2xl">📅</span>
                                {reviewData.upcomingTasks.title}
                            </h4>
                            <div className="space-y-2">
                                {reviewData.upcomingTasks.tasks.slice(0, 5).map(task => (
                                    <TaskMiniCard key={task.id} task={task} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-6">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
                    >
                        Close Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeeklyReviewModal;
