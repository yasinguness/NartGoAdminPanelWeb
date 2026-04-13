import { api } from '../api';

const unwrap = async <T>(request: Promise<{ data: { data: T } }>): Promise<T> => {
    const response = await request;
    return response.data?.data;
};

class SalesCommandService {
    getSalesDashboard(eventId: string) {
        return unwrap<any>(api.get('/tickets/sales-command/dashboard', { params: { eventId } }));
    }

    getSalesVelocity(eventId: string, intervalMinutes = 60) {
        return unwrap<any[]>(api.get('/tickets/sales-command/velocity', { params: { eventId, intervalMinutes } }));
    }

    getOrderFeed(eventId: string, status?: string, limit = 50) {
        return unwrap<any[]>(api.get('/tickets/sales-command/orders', { params: { eventId, status, limit } }));
    }

    getChannelBreakdown(eventId: string) {
        return unwrap<any>(api.get('/tickets/sales-command/channels', { params: { eventId } }));
    }

    getOrderLifecycle(orderId: string) {
        return unwrap<any>(api.get(`/tickets/sales-command/orders/${orderId}/lifecycle`));
    }

    getRiskExposure(eventId: string) {
        return unwrap<any>(api.get('/tickets/sales-command/risk', { params: { eventId } }));
    }
}

export const salesCommandService = new SalesCommandService();
