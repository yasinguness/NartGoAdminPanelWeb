import { api } from '../api';
import {
    CampaignAnalytics, AnalyticsDashboardData, AnalyticsTimeframe,
} from '../../types/notifications/analytics';

// ─── DTOs ──────────────────────────────────────────────────
interface ApiResponse<T> {
    data: T;
    success: boolean;
}

// ─── Service ───────────────────────────────────────────────
export const analyticsService = {
    /**
     * Get dashboard overview data
     */
    getDashboardOverview: async (
        timeframe: AnalyticsTimeframe = AnalyticsTimeframe.LAST_7D
    ): Promise<AnalyticsDashboardData> => {
        const response = await api.get<ApiResponse<AnalyticsDashboardData>>(
            '/notifications/admin/analytics/dashboard',
            { params: { timeframe } }
        );
        return response.data.data;
    },

    /**
     * Get analytics for a specific campaign
     */
    getCampaignAnalytics: async (campaignId: string): Promise<CampaignAnalytics> => {
        const response = await api.get<ApiResponse<CampaignAnalytics>>(
            `/notifications/admin/analytics/campaign/${campaignId}`
        );
        return response.data.data;
    },
};
