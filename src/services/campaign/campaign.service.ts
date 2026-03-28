import { api } from '../api';

class CampaignService {
    async getCampaigns(params?: any): Promise<any[]> {
        const response = await api.get('/campaigns', { params });
        return response.data;
    }

    async getCampaignById(campaignId: string): Promise<any> {
        const response = await api.get(`/campaigns/${campaignId}`);
        return response.data;
    }

    async evaluateEligibility(campaignId: string, payload: any): Promise<any> {
        const response = await api.post(`/campaigns/${campaignId}/evaluate`, payload);
        return response.data;
    }

    async createCampaign(payload: any): Promise<any> {
        const response = await api.post(`/campaigns`, payload);
        return response.data;
    }

    async updateCampaignStatus(campaignId: string, status: string): Promise<any> {
        const response = await api.patch(`/campaigns/${campaignId}/status`, { status });
        return response.data;
    }

    async addRuleCondition(campaignId: string, payload: any): Promise<any> {
        const response = await api.post(`/campaigns/${campaignId}/rules/conditions`, payload);
        return response.data;
    }
}

export const campaignService = new CampaignService();
