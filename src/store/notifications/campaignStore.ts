import { create } from 'zustand';
import { Campaign, CampaignType } from '../../types/notifications/campaign';
import { AudienceSegment, SegmentFilter } from '../../types/notifications/audience';
import { AnalyticsDashboardData, AnalyticsTimeframe } from '../../types/notifications/analytics';
import { RateLimitConfig } from '../../types/notifications/rateLimit';
import { NotificationChannel } from '../../types/notifications/campaign';
import { NotificationPriority } from '../../types/notifications/notificationModel';
import { CampaignContent } from '../../types/notifications/campaign';
import { ScheduleConfig } from '../../types/notifications/scheduling';
import { campaignService } from '../../services/notification/campaignService';
import { audienceService } from '../../services/notification/audienceService';
import { analyticsService } from '../../services/notification/analyticsService';
import { schedulingService } from '../../services/notification/schedulingService';

interface CampaignCreateData {
    name: string;
    type: CampaignType;
    channels: NotificationChannel[];
    content: CampaignContent;
    filters?: SegmentFilter[];
    schedule?: ScheduleConfig;
    priority: NotificationPriority;
    tags?: string[];
}

interface CampaignStore {
    // State
    campaigns: Campaign[];
    totalPages: number;
    totalElements: number;
    segments: AudienceSegment[];
    dashboardData: AnalyticsDashboardData | null;
    rateLimitConfig: RateLimitConfig | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchCampaigns: (type?: CampaignType, page?: number, search?: string) => Promise<void>;
    createCampaign: (data: CampaignCreateData) => Promise<Campaign>;
    updateCampaign: (id: string, data: Partial<CampaignCreateData>) => Promise<void>;
    deleteCampaign: (id: string) => Promise<void>;
    sendCampaign: (id: string) => Promise<void>;
    cancelCampaign: (id: string) => Promise<void>;

    fetchSegments: () => Promise<void>;
    fetchAnalytics: (timeframe?: AnalyticsTimeframe) => Promise<void>;
    fetchRateLimitConfig: () => Promise<void>;
    saveRateLimitConfig: (config: RateLimitConfig) => Promise<void>;
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
    campaigns: [],
    totalPages: 0,
    totalElements: 0,
    segments: [],
    dashboardData: null,
    rateLimitConfig: null,
    loading: false,
    error: null,

    fetchCampaigns: async (type, page = 0, search) => {
        try {
            set({ loading: true, error: null });
            const result = await campaignService.getCampaigns(type, page, 20, search);
            set({
                campaigns: result.campaigns,
                totalPages: result.totalPages,
                totalElements: result.totalElements,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign listesi yüklenemedi' });
        } finally {
            set({ loading: false });
        }
    },

    createCampaign: async (data) => {
        try {
            set({ loading: true, error: null });
            const campaign = await campaignService.createCampaign(data);
            set({ campaigns: [campaign, ...get().campaigns] });
            return campaign;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign oluşturulamadı' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateCampaign: async (id, data) => {
        try {
            set({ loading: true, error: null });
            const updated = await campaignService.updateCampaign(id, data);
            set({ campaigns: get().campaigns.map(c => c.id === id ? updated : c) });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign güncellenemedi' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteCampaign: async (id) => {
        try {
            set({ loading: true, error: null });
            await campaignService.deleteCampaign(id);
            set({ campaigns: get().campaigns.filter(c => c.id !== id) });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign silinemedi' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendCampaign: async (id) => {
        try {
            set({ loading: true, error: null });
            const updated = await campaignService.sendCampaign(id);
            set({ campaigns: get().campaigns.map(c => c.id === id ? updated : c) });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign gönderilemedi' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    cancelCampaign: async (id) => {
        try {
            set({ loading: true, error: null });
            const updated = await campaignService.cancelCampaign(id);
            set({ campaigns: get().campaigns.map(c => c.id === id ? updated : c) });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Campaign iptal edilemedi' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    fetchSegments: async () => {
        try {
            const segments = await audienceService.getPresetSegments();
            set({ segments });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Segmentler yüklenemedi' });
        }
    },

    fetchAnalytics: async (timeframe = AnalyticsTimeframe.LAST_7D) => {
        try {
            set({ loading: true, error: null });
            const dashboardData = await analyticsService.getDashboardOverview(timeframe);
            set({ dashboardData });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Analitik verileri yüklenemedi' });
        } finally {
            set({ loading: false });
        }
    },

    fetchRateLimitConfig: async () => {
        try {
            const rateLimitConfig = await schedulingService.getRateLimitConfig();
            set({ rateLimitConfig });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Limit ayarları yüklenemedi' });
        }
    },

    saveRateLimitConfig: async (config) => {
        try {
            set({ loading: true, error: null });
            const saved = await schedulingService.saveRateLimitConfig(config);
            set({ rateLimitConfig: saved });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Limit ayarları kaydedilemedi' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
}));
