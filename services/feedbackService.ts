import { supabase } from '../supabase';
import { Feedback, FeedbackCategory } from '../types';

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
