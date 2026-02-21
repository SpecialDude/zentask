import { supabase } from '../supabase';
import { Feedback, FeedbackCategory } from '../types';

export const getFeedback = async (
    page: number = 1,
    limit: number = 20,
    categoryFilter?: FeedbackCategory,
    sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ data: Feedback[] | null; error: any; count: number | null }> => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('feedback')
        .select('*', { count: 'exact' });

    if (categoryFilter) {
        query = query.eq('category', categoryFilter);
    }

    query = query.order('created_at', { ascending: sortOrder === 'asc' });
    query = query.range(from, to);

    const { data, error, count } = await query;
    return { data, error, count };
};
export const submitFeedback = async (
    category: FeedbackCategory,
    message: string,
    email?: string,
    userId?: string
): Promise<{ error: any }> => {
    const { error } = await supabase.from('feedback').insert({
        user_id: userId || null,
        category,
        message,
        email: email || null,
        created_at: new Date().toISOString()
    });

    return { error };
};
