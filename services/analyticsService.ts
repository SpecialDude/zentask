import { request, toServiceError } from './apiClient';
import type { ServiceError } from './apiClient';
import { AdminAnalyticsData, AdminAnalyticsTimeSeriesData, ChurnAnalyticsData } from '../types';

export const getAppAnalytics = async (): Promise<{ data: AdminAnalyticsData | null; error: ServiceError | null }> => {
    try {
        return { data: await request<AdminAnalyticsData>('/analytics/summary'), error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};

export const getAppAnalyticsTimeseries = async (days: number = 30): Promise<{ data: AdminAnalyticsTimeSeriesData[] | null; error: ServiceError | null }> => {
    try {
        return { data: await request<AdminAnalyticsTimeSeriesData[]>(`/analytics/timeseries?days=${days}`), error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};

export const getChurnMetrics = async (inactivityDays: number = 14): Promise<{ data: ChurnAnalyticsData | null; error: ServiceError | null }> => {
    try {
        return { data: await request<ChurnAnalyticsData>(`/analytics/churn?inactivity_days=${inactivityDays}`), error: null };
    } catch (error) {
        return { data: null, error: toServiceError(error) };
    }
};
