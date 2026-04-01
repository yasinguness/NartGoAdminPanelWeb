import { api } from '../api';
import type { Campaign, CreateCampaignRequest, ContentBlock, TargetingConfig, AnalyticsOverview, NotificationLog } from '../../types/notification.types';

interface ApiResponse<T> { success: boolean; data: T; message: string; }
interface PageResponse<T> { content: T[]; totalElements: number; totalPages: number; number: number; }

const BASE = '/notifications/admin/campaigns';

/** Parse richContent JSON string from backend into ContentBlock[] */
function parseCampaignResponse(campaign: any): Campaign {
  if (!campaign) return campaign;
  let richContent: ContentBlock[] | undefined;
  if (campaign.richContent && typeof campaign.richContent === 'string') {
    try { richContent = JSON.parse(campaign.richContent); } catch { richContent = undefined; }
  } else if (campaign.content?.richContent && typeof campaign.content.richContent === 'string') {
    try { richContent = JSON.parse(campaign.content.richContent); } catch { richContent = undefined; }
  } else if (Array.isArray(campaign.richContent)) {
    richContent = campaign.richContent;
  }
  return { ...campaign, richContent };
}

export const notificationCampaignService = {
  getCampaigns: async (params?: { status?: string; page?: number; size?: number; search?: string }) => {
    const response = await api.get<ApiResponse<PageResponse<any>>>(BASE, { params });
    const data = response.data?.data;
    if (data?.content) {
      data.content = data.content.map(parseCampaignResponse);
    }
    return data;
  },

  getCampaign: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`${BASE}/${id}`);
    return parseCampaignResponse(response.data?.data);
  },

  createCampaign: async (data: CreateCampaignRequest) => {
    const payload = {
      ...data,
      richContent: data.richContent?.length ? JSON.stringify(data.richContent) : undefined,
    };
    const response = await api.post<ApiResponse<Campaign>>(BASE, payload);
    return parseCampaignResponse(response.data?.data);
  },

  updateCampaign: async (id: string, data: Partial<CreateCampaignRequest>) => {
    const payload = {
      ...data,
      richContent: data.richContent?.length ? JSON.stringify(data.richContent) : undefined,
    };
    const response = await api.put<ApiResponse<Campaign>>(`${BASE}/${id}`, payload);
    return parseCampaignResponse(response.data?.data);
  },

  deleteCampaign: async (id: string) => {
    await api.delete(`${BASE}/${id}`);
  },

  publishCampaign: async (id: string) => {
    const response = await api.post<ApiResponse<Campaign>>(`${BASE}/${id}/send`);
    return response.data?.data;
  },

  scheduleCampaign: async (id: string, scheduledAt: string) => {
    const response = await api.post<ApiResponse<Campaign>>(`${BASE}/${id}/schedule`, { scheduledAt });
    return response.data?.data;
  },

  cancelCampaign: async (id: string) => {
    const response = await api.post<ApiResponse<Campaign>>(`${BASE}/${id}/cancel`);
    return response.data?.data;
  },

  duplicateCampaign: async (id: string) => {
    const response = await api.post<ApiResponse<Campaign>>(`${BASE}/${id}/duplicate`);
    return response.data?.data;
  },

  estimateReach: async (targeting: TargetingConfig): Promise<number> => {
    const response = await api.post<ApiResponse<{ estimatedCount: number }>>('/notifications/admin/audience/estimate', {
      filters: [
        ...(targeting.type === 'ALL' ? [{ type: 'ANONYMOUS_STATUS', operator: 'NOT_EQUALS', value: 'true' }] : []),
        ...targeting.countries.map(c => ({ type: 'CITY', operator: 'EQUALS', value: c })),
        ...targeting.userSegments.map(s => ({ type: 'ACCOUNT_TYPE', operator: 'EQUALS', value: s })),
      ],
    });
    return response.data?.data?.estimatedCount || 0;
  },

  getAnalytics: async (timeRange = '30d'): Promise<AnalyticsOverview> => {
    const response = await api.get<ApiResponse<any>>('/notifications/admin/analytics/dashboard', { params: { timeRange } });
    const d = response.data?.data;
    return {
      totalCampaigns: d?.totalCampaigns || 0,
      totalSent: d?.totalNotificationsSent || 0,
      totalDelivered: d?.totalDelivered || 0,
      totalOpened: d?.totalOpened || 0,
      totalClicked: d?.totalClicked || 0,
      totalOptOut: 0,
      avgDeliveryRate: d?.deliveryRate || 0,
      avgOpenRate: d?.openRate || 0,
      avgCTR: d?.clickRate || 0,
      channelBreakdown: {},
      dailyStats: d?.dailyTrend?.map((t: any) => ({ date: t.date, sent: t.sent, opened: t.opened, clicked: t.clicked })) || [],
      topCampaigns: d?.topCampaigns?.map((t: any) => ({ id: t.id, name: t.name, ctr: t.clickRate, sent: t.totalSent })) || [],
    };
  },

  getCampaignLogs: async (id: string, params?: { status?: string; page?: number; size?: number }) => {
    const response = await api.get<ApiResponse<PageResponse<NotificationLog>>>(`${BASE}/${id}/logs`, { params });
    return response.data?.data;
  },

  previewCampaign: async (data: Partial<CreateCampaignRequest>) => {
    const response = await api.post<ApiResponse<any>>(`${BASE}/preview`, data);
    return response.data?.data;
  },

  exportAnalytics: async (timeRange = '30d') => {
    const response = await api.get('/notifications/admin/analytics/export', {
      params: { timeRange },
      responseType: 'blob',
    });
    return response.data;
  },
};
