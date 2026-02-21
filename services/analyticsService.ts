import { supabase } from '../supabase';
import { AdminAnalyticsData } from '../types';

export const getAppAnalytics = async (): Promise<{ data: AdminAnalyticsData | null; error: any }> => {
    // Call the Postgres RPC function
    const { data, error } = await supabase.rpc('get_admin_analytics');
    
    return { data, error };
};
