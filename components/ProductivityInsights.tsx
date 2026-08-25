import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../types';
import { analyzeCarryOverPatterns, generateInsightText, ProductivityInsight } from '../services/insightsService';

interface ProductivityInsightsProps {
    tasks: Task[];
}

const ProductivityInsights: React.FC<ProductivityInsightsProps> = ({ tasks }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [insightText, setInsightText] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState<7 | 30>(7);

    const insight = useMemo(() =>
        analyzeCarryOverPatterns(tasks, selectedTimeframe),
        [tasks, selectedTimeframe]
    );

    const totalIssues = insight.totalCarriedOver + insight.totalCancelled + insight.totalAbandoned;

    useEffect(() => {
        if (insight.patterns.length === 0) {
            setInsightText(insight.summary);
            return;
        }

        setIsGenerating(true);
        generateInsightText(insight)
            .then(text => {
                setInsightText(text);
                setIsGenerating(false);
            })
            .catch(() => {
                setInsightText(insight.summary || 'Unable to generate insight');
                setIsGenerating(false);
            });
    }, [insight]);

    // Don't show if no data
    if (totalIssues === 0) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-100 dark:border-green-900/30 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="font-black text-green-700 dark:text-green-400">Excellent Consistency!</h3>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                    No pushed, cancelled, or abandoned tasks in the last {selectedTimeframe} days. Keep it up!
                </p>
            </div>
        );
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div
                className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-black text-slate-900 dark:text-white">Your Productivity Patterns</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                                    {insight.totalCarriedOver > 0 && `${insight.totalCarriedOver} pushed`}
                                    {insight.totalCancelled > 0 && ` • ${insight.totalCancelled} cancelled`}
                                    {insight.totalAbandoned > 0 && ` • ${insight.totalAbandoned} abandoned`}
                                </span>
                            </div>
                            </div>
                            {isGenerating ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Analyzing patterns...</span>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {insightText}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        className="ml-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {/* Timeframe Selector */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeframe</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setSelectedTimeframe(7)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${selectedTimeframe === 7
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Last 7 Days
                            </button>
                            <button
                                onClick={() => setSelectedTimeframe(30)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${selectedTimeframe === 30
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Last 30 Days
                            </button>
                        </div>
                    </div>

                    {/* Pattern Breakdown */}
                    <div className="space-y-3">
                        {/* Carry-Over Patterns */}
                        {insight.patterns.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    📋 Pushed Tasks
                                </h5>
                                {insight.patterns.map((pattern, index) => (
                                    <div
                                        key={index}
                                        className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">
                                                    {pattern.reason.toLowerCase().includes('time') ? '🕒' :
                                                        pattern.reason.toLowerCase().includes('tired') ? '😴' :
                                                            pattern.reason.toLowerCase().includes('priority') ? '⚡' :
                                                                pattern.reason.toLowerCase().includes('forgot') ? '🤔' : '📋'}
                                                </span>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                                        "{pattern.reason}"
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {pattern.count} {pattern.count === 1 ? 'task' : 'tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                                                        <div
                                                            key={day}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${pattern.daysOfWeek.includes(day)
                                                                ? 'bg-purple-500 text-white'
                                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                                }`}
                                                            title={dayNames[day]}
                                                        >
                                                            {dayNames[day][0]}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Mostly {pattern.avgTimeSlot}
                                                </p>
                                            </div>
                                        </div>
                                        {pattern.taskTitles.length > 0 && (
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Examples: {pattern.taskTitles.join(', ')}
                                                    {pattern.count > pattern.taskTitles.length && ` +${pattern.count - pattern.taskTitles.length} more`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cancellation Patterns */}
                        {insight.cancellationPatterns.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    ❌ Cancelled Tasks
                                </h5>
                                {insight.cancellationPatterns.map((pattern, index) => (
                                    <div
                                        key={index}
                                        className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 space-y-2 border border-red-100 dark:border-red-900/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">❌</span>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                                        "{pattern.reason}"
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {pattern.count} {pattern.count === 1 ? 'task' : 'tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-red-600 dark:text-red-400">
                                                    ~{pattern.avgDaysBeforeCancellation} days
                                                </div>
                                                <p className="text-[10px] text-slate-500">before cancel</p>
                                            </div>
                                        </div>
                                        {pattern.taskTitles.length > 0 && (
                                            <div className="pt-2 border-t border-red-200 dark:border-red-900/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Examples: {pattern.taskTitles.join(', ')}
                                                    {pattern.count > pattern.taskTitles.length && ` +${pattern.count - pattern.taskTitles.length} more`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Abandonment Patterns */}
                        {insight.abandonmentPatterns.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    ⏳ Abandoned Tasks
                                </h5>
                                {insight.abandonmentPatterns.map((pattern, index) => (
                                    <div
                                        key={index}
                                        className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 space-y-2 border border-amber-100 dark:border-amber-900/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">⏳</span>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                                        {pattern.daysAbandoned}+ days overdue
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {pattern.count} {pattern.count === 1 ? 'task' : 'tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            {pattern.commonPriorities.length > 0 && (
                                                <div className="flex gap-1">
                                                    {pattern.commonPriorities.map((priority, i) => (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-1 rounded text-[10px] font-bold ${priority === 'URGENT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                                priority === 'HIGH' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                    priority === 'MEDIUM' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                                }`}
                                                        >
                                                            {priority}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {pattern.taskTitles.length > 0 && (
                                            <div className="pt-2 border-t border-amber-200 dark:border-amber-900/30">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Examples: {pattern.taskTitles.join(', ')}
                                                    {pattern.count > pattern.taskTitles.length && ` +${pattern.count - pattern.taskTitles.length} more`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Future: Action buttons */}
                    {/* 
                    <div className="flex gap-2 pt-2">
                        <button className="flex-1 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                            Block Time for These
                        </button>
                        <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Weekly Review
                        </button>
                    </div>
                    */}
                </div>
            )}
        </div>
    );
};

export default ProductivityInsights;
