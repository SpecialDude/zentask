import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface DashboardProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onGoToDate: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, onTaskClick, onGoToDate }) => {
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Statistics
        const allTopLevel = tasks.filter(t => !t.parentId);
        const completed = allTopLevel.filter(t => t.status === TaskStatus.COMPLETED).length;
        const completionRate = allTopLevel.length > 0 ? Math.round((completed / allTopLevel.length) * 100) : 0;

        // Streak
        const sortedDates = [...new Set(tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.date))].sort().reverse();
        let streak = 0;
        const todayObj = new Date(today);
        for (let i = 0; i < sortedDates.length; i++) {
            const expected = new Date(todayObj);
            expected.setDate(expected.getDate() - i);
            if (sortedDates[i] === expected.toISOString().split('T')[0]) streak++;
            else break;
        }

        // 2. Pending Tasks (Today's unfinished top-level tasks)
        const pending = tasks.filter(t => t.date === today && !t.parentId && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
            .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

        // 3. Upcoming Tasks (Next 7 days, excluding today)
        const next7Days = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(todayObj);
            d.setDate(d.getDate() + i);
            next7Days.push(d.toISOString().split('T')[0]);
        }
        const upcoming = tasks.filter(t => next7Days.includes(t.date) && !t.parentId && t.status !== TaskStatus.COMPLETED)
            .sort((a, b) => a.date.localeCompare(b.date));

        // 4. Attention Needed (Lost Tasks: Past dates, not completed, not cancelled, not carried over)
        const lost = tasks.filter(t => {
            return t.date < today &&
                !t.parentId &&
                t.status !== TaskStatus.COMPLETED &&
                t.status !== TaskStatus.CANCELLED &&
                !t.carriedOverTo;
        }).sort((a, b) => b.date.localeCompare(a.date));

        return {
            completionRate,
            completed,
            total: allTopLevel.length,
            streak,
            pending,
            upcoming,
            lost
        };
    }, [tasks]);

    const TaskCard = ({ task, showDate = false }: { task: Task, showDate?: boolean }) => (
        <div
            onClick={() => onTaskClick(task)}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary dark:hover:border-primary/50 cursor-pointer transition-all hover:shadow-md group"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {task.priority && (
                        <span className={`w-2 h-2 rounded-full ${task.priority === TaskPriority.URGENT ? 'bg-red-500' :
                            task.priority === TaskPriority.HIGH ? 'bg-orange-500' :
                                task.priority === TaskPriority.MEDIUM ? 'bg-blue-500' : 'bg-slate-400'
                            }`} />
                    )}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                        {task.startTime || 'No Time'}
                    </span>
                    {task.isRecurring && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
                {showDate && (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500">
                        {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                {task.title}
            </h4>
            {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                    {task.description}
                </p>
            )}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Welcome & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-primary to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[220px]">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-2">Welcome Back!</h2>
                        <p className="text-indigo-100 text-sm max-w-md">
                            You've completed {stats.completed} tasks so far. Keep the momentum going to maintain your {stats.streak}-day streak!
                        </p>
                    </div>
                    <div className="flex items-center gap-6 mt-6">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.completionRate}%</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Completion</span>
                        </div>
                        <div className="h-12 w-px bg-white/20" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.streak}</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Day Streak</span>
                        </div>
                        <div className="h-12 w-px bg-white/20" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.total}</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Total Tasks</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center mb-4 relative">
                        <svg className="w-full h-full absolute inset-0 -rotate-90">
                            <circle
                                cx="40" cy="40" r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                                cx="40" cy="40" r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 36}`}
                                strokeDashoffset={`${2 * Math.PI * 36 * (1 - stats.completionRate / 100)}`}
                                className="text-primary"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.completionRate}%</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Tasks Completed</p>
                    <p className="text-xs text-slate-500 mt-1">Excellent progress this session!</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Pending & Upcoming */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Pending Tasks */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-6 bg-primary rounded-full" />
                                Focus Today
                            </h3>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                {stats.pending.length} Remaining
                            </span>
                        </div>
                        {stats.pending.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats.pending.map(t => <TaskCard key={t.id} task={t} />)}
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                                <p className="text-slate-400 font-medium">All caught up for today! 🎉</p>
                            </div>
                        )}
                    </section>

                    {/* Upcoming Tasks */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-400 rounded-full" />
                                Upcoming
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.upcoming.slice(0, 4).map(t => <TaskCard key={t.id} task={t} showDate={true} />)}
                            {stats.upcoming.length === 0 && (
                                <p className="col-span-2 text-slate-400 text-sm ml-2">No upcoming tasks scheduled.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Attention Section */}
                <div className="space-y-8">
                    <section className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] p-6">
                        <h3 className="font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2 mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Attention Needed
                        </h3>

                        <div className="space-y-4">
                            {stats.lost.length > 0 ? (
                                stats.lost.slice(0, 5).map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => onTaskClick(t)}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/20 cursor-pointer hover:shadow-md transition-shadow group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded uppercase">
                                                Missed
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400">
                                                {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <h5 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 transition-colors truncate">
                                            {t.title}
                                        </h5>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onGoToDate(t.date); }}
                                            className="mt-2 text-[10px] font-bold text-primary hover:underline"
                                        >
                                            Handle this day →
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-slate-400 text-xs font-medium">No lost tasks. You're efficient! 🏆</p>
                                </div>
                            )}

                            {stats.lost.length > 5 && (
                                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                                    + {stats.lost.length - 5} more missed tasks
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Productivity Tip */}
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-[2rem] p-6">
                        <span className="text-xl">💡</span>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">Pro Tip</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Recurring tasks help you build habits. Try setting up your morning routine as recurring for a better start!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
