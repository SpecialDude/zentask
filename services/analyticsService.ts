import { supabase } from '../supabase';
import { AdminAnalyticsData } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

export const getAppAnalytics = async (): Promise<{ data: AdminAnalyticsData | null; error: PostgrestError | null }> => {
    const { data, error } = await supabase.rpc('get_admin_analytics');

    return { data, error };
};
