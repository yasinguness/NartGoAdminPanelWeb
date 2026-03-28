import { api } from '../api';

class SalesCommandService {
    async getSalesDashboard(eventId: string): Promise<any> {
        const response = await api.get(`/sales-command/dashboard`, { params: { eventId } });
        return response.data;
    }

    async getSalesVelocity(eventId: string, intervalMinutes: number = 60): Promise<any[]> {
        const response = await api.get(`/sales-command/velocity`, { params: { eventId, intervalMinutes } });
        return response.data;
    }

    async getOrderFeed(eventId: string, params?: any): Promise<any[]> {
        const response = await api.get(`/sales-command/orders`, { params: { eventId, ...params } });
        return response.data;
    }

    async getChannelBreakdown(eventId: string): Promise<any> {
        const response = await api.get(`/sales-command/channels`, { params: { eventId } });
        return response.data;
    }

    async getOrderLifecycle(orderId: string): Promise<any> {
        const response = await api.get(`/sales-command/orders/${orderId}/lifecycle`);
        return response.data;
    }

    async getRiskExposure(eventId: string): Promise<any> {
        const response = await api.get(`/sales-command/risk`, { params: { eventId } });
        return response.data;
    }
}

export const salesCommandService = new SalesCommandService();
