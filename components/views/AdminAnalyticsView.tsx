import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { getAppAnalytics } from '../../services/analyticsService';
import { AdminAnalyticsData } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

const AdminAnalyticsView: React.FC = () => {
    const { isAdmin } = useAuth();
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
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
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAnalytics();
        } else {
            setIsLoading(false);
            setError("You do not have permission to view this page.");
        }
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400">You must be an administrator to view this page.</p>
            </div>
        );
    }

    const StatCard = ({ title, value, icon, color, subtitle = '' }: { title: string, value: string | number, icon: React.ReactNode, color: string, subtitle?: string }) => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Background Blob decoration */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700 ${color}`} />
            
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    {value}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {title}
                </p>
                {subtitle && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col p-2">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between items-start gap-4">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Platform Analytics
                        </h1>
                        <p className="text-sm text-slate-500 mt-2">
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

            {/* Error or Loading States */}
            {isLoading && !analytics ? (
                <div className="flex-1 flex justify-center items-center">
                    <LoadingSpinner size="lg" message="Crunching numbers..." />
                </div>
            ) : error ? (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                    <p className="font-medium">Error loading analytics</p>
                    <p className="text-sm mt-1">{error}</p>
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
