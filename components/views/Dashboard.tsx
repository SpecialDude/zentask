import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../types';

interface DashboardProps {
    tasks: Task[];
    selectedDate: string;
    onTaskClick: (task: Task) => void;
    onGoToDate: (date: string) => void;
    onExtendSeries?: (task: Task) => void;
}

type TimelineScale = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const Dashboard: React.FC<DashboardProps> = ({ tasks, selectedDate, onTaskClick, onGoToDate, onExtendSeries }) => {
    const [timelineScale, setTimelineScale] = React.useState<TimelineScale>('DAY');

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Current Session Statistics (Based on selectedDate)
        const selectedDateTasks = tasks.filter(t => t.date === selectedDate && !t.parentId);
        const selectedCompleted = selectedDateTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const selectedCompletionRate = selectedDateTasks.length > 0 ? Math.round((selectedCompleted / selectedDateTasks.length) * 100) : 0;

        // Overall Global Stats (for context)
        const allTopLevel = tasks.filter(t => !t.parentId);
        const globalCompleted = allTopLevel.filter(t => t.status === TaskStatus.COMPLETED).length;
        // Global completion rate is still useful for general motivation
        const globalCompletionRate = allTopLevel.length > 0 ? Math.round((globalCompleted / allTopLevel.length) * 100) : 0;

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

        // 5. Recurring tasks ending soon (within 3 days)
        const endingSoon: { task: Task, daysLeft: number, lastDate: string }[] = [];
        const processedSeries = new Set<string>();

        tasks.filter(t => t.isRecurring || t.recurringParentId).forEach(t => {
            const parentId = t.recurringParentId || t.id;
            if (processedSeries.has(parentId)) return;
            processedSeries.add(parentId);

            const seriesInstances = tasks.filter(st =>
                (st.id === parentId || st.recurringParentId === parentId) && !st.carriedOverTo
            );
            if (seriesInstances.length === 0) return;

            const lastDate = seriesInstances.reduce((latest, st) =>
                st.date > latest ? st.date : latest, ''
            );

            const lastDateObj = new Date(lastDate);
            const diffTime = lastDateObj.getTime() - todayObj.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Show if ending within 3 days (including today and past)
            if (daysLeft <= 3) {
                const templateTask = tasks.find(st => st.id === parentId) || t;
                endingSoon.push({ task: templateTask, daysLeft, lastDate });
            }
        });

        endingSoon.sort((a, b) => a.daysLeft - b.daysLeft);

        return {
            completionRate: selectedCompletionRate,
            completed: selectedCompleted,
            total: selectedDateTasks.length,
            globalCompletionRate,
            streak,
            pending,
            upcoming,
            lost,
            endingSoon
        };
    }, [tasks, selectedDate]);

    // Timeline Data Aggregation
    const timelineData = useMemo(() => {
        const data: { label: string, tasksCompleted: number, completionRate: number, totalTasks: number }[] = [];
        const now = new Date();

        const aggregatePeriod = (dateFilter: (task: Task) => boolean, label: string) => {
            const periodTasks = tasks.filter(t => dateFilter(t) && !t.parentId);
            const completedTasks = periodTasks.filter(t => t.status === TaskStatus.COMPLETED);
            const rate = periodTasks.length > 0 ? (completedTasks.length / periodTasks.length) * 100 : 0;
            data.push({
                label,
                tasksCompleted: completedTasks.length,
                completionRate: rate,
                totalTasks: periodTasks.length
            });
        };

        if (timelineScale === 'DAY') {
            for (let i = 13; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                aggregatePeriod(t => t.date === ds, d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        } else if (timelineScale === 'WEEK') {
            for (let i = 7; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i * 7);
                const start = new Date(d); start.setDate(d.getDate() - d.getDay());
                const end = new Date(start); end.setDate(start.getDate() + 6);
                const ss = start.toISOString().split('T')[0];
                const es = end.toISOString().split('T')[0];
                aggregatePeriod(t => t.date >= ss && t.date <= es, `${start.getMonth() + 1}/${start.getDate()}`);
            }
        } else if (timelineScale === 'MONTH') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const month = d.getMonth();
                const year = d.getFullYear();
                aggregatePeriod(t => {
                    const td = new Date(t.date);
                    return td.getMonth() === month && td.getFullYear() === year;
                }, d.toLocaleDateString('en-US', { month: 'short' }));
            }
        } else if (timelineScale === 'YEAR') {
            for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
                aggregatePeriod(t => new Date(t.date).getFullYear() === year, `${year}`);
            }
        }
        return data;
    }, [tasks, timelineScale]);

    const TimelineGraph = () => {
        if (timelineData.length === 0) return null;

        const width = 800;
        const height = 180;
        const padding = 30;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const maxTasks = Math.max(...timelineData.map(d => d.tasksCompleted), 1);

        // Points for tasks completed line (scaled to max tasks)
        const tasksPoints = timelineData.map((d, i) => {
            const x = padding + (i / Math.max(timelineData.length - 1, 1)) * chartWidth;
            const y = height - (padding + (d.tasksCompleted / maxTasks) * chartHeight);
            return { x, y };
        });

        // Points for completion rate line (scaled to 100%)
        const ratePoints = timelineData.map((d, i) => {
            const x = padding + (i / Math.max(timelineData.length - 1, 1)) * chartWidth;
            const y = height - (padding + (d.completionRate / 100) * chartHeight);
            return { x, y };
        });

        const createPath = (points: { x: number, y: number }[]) => {
            return points.reduce((acc, p, i) => {
                if (i === 0) return `M ${p.x} ${p.y}`;
                const prev = points[i - 1];
                const cp1x = prev.x + (p.x - prev.x) / 2;
                const cp2x = prev.x + (p.x - prev.x) / 2;
                return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
            }, "");
        };

        const tasksPath = createPath(tasksPoints);
        const ratePath = createPath(ratePoints);

        const totalCompleted = timelineData.reduce((sum, d) => sum + d.tasksCompleted, 0);
        const avgRate = timelineData.length > 0
            ? timelineData.reduce((sum, d) => sum + d.completionRate, 0) / timelineData.length
            : 0;

        return (
            <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Productivity Timeline</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tasks completed & completion rate</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                        {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(scale => (
                            <button
                                key={scale}
                                onClick={() => setTimelineScale(scale)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-tighter transition-all ${timelineScale === scale
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                {scale}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs text-slate-500 font-medium">Tasks Completed</span>
                        <span className="text-sm font-black text-green-600">{totalCompleted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-xs text-slate-500 font-medium">Avg Completion Rate</span>
                        <span className="text-sm font-black text-primary">{avgRate.toFixed(0)}%</span>
                    </div>
                </div>

                <div className="relative h-[180px] w-full">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map(v => {
                            const y = height - (padding + (v / 100) * chartHeight);
                            return (
                                <line
                                    key={v}
                                    x1={padding} y1={y} x2={width - padding} y2={y}
                                    stroke="currentColor"
                                    className="text-slate-100 dark:text-slate-800/50"
                                    strokeWidth="1"
                                />
                            );
                        })}

                        {/* Completion Rate Area & Line */}
                        <path
                            d={`${ratePath} L ${ratePoints[ratePoints.length - 1].x} ${height - padding} L ${ratePoints[0].x} ${height - padding} Z`}
                            fill="url(#rateGradient)"
                        />
                        <path
                            d={ratePath}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm"
                        />

                        {/* Tasks Completed Line */}
                        <path
                            d={tasksPath}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm"
                        />

                        {/* Data points and labels */}
                        {timelineData.map((d, i) => (
                            <g key={i} className="group cursor-pointer">
                                {/* Tasks point */}
                                <circle
                                    cx={tasksPoints[i].x} cy={tasksPoints[i].y} r="4"
                                    fill="white"
                                    stroke="#22c55e"
                                    strokeWidth="2"
                                    className="dark:fill-slate-900"
                                />
                                {/* Rate point */}
                                <circle
                                    cx={ratePoints[i].x} cy={ratePoints[i].y} r="4"
                                    fill="white"
                                    stroke="#6366f1"
                                    strokeWidth="2"
                                    className="dark:fill-slate-900"
                                />
                                {/* X-axis label */}
                                <text
                                    x={tasksPoints[i].x} y={height - 5}
                                    textAnchor="middle"
                                    className="text-[9px] fill-slate-400 font-bold"
                                >
                                    {d.label}
                                </text>
                                {/* Hover tooltip */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <rect
                                        x={tasksPoints[i].x - 45}
                                        y={Math.min(tasksPoints[i].y, ratePoints[i].y) - 45}
                                        width="90" height="35" rx="6"
                                        className="fill-slate-900 dark:fill-white"
                                    />
                                    <text
                                        x={tasksPoints[i].x}
                                        y={Math.min(tasksPoints[i].y, ratePoints[i].y) - 28}
                                        textAnchor="middle"
                                        className="text-[10px] font-bold fill-white dark:fill-slate-900"
                                    >
                                        <tspan fill="#22c55e">{d.tasksCompleted}</tspan> tasks
                                    </text>
                                    <text
                                        x={tasksPoints[i].x}
                                        y={Math.min(tasksPoints[i].y, ratePoints[i].y) - 15}
                                        textAnchor="middle"
                                        className="text-[10px] font-bold fill-white dark:fill-slate-900"
                                    >
                                        <tspan fill="#6366f1">{d.completionRate.toFixed(0)}%</tspan> rate
                                    </text>
                                </g>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        );
    };

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
                        <h2 className="text-3xl font-extrabold mb-2">My Productivity</h2>
                        <p className="text-indigo-100 text-sm max-w-md">
                            On {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, you've tackled {stats.total} tasks. Keep your {stats.streak}-day streak alive!
                        </p>
                    </div>
                    <div className="flex items-center gap-6 mt-6">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.completionRate}%</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Day Progress</span>
                        </div>
                        <div className="h-12 w-px bg-white/20" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.streak}</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Day Streak</span>
                        </div>
                        <div className="h-12 w-px bg-white/20" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-black">{stats.total}</span>
                            <span className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Tasks Today</span>
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

            {/* Timeline Visualization */}
            <TimelineGraph />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Pending & Upcoming */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Pending Tasks */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-6 bg-primary rounded-full" />
                                Tasks for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                            ) : stats.endingSoon.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-slate-400 text-xs font-medium">No issues. You're efficient! 🏆</p>
                                </div>
                            ) : null}

                            {stats.lost.length > 5 && (
                                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                                    + {stats.lost.length - 5} more missed tasks
                                </p>
                            )}

                            {/* Recurring Tasks Ending Soon */}
                            {stats.endingSoon.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-900/20">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" clipRule="evenodd" />
                                        </svg>
                                        Recurring Series Ending
                                    </p>
                                    {stats.endingSoon.map(({ task, daysLeft, lastDate }) => (
                                        <div
                                            key={task.id}
                                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/20 mb-3"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${daysLeft <= 0
                                                    ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                                    : daysLeft === 1
                                                        ? 'text-orange-500 bg-orange-50 dark:bg-orange-500/10'
                                                        : 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                                                    }`}>
                                                    {daysLeft <= 0 ? 'Ends today' : daysLeft === 1 ? 'Ends tomorrow' : `Ends in ${daysLeft} days`}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {task.recurrencePattern?.toLowerCase()}
                                                </span>
                                            </div>
                                            <h5 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {task.title}
                                            </h5>
                                            <div className="flex gap-2 mt-2">
                                                {onExtendSeries && (
                                                    <button
                                                        onClick={() => onExtendSeries(task)}
                                                        className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Extend Series
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onGoToDate(lastDate)}
                                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    View Last →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
