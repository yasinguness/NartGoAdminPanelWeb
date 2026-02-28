import { api } from '../api';
import {
    Campaign, CampaignType, CampaignStatus, CampaignContent,
    NotificationChannel, TransactionalConfig,
} from '../../types/notifications/campaign';
import { AudienceSegment, SegmentFilter } from '../../types/notifications/audience';
import { ScheduleConfig } from '../../types/notifications/scheduling';
import { NotificationPriority } from '../../types/notifications/notificationModel';

// ─── Request / Response DTOs ───────────────────────────────
interface CampaignRequest {
    name: string;
    type: CampaignType;
    channels: NotificationChannel[];
    content: CampaignContent;
    filters?: SegmentFilter[];
    schedule?: ScheduleConfig;
    priority: NotificationPriority;
    tags?: string[];
}

interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
}

// ─── Service ───────────────────────────────────────────────
export const campaignService = {
    /**
     * Get all campaigns (paginated)
     */
    getCampaigns: async (
        type?: CampaignType,
        page = 0,
        size = 20,
        search?: string
    ): Promise<{ campaigns: Campaign[]; totalPages: number; totalElements: number }> => {
        const params: Record<string, string | number> = { page, size };
        if (type) params.type = type;
        if (search) params.search = search;

        const response = await api.get<ApiResponse<PageResponse<Campaign>>>(
            '/notifications/admin/campaigns',
            { params }
        );
        const pageData = response.data.data;
        return {
            campaigns: pageData.content,
            totalPages: pageData.totalPages,
            totalElements: pageData.totalElements,
        };
    },

    /**
     * Get single campaign by ID
     */
    getCampaign: async (id: string): Promise<Campaign> => {
        const response = await api.get<ApiResponse<Campaign>>(
            `/notifications/admin/campaigns/${id}`
        );
        return response.data.data;
    },

    /**
     * Create a new campaign
     */
    createCampaign: async (data: CampaignRequest): Promise<Campaign> => {
        const response = await api.post<ApiResponse<Campaign>>(
            '/notifications/admin/campaigns',
            data
        );
        return response.data.data;
    },

    /**
     * Update an existing campaign
     */
    updateCampaign: async (id: string, data: Partial<CampaignRequest>): Promise<Campaign> => {
        const response = await api.put<ApiResponse<Campaign>>(
            `/notifications/admin/campaigns/${id}`,
            data
        );
        return response.data.data;
    },

    /**
     * Delete a campaign
     */
    deleteCampaign: async (id: string): Promise<void> => {
        await api.delete(`/notifications/admin/campaigns/${id}`);
    },

    /**
     * Send a campaign
     */
    sendCampaign: async (id: string): Promise<Campaign> => {
        const response = await api.post<ApiResponse<Campaign>>(
            `/notifications/admin/campaigns/${id}/send`
        );
        return response.data.data;
    },

    /**
     * Cancel a scheduled campaign
     */
    cancelCampaign: async (id: string): Promise<Campaign> => {
        const response = await api.post<ApiResponse<Campaign>>(
            `/notifications/admin/campaigns/${id}/cancel`
        );
        return response.data.data;
    },
};
