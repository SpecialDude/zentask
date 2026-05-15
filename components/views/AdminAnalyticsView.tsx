import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks';
import { getAppAnalytics, getAppAnalyticsTimeseries, getChurnMetrics } from '../../services/analyticsService';
import { AdminAnalyticsData, AdminAnalyticsTimeSeriesData, ChurnAnalyticsData } from '../../types';
import { AccessDenied, StatCard } from '../admin';
import LoadingSpinner from '../LoadingSpinner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];
const CHURN_COLORS: Record<string, string> = {
    'Completed': '#10b981',
    'Cancelled': '#f43f5e',
    'Abandoned': '#94a3b8',
    'Carried Over': '#f59e0b',
};

const AdminAnalyticsView: React.FC = () => {
    const { isAdmin } = useAuth();
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [timeseries, setTimeseries] = useState<AdminAnalyticsTimeSeriesData[] | null>(null);
    const [churnData, setChurnData] = useState<ChurnAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'charts'>('cards');
    const [timeRange, setTimeRange] = useState<number>(30);
    const [customInput, setCustomInput] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'general' | 'churn'>('general');

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [aggregateRes, timeseriesRes, churnRes] = await Promise.all([
                getAppAnalytics(),
                getAppAnalyticsTimeseries(timeRange),
                getChurnMetrics(14)
            ]);

            if (aggregateRes.error) throw new Error(aggregateRes.error.message || "Failed to fetch aggregate analytics.");
            
            // Handle gracefully in case migrations haven't run
            if (timeseriesRes.error) console.warn("Failed to fetch timeseries analytics. Please run the SQL migration.");
            if (churnRes.error) console.warn("Failed to fetch churn analytics. Please run the SQL migration.");

            setAnalytics(aggregateRes.data);
            setTimeseries(timeseriesRes.data || null);
            setChurnData(churnRes.data || null);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        if (isAdmin) {
            fetchAnalytics();
        } else {
            setIsLoading(false);
        }
    }, [isAdmin, fetchAnalytics]);

    if (!isAdmin) return <AccessDenied />;

    // Prepare data for Option A charts
    const pieData = analytics ? [
        { name: 'Completed', value: analytics.tasks_completed },
        { name: 'Pending', value: analytics.total_tasks - analytics.tasks_completed }
    ] : [];

    const barData = analytics ? [
        { name: 'Users', count: analytics.total_users },
        { name: 'Tasks', count: analytics.total_tasks },
        { name: 'Lists', count: analytics.total_quick_lists },
        { name: 'Feedback', count: analytics.total_feedback },
    ] : [];

    // Format timeseries dates for better display
    const formattedTimeseries = timeseries?.map(item => {
        const dateObj = new Date(item.date);
        return {
            ...item,
            displayDate: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
        };
    }) || [];

    // Churn Data Formatting
    const taskChurnPieData = churnData ? [
        { name: 'Completed', value: churnData.task_outcomes.completed },
        { name: 'Cancelled', value: churnData.task_outcomes.cancelled },
        { name: 'Abandoned', value: churnData.task_outcomes.abandoned },
        { name: 'Carried Over', value: churnData.task_outcomes.carried_over },
    ] : [];

    const userRetentionPieData = churnData ? [
        { name: 'Active Users', value: churnData.user_retention.active },
        { name: 'Churned Users', value: churnData.user_retention.churned },
    ] : [];

    const cancelReasonsData = churnData?.cancel_reasons || [];

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col p-2 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-4 flex flex-col justify-between items-start gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Platform Analytics
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            High-level usage metrics and aggregate platform statistics (Admin Only).
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'general' && (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode('cards')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    Cards
                                </button>
                                <button
                                    onClick={() => setViewMode('charts')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'charts' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    Charts
                                </button>
                            </div>
                        )}
                        <button
                            onClick={fetchAnalytics}
                            disabled={isLoading}
                            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 shadow-sm transition-all disabled:opacity-50"
                            title="Refresh Analytics"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    General Overview
                </button>
                <button
                    onClick={() => setActiveTab('churn')}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'churn' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Retention & Churn
                </button>
            </div>

            {/* Dismissable Error State */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-start justify-between gap-3 shrink-0">
                    <div>
                        <p className="font-medium">Error loading analytics</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && !analytics ? (
                <div className="flex-1 flex justify-center items-center">
                    <LoadingSpinner size="lg" message="Crunching numbers..." />
                </div>
            ) : analytics && (
                <div className="pb-8">
                    {/* General Overview Tab */}
                    {activeTab === 'general' && (
                        <>
                            {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                    <StatCard
                                        title="Total Users"
                                        value={analytics.total_users.toLocaleString()}
                                        color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                        subtitle="Registered accounts on the platform"
                                    />

                                    <StatCard
                                        title="Total Tasks Created"
                                        value={analytics.total_tasks.toLocaleString()}
                                        color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                                        subtitle="Aggregate across all users"
                                    />

                                    <StatCard
                                        title="Platform Task Completion"
                                        value={`${analytics.tasks_completion_rate}%`}
                                        color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                                        subtitle={`${analytics.tasks_completed.toLocaleString()} tasks explicitly marked as completed`}
                                    />

                                    <StatCard
                                        title="Total Quick Lists"
                                        value={analytics.total_quick_lists.toLocaleString()}
                                        color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                                        subtitle="Includes checklist, bullet, and document formats"
                                    />

                                    <StatCard
                                        title="Feedback Count"
                                        value={analytics.total_feedback.toLocaleString()}
                                        color="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                                        subtitle="General, Bugs, and Feature requests submitted"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Task Completion Ratio</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={90}
                                                        paddingAngle={5} dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Overall Volume Metrics</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => value.toLocaleString()} />
                                                    <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} formatter={(value: number) => value.toLocaleString()} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                        {barData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Activity Trends</h3>
                                        <p className="text-sm text-slate-500">Daily breakdown of platform activity over the selected period.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                                            {[7, 30, 90].map(days => (
                                                <button
                                                    key={days}
                                                    onClick={() => {
                                                        setTimeRange(days);
                                                        setCustomInput('');
                                                    }}
                                                    className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${timeRange === days && customInput === '' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                >
                                                    {days} Days
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                placeholder="Custom days..."
                                                value={customInput}
                                                onChange={(e) => setCustomInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && customInput) {
                                                        const days = parseInt(customInput);
                                                        if (days > 0) setTimeRange(days);
                                                    }
                                                }}
                                                className="w-32 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                min="1"
                                            />
                                            <button 
                                                onClick={() => {
                                                    if (customInput) {
                                                        const days = parseInt(customInput);
                                                        if (days > 0) setTimeRange(days);
                                                    }
                                                }}
                                                disabled={!customInput}
                                                className="px-3 py-1.5 text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {timeseries && timeseries.length > 0 ? (
                                    <div className="h-96">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={formattedTimeseries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} minTickGap={20} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Line type="monotone" dataKey="tasks_created" name="Tasks Created" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="tasks_completed" name="Tasks Completed" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="users_joined" name="New Users" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="lists_created" name="Lists Created" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                                <Line type="monotone" dataKey="feedback_submitted" name="Feedback" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p>No time-series data available.</p>
                                        <p className="text-sm mt-1">Please ensure the Supabase migration has been run.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Retention & Churn Tab */}
                    {activeTab === 'churn' && (
                        <div className="space-y-6">
                            {churnData ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Task Outcomes Donut */}
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Task Churn (Overall)</h3>
                                            <p className="text-sm text-slate-500 mb-6">What happens to created tasks?</p>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={taskChurnPieData}
                                                            cx="50%" cy="50%"
                                                            innerRadius={60} outerRadius={90}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                        >
                                                            {taskChurnPieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={CHURN_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* User Retention Pie */}
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">User Retention</h3>
                                            <p className="text-sm text-slate-500 mb-6">Active vs Churned users based on a 14-day inactivity threshold.</p>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={userRetentionPieData}
                                                            cx="50%" cy="50%"
                                                            outerRadius={90}
                                                            dataKey="value"
                                                        >
                                                            <Cell fill="#10b981" /> {/* Active */}
                                                            <Cell fill="#f43f5e" /> {/* Churned */}
                                                        </Pie>
                                                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Cancellation Reasons Bar Chart */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Top Cancellation Reasons</h3>
                                        {cancelReasonsData.length > 0 ? (
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart layout="vertical" data={cancelReasonsData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                                        <XAxis type="number" axisLine={false} tickLine={false} />
                                                        <YAxis type="category" dataKey="reason" axisLine={false} tickLine={false} tick={{fontSize: 12}} width={120} />
                                                        <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} formatter={(value: number) => value.toLocaleString()} />
                                                        <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-48 flex flex-col items-center justify-center text-slate-500">
                                                <p>No cancellation reasons recorded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p>No churn data available.</p>
                                    <p className="text-sm mt-1">Please ensure the Supabase migration has been run.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminAnalyticsView;
