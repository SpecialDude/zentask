import React from 'react';
import { Task, TaskStatus, TaskPriority, RecurrencePattern } from '../types';
import { formatDuration } from '../utils';

interface TaskDetailModalProps {
    task: Task;
    allTasks: Task[];
    onClose: () => void;
    onEdit: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, allTasks, onClose, onEdit }) => {
    const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
        [TaskPriority.LOW]: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
        [TaskPriority.MEDIUM]: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        [TaskPriority.HIGH]: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        [TaskPriority.URGENT]: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    };

    const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
        [TaskStatus.TODO]: { label: 'To Do', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', icon: '○' },
        [TaskStatus.IN_PROGRESS]: { label: 'In Progress', color: 'text-primary', bg: 'bg-primary/10', icon: '◐' },
        [TaskStatus.COMPLETED]: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: '✓' },
        [TaskStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: '✕' },
    };

    const recurrenceLabels: Record<RecurrencePattern, string> = {
        [RecurrencePattern.DAILY]: 'Daily',
        [RecurrencePattern.WEEKLY]: 'Weekly',
        [RecurrencePattern.MONTHLY]: 'Monthly',
        [RecurrencePattern.WEEKDAYS]: 'Weekdays',
    };

    const status = statusConfig[task.status];
    const priority = task.priority ? priorityConfig[task.priority] : null;

    // Calculate parent and subtasks
    const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
    const subtasks = allTasks.filter(t => t.parentId === task.id && t.date === task.date);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${status.bg} ${status.color}`}>
                                {status.icon} {status.label}
                            </span>
                            {priority && (
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${priority.bg} ${priority.color}`}>
                                    {priority.label}
                                </span>
                            )}
                            {task.isRecurring && task.recurrencePattern && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                                    🔁 {recurrenceLabels[task.recurrencePattern]}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 break-words">{task.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Progress</span>
                            <span className="text-sm font-black text-primary">{task.completion}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${task.status === TaskStatus.COMPLETED ? 'bg-green-500' : 'bg-primary'}`}
                                style={{ width: `${task.completion}%` }}
                            />
                        </div>
                    </div>

                    {/* Parent Task */}
                    {parentTask && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                Part of Parent Task
                            </span>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{parentTask.title}</p>
                        </div>
                    )}

                    {/* Subtasks Count */}
                    {subtasks.length > 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                Subtasks
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-amber-600">{subtasks.length}</span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {subtasks.filter(s => s.status === TaskStatus.COMPLETED).length} completed
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {task.description && (
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Description</span>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                {task.description}
                            </p>
                        </div>
                    )}

                    {/* Time & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        {task.date && (
                            <div className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Date</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {new Date(task.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        )}
                        {task.startTime && (
                            <div className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Start Time</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.startTime}</p>
                            </div>
                        )}
                        {task.duration && (
                            <div className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Duration</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDuration(task.duration)}</p>
                            </div>
                        )}
                    </div>

                    {/* Recurring Info */}
                    {task.isRecurring && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Recurring Task</span>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-300">
                                {task.recurrencePattern && (
                                    <span>Pattern: <strong>{recurrenceLabels[task.recurrencePattern]}</strong></span>
                                )}
                                {task.recurrenceEndDate && (
                                    <span>Until: <strong>{new Date(task.recurrenceEndDate).toLocaleDateString()}</strong></span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Carry Over Info */}
                    {(task.carriedOverFrom || task.carriedOverTo) && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Carry Over</span>
                            <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                {task.carriedOverFrom && (
                                    <p>Carried from: <strong>{new Date(task.carriedOverFrom).toLocaleDateString()}</strong></p>
                                )}
                                {task.carriedOverTo && (
                                    <p>Carried to: <strong>{new Date(task.carriedOverTo).toLocaleDateString()}</strong></p>
                                )}
                                {task.carryOverReason && (
                                    <p className="italic text-slate-500">"{task.carryOverReason}"</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Cancellation Reason */}
                    {task.status === TaskStatus.CANCELLED && task.cancelReason && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-red-600">Cancellation Reason</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{task.cancelReason}"</p>
                        </div>
                    )}

                    {/* Review */}
                    {task.review && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-green-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Task Review
                            </span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.review}</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="text-[10px] text-slate-400 space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                        <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-1 py-3 text-sm font-bold text-white bg-primary hover:bg-indigo-700 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
