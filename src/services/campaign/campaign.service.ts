import { api } from '../api';

interface ApiEnvelope<T> {
    success: boolean;
    message?: string;
    data: T;
    timestamp?: string;
    statusCode?: number;
    statusMessage?: string;
}

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
};

class CampaignService {
    async getCampaigns(params?: any): Promise<any[]> {
        const response = await api.get<ApiEnvelope<any[]> | any[]>('/tickets/campaigns', { params });
        return unwrap(response.data);
    }

    async getCampaignById(campaignId: string): Promise<any> {
        const response = await api.get<ApiEnvelope<any> | any>(`/tickets/campaigns/${campaignId}`);
        return unwrap(response.data);
    }

    async evaluateEligibility(campaignId: string, payload: any): Promise<any> {
        const response = await api.post<ApiEnvelope<any> | any>(`/tickets/campaigns/${campaignId}/evaluate`, payload);
        return unwrap(response.data);
    }

    async createCampaign(payload: any): Promise<any> {
        const response = await api.post<ApiEnvelope<any> | any>('/tickets/campaigns', payload);
        return unwrap(response.data);
    }

    async updateCampaignStatus(campaignId: string, status: string): Promise<any> {
        const response = await api.patch<ApiEnvelope<any> | any>(`/tickets/campaigns/${campaignId}/status`, { status });
        return unwrap(response.data);
    }

    async addRuleCondition(campaignId: string, payload: any): Promise<any> {
        const response = await api.post<ApiEnvelope<any> | any>(`/tickets/campaigns/${campaignId}/rules/conditions`, payload);
        return unwrap(response.data);
    }
}

export const campaignService = new CampaignService();
