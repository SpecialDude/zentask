import React, { useState } from 'react';
import { Task } from '../types';
import { scrollInputIntoView } from '../utils';

interface TaskReviewModalProps {
    task: Task;
    onClose: () => void;
    onSave: (review: string) => void;
}

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({ task, onClose, onSave }) => {
    const [review, setReview] = useState(task.review || '');

    const handleSave = () => {
        onSave(review);
        onClose();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200 overflow-hidden">
                {/* Header */}
                <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-green-100 dark:border-green-900/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Task Review</h3>
                                <p className="text-xs text-green-600 dark:text-green-400">Completed!</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Task Details */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{formatDate(task.date)}</span>
                        {task.startTime && (
                            <>
                                <span>·</span>
                                <span>{task.startTime}</span>
                            </>
                        )}
                    </div>
                    {task.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{task.description}</p>
                    )}
                </div>

                {/* Review Input */}
                <div className="px-6 py-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        How did it go?
                    </label>
                    <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Any notes, learnings, or reflections..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none text-sm"
                        onFocus={scrollInputIntoView}
                    />
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-lg shadow-green-500/20 transition-all"
                    >
                        Save Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskReviewModal;
