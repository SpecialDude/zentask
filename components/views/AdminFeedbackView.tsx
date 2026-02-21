import React, { useState, useEffect } from 'react';
import { FeedbackCategory, Feedback } from '../../types';
import { getFeedback } from '../../services/feedbackService';
import { useAuth } from '../../hooks';
import LoadingSpinner from '../LoadingSpinner';

const AdminFeedbackView: React.FC = () => {
    const { isAdmin } = useAuth();
    
    // State
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [error, setError] = useState<string | null>(null);

    const limit = 10;

    // Fetch Data
    const fetchFeedback = async () => {
        setIsLoading(true);
        setError(null);
        
        const filter = categoryFilter === 'all' ? undefined : categoryFilter;
        
        try {
            const { data, count, error: fetchError } = await getFeedback(page, limit, filter, sortOrder);
            
            if (fetchError) {
                console.error("Error fetching feedback:", fetchError);
                setError(fetchError.message || "Failed to load feedback. Ensure you are an admin.");
                setFeedback([]);
                setTotalCount(0);
            } else {
                setFeedback(data || []);
                setTotalCount(count || 0);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch when dependencies change
    useEffect(() => {
        if (isAdmin) {
            fetchFeedback();
        } else {
            setIsLoading(false);
            setError("You do not have permission to view this page.");
        }
    }, [page, categoryFilter, sortOrder, isAdmin]);

    // Derived states
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Handlers
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCategoryFilter(e.target.value as FeedbackCategory | 'all');
        setPage(1); // Reset to first page on filter change
    };

    const handleSortToggle = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        setPage(1); // Reset to first page
    };

    // Helpers
    const getCategoryStyles = (cat: string) => {
        switch (cat) {
            case 'bug': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
            case 'feature': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            case 'question': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

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

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            {/* Header & Controls */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Admin Feedback
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Viewing user feedback from the landing page
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Category Filter */}
                    <div className="flex-1 sm:flex-none">
                        <select
                            value={categoryFilter}
                            onChange={handleCategoryChange}
                            className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                        >
                            <option value="all">All Categories</option>
                            <option value="bug">Bug Reports</option>
                            <option value="feature">Feature Requests</option>
                            <option value="question">Questions</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    {/* Sort Order */}
                    <button
                        onClick={handleSortToggle}
                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all"
                        title={`Sort by Date: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
                    >
                        <div className="flex items-center gap-1 text-sm font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                        </div>
                    </button>
                    
                    {/* Refresh */}
                    <button
                        onClick={fetchFeedback}
                        disabled={isLoading}
                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-purple-600 shadow-sm transition-all disabled:opacity-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                    <p className="font-medium">Error loading feedback</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm">
                
                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <LoadingSpinner size="lg" message="Loading feedback..." />
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No Feedback Found</h3>
                        <p className="max-w-md mx-auto">
                            {categoryFilter === 'all' 
                                ? "There is no user feedback recorded yet." 
                                : `No feedback found for the '${categoryFilter}' category.`}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="space-y-4">
                            {feedback.map((item) => (
                                <div key={item.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow group">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border capitalize ${getCategoryStyles(item.category)}`}>
                                                {item.category}
                                            </span>
                                            {item.email && (
                                                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                    </svg>
                                                    <a href={`mailto:${item.email}`} className="hover:text-purple-600 transition-colors">
                                                        {item.email}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                            {new Date(item.created_at).toLocaleString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                                            {item.message}
                                        </p>
                                    </div>
                                    {item.user_id && (
                                        <div className="mt-3 flex items-center justify-end">
                                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                Auth User: {item.user_id.substring(0, 8)}...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{feedback.length}</span> of <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span> items
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Previous
                            </button>
                            
                            <div className="flex items-center px-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Page {page} of {totalPages}
                                </span>
                            </div>
                            
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedbackView;
