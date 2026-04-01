import { useQuery } from '@tanstack/react-query';
import { CampaignType } from '../../types/notifications/campaign';
import { AnalyticsTimeframe } from '../../types/notifications/analytics';
import { campaignService } from '../../services/notification/campaignService';
import { audienceService } from '../../services/notification/audienceService';
import { analyticsService } from '../../services/notification/analyticsService';
import { schedulingService } from '../../services/notification/schedulingService';
export const useCampaigns = (type?: CampaignType, page = 0, search?: string) => {
    return useQuery({
        queryKey: ['campaigns', type, page, search],
        queryFn: () => campaignService.getCampaigns(type, page, 20, search),
        staleTime: 2 * 60 * 1000,
    });
};

export const useAudienceSegments = () => {
    return useQuery({
        queryKey: ['audience-segments'],
        queryFn: () => audienceService.getPresetSegments(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useAvailableFilters = () => {
    return useQuery({
        queryKey: ['audience-filters'],
        queryFn: async () => {
            try {
                return await audienceService.getAvailableFilters();
            } catch {
                return [];
            }
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useAnalyticsDashboard = (timeframe: AnalyticsTimeframe = AnalyticsTimeframe.LAST_7D) => {
    return useQuery({
        queryKey: ['analytics-dashboard', timeframe],
        queryFn: () => analyticsService.getDashboardOverview(timeframe),
        staleTime: 2 * 60 * 1000,
    });
};

export const useRateLimitConfig = () => {
    return useQuery({
        queryKey: ['rate-limit-config'],
        queryFn: () => schedulingService.getRateLimitConfig(),
        staleTime: 5 * 60 * 1000,
    });
};
