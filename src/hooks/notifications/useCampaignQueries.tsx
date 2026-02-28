import { useQuery } from '@tanstack/react-query';
import { CampaignType } from '../../types/notifications/campaign';
import { AnalyticsTimeframe } from '../../types/notifications/analytics';
import { campaignService } from '../../services/notification/campaignService';
import { audienceService } from '../../services/notification/audienceService';
import { analyticsService } from '../../services/notification/analyticsService';
import { schedulingService } from '../../services/notification/schedulingService';
import { mockCampaigns, mockDashboardData, mockSegments, mockRateLimit } from './mockData';

export const useCampaigns = (type?: CampaignType, page = 0, search?: string) => {
    return useQuery({
        queryKey: ['campaigns', type, page, search],
        queryFn: async () => {
            try {
                return await campaignService.getCampaigns(type, page, 20, search);
            } catch (err) {
                // Fallback dummy veriler
                console.warn('Backend hatası, fallback veri gösteriliyor', err);
                const filtered = mockCampaigns.filter(c => type ? c.type === type : true)
                    .filter(c => search ? c.name.toLowerCase().includes(search.toLowerCase()) : true);
                return { campaigns: filtered, totalPages: 1, totalElements: filtered.length };
            }
        },
        staleTime: 2 * 60 * 1000,
    });
};

export const useAudienceSegments = () => {
    return useQuery({
        queryKey: ['audience-segments'],
        queryFn: async () => {
            try {
                return await audienceService.getPresetSegments();
            } catch (err) {
                console.warn('Backend hatası, fallback segmentler', err);
                return mockSegments;
            }
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useAvailableFilters = () => {
    return useQuery({
        queryKey: ['audience-filters'],
        queryFn: async () => {
            try {
                return await audienceService.getAvailableFilters();
            } catch (err) {
                return [];
            }
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useAnalyticsDashboard = (timeframe: AnalyticsTimeframe = AnalyticsTimeframe.LAST_7D) => {
    return useQuery({
        queryKey: ['analytics-dashboard', timeframe],
        queryFn: async () => {
            try {
                return await analyticsService.getDashboardOverview(timeframe);
            } catch (err) {
                console.warn('Backend hatası, fallback analitik', err);
                return mockDashboardData;
            }
        },
        staleTime: 2 * 60 * 1000,
    });
};

export const useRateLimitConfig = () => {
    return useQuery({
        queryKey: ['rate-limit-config'],
        queryFn: async () => {
            try {
                return await schedulingService.getRateLimitConfig();
            } catch (err) {
                console.warn('Backend hatası, fallback rate limit', err);
                return mockRateLimit;
            }
        },
        staleTime: 5 * 60 * 1000,
    });
};
