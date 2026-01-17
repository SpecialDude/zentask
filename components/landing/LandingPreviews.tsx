import React from 'react';

// Mock data for a productivity story
const mockTasks = [
    { id: '1', title: 'Morning workout', status: 'COMPLETED', priority: 'HIGH', completion: 100 },
    { id: '2', title: 'Review project proposal', status: 'IN_PROGRESS', priority: 'MEDIUM', completion: 60 },
    { id: '3', title: 'Team standup meeting', status: 'TODO', priority: 'LOW', startTime: '10:00 AM' },
    { id: '4', title: 'Prepare client presentation', status: 'TODO', priority: 'URGENT', completion: 0 },
    { id: '5', title: 'Send weekly report', status: 'TODO', priority: 'MEDIUM', completion: 0 },
];

const mockQuickListItems = [
    { id: '1', text: 'Buy groceries', checked: true },
    { id: '2', text: 'Call mom', checked: true },
    { id: '3', text: 'Book dentist appointment', checked: false },
    { id: '4', text: 'Research vacation spots', checked: false },
    { id: '5', text: 'Update resume', checked: false },
];

const priorityColors: Record<string, { bg: string; text: string }> = {
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    HIGH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400' },
};

// Mini Task Item for preview
const MiniTaskItem: React.FC<{ task: typeof mockTasks[0] }> = ({ task }) => {
    const priority = priorityColors[task.priority] || priorityColors.MEDIUM;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${task.status === 'COMPLETED'
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                {task.status === 'COMPLETED' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {task.title}
                </p>
            </div>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                {task.priority}
            </span>
        </div>
    );
};

// Dashboard Preview
export const DashboardPreview: React.FC = () => {
    const completedCount = mockTasks.filter(t => t.status === 'COMPLETED').length;
    const totalCount = mockTasks.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 p-3 overflow-hidden">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                    <p className="text-[8px] text-slate-500 dark:text-slate-400">Today</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{totalCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                    <p className="text-[8px] text-slate-500 dark:text-slate-400">Done</p>
                    <p className="text-lg font-bold text-green-500">{completedCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                    <p className="text-[8px] text-slate-500 dark:text-slate-400">Streak</p>
                    <p className="text-lg font-bold text-orange-500">7🔥</p>
                </div>
            </div>

            {/* Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700 mb-3">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[8px] font-medium text-slate-500 dark:text-slate-400">Today's Progress</p>
                    <p className="text-xs font-bold text-purple-600">{percentage}%</p>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* Recent Tasks */}
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recent Tasks</p>
            <div className="space-y-1">
                {mockTasks.slice(0, 3).map(task => (
                    <MiniTaskItem key={task.id} task={task} />
                ))}
            </div>
        </div>
    );
};

// Task List Preview
export const TaskListPreview: React.FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 p-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Today</p>
                    <p className="text-[8px] text-slate-500 dark:text-slate-400">5 tasks</p>
                </div>
                <div className="flex gap-1">
                    <span className="text-[8px] px-2 py-1 bg-purple-500 text-white rounded-md">Smart</span>
                    <span className="text-[8px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">Priority</span>
                </div>
            </div>

            {/* Tasks */}
            <div className="space-y-1.5">
                {mockTasks.map(task => (
                    <MiniTaskItem key={task.id} task={task} />
                ))}
            </div>
        </div>
    );
};

// Quick Lists Preview
export const QuickListsPreview: React.FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 p-3 overflow-hidden">
            {/* Quick List Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2">
                    <p className="text-xs font-bold text-white">📋 Personal Tasks</p>
                    <p className="text-[8px] text-purple-100">Checklist</p>
                </div>
                <div className="p-2 space-y-1.5">
                    {mockQuickListItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${item.checked
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                {item.checked && (
                                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-[10px] ${item.checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Mobile Preview (compact task list)
export const MobilePreview: React.FC = () => {
    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 p-2 overflow-hidden">
            {/* Mini Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-white">Today</span>
                </div>
                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px]">+</span>
                </div>
            </div>

            {/* Tasks */}
            <div className="space-y-1">
                {mockTasks.slice(0, 4).map(task => (
                    <div key={task.id} className="bg-white dark:bg-slate-800 rounded-md p-1.5 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${task.status === 'COMPLETED'
                                ? 'bg-green-500 border-green-500'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                            {task.status === 'COMPLETED' && (
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <p className={`text-[8px] truncate flex-1 ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {task.title}
                        </p>
                    </div>
                ))}
            </div>

            {/* Bottom FAB hint */}
            <div className="absolute bottom-2 right-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs">+</span>
                </div>
            </div>
        </div>
    );
};
