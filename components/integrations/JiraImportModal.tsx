import React, { useState } from 'react';
import { JiraIssue } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

interface JiraImportModalProps {
    issues: JiraIssue[];
    isLoading: boolean;
    projectKey: string;
    onImport: (selectedIssues: JiraIssue[], dates: Record<string, string>) => void;
    onClose: () => void;
}

const JiraImportModal: React.FC<JiraImportModalProps> = ({ issues, isLoading, projectKey, onImport, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dates, setDates] = useState<Record<string, string>>({});

    const toggleSelect = (issueId: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(issueId)) next.delete(issueId);
            else next.add(issueId);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === issues.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(issues.map(i => i.id)));
        }
    };

    const setDate = (issueId: string, date: string) => {
        setDates(prev => ({ ...prev, [issueId]: date }));
    };

    const handleImport = () => {
        const selectedIssues = issues.filter(i => selected.has(i.id));
        // Fill in today's date for any issue without an explicit date
        const finalDates: Record<string, string> = {};
        selectedIssues.forEach(i => {
            finalDates[i.id] = dates[i.id] || today;
        });
        onImport(selectedIssues, finalDates);
    };

    const STATUS_COLORS: Record<string, string> = {
        new: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        indeterminate: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        done: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Import from {projectKey}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Select issues to import and set their target date in ZenTask.
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" message="Fetching issues from Jira..." />
                        </div>
                    ) : issues.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="font-medium text-slate-900 dark:text-white mb-1">All caught up!</h4>
                            <p className="text-sm text-slate-500">No new issues to import from this project.</p>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === issues.length}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Select All ({issues.length})
                                </label>
                                <span className="text-xs text-slate-400">
                                    {selected.size} selected
                                </span>
                            </div>

                            {/* Issue List */}
                            <div className="space-y-2">
                                {issues.map(issue => (
                                    <div
                                        key={issue.id}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                            selected.has(issue.id)
                                                ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                        onClick={() => toggleSelect(issue.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(issue.id)}
                                                onChange={() => toggleSelect(issue.id)}
                                                onClick={e => e.stopPropagation()}
                                                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono text-slate-400">{issue.key}</span>
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[issue.statusCategory] || STATUS_COLORS.new}`}>
                                                        {issue.status}
                                                    </span>
                                                    {issue.parentKey && (
                                                        <span className="text-[10px] text-slate-400">↳ {issue.parentKey}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {issue.summary}
                                                </p>
                                            </div>
                                            {selected.has(issue.id) && (
                                                <input
                                                    type="date"
                                                    value={dates[issue.id] || today}
                                                    onChange={e => { e.stopPropagation(); setDate(issue.id, e.target.value); }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={selected.size === 0}
                        className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Import {selected.size > 0 ? `${selected.size} Task${selected.size > 1 ? 's' : ''}` : 'Selected'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JiraImportModal;
