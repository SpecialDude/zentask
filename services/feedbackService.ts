import { request, toServiceError } from './apiClient';
import type { ServiceError } from './apiClient';
import { Feedback, FeedbackCategory } from '../types';

interface FeedbackPage {
    count: number;
    next: string | null;
    previous: string | null;
    results: Feedback[];
}

export const getFeedback = async (
    page: number = 1,
    limit: number = 20,
    categoryFilter?: FeedbackCategory,
    sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ data: Feedback[] | null; error: ServiceError | null; count: number | null }> => {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(limit),
        sort: sortOrder,
    });
    if (categoryFilter) params.set('category', categoryFilter);

    try {
        const body = await request<FeedbackPage>(`/feedback?${params.toString()}`);
        return { data: body.results, error: null, count: body.count };
    } catch (error) {
        return { data: null, error: toServiceError(error), count: null };
    }
};

export const submitFeedback = async (
    category: FeedbackCategory,
    message: string,
    email?: string,
    _userId?: string
): Promise<{ error: ServiceError | null }> => {
    try {
        await request('/feedback', {
            method: 'POST',
            body: {
                category,
                message,
                email: email || null,
            },
        });
        return { error: null };
    } catch (error) {
        return { error: toServiceError(error) };
    }
};
