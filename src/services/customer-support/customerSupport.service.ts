import { api } from '../api';

class CustomerSupportService {
    async searchCustomer(query: string): Promise<any> {
        const response = await api.get('/tickets/customer-support/search', { params: { q: query } });
        return response.data;
    }

    async getCustomerProfile(customerId: string): Promise<any> {
        const response = await api.get(`/tickets/customer-support/${customerId}/profile`);
        return response.data;
    }

    async getCustomerTimeline(customerId: string): Promise<any[]> {
        const response = await api.get(`/tickets/customer-support/${customerId}/timeline`);
        return response.data;
    }

    async resendTicketAction(customerId: string, orderId: string): Promise<any> {
        const response = await api.post(`/tickets/customer-support/${customerId}/resend-ticket`, { orderId });
        return response.data;
    }

    async resetCheckInStatus(customerId: string, ticketId: string): Promise<any> {
        const response = await api.post(`/tickets/customer-support/${customerId}/reset-checkin`, { ticketId });
        return response.data;
    }

    async refundOrder(customerId: string, orderId: string, note?: string): Promise<any> {
        const response = await api.post(`/tickets/customer-support/${customerId}/refund`, { orderId, note });
        return response.data;
    }

    async markAsFraud(customerId: string, reason: string): Promise<any> {
        const response = await api.post(`/tickets/customer-support/${customerId}/mark-fraud`, { reason });
        return response.data;
    }

    async addAgentLog(customerId: string, payload: { note: string; actionType?: string }): Promise<any> {
        const response = await api.post(`/tickets/customer-support/${customerId}/agent-logs`, payload);
        return response.data;
    }
}

export const customerSupportService = new CustomerSupportService();
