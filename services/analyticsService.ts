import { supabase } from '../supabase';
import { AdminAnalyticsData, AdminAnalyticsTimeSeriesData, ChurnAnalyticsData } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

export const getAppAnalytics = async (): Promise<{ data: AdminAnalyticsData | null; error: PostgrestError | null }> => {
    const { data, error } = await supabase.rpc('get_admin_analytics');

    return { data, error };
};

export const getAppAnalyticsTimeseries = async (days: number = 30): Promise<{ data: AdminAnalyticsTimeSeriesData[] | null; error: PostgrestError | null }> => {
    const { data, error } = await supabase.rpc('get_admin_analytics_timeseries', { days });

    return { data, error };
};

export const getChurnMetrics = async (inactivityDays: number = 14): Promise<{ data: ChurnAnalyticsData | null; error: PostgrestError | null }> => {
    const { data, error } = await supabase.rpc('get_churn_analytics', { inactivity_days: inactivityDays });

    return { data, error };
};
