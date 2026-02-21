import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks';
import { getAppAnalytics } from '../../services/analyticsService';
import { AdminAnalyticsData } from '../../types';
import { AccessDenied, StatCard } from '../admin';
import LoadingSpinner from '../LoadingSpinner';

const AdminAnalyticsView: React.FC = () => {
    const { isAdmin } = useAuth();
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getAppAnalytics();
            if (fetchError) {
                setError(fetchError.message || "Failed to fetch analytics.");
            } else {
                setAnalytics(data);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchAnalytics();
        } else {
            setIsLoading(false);
        }
    }, [isAdmin, fetchAnalytics]);

    if (!isAdmin) return <AccessDenied />;

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col p-2">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between items-start gap-4">
                <div className="flex items-center justify-between w-full">
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

            {/* Dismissable Error State */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-start justify-between gap-3">
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

            {/* Loading or Content */}
            {isLoading && !analytics ? (
                <div className="flex-1 flex justify-center items-center">
                    <LoadingSpinner size="lg" message="Crunching numbers..." />
                </div>
            ) : analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
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
            )}
        </div>
    );
};

export default AdminAnalyticsView;
